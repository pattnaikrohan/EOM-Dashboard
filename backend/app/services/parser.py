"""
Excel Parser — reads CargoWise export and WIP Review files.

Handles two formats:
  1. CargoWise raw export (single 'Shipment Profile' sheet with report header)
  2. WIP Review output (per-operator sheets with section banners)
"""
from __future__ import annotations
import re
from datetime import datetime, date
from openpyxl import load_workbook
from io import BytesIO

from app.services.rules import get_flags, priority_flag, get_ops_section, is_export_dept


def _parse_number(val) -> float:
    """Safely parse a number, handling comma-formatted strings."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", "").replace("$", "")
    if not s or s == "-":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_date_str(val) -> str:
    """Convert a date value to DD/MM/YYYY string."""
    if val is None:
        return ""
    if isinstance(val, (datetime, date)):
        return val.strftime("%d/%m/%Y")
    return str(val).strip()


def _compute_age(val) -> int:
    """Compute days since open date."""
    if val is None:
        return 0
    today = datetime.now()
    if isinstance(val, datetime):
        return max(0, (today - val).days)
    if isinstance(val, date):
        return max(0, (today.date() - val).days)
    # Try parsing common formats
    for fmt in ("%d/%m/%Y", "%d-%b-%y", "%d-%b-%Y", "%Y-%m-%d"):
        try:
            d = datetime.strptime(str(val).strip(), fmt)
            return max(0, (today - d).days)
        except ValueError:
            continue
    return 0


def parse_wip_review(file_bytes: bytes) -> dict:
    """
    Parse a WIP Review Excel file (per-operator sheets).
    Returns { branch, period, operators: [str], jobs: [dict] }
    """
    wb = load_workbook(BytesIO(file_bytes), data_only=True, read_only=True)
    
    skip_sheets = {"Legend", "Ops Manager Review"}
    all_jobs = []
    operators = []
    branch = ""
    period = ""
    
    # ── Parse operator sheets ──────────────────────────────────────────────
    for sheet_name in wb.sheetnames:
        if sheet_name in skip_sheets:
            continue
        
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 3:
            operators.append(sheet_name)
            continue
        
        # Row 0 = title like "WIP Review - DL2 - May 2026"
        title_row = rows[0]
        title = str(title_row[0] or "") if title_row else ""
        
        # Extract period from title
        match = re.search(r"-\s*(\w+\s+\d{4})\s*$", title)
        if match and not period:
            period = match.group(1)
        
        # Row 1 = headers
        headers = [str(h or "").strip() for h in rows[1]]
        
        # Build column index map
        col_map = {}
        for idx, h in enumerate(headers):
            hl = h.lower()
            if "job number" in hl:
                col_map["job_number"] = idx
            elif "job status" in hl:
                col_map["job_status"] = idx
            elif "branch" in hl:
                col_map["branch"] = idx
            elif "department" in hl:
                col_map["department"] = idx
            elif "open date" in hl:
                col_map["open_date"] = idx
            elif "operator" in hl:
                col_map["operator"] = idx
            elif "sales rep" in hl:
                col_map["sales_rep"] = idx
            elif "local charges" in hl:
                col_map["local_charges"] = idx
            elif "overseas agent" in hl:
                col_map["overseas_agent"] = idx
            elif "revenue" in hl:
                col_map["revenue"] = idx
            elif hl == "wip":
                col_map["wip"] = idx
            elif "cost" in hl:
                col_map["cost"] = idx
            elif "accrual" in hl:
                col_map["accrual"] = idx
            elif "profit" in hl or "p/l" in hl or "profit/loss" in hl:
                col_map["profit_loss"] = idx
            elif "margin" in hl:
                col_map["margin_pct"] = idx
            elif "age" in hl:
                col_map["job_age_days"] = idx
            elif "flag" in hl:
                col_map["flags_str"] = idx
        
        operators.append(sheet_name)
        
        # Parse data rows (skip section banners)
        for row in rows[2:]:
            # Section banners have empty first cell and text in second
            job_num_idx = col_map.get("job_number", 0)
            job_num = str(row[job_num_idx] or "").strip() if row[job_num_idx] else ""
            
            # Skip empty rows and section banner rows
            if not job_num or not re.match(r'^[A-Z]\d{5,}', job_num):
                continue
            
            def _get(key: str):
                idx = col_map.get(key)
                if idx is not None and idx < len(row):
                    return row[idx]
                return None
            
            open_date_raw = _get("open_date")
            dept = str(_get("department") or "").strip()
            age_raw = _get("job_age_days")
            age = int(_parse_number(age_raw)) if age_raw is not None else _compute_age(open_date_raw)
            
            job = {
                "job_number":     job_num,
                "job_status":     str(_get("job_status") or "").strip(),
                "branch":         str(_get("branch") or "").strip(),
                "department":     dept,
                "open_date":      _parse_date_str(open_date_raw),
                "operator":       str(_get("operator") or sheet_name).strip(),
                "sales_rep":      str(_get("sales_rep") or "").strip(),
                "local_charges":  str(_get("local_charges") or "").strip(),
                "overseas_agent": str(_get("overseas_agent") or "").strip(),
                "revenue":        _parse_number(_get("revenue")),
                "wip":            _parse_number(_get("wip")),
                "cost":           _parse_number(_get("cost")),
                "accrual":        _parse_number(_get("accrual")),
                "profit_loss":    _parse_number(_get("profit_loss")),
                "margin_pct":     _parse_number(_get("margin_pct")),
                "job_age_days":   age,
                "is_export":      is_export_dept(dept),
            }
            
            # Get branch
            if job["branch"] and not branch:
                branch = job["branch"]
            
            # Compute flags from data (or use provided flags)
            flags_str = str(_get("flags_str") or "").strip()
            if flags_str:
                job["flags"] = [f.strip() for f in flags_str.split(",") if f.strip()]
            else:
                job["flags"] = get_flags(job, period)
            
            job["primary_flag"] = priority_flag(job["flags"])
            job["ops_section"] = get_ops_section(job)
            
            all_jobs.append(job)
    
    wb.close()
    
    return {
        "branch": branch or "ALL",
        "period": period or datetime.now().strftime("%B %Y"),
        "operators": operators,
        "jobs": all_jobs,
    }


def parse_cargowise_export(file_bytes: bytes) -> dict:
    """
    Parse a raw CargoWise Shipment Profile export.
    Returns same structure as parse_wip_review.
    """
    wb = load_workbook(BytesIO(file_bytes), data_only=True, read_only=True)
    
    # Find the Shipment Profile sheet
    target_sheet = None
    for name in wb.sheetnames:
        if "shipment" in name.lower() or "profile" in name.lower():
            target_sheet = name
            break
    if not target_sheet:
        target_sheet = wb.sheetnames[0]
    
    ws = wb[target_sheet]
    rows = list(ws.iter_rows(values_only=True))
    
    # Scan for header row (contains "Shipment ID" or "Job Number")
    header_idx = None
    branch = ""
    for i, row in enumerate(rows[:30]):
        row_strs = [str(c or "").strip() for c in row]
        # Check for branch
        for cell in row_strs:
            if "job branch:" in cell.lower():
                parts = cell.split(":")
                if len(parts) > 1:
                    branch = parts[1].strip().split(",")[0].strip()
        # Check for header
        if any(s.lower() in ("shipment id", "job number") for s in row_strs):
            header_idx = i
            break
    
    if header_idx is None:
        wb.close()
        return {"branch": "", "period": "", "operators": [], "jobs": []}
    
    headers = [str(h or "").strip() for h in rows[header_idx]]
    
    # Build column map using .includes() style matching
    def ci(*candidates):
        for c in candidates:
            for idx, h in enumerate(headers):
                if c.lower() in h.lower():
                    return idx
        return -1
    
    id_col     = ci("Shipment ID", "Job Number")
    dept_col   = ci("Job Dept", "Department")
    status_col = ci("Job Status")
    op_col     = ci("Job Operator", "Operator")
    branch_col = ci("Branch")
    consignor  = ci("Consignor")
    consignee  = ci("Consignee")
    origin_col = ci("Origin")
    dest_col   = ci("Destination")
    etd_col    = ci("Origin ETD", "ETD")
    eta_col    = ci("Destination ETA", "ETA")
    rev_col    = ci("Total Revenue", "Revenue")
    wip_col    = ci("Total WIP", "WIP")
    accr_col   = ci("Total Accrual", "Accrual")
    cost_col   = ci("Total Cost", "Cost")
    profit_col = ci("Job Profit", "Profit")
    
    all_jobs = []
    operators_set = set()
    
    for row in rows[header_idx + 1:]:
        if not row or not row[id_col]:
            continue
        
        job_id = str(row[id_col] or "").strip()
        if not job_id:
            continue
        
        def _g(idx):
            return row[idx] if idx >= 0 and idx < len(row) else None
        
        dept = str(_g(dept_col) or "").strip()
        op = str(_g(op_col) or "").strip()
        open_date_raw = _g(etd_col) if is_export_dept(dept) else _g(eta_col)
        
        if op:
            operators_set.add(op)
        
        job = {
            "job_number":     job_id,
            "job_status":     str(_g(status_col) or "").strip(),
            "branch":         str(_g(branch_col) or branch).strip(),
            "department":     dept,
            "open_date":      _parse_date_str(open_date_raw),
            "operator":       op,
            "sales_rep":      "",
            "local_charges":  "",
            "overseas_agent": "",
            "revenue":        _parse_number(_g(rev_col)),
            "wip":            _parse_number(_g(wip_col)),
            "cost":           _parse_number(_g(cost_col)),
            "accrual":        _parse_number(_g(accr_col)),
            "profit_loss":    _parse_number(_g(profit_col)),
            "margin_pct":     0.0,
            "job_age_days":   _compute_age(open_date_raw),
            "is_export":      is_export_dept(dept),
        }
        
        # Calculate margin
        if job["revenue"] != 0:
            job["margin_pct"] = round((job["profit_loss"] / job["revenue"]) * 100, 2)
        
        job["flags"] = get_flags(job, period if 'period' in locals() else "")
        job["primary_flag"] = priority_flag(job["flags"])
        job["ops_section"] = get_ops_section(job)
        
        all_jobs.append(job)
    
    wb.close()
    
    return {
        "branch": branch or "ALL",
        "period": datetime.now().strftime("%B %Y"),
        "operators": sorted(operators_set),
        "jobs": all_jobs,
    }


def parse_excel(file_bytes: bytes, filename: str = "") -> dict:
    """Auto-detect format and parse."""
    fn = filename.lower()
    if "wip_review" in fn or "wip review" in fn:
        return parse_wip_review(file_bytes)
    
    # Try to detect by checking sheet names
    wb = load_workbook(BytesIO(file_bytes), read_only=True)
    sheet_names = wb.sheetnames
    wb.close()
    
    # If it has a "Shipment Profile" sheet, it's CargoWise
    if any("shipment" in s.lower() for s in sheet_names):
        return parse_cargowise_export(file_bytes)
    
    # If it has named operator sheets (2-3 char codes), treat as WIP Review
    if any(len(s) <= 4 and s.isalnum() for s in sheet_names):
        return parse_wip_review(file_bytes)
    
    # Default to CargoWise
    return parse_cargowise_export(file_bytes)
