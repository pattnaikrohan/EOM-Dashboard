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
        warehouse=SF_WAREHOUSE, role=SF_ROLE, database="PROD", schema="CORE")

def _fmt_date(val):
    """Convert a Snowflake datetime/date to 'DD-MM-YYYY' string, or return as-is."""
    if val is None:
        return ""
    if hasattr(val, 'strftime'):
        return val.strftime('%d-%m-%Y')
    s = str(val).strip()
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        return f"{s[8:10]}-{s[5:7]}-{s[0:4]}"
    return s


def fetch_jobs_from_snowflake():
    """
    Fetch charge-level data from VW_EOM_JOB_CHARGES_UPDATED_V3 and aggregate
    into job-level records for the dashboard rules engine.
    
    This single view replaces both VW_EOM_JOB_CHARGES and VW_EOM_JOBS_SUMMARY.
    """
    from datetime import datetime, timezone

    update_sync_progress("Connecting to Snowflake Database...", 5)
    conn = get_connection()
    cur = conn.cursor()

    # ── Step 1: Fetch charge rows from the single unified view ────────────
    select_query = """
        SELECT
            JOB_NUMBER,
            JOB_STATUS,
            JOB_TYPE,
            JOB_DIRECTION,
            JOB_OPENED_DATE,
            JOB_CLOSED_DATE,
            JOB_AGE_DAYS,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            JOB_COMPANY_CODE,
            JOB_COMPANY_NAME,
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
            SELL_LOCAL_AMT,
            COST_LOCAL_AMT,
            IS_WIP_COST,
            IS_ACCRUED_REVENUE,
            WIP_RECOGNITION_DATE,
            WIP_AGE_DAYS,
            CHARGE_DESCRIPTION,
            CHARGECODE,
            CHARGECODE_DESC,
            COST_CREDITOR_ACCOUNT_NAME,
            SELL_DEBTOR_ACCOUNT_NAME,
            COST_GST,
            SELL_GST,
            COST_AP_POSTING_STATUS,
            SELL_AR_POSTING_STATUS
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED_V3
    """

    update_sync_progress("Querying Snowflake View (charge-level)...", 10)
    print("Fetching charges from PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED_V3 (Live)...")
    cur.execute(select_query)

    cols = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    total_rows = len(rows)
    print(f"Fetched {total_rows:,} charge rows from Snowflake.")

    # ── Step 1b: Fetch unposted accruals detail from ACCTRANSACTIONLINES ───────
    update_sync_progress("Fetching unposted accruals detail...", 25)
    print("Fetching unposted accruals detail from ACCTRANSACTIONLINES...")
    try:
        cur.execute("""
            WITH al_dedup AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY AL_PK
                         ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST) AS _rn
                FROM PROD.CORE.ACCTRANSACTIONLINES_DEDUP
            ),
            al AS (
                SELECT * FROM al_dedup 
                WHERE _rn = 1
                  AND AL_LINETYPE = 'ACR'
                  AND (AL_REVERSEDATE IS NULL OR AL_REVERSEDATE = '1900-01-01 00:00:00')
                  AND (AL_REVERSETOGL IS NULL OR AL_REVERSETOGL = 'N')
            ),
            jh_dedup AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY JH_PK
                         ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST) AS _rn
                FROM PROD.CORE.JOBHEADER_DEDUP
                WHERE JH_PARENTTABLECODE IN ('JS','JE')
            ),
            jh AS (SELECT * FROM jh_dedup WHERE _rn = 1),
            ac_dedup AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY AC_PK 
                         ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST) AS _rn
                FROM PROD.CORE.ACCCHARGECODE_DEDUP
            ),
            ac AS (SELECT * FROM ac_dedup WHERE _rn = 1),
            oh_dedup AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY OH_PK 
                         ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST) AS _rn
                FROM PROD.CORE.ORGHEADER_DEDUP
            ),
            oh AS (SELECT * FROM oh_dedup WHERE _rn = 1)
            SELECT 
                jh.JH_JOBNUM,
                ac.AC_CODE,
                al.AL_DESC,
                oh.OH_CODE,
                oh.OH_FULLNAME,
                al.AL_LINEAMOUNT,
                al.AL_POSTDATE,
                DATEDIFF('day', al.AL_POSTDATE, CURRENT_DATE()) AS AGE_DAYS
            FROM al
            JOIN jh ON al.AL_JH = jh.JH_PK
            LEFT JOIN ac ON al.AL_AC = ac.AC_PK
            LEFT JOIN oh ON al.AL_OH = oh.OH_PK
        """)
        accrual_rows = cur.fetchall()
        job_accruals = {}
        for jnum, code, desc, oh_code, oh_name, amt, postdate, age in accrual_rows:
            if not jnum:
                continue
            if jnum not in job_accruals:
                job_accruals[jnum] = []
            job_accruals[jnum].append({
                "charge_code": code or desc or "",
                "creditor": oh_name or oh_code or "",
                "os_cur": "",
                "os_amount": 0.0,
                "ex_rate": 1.0,
                "cost_local": float(amt or 0),
                "has_acr": "Y",
                "acr_recognised": _fmt_date(postdate),
                "age_days": int(age or 0)
            })
        print(f"Loaded active accrual details for {len(job_accruals):,} jobs.")

        # Also fetch confirmed ledger financials (REV & CST) from CargoWise General Ledger (ACCTRANSACTIONLINES)
        cur.execute("""
            WITH al_dedup AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY AL_PK
                         ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST) AS _rn
                FROM PROD.CORE.ACCTRANSACTIONLINES_DEDUP
            ),
            al AS (SELECT * FROM al_dedup WHERE _rn = 1),
            jh_dedup AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY JH_PK
                         ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST) AS _rn
                FROM PROD.CORE.JOBHEADER_DEDUP
                WHERE JH_PARENTTABLECODE IN ('JS','JE')
            ),
            jh AS (SELECT * FROM jh_dedup WHERE _rn = 1)
            SELECT 
                jh.JH_JOBNUM,
                SUM(CASE WHEN al.AL_LINETYPE = 'REV' THEN al.AL_LINEAMOUNT ELSE 0 END) AS CONFIRMED_REV,
                SUM(CASE WHEN al.AL_LINETYPE = 'CST' THEN ABS(al.AL_LINEAMOUNT) ELSE 0 END) AS CONFIRMED_COST,
                COUNT(CASE WHEN al.AL_LINETYPE = 'REV' THEN 1 END) AS REV_COUNT,
                COUNT(CASE WHEN al.AL_LINETYPE = 'CST' THEN 1 END) AS CST_COUNT
            FROM al
            JOIN jh ON al.AL_JH = jh.JH_PK
            WHERE al.AL_LINETYPE IN ('REV', 'CST')
            GROUP BY jh.JH_JOBNUM
        """)
        job_confirmed_ledger = {}
        for jnum, c_rev, c_cost, r_cnt, c_cnt in cur.fetchall():
            if jnum:
                job_confirmed_ledger[jnum] = {
                    "rev": float(c_rev or 0),
                    "cost": float(c_cost or 0),
                    "rev_count": r_cnt,
                    "cst_count": c_cnt
                }
        print(f"Loaded confirmed ledger financials for {len(job_confirmed_ledger):,} jobs.")
    except Exception as e:
        print(f"Warning: could not fetch job_accruals or confirmed ledger: {e}")
        job_accruals = {}
        job_confirmed_ledger = {}

    update_sync_progress(f"Grouping {total_rows:,} charges into jobs...", 30, current=0, total=total_rows)

    # ── Step 2: Group charge rows by job and aggregate ────────────────────
    jobs_map = {}
    now = datetime.now()

    step = max(500, total_rows // 40)
    for idx, raw_row in enumerate(rows, 1):
        if idx % step == 0 or idx == total_rows:
            pct = 30 + int((idx / total_rows) * 55)
            update_sync_progress(f"Processing charges ({idx:,} / {total_rows:,})", pct, current=idx, total=total_rows)

        row = dict(zip(cols, raw_row))
        job_num = row.get("JOB_NUMBER")
        if not job_num:
            continue

        # First time seeing this job — initialise the job record
        if job_num not in jobs_map:
            direction = (row.get("JOB_DIRECTION") or "").strip().upper()
            is_export = direction in ('EXP', 'E')

            # Coalesce routing: Shipment takes priority over Declaration
            origin = row.get("SHIPMENT_ORIGIN") or row.get("DECLARATION_ORIGIN") or ""
            dest = row.get("SHIPMENT_DESTINATION") or row.get("DECLARATION_FINAL_DEST") or ""
            etd = row.get("SHIPMENT_ETD") or row.get("DECLARATION_EXPORT_DATE")
            eta = row.get("SHIPMENT_ETA") or row.get("DECLARATION_ARRIVAL_DATE")

            # Cross-trade: both origin & dest are non-AU
            is_cross_trade = False
            if origin and dest:
                origin_country = origin[:2].upper()
                dest_country = dest[:2].upper()
                if origin_country != 'AU' and dest_country != 'AU':
                    is_cross_trade = True

            # Operator name resolution
            op_raw = row.get("OPERATOR_FRIENDLY_NAME") or row.get("OPERATOR_FULLNAME") or row.get("OPERATOR_CODE") or ""
            op_name = OPERATOR_NAMES.get(op_raw, op_raw) or "Unknown Operator"

            # Branch name resolution (Option 2: Job booking branch)
            branch_raw = row.get("JOB_BRANCH_NAME") or row.get("JOB_BRANCH_CODE") or ""
            branch_name = normalize_branch_name(branch_raw)

            # Department: use the department code from the view (not direction)
            dept_code = row.get("JOB_DEPARTMENT_CODE") or direction

            open_date = row.get("JOB_OPENED_DATE")

            jobs_map[job_num] = {
                "job_number":     job_num,
                "job_status":     row.get("JOB_STATUS") or "",
                "branch":         branch_name,
                "department":     dept_code,
                "department_name": row.get("JOB_DEPARTMENT_DESCRIPTION") or "",
                "open_date":      _fmt_date(open_date),
                "operator":       op_name,
                "sales_rep":      row.get("SALES_REP_FULLNAME") or row.get("SALES_REP_CODE") or "",
                "local_client":   row.get("SELL_DEBTOR_ACCOUNT_NAME") or row.get("LOCAL_CLIENT_NAME") or row.get("LOCAL_CLIENT_CODE") or "",
                "local_charges":  "",
                "overseas_agent": row.get("AGENT_ORG_NAME") or row.get("AGENT_ORG_CODE") or "",
                "origin":         origin[:2].upper() if origin else "",
                "destination":    dest[:2].upper() if dest else "",
                "revenue":        0.0,
                "wip":            0.0,
                "cost":           0.0,
                "accrual":        0.0,
                "profit_loss":    0.0,
                "margin_pct":     0.0,
                "job_age_days":   int(row.get("JOB_AGE_DAYS") or 0),
                "is_export":      is_export,
                "is_cross_trade": is_cross_trade,
                "etd":            _fmt_date(etd),
                "eta":            _fmt_date(eta),
                "job_direction":  direction,
                "source_type":    "snowflake",
                # Aged accrual tracking (from WIP_AGE_DAYS, only valid on WIP/accrual rows)
                "has_aged_accruals": False,
                "_acr_age_days": 0,
                "accrual_lines": [],
            }

        # ── Accumulate charge-level financials ────────────────────────────
        j = jobs_map[job_num]
        charge_desc = str(row.get("CHARGE_DESCRIPTION") or "").strip().upper()

        # In CargoWise, REV/WIP ADJUSTMENT lines are internal accounting WIP/revenue journal revaluations,
        # not operating job billing charges. Excluding them aligns Job Profit and Cost with CargoWise Job Costing totals.
        if charge_desc.startswith("REV/WIP ADJUSTMENT"):
            continue

        sell = float(row.get("SELL_LOCAL_AMT") or 0.0)
        cost = float(row.get("COST_LOCAL_AMT") or 0.0)
        is_wip = bool(row.get("IS_WIP_COST"))
        is_accrual = bool(row.get("IS_ACCRUED_REVENUE"))

        # Prefer SELL_DEBTOR_ACCOUNT_NAME for client code if available on any charge
        debtor_name = row.get("SELL_DEBTOR_ACCOUNT_NAME")
        if debtor_name:
            j["local_client"] = debtor_name

        j["revenue"] += sell
        j["cost"] += cost
        if is_wip:
            j["wip"] += cost
        if is_accrual:
            j["accrual"] += sell

        # Track max WIP/accrual age — ONLY from rows that are actual WIP or accrual charges
        # to avoid sentinel values (46257 days from 1900-01-01 defaults on non-WIP rows)
        if is_wip or is_accrual:
            wip_age = int(row.get("WIP_AGE_DAYS") or 0)
            if wip_age > 0 and wip_age < 36500:  # Filter out sentinel values (>100 years)
                if wip_age > j["_acr_age_days"]:
                    j["_acr_age_days"] = wip_age

            # Collect accrual line detail for dropdown expand
            wip_rec_date = row.get("WIP_RECOGNITION_DATE")
            j["accrual_lines"].append({
                "charge_code": row.get("CHARGECODE") or row.get("CHARGECODE_DESC") or "",
                "creditor": row.get("COST_CREDITOR_ACCOUNT_NAME") or "",
                "os_cur": "",
                "os_amount": 0.0,
                "ex_rate": 1.0,
                "cost_local": cost,
                "has_acr": "Y" if is_accrual else "N",
                "acr_recognised": _fmt_date(wip_rec_date) if wip_rec_date and hasattr(wip_rec_date, 'strftime') and wip_rec_date.year > 1900 else "",
                "age_days": wip_age if (wip_age > 0 and wip_age < 36500) else 0,
            })

    # ── Step 3: Finalise computed fields ──────────────────────────────────
    update_sync_progress("Finalising job calculations...", 90, current=total_rows, total=total_rows)

    jobs = []
    branches = set()
    operators = set()

    for jnum, j in jobs_map.items():
        is_closed = str(j.get("job_status", "")).strip().upper() in ("CLS", "CLOSED")
        
        # Authoritative accrual lines override from ACCTRANSACTIONLINES (only for non-closed jobs)
        if not is_closed and jnum in job_accruals and job_accruals[jnum]:
            j["accrual_lines"] = job_accruals[jnum]
            total_acr = sum(item["cost_local"] for item in job_accruals[jnum])
            max_acr_age = max((item["age_days"] for item in job_accruals[jnum]), default=0)
            if j["accrual"] == 0:
                j["accrual"] = round(total_acr, 2)
            j["_acr_age_days"] = max_acr_age
        elif is_closed:
            j["accrual_lines"] = []
            j["accrual"] = 0.0
            j["_acr_age_days"] = 0

        # Apply confirmed accounting ledger transactions from ACCTRANSACTIONLINES
        # when confirmed revenue/cost exist (prevents re-rated/deleted ghost charges in JOBCHARGE from corrupting P&L)
        if jnum in job_confirmed_ledger:
            c_ledger = job_confirmed_ledger[jnum]
            if c_ledger["rev_count"] > 0:
                j["revenue"] = c_ledger["rev"]
            if c_ledger["cst_count"] > 0 and (is_closed or str(j.get("job_status", "")).strip().upper() in ("CMP", "CLS", "CLOSED")):
                j["cost"] = c_ledger["cost"]

        j["revenue"] = round(j["revenue"], 2)
        j["cost"] = round(j["cost"], 2)
        j["wip"] = round(j["wip"], 2)
        j["accrual"] = round(j["accrual"], 2)
        j["profit_loss"] = round(j["revenue"] - j["cost"], 2)
        if j["revenue"] != 0:
            j["margin_pct"] = round((j["profit_loss"] / j["revenue"]) * 100, 2)

        # Aged accruals: job must have outstanding accruals AND
        # accrual/WIP age must be >= 90 days old (never for closed jobs)
        if not is_closed and (abs(j["accrual"]) > 0 or len(j.get("accrual_lines", [])) > 0) and j["_acr_age_days"] >= 90:
            j["has_aged_accruals"] = True
        else:
            j["has_aged_accruals"] = False

        # Persist accrual age for frontend display, then clean up internal field
        j["accrual_age_days"] = j["_acr_age_days"]
        del j["_acr_age_days"]

        jobs.append(j)
        if j["branch"]:
            branches.add(j["branch"])
        if j["operator"]:
            operators.add(j["operator"])

    cur.close()
    conn.close()

    print(f"Aggregated {total_rows:,} charges into {len(jobs):,} unique jobs.")
    update_sync_progress("Synchronization Complete", 100, current=len(jobs), total=len(jobs), status="completed")

    return {
        "jobs": jobs,
        "branch": "All Branches (Snowflake)" if len(branches) > 1 else list(branches)[0] if branches else "Unknown",
        "period": "Current (Snowflake)",
        "operators": sorted(list(operators))
    }
