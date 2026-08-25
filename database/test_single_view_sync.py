import sys
import os
import time
from collections import defaultdict
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection
from app.services.staff_lookup import OPERATOR_NAMES, normalize_branch_name

def test_fetch_from_single_view():
    print("Testing single-view sync using PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED...")
    t0 = time.time()
    conn = get_connection()
    cur = conn.cursor()
    
    # Query the single view
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_STATUS,
            JOB_BRANCH_NAME,
            JOB_BRANCH_CODE,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            JOB_DIRECTION,
            JOB_OPENED_DATE,
            OPERATOR_FULLNAME,
            OPERATOR_FRIENDLY_NAME,
            OPERATOR_CODE,
            SALES_REP_FULLNAME,
            SALES_REP_CODE,
            LOCAL_CLIENT_NAME,
            LOCAL_CLIENT_CODE,
            AGENT_ORG_NAME,
            AGENT_ORG_CODE,
            SHIPMENT_ORIGIN,
            SHIPMENT_DESTINATION,
            SHIPMENT_ETD,
            SHIPMENT_ETA,
            DECLARATION_ORIGIN,
            DECLARATION_FINAL_DEST,
            DECLARATION_EXPORT_DATE,
            DECLARATION_ARRIVAL_DATE,
            CHARGE_DESCRIPTION,
            CHARGECODE,
            SELL_LOCAL_AMT,
            COST_LOCAL_AMT,
            IS_WIP_COST,
            IS_ACCRUED_REVENUE,
            COST_CREDITOR_ACCOUNT_NAME,
            SELL_DEBTOR_ACCOUNT_NAME,
            COST_GST,
            SELL_GST,
            COST_AP_POSTING_STATUS,
            SELL_AR_POSTING_STATUS
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
    """)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    fetch_time = time.time() - t0
    print(f"Fetched {len(rows):,} charge rows in {fetch_time:.2f}s")
    
    t1 = time.time()
    # Group by job
    jobs_map = {}
    for r in rows:
        row = dict(zip(cols, r))
        job_num = row["JOB_NUMBER"]
        if not job_num:
            continue
            
        if job_num not in jobs_map:
            direction = row.get("JOB_DIRECTION") or ""
            is_export = direction.strip().upper() in ('EXP', 'E')
            
            etd = row.get("SHIPMENT_ETD") or row.get("DECLARATION_EXPORT_DATE") or ""
            eta = row.get("SHIPMENT_ETA") or row.get("DECLARATION_ARRIVAL_DATE") or ""
            origin = row.get("SHIPMENT_ORIGIN") or row.get("DECLARATION_ORIGIN") or ""
            dest = row.get("SHIPMENT_DESTINATION") or row.get("DECLARATION_FINAL_DEST") or ""
            
            # Cross-trade logic: if origin and dest both non-empty and don't start with AU
            is_cross = False
            if origin and dest and not origin.startswith('AU') and not dest.startswith('AU'):
                is_cross = True
            
            op_raw = row.get("OPERATOR_FRIENDLY_NAME") or row.get("OPERATOR_FULLNAME") or row.get("OPERATOR_CODE") or "Unknown Operator"
            op_name = OPERATOR_NAMES.get(op_raw, op_raw)
            
            branch_raw = row.get("JOB_BRANCH_NAME") or row.get("JOB_BRANCH_CODE") or ""
            branch_name = normalize_branch_name(branch_raw)
            
            dept_code = row.get("JOB_DEPARTMENT_CODE") or direction
            
            jobs_map[job_num] = {
                "job_number": job_num,
                "job_status": row.get("JOB_STATUS") or "",
                "branch": branch_name,
                "department": dept_code,
                "department_name": row.get("JOB_DEPARTMENT_DESCRIPTION") or "",
                "open_date": row.get("JOB_OPENED_DATE") or "",
                "operator": op_name,
                "sales_rep": row.get("SALES_REP_FULLNAME") or row.get("SALES_REP_CODE") or "",
                "local_client": row.get("LOCAL_CLIENT_NAME") or row.get("LOCAL_CLIENT_CODE") or "",
                "overseas_agent": row.get("AGENT_ORG_NAME") or row.get("AGENT_ORG_CODE") or "",
                "origin": origin,
                "destination": dest,
                "revenue": 0.0,
                "wip": 0.0,
                "cost": 0.0,
                "accrual": 0.0,
                "profit_loss": 0.0,
                "margin_pct": 0.0,
                "job_age_days": 0,
                "is_export": is_export,
                "is_cross_trade": is_cross,
                "etd": etd,
                "eta": eta,
                "job_direction": direction,
                "source_type": "snowflake",
                "charge_lines": []
            }
            
        j = jobs_map[job_num]
        sell = float(row.get("SELL_LOCAL_AMT") or 0.0)
        cost = float(row.get("COST_LOCAL_AMT") or 0.0)
        is_wip = bool(row.get("IS_WIP_COST"))
        is_accrual = bool(row.get("IS_ACCRUED_REVENUE"))
        
        j["revenue"] += sell
        j["cost"] += cost
        if is_wip:
            j["wip"] += cost
        if is_accrual:
            j["accrual"] += sell
            
        j["charge_lines"].append({
            "description": row.get("CHARGE_DESCRIPTION") or "",
            "charge_code": row.get("CHARGECODE") or "",
            "sell_amt": sell,
            "cost_amt": cost,
            "is_wip": is_wip,
            "is_accrual": is_accrual,
            "creditor": row.get("COST_CREDITOR_ACCOUNT_NAME") or "",
            "debtor": row.get("SELL_DEBTOR_ACCOUNT_NAME") or "",
            "cost_gst": row.get("COST_GST") or "",
            "sell_gst": row.get("SELL_GST") or "",
        })

    for j in jobs_map.values():
        j["revenue"] = round(j["revenue"], 2)
        j["cost"] = round(j["cost"], 2)
        j["wip"] = round(j["wip"], 2)
        j["accrual"] = round(j["accrual"], 2)
        j["profit_loss"] = round(j["revenue"] - j["cost"], 2)
        if j["revenue"] != 0:
            j["margin_pct"] = round((j["profit_loss"] / j["revenue"]) * 100, 2)
        else:
            j["margin_pct"] = 0.0

    process_time = time.time() - t1
    print(f"Processed into {len(jobs_map):,} unique jobs in {process_time:.2f}s")
    print(f"Total end-to-end time: {time.time() - t0:.2f}s")

    # Sample output
    sample_jobs = list(jobs_map.values())[:3]
    for sj in sample_jobs:
        print(f"\nJob {sj['job_number']} ({sj['branch']}, Dept: {sj['department']}):")
        print(f"  Status: {sj['job_status']}, Operator: {sj['operator']}, Client: {sj['local_client']}")
        print(f"  Revenue: ${sj['revenue']:,.2f}, Cost: ${sj['cost']:,.2f}, Profit: ${sj['profit_loss']:,.2f}, WIP: ${sj['wip']:,.2f}, Accrual: ${sj['accrual']:,.2f}")
        print(f"  Total charge lines: {len(sj['charge_lines'])}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    test_fetch_from_single_view()
