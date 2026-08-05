import snowflake.connector
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import os

SF_ACCOUNT   = os.environ.get("SF_ACCOUNT", "SGLYREN-GG43054")
SF_USER      = os.environ.get("SF_USER", "TEST_AI_AUTO")
SF_WAREHOUSE = os.environ.get("SF_WAREHOUSE", "PROD_COMPUTE_WH")
SF_ROLE      = os.environ.get("SF_ROLE", "PROD_ENGINEER")

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
    # Because we don't have CREATE VIEW permissions in PROD.CORE, we run the raw CTE logic here.
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sql_file = os.path.join(current_dir, 'VW_EOM_JOB_CHARGES.sql')
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Extract the VW_EOM_JOBS_SUMMARY CTE
    query_parts = sql_content.split('CREATE OR REPLACE VIEW DEV.CORE.VW_EOM_JOBS_SUMMARY\nAS\n')
    if len(query_parts) < 2:
        raise Exception("Could not parse SQL file")
    
    select_query = query_parts[1].strip().rstrip(';')
    
    conn = get_connection()
    cur = conn.cursor()
    
    print("Fetching jobs from Snowflake (Live)...")
    cur.execute(select_query)
    
    cols = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    
    jobs = []
    branches = set()
    operators = set()
    
    for row in rows:
        job_data = dict(zip(cols, row))
        
        job_direction = job_data.get("JOB_DIRECTION") or ""
        is_cross_trade = job_data.get("IS_CROSS_TRADE", False)
        
        is_export = (job_direction.strip().upper() in ('EXP', 'E'))
        is_domestic = (job_direction.strip().upper() == 'DOM')
        
        # VW_EOM_JOBS_SUMMARY date columns
        open_date = job_data.get("JOB_OPENED_DATE")
        etd = job_data.get("ROUTING_ETD")
        eta = job_data.get("ROUTING_ETA")
        
        branch_name = job_data.get("BRANCH_NAME") or job_data.get("BRANCH_CODE")
        if not branch_name:
            job_num = (job_data.get("JOB_NUMBER") or "").upper()
            # Map job number prefix → branch name
            # Check 2-char prefixes first (AK before A) for disambiguation
            _prefix_map_2 = {
                "AK": "AAW Global Logistics - Auckland",
                "CB": "Coastalbridge",
                "BL": "AAW Bulk Liquid Logistics Team",
                "PR": "AAW Project Logistics",
                "PI": "PIL Logistics Australia",
            }
            _prefix_map_1 = {
                "S":  "AAW Global Logistics - Sydney",
                "B":  "AAW Global Logistics - Brisbane",
                "V":  "AAW Global Logistics - Melbourne",
                "M":  "AAW Global Logistics - Melbourne",
                "F":  "AAW Global Logistics - Fremantle",
                "A":  "AAW Global Logistics - Adelaide",
                "N":  "AAW Global Logistics - Auckland",
                "P":  "AAW Project Logistics",
                "C":  "AAW Customs Brokerage",
                "H":  "AAW Group Holdings",
            }
            prefix2 = job_num[:2] if len(job_num) >= 2 else ""
            branch_name = _prefix_map_2.get(prefix2) or _prefix_map_1.get(job_num[:1], "AAW Global Logistics - Unknown")

                
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
    
    return {
        "jobs": jobs,
        "branch": "All Branches (Snowflake)" if len(branches) > 1 else list(branches)[0] if branches else "Unknown",
        "period": "Current (Snowflake)",
        "operators": sorted(list(operators))
    }
