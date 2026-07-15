"""
FINAL corrected test — ALL tables deduped via ROW_NUMBER on CRE_DT DESC.
The DEV.CORE tables are CDC/change-log tables. Every row is a version.
We must ROW_NUMBER(PARTITION BY PK ORDER BY CRE_DT DESC) on EVERY table.
"""
import snowflake.connector
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

SF_ACCOUNT   = "SGLYREN-GG43054"
SF_USER      = "TEST_AI_AUTO"
SF_WAREHOUSE = "PROD_COMPUTE_WH"
SF_ROLE      = "PROD_ENGINEER"

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

DB = "DEV"
SCHEMA = "CORE"

def get_connection():
    p_key = serialization.load_pem_private_key(
        PRIVATE_KEY_PEM.encode(), password=None, backend=default_backend())
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption())
    return snowflake.connector.connect(
        account=SF_ACCOUNT, user=SF_USER, private_key=pkb,
        warehouse=SF_WAREHOUSE, database=DB, schema=SCHEMA, role=SF_ROLE)

def q(cur, sql):
    try:
        cur.execute(sql)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description] if cur.description else []
        return rows, cols
    except Exception as e:
        return None, str(e)

def main():
    conn = get_connection()
    cur = conn.cursor()
    print("CONNECTED\n")

    # ── 1. Check dedup row counts ─────────────────────────────────────────
    print("=== 1. Row counts: RAW vs DEDUP ===")
    tables_with_pk = [
        ('JOBHEADER', 'JH_PK'),
        ('JOBCHARGE', 'JR_PK'),
        ('JOBSHIPMENT', 'JS_PK'),
        ('JOBDECLARATION', 'JE_PK'),
        ('GLBSTAFF', 'GS_PK'),
        ('ORGHEADER', 'OH_PK'),
        ('ORGADDRESS', 'OA_PK'),
        ('GLBBRANCH', 'GB_PK'),
        ('ACCCHARGECODE', 'AC_PK'),
        ('JOBCHARGEREVRECOGNITION', 'D3_PK'),
    ]
    for table, pk in tables_with_pk:
        rows, _ = q(cur, f"SELECT COUNT(*), COUNT(DISTINCT {pk}) FROM {DB}.{SCHEMA}.{table}")
        if rows:
            print(f"  {table:35s} total: {rows[0][0]:>12,}  unique PKs: {rows[0][1]:>12,}")

    # ── 2. Check if JOBHEADER has ACTV_IND filtering ──────────────────────
    print("\n=== 2. JOBHEADER ACTV_IND distribution ===")
    rows, _ = q(cur, f"""
        SELECT ACTV_IND, COUNT(*), COUNT(DISTINCT JH_PK)
        FROM {DB}.{SCHEMA}.JOBHEADER
        GROUP BY ACTV_IND
    """)
    if rows:
        for r in rows:
            print(f"  ACTV_IND={str(r[0]):10s}  rows={r[1]:>10,}  unique_pk={r[2]:>10,}")

    # ── 3. FINAL CORRECTED SMOKE TEST ─────────────────────────────────────
    # Strategy: Use CTEs to deduplicate ALL tables first, then join
    print("\n=== 3. FINAL CORRECTED SMOKE TEST (full CDC dedup via CTEs) ===")
    sql = f"""
    WITH
    -- Deduplicate JOBHEADER: latest version per JH_PK
    jh_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY JH_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.JOBHEADER
        WHERE ACTV_IND = TRUE
    ),
    jh AS (SELECT * FROM jh_dedup WHERE rn = 1),

    -- Deduplicate JOBCHARGE: latest version per JR_PK
    jr_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY JR_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.JOBCHARGE
        WHERE ACTV_IND = TRUE AND JR_ISVALID = TRUE
    ),
    jr AS (SELECT * FROM jr_dedup WHERE rn = 1),

    -- Aggregate financials per job (from deduped charges)
    agg AS (
        SELECT JR_JH,
            SUM(COALESCE(JR_LOCALSELLAMT,0)) AS TOTAL_REVENUE,
            SUM(COALESCE(JR_LOCALCOSTAMT,0)) AS TOTAL_COST,
            SUM(CASE WHEN JR_PROFORMACOST=TRUE THEN COALESCE(JR_LOCALCOSTAMT,0) ELSE 0 END) AS TOTAL_WIP,
            SUM(CASE WHEN JR_PROFORMAREVENUE=TRUE THEN COALESCE(JR_LOCALSELLAMT,0) ELSE 0 END) AS TOTAL_ACCRUAL,
            COUNT(*) AS CHARGE_LINES
        FROM jr
        GROUP BY JR_JH
    ),

    -- Deduplicate GLBSTAFF: latest per GS_CODE (not GS_PK!)
    gs_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY GS_CODE ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.GLBSTAFF
        WHERE ACTV_IND = TRUE
    ),
    gs AS (SELECT * FROM gs_dedup WHERE rn = 1),

    -- Deduplicate GLBBRANCH
    gb_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY GB_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.GLBBRANCH
        WHERE ACTV_IND = TRUE
    ),
    gb AS (SELECT * FROM gb_dedup WHERE rn = 1),

    -- Deduplicate ORGADDRESS
    oa_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY OA_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.ORGADDRESS
        WHERE ACTV_IND = TRUE
    ),
    oa AS (SELECT * FROM oa_dedup WHERE rn = 1),

    -- Deduplicate ORGHEADER
    oh_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY OH_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.ORGHEADER
        WHERE ACTV_IND = TRUE
    ),
    oh AS (SELECT * FROM oh_dedup WHERE rn = 1),

    -- Deduplicate JOBSHIPMENT
    js_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY JS_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.JOBSHIPMENT
        WHERE ACTV_IND = TRUE AND JS_ISVALID = TRUE
    ),
    js AS (SELECT * FROM js_dedup WHERE rn = 1),

    -- Deduplicate JOBDECLARATION
    je_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY JE_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.JOBDECLARATION
        WHERE ACTV_IND = TRUE AND JE_ISVALID = TRUE
    ),
    je AS (SELECT * FROM je_dedup WHERE rn = 1)

    SELECT
        jh.JH_JOBNUM                             AS JOB_NUMBER,
        jh.JH_STATUS                             AS STATUS,
        jh.JH_DIRECTION                          AS DIRECTION,
        branch.GB_CODE                           AS BRANCH,
        branch.GB_BRANCHNAME                     AS BRANCH_NAME,
        jh.JH_GE                                 AS DEPT_FK,
        ops.GS_CODE                              AS OPS_CODE,
        ops.GS_FULLNAME                          AS OPERATOR,
        sales.GS_CODE                            AS SALES_CODE,
        sales.GS_FULLNAME                        AS SALES_REP,
        agent_org.OH_FULLNAME                    AS OVERSEAS_AGENT,
        local_org.OH_FULLNAME                    AS LOCAL_CLIENT,
        COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN) AS ORIGIN,
        COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION) AS DEST,
        COALESCE(ship.JS_E_DEP, decl.JE_EXPORTDATE) AS ETD,
        COALESCE(ship.JS_E_ARV, decl.JE_DATEOFARRIVAL) AS ETA,
        COALESCE(ship.JS_TRANSPORTMODE, decl.JE_TRANSPORTMODE) AS TRANSPORT,
        CASE WHEN ship.JS_PK IS NOT NULL THEN 'SHIP'
             WHEN decl.JE_PK IS NOT NULL THEN 'DECL'
             ELSE NULL END                        AS ROUTING_SRC,
        agg.TOTAL_REVENUE                        AS REVENUE,
        agg.TOTAL_COST                           AS COST,
        agg.TOTAL_WIP                            AS WIP,
        agg.TOTAL_ACCRUAL                        AS ACCRUAL,
        (COALESCE(agg.TOTAL_REVENUE,0) - COALESCE(agg.TOTAL_COST,0)) AS PROFIT_LOSS,
        agg.CHARGE_LINES,
        jh.JH_A_JOP                              AS OPENED_DATE
    FROM jh

    -- Branch lookup
    LEFT JOIN gb AS branch ON jh.JH_GB = branch.GB_PK

    -- Operator (join on CODE, not PK!)
    LEFT JOIN gs AS ops ON jh.JH_GS_NKREPOPS = ops.GS_CODE

    -- Sales Rep (join on CODE)
    LEFT JOIN gs AS sales ON jh.JH_GS_NKREPSALES = sales.GS_CODE

    -- Overseas Agent
    LEFT JOIN oa AS oa_agent ON jh.JH_OA_AGENTCOLLECTADDR = oa_agent.OA_PK
    LEFT JOIN oh AS agent_org ON oa_agent.OA_OH = agent_org.OH_PK

    -- Local Client
    LEFT JOIN oa AS oa_local ON jh.JH_OA_LOCALCHARGESADDR = oa_local.OA_PK
    LEFT JOIN oh AS local_org ON oa_local.OA_OH = local_org.OH_PK

    -- Routing
    LEFT JOIN js AS ship ON ship.JS_PK = jh.JH_PK
    LEFT JOIN je AS decl ON decl.JE_PK = jh.JH_PK

    -- Financials
    LEFT JOIN agg ON agg.JR_JH = jh.JH_PK

    WHERE jh.JH_ISACTIVE = TRUE
      AND agg.TOTAL_REVENUE > 0
    ORDER BY jh.JH_JOBNUM
    LIMIT 20
    """

    rows, cols = q(cur, sql)
    if rows:
        # Check uniqueness
        job_nums = [r[0] for r in rows]
        unique = len(set(job_nums))
        print(f"  PASSED - {len(rows)} rows, {unique} unique jobs {'(NO DUPLICATES!)' if unique == len(rows) else '(STILL HAS DUPES)'}")

        for i, r in enumerate(rows[:10]):
            print(f"\n  --- Row {i+1} ---")
            for c, v in zip(cols, r):
                val_str = str(v) if v is not None else "NULL"
                if len(val_str) > 55:
                    val_str = val_str[:55] + "..."
                print(f"    {c:20s} = {val_str}")
    else:
        print(f"  FAILED: {cols}")

    # ── 4. Count jobs per branch after full dedup ─────────────────────────
    print("\n\n=== 4. Jobs per branch (deduped) ===")
    sql2 = f"""
    WITH jh_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY JH_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.JOBHEADER WHERE ACTV_IND = TRUE
    ),
    jh AS (SELECT * FROM jh_dedup WHERE rn = 1),
    gb_dedup AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY GB_PK ORDER BY CRE_DT DESC) AS rn
        FROM {DB}.{SCHEMA}.GLBBRANCH WHERE ACTV_IND = TRUE
    ),
    gb AS (SELECT * FROM gb_dedup WHERE rn = 1)

    SELECT gb.GB_CODE, gb.GB_BRANCHNAME, COUNT(*) AS job_count
    FROM jh
    LEFT JOIN gb ON jh.JH_GB = gb.GB_PK
    WHERE jh.JH_ISACTIVE = TRUE
    GROUP BY gb.GB_CODE, gb.GB_BRANCHNAME
    ORDER BY job_count DESC
    LIMIT 20
    """
    rows, _ = q(cur, sql2)
    if rows:
        for r in rows:
            print(f"  {str(r[0]):8s} {str(r[1]):40s} {r[2]:>8,} jobs")

    cur.close()
    conn.close()
    print("\nDONE")

if __name__ == "__main__":
    main()
