import snowflake.connector
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import os
import time

from app.services.staff_lookup import OPERATOR_NAMES, BRANCH_NAMES, normalize_branch_name

SF_ACCOUNT   = os.environ.get("SF_ACCOUNT", "SGLYREN-GG43054")
SF_USER      = os.environ.get("SF_USER", "TEST_AI_AUTO")
SF_WAREHOUSE = os.environ.get("SF_WAREHOUSE", "PROD_COMPUTE_WH")
SF_ROLE      = os.environ.get("SF_ROLE", "PROD_ENGINEER")

# Thread-safe global progress dictionary
sync_progress = {
    "status": "idle",
    "stage": "Ready",
    "percent": 100,
    "current": 0,
    "total": 0,
    "message": ""
}

def update_sync_progress(stage: str, percent: int, current: int = 0, total: int = 0, status: str = "running", message: str = ""):
    sync_progress["status"] = status
    sync_progress["stage"] = stage
    sync_progress["percent"] = max(0, min(100, percent))
    sync_progress["current"] = current
    sync_progress["total"] = total
    sync_progress["message"] = message


PRIVATE_KEY_PEM = """-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDFkLT/bHavGuUi
y/7e+nae+Pyitn5Y7ZFpct73cZnGK18+YD7MnexY4vYFNgb7Io9GEEnPUcUk0N0a
HzUwUcHMey/tMRxDzGB2mj3Vqgr1HkwEpwckOjnJiqoo29IqNcFSzGhCTnuBQAS9
u1y49pRiXXBQNzHN2m1CP/CTI6MlL0l/QZ4osQhBb41avjcl3c0iQzn/OxGvUaUf
cF30cWQWiv3fQ8lXf29/uA8UIWF1Wp/O2bEJgqF6BX1tGcml2QrkZBgIdURJpYgg
CccywefO2MkfIf7vzttcWSA2dByn8ImmcBo1t2dIfaERa+ZNGNfEcGFEpBGGo0F4
uGHHZGHPAgMBAAECggEAHUT1tmxt85NFzy9EcJR6w81E4HZY/E519Ja9dxCwJNkt
dc2cgC6wDUXSslhGwH4Q6+MN4avOS/Na+REWjYoPRClxTZqxAqUMxYV5vmXq1FXL
aAUMMc8j2zqylaBmNTVcPCq8Z4ETxcT47thglvvbupb372ponoQgcRLipBSWNF6B
9PegOKGhGeJ1APb693Lr9hkFvM8mq/usoQMe1sLvc+AbSV7O0Sd7fs0bn9TkWaxC
VA1QyiVtCBspfwtEuXpByrshgxbkfszC0R3mGn+Ojcpihbk+/s7mfdH+Ep72QPN6
IFg0SOHUA4HwR6RkDsPLdX4oSccaRropYP3mTYD1QQKBgQD+JGx06OzX6AOsuLas
OhcXVFw2rZ5kggFnzTksRSXBwJBINDclK+Ah4Lq6jbqap84pzOPJe2Xyx1nQ6b6q
VqYO/tcVN3BgpHxxNOc1YvSIEeP2gy97AuVzD+5bFvgF7x5Bml4mgRQIb0uYfEby
b0UKlGxodyelt7MWF8tNRBTkbQKBgQDHAmkrEgQOJ/g/CjHWDcqywQt5JVQGP3ZC
5Im+C37v/WZge77fg2oYpv0yJ1QIuLiCp8MDRYdLahru0/JUsL8Yu6gb9tXc0MpE
vxoVJBiCDJfdOSHZs+AOmUDnLBQBoZLHxUbGC6ltwRALSHQGRmH7EPdN4UJg5awJ
MehRT9zhqwKBgQDiq/AEMkAUrj6gzjs3z7QKvdZlemM8t+uy/osQ3je34R2PGOta
fxCwhrVlcMXP7P1nsPQ2H5alfIKyX9kMKq5/z3Jc3Q6hU/QeMJZLuo/p0TMnCojN
yZ6HCt2IZysed9DfqGRzKUuJ3mJphebtkqrcrdcnMaeuGfNkMCLHLoMH3QKBgQC5
AS+9n4DvnA62pAaSZL3kEXxWAfKr4EFTjFvUtaEq/5o15bQa23M9Obg18MO5W+gD
ZmvvVaqh3CDvl083lhwApStx27UTE3KGGFXqA2VZONXRDbS/Su3nBGeGwL5Uid0H
JAlYQS0f4BPHOXLLBpE9spcE6n0n0TtuTNwZAzJnAwKBgGnb/uagqCameqnDoVrw
RKdz/6DLX6Ul3ql5FU/KH9zKH5yKa8arOONJKqggrF920vaLZuArAMNL7e1KSbMv
FY+Se1JzkprZUnYRrZDyJy1xUzfpPmfHdXJcr+7qNXWUgvVEP5pGR38YSjA6MDac
8QOHXsEQQry1/656UObS4Nvl
-----END PRIVATE KEY-----"""

def get_connection():
    p_key = serialization.load_pem_private_key(
        PRIVATE_KEY_PEM.encode(), password=None, backend=default_backend())
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption())
    return snowflake.connector.connect(
        account=SF_ACCOUNT, user=SF_USER, private_key=pkb,
        warehouse=SF_WAREHOUSE, role=SF_ROLE)

def fetch_jobs_from_snowflake():
    # Directly query the pre-compiled Snowflake View in PROD.AI_AUTO schema
    select_query = "SELECT * FROM PROD.AI_AUTO.VW_EOM_JOBS_SUMMARY"
    
    update_sync_progress("Connecting to Snowflake Database...", 10)
    conn = get_connection()
    cur = conn.cursor()
    
    update_sync_progress("Querying Snowflake View PROD.AI_AUTO.VW_EOM_JOBS_SUMMARY...", 25)
    print("Fetching jobs from PROD.AI_AUTO.VW_EOM_JOBS_SUMMARY (Live)...")
    try:
        cur.execute(select_query)
    except Exception as view_err:
        print(f"Direct view query warning ({view_err}). Falling back to local CTE file...")
        current_dir = os.path.dirname(os.path.abspath(__file__))
        sql_file = os.path.join(current_dir, 'VW_EOM_JOB_CHARGES.sql')
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read().replace('\r\n', '\n')
        if 'CREATE OR REPLACE VIEW DEV.CORE.VW_EOM_JOBS_SUMMARY\nAS\n' in sql_content:
            query_parts = sql_content.split('CREATE OR REPLACE VIEW DEV.CORE.VW_EOM_JOBS_SUMMARY\nAS\n')
            select_query = query_parts[1].strip().rstrip(';')
        else:
            idx = sql_content.find('SELECT')
            select_query = sql_content[idx:].strip().rstrip(';')
        cur.execute(select_query)
    
    cols = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    total_rows = len(rows)
    update_sync_progress(f"Parsing CargoWise records (0 / {total_rows:,})", 30, current=0, total=total_rows)
    
    jobs = []
    branches = set()
    operators = set()
    
    step = max(200, total_rows // 50)
    for idx, row in enumerate(rows, 1):
        if idx % step == 0 or idx == total_rows:
            pct = 30 + int((idx / total_rows) * 65)
            update_sync_progress(f"Parsing CargoWise records ({idx:,} / {total_rows:,})", pct, current=idx, total=total_rows)

        job_data = dict(zip(cols, row))
        
        job_direction = job_data.get("JOB_DIRECTION") or ""
        is_cross_trade = job_data.get("IS_CROSS_TRADE", False)
        
        is_export = (job_direction.strip().upper() in ('EXP', 'E'))
        is_domestic = (job_direction.strip().upper() == 'DOM')
        
        # VW_EOM_JOBS_SUMMARY date columns
        open_date = job_data.get("JOB_OPENED_DATE")
        etd = job_data.get("ROUTING_ETD")
        eta = job_data.get("ROUTING_ETA")
        
        op_raw = job_data.get("OPERATOR_NAME") or job_data.get("OPERATOR_CODE") or ""
        op_name = OPERATOR_NAMES.get(op_raw, op_raw)
        
        branch_raw = job_data.get("BRANCH_NAME") or job_data.get("BRANCH_CODE") or ""
        branch_name = normalize_branch_name(branch_raw)

        job = {
            "job_number":     job_data.get("JOB_NUMBER", ""),
            "job_status":     job_data.get("JOB_STATUS", ""),
            "branch":         branch_name,
            "department":     job_direction, # Treat JOB_DIRECTION as the "department" for the rules engine
            "open_date":      open_date.strftime('%Y-%m-%d') if hasattr(open_date, 'strftime') else open_date,
            "operator":       job_data.get("OPERATOR_NAME") or job_data.get("OPERATOR_CODE") or "Unknown Operator",
            "sales_rep":      job_data.get("SALES_REP_NAME") or job_data.get("SALES_REP_CODE") or "",
            "local_client":   job_data.get("LOCAL_CLIENT_NAME") or job_data.get("LOCAL_CLIENT_CODE") or "",
            "local_charges":  "",
            "overseas_agent": job_data.get("OVERSEAS_AGENT_NAME") or job_data.get("OVERSEAS_AGENT_CODE") or "",
            "origin":         job_data.get("ORIGIN_COUNTRY") or "",
            "destination":    job_data.get("DEST_COUNTRY") or "",
            "revenue":        float(job_data.get("TOTAL_REVENUE") or 0.0),
            "wip":            float(job_data.get("TOTAL_WIP") or 0.0),
            "cost":           float(job_data.get("TOTAL_COST") or 0.0),
            "accrual":        float(job_data.get("TOTAL_ACCRUAL") or 0.0),
            "profit_loss":    float(job_data.get("PROFIT_LOSS") or 0.0),
            "margin_pct":     float(job_data.get("MARGIN_PCT") or 0.0),
            "job_age_days":   int(job_data.get("JOB_AGE_DAYS") or 0),
            "is_export":      is_export,
            "is_cross_trade": is_cross_trade,
            "etd":            etd.strftime('%Y-%m-%d') if hasattr(etd, 'strftime') else etd,
            "eta":            eta.strftime('%Y-%m-%d') if hasattr(eta, 'strftime') else eta,
            "job_direction":  job_direction,
            "source_type":    "snowflake",
        }
        
        jobs.append(job)
        if job["branch"]: branches.add(job["branch"])
        if job["operator"]: operators.add(job["operator"])
        
    cur.close()
    conn.close()
    
    update_sync_progress("Synchronization Complete", 100, current=total_rows, total=total_rows, status="completed")

    return {
        "jobs": jobs,
        "branch": "All Branches (Snowflake)" if len(branches) > 1 else list(branches)[0] if branches else "Unknown",
        "period": "Current (Snowflake)",
        "operators": sorted(list(operators))
    }
