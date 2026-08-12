"""
API Routes for the EOM Review Agent (Flask version).

All routes are protected by Azure AD authentication via the auth middleware.
User data scope is automatically restricted to their authorized branches.
"""
from flask import Blueprint, request, jsonify, g
from app.services.parser import parse_excel
from app.services.data_store import data_store
from app.services.blob_service import upload_parsed_data, delete_parsed_data
from app.core.auth_middleware import (
    require_auth, require_bu_manager, require_settings_admin,
    get_scoped_branches,
)

blueprint = Blueprint('api', __name__)


# ── User Info Endpoint ─────────────────────────────────────────────────────────

@blueprint.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Returns the current user's role, branches, and capabilities."""
    return jsonify(g.current_user.to_dict())

@blueprint.route("/upload", methods=["POST"])
@require_bu_manager
def upload_file():
    if 'files' not in request.files:
        return jsonify({"error": "No files uploaded"}), 400
        
    uploaded_files = request.files.getlist('files')
    if not uploaded_files or len(uploaded_files) == 0:
        return jsonify({"error": "No files selected"}), 400
        
    for file in uploaded_files:
        if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
            continue
            
        contents = file.read()
        try:
            from app.services.parser import is_neg_movement_file
            if is_neg_movement_file(contents, file.filename):
                from app.services.neg_movement_parser import parse_neg_movement_excel
                from app.services.neg_movement_store import neg_movement_store
                from app.services.blob_service import upload_neg_movement_data
                
                parsed_neg = parse_neg_movement_excel(contents)
                neg_movement_store.load(parsed_neg)
                upload_neg_movement_data({
                    "branch": neg_movement_store.branch,
                    "period": neg_movement_store.period,
                    "sections": neg_movement_store.sections,
                })
                continue

            parsed = parse_excel(contents, file.filename)
            data_store.load(parsed, merge=True)
        except Exception as e:
            print(f"Failed to parse {file.filename}: {e}")
            # Continue processing other files even if one fails

    
    # We must construct a dictionary representing the merged state to upload to blob storage!
    merged_parsed = {
        "branch": data_store.branch,
        "period": data_store.period,
        "operators": data_store.operators,
        "jobs": data_store.jobs
    }
    
    # Persist the merged data to Azure Blob Storage
    upload_parsed_data(merged_parsed)

    return jsonify({
        "success": True,
        "message": f"Loaded {len(data_store.jobs)} jobs from {len(data_store.operators)} operators",
        "branch": data_store.branch,
        "period": data_store.period,
        "total_jobs": len(data_store.jobs),
        "operators": data_store.operators,
    })

@blueprint.route("/sync", methods=["POST"])
@require_bu_manager
def sync_snowflake():
    try:
        from app.services.snowflake_client import fetch_jobs_from_snowflake
        parsed = fetch_jobs_from_snowflake()
        
        # We can either merge or overwrite. Let's merge for now as requested.
        data_store.load(parsed, merge=True)
        
        merged_parsed = {
            "branch": data_store.branch,
            "period": data_store.period,
            "operators": data_store.operators,
            "jobs": data_store.jobs
        }
        
        upload_parsed_data(merged_parsed)
        
        return jsonify({
            "success": True,
            "message": f"Synced {len(parsed['jobs'])} live jobs from Snowflake! Total in system: {len(data_store.jobs)}",
            "branch": data_store.branch,
            "period": data_store.period,
            "total_jobs": len(data_store.jobs),
            "operators": data_store.operators,
        })
    except Exception as e:
        print(f"Snowflake sync failed: {e}")
        return jsonify({"error": f"Snowflake sync failed: {str(e)}"}), 500

@blueprint.route("/sync/progress", methods=["GET"])
def get_sync_progress():
    """Returns real-time progress of ongoing Snowflake data sync."""
    from app.services.snowflake_client import sync_progress
    return jsonify(sync_progress)

@blueprint.route("/clear", methods=["POST"])
@require_bu_manager
def clear_data():
    data_store.clear()
    delete_parsed_data()
    return jsonify({
        "success": True,
        "message": "All data cleared successfully."
    })

@blueprint.route("/dashboard", methods=["GET"])
@require_auth
def get_dashboard():
    if not data_store.is_loaded:
        return jsonify({"error": "No data loaded. Please upload a file first."}), 400

    flags_param = request.args.get('flags')
    flags = flags_param.split(',') if flags_param else None
    
    branches_param = request.args.get('branches')
    ui_branches = branches_param.split(',') if branches_param else None
    branches = get_scoped_branches(g.current_user, ui_branches)
    
    depts_param = request.args.get('departments')
    departments = depts_param.split(',') if depts_param else None

    return jsonify({
        "branch": data_store.branch,
        "period": data_store.period,
        "kpi": data_store.get_kpi(flags=flags, branches=branches, departments=departments),
        "operators": data_store.get_operator_summaries(flags=flags, branches=branches, departments=departments),
        "flag_distribution": data_store.get_flag_distribution(flags=flags, branches=branches, departments=departments),
        "available_branches": data_store.available_branches,
        "available_departments": data_store.available_departments,
    })

@blueprint.route("/operators", methods=["GET"])
@require_auth
def get_operators():
    if not data_store.is_loaded:
        return jsonify({"error": "No data loaded."}), 400
    
    flags_param = request.args.get('flags')
    flags = flags_param.split(',') if flags_param else None
    
    branches_param = request.args.get('branches')
    ui_branches = branches_param.split(',') if branches_param else None
    branches = get_scoped_branches(g.current_user, ui_branches)
    
    depts_param = request.args.get('departments')
    departments = depts_param.split(',') if depts_param else None
    
    return jsonify({
        "operators": data_store.get_operator_summaries(flags=flags, branches=branches, departments=departments),
        "branch": data_store.branch,
        "period": data_store.period,
    })

@blueprint.route("/operator/<code>", methods=["GET"])
@require_auth
def get_operator_detail(code):
    if not data_store.is_loaded:
        return jsonify({"error": "No data loaded."}), 400

    flags_param = request.args.get('flags')
    flags = flags_param.split(',') if flags_param else None
    
    branches_param = request.args.get('branches')
    ui_branches = branches_param.split(',') if branches_param else None
    branches = get_scoped_branches(g.current_user, ui_branches)
    
    depts_param = request.args.get('departments')
    departments = depts_param.split(',') if depts_param else None

    jobs = data_store.get_all_jobs(code, flags=flags, branches=branches, departments=departments)
    if not jobs and code != "ALL" and code not in data_store.operators:
        return jsonify({"error": f"Operator '{code}' not found"}), 404

    jobs_by_flag = data_store.get_jobs_by_flag(code, flags=flags, branches=branches, departments=departments)
    if code == "ALL":
        # For ALL operators view, cap each section at 250 jobs max to reduce 50MB JSON payload down to 1.5MB for sub-100ms loading speed
        jobs_by_flag = {flag: jlist[:250] for flag, jlist in jobs_by_flag.items()}

    return jsonify({
        "operator": code,
        "branch": data_store.branch,
        "period": data_store.period,
        "kpi": data_store.get_kpi(code, flags=flags, branches=branches, departments=departments),
        "jobs_by_flag": jobs_by_flag,
        "flag_distribution": data_store.get_flag_distribution(code, flags=flags, branches=branches, departments=departments),
    })

@blueprint.route("/jobs", methods=["GET"])
@require_auth
def get_jobs():
    if not data_store.is_loaded:
        return jsonify({"error": "No data loaded."}), 400

    operator = request.args.get('operator')
    flags_param = request.args.get('flags') or request.args.get('flag')
    flags = flags_param.split(',') if flags_param else None
    
    branches_param = request.args.get('branches') or request.args.get('branch')
    ui_branches = branches_param.split(',') if branches_param else None
    branches = get_scoped_branches(g.current_user, ui_branches)
    
    depts_param = request.args.get('departments') or request.args.get('department')
    departments = depts_param.split(',') if depts_param else None

    status = request.args.get('status')
    direction = request.args.get('direction')
    sort_by = request.args.get('sort_by', 'job_number')
    sort_dir = request.args.get('sort_dir', 'asc')

    jobs = data_store.get_all_jobs(operator=operator, flags=flags, branches=branches, departments=departments)

    if status:
        jobs = [j for j in jobs if j.get("job_status", "").upper() == status.upper()]
    if direction:
        is_exp = direction.lower() in ("export", "exp")
        jobs = [j for j in jobs if j.get("is_export") == is_exp]

    reverse = sort_dir.lower() == "desc"
    if sort_by in ("revenue", "wip", "cost", "accrual", "profit_loss", "margin_pct", "job_age_days"):
        jobs.sort(key=lambda j: j.get(sort_by, 0), reverse=reverse)
    else:
        jobs.sort(key=lambda j: str(j.get(sort_by, "")), reverse=reverse)

    return jsonify({
        "total": len(jobs),
        "jobs": jobs,
    })

@blueprint.route("/ops-review", methods=["GET"])
@require_bu_manager
def get_ops_review():
    if not data_store.is_loaded:
        return jsonify({"error": "No data loaded."}), 400

    flags_param = request.args.get('flags')
    flags = flags_param.split(',') if flags_param else None
    
    branches_param = request.args.get('branches')
    ui_branches = branches_param.split(',') if branches_param else None
    branches = get_scoped_branches(g.current_user, ui_branches)
    
    depts_param = request.args.get('departments')
    departments = depts_param.split(',') if depts_param else None

    review_jobs = data_store.get_ops_review_jobs(flags=flags, branches=branches, departments=departments)

    sections = {}
    for item in review_jobs:
        label = item["ops_label"]
        if label not in sections:
            sections[label] = []
        sections[label].append(item["job"])

    print(f"DEBUG: Returning ops-review. Total jobs: {len(review_jobs)}")
    for lbl, jlist in sections.items():
        print(f"DEBUG: Section {lbl} has {len(jlist)} jobs")

    kpi = data_store.get_kpi(operator=None, flags=flags, branches=branches, departments=departments)

    return jsonify({
        "branch": data_store.branch,
        "period": data_store.period,
        "sections": sections,
        "total": len(review_jobs),
        "kpi": kpi,
    })

@blueprint.route("/legend", methods=["GET"])
@require_auth
def get_legend():
    return jsonify({"legend": data_store.get_legend()})

@blueprint.route("/status", methods=["GET"])
@require_auth
def get_status():
    return jsonify({
        "loaded": data_store.is_loaded,
        "branch": data_store.branch,
        "period": data_store.period,
        "total_jobs": len(data_store.jobs),
        "operators": data_store.operators,
        "available_branches": data_store.available_branches,
        "available_departments": data_store.available_departments,
    })


# ── Negative Movement Endpoints ────────────────────────────────────────────────

from app.services.neg_movement_parser import parse_neg_movement_excel
from app.services.neg_movement_store import neg_movement_store
from app.services.blob_service import (
    upload_neg_movement_data, upload_neg_movement_comments,
    delete_neg_movement_data
)


@blueprint.route("/neg-movement/upload", methods=["POST"])
@require_bu_manager
def upload_neg_movement():
    if 'files' not in request.files:
        return jsonify({"error": "No files uploaded"}), 400
    
    uploaded_files = request.files.getlist('files')
    if not uploaded_files or len(uploaded_files) == 0:
        return jsonify({"error": "No files selected"}), 400
    
    for file in uploaded_files:
        if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
            continue
        
        contents = file.read()
        try:
            parsed = parse_neg_movement_excel(contents)
            neg_movement_store.load(parsed)
        except Exception as e:
            print(f"Failed to parse neg movement file {file.filename}: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400
    
    # Persist data to Azure Blob Storage
    data_to_persist = {
        "branch": neg_movement_store.branch,
        "period": neg_movement_store.period,
        "sections": neg_movement_store.sections,
    }
    upload_neg_movement_data(data_to_persist)
    
    summary = neg_movement_store.get_summary()
    
    return jsonify({
        "success": True,
        "message": f"Loaded negative movement data: {summary.get('total_jobs', 0)} total jobs",
        "branch": neg_movement_store.branch,
        "period": neg_movement_store.period,
        "summary": summary,
    })


@blueprint.route("/neg-movement/summary", methods=["GET"])
@require_auth
def get_neg_movement_summary():
    if not neg_movement_store.is_loaded:
        return jsonify({"error": "No negative movement data loaded."}), 400
    
    return jsonify({
        "branch": neg_movement_store.branch,
        "period": neg_movement_store.period,
        "summary": neg_movement_store.get_summary(),
        "pl_categories": neg_movement_store.pl_categories,
    })


@blueprint.route("/neg-movement/jobs", methods=["GET"])
@require_auth
def get_neg_movement_jobs():
    if not neg_movement_store.is_loaded:
        return jsonify({"error": "No negative movement data loaded."}), 400
    
    section = request.args.get("section")
    status_filter = request.args.get("status")
    branch_filter = request.args.get("branch")
    
    # Scope neg movement to user's allowed branches
    allowed_neg_branches = g.current_user.get_neg_movement_branches()
    if allowed_neg_branches is not None and branch_filter:
        if branch_filter not in allowed_neg_branches:
            branch_filter = None  # Reset to allowed scope
    
    jobs = neg_movement_store.get_jobs(section, status_filter, branch_filter)
    
    # Filter jobs by allowed branches if user is not elevated
    if allowed_neg_branches is not None:
        jobs = [j for j in jobs if j.get('branch', '') in allowed_neg_branches]
    
    return jsonify({
        "total": len(jobs),
        "jobs": jobs,
    })


@blueprint.route("/neg-movement/comment/<job_number>", methods=["PUT"])
@require_auth
def update_neg_movement_comment(job_number):
    if not neg_movement_store.is_loaded:
        return jsonify({"error": "No negative movement data loaded."}), 400
    
    body = request.get_json()
    if not body:
        return jsonify({"error": "Request body is required"}), 400
    
    section = body.get("section")
    if not section:
        return jsonify({"error": "'section' is required"}), 400
    
    updated = neg_movement_store.update_comment(
        job_number=job_number,
        section=section,
        comment=body.get("comment"),
        category=body.get("category"),
        notes_ho=body.get("notes_ho"),
        resolution_status=body.get("resolution_status"),
    )
    
    if updated is None:
        return jsonify({"error": f"Job '{job_number}' not found in section '{section}'"}), 404
    
    # Persist comments to Azure Blob Storage
    upload_neg_movement_comments(neg_movement_store.get_serializable_comments())
    
    return jsonify({
        "success": True,
        "job": updated,
    })


@blueprint.route("/neg-movement/overdue", methods=["GET"])
@require_auth
def get_neg_movement_overdue():
    if not neg_movement_store.is_loaded:
        return jsonify({"error": "No negative movement data loaded."}), 400
    
    hours = int(request.args.get("hours", 48))
    overdue = neg_movement_store.get_overdue_jobs(hours)
    
    return jsonify({
        "total": len(overdue),
        "jobs": overdue,
    })


@blueprint.route("/neg-movement/clear", methods=["POST"])
@require_bu_manager
def clear_neg_movement():
    neg_movement_store.clear()
    delete_neg_movement_data()
    return jsonify({
        "success": True,
        "message": "Negative movement data cleared."
    })


@blueprint.route("/neg-movement/status", methods=["GET"])
@require_auth
def get_neg_movement_status():
    return jsonify({
        "loaded": neg_movement_store.is_loaded,
        "branch": neg_movement_store.branch,
        "period": neg_movement_store.period,
        "pl_categories": neg_movement_store.pl_categories,
    })


@blueprint.route("/neg-movement/pl-categories", methods=["PUT"])
@require_settings_admin
def update_pl_categories():
    body = request.get_json()
    if not body or "categories" not in body:
        return jsonify({"error": "'categories' list is required"}), 400
    
    neg_movement_store.update_pl_categories(body["categories"])
    # Persist to blob
    upload_neg_movement_comments(neg_movement_store.get_serializable_comments())
    
    return jsonify({
        "success": True,
        "pl_categories": neg_movement_store.pl_categories,
    })

