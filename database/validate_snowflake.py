"""
Snowflake Validation v2 — Target: DEV.CORE (where tables actually live)
"""
import snowflake.connector
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

SF_ACCOUNT   = "SGLYREN-GG43054"
SF_USER      = "TEST_AI_AUTO"
SF_WAREHOUSE = "PROD_COMPUTE_WH"
SF_DATABASE  = "DEV"
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

def get_connection():
    p_key = serialization.load_pem_private_key(
        PRIVATE_KEY_PEM.encode(), password=None, backend=default_backend())
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption())
    return snowflake.connector.connect(
        account=SF_ACCOUNT, user=SF_USER, private_key=pkb,
        warehouse=SF_WAREHOUSE, database=SF_DATABASE, schema="CORE", role=SF_ROLE)

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
    print("CONNECTED to DEV.CORE\n")

    DB = "DEV"
    SCHEMA = "CORE"

    # ── Step 1: Find all 9 tables ─────────────────────────────────────────
    REQUIRED = ['JOBCHARGE','JOBHEADER','ACCCHARGECODE','JOBCHARGEREVRECOGNITION',
                'GLBSTAFF','ORGHEADER','ORGADDRESS','JOBSHIPMENT','JOBDECLARATION']

    print("=== STEP 1: Table existence ===")
    rows, _ = q(cur, f"""
        SELECT TABLE_NAME, ROW_COUNT
        FROM {DB}.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '{SCHEMA}'
          AND TABLE_NAME IN ({','.join(f"'{t}'" for t in REQUIRED)})
        ORDER BY TABLE_NAME
    """)
    found_tables = set()
    if rows:
        for r in rows:
            print(f"  {r[0]:40s} rows: {r[1]}")
            found_tables.add(r[0])
    missing_tables = set(REQUIRED) - found_tables
    if missing_tables:
        print(f"\n  MISSING TABLES: {missing_tables}")
    else:
        print(f"\n  ALL 9 TABLES FOUND!")

    # ── Step 2: Validate columns per table ────────────────────────────────
    EXPECTED = {
        'JOBCHARGE': [
            'JR_PK','JR_JH','JR_AC','JR_DESC','JR_CHARGETYPE','JR_LINETYPE',
            'JR_DISPLAYSEQUENCE','JR_OSCOSTAMT','JR_LOCALCOSTAMT','JR_RX_NKCOSTCURRENCY',
            'JR_OSCOSTEXRATE','JR_ESTIMATEDCOST','JR_AT_COSTGSTRATE','JR_OSCOSTGSTAMT',
            'JR_OH_COSTACCOUNT','JR_APLINEPOSTINGSTATUS','JR_APINVOICENUM','JR_APINVOICEDATE',
            'JR_OSSELLAMT','JR_LOCALSELLAMT','JR_RX_NKSELLCURRENCY','JR_OSSELLEXRATE',
            'JR_ESTIMATEDREVENUE','JR_AT_SELLGSTRATE','JR_OH_SELLACCOUNT',
            'JR_ARLINEPOSTINGSTATUS','JR_INVOICETYPE','JR_MARGINPERCENTAGE',
            'JR_PROFORMACOST','JR_PROFORMAREVENUE','JR_ISINCLUDEDINPROFITSHARE',
            'JR_ISVALID','JR_GE','JR_GB','JR_GC',
            'JR_SYSTEMCREATETIMEUTC','JR_SYSTEMCREATEUSER',
            'JR_SYSTEMLASTEDITTIMEUTC','JR_SYSTEMLASTEDITUSER'],
        'JOBHEADER': [
            'JH_PK','JH_JOBNUM','JH_NAME','JH_DESCRIPTION','JH_STATUS',
            'JH_HEADERTYPE','JH_DIRECTION','JH_JOBLOCALREFERENCE',
            'JH_JH_PARENTJOB','JH_HOLDREASON','JH_PROFITLOSSREASONCODE',
            'JH_LOCALCHARGESCFX','JH_OA_LOCALCHARGESADDR','JH_OA_AGENTCOLLECTADDR',
            'JH_GB','JH_GE','JH_GC','JH_GS_NKREPOPS','JH_GS_NKREPSALES',
            'JH_A_JOP','JH_A_JCL','JH_ISACTIVE',
            'JH_SYSTEMCREATETIMEUTC','JH_SYSTEMCREATEUSER','JH_SYSTEMLASTEDITUSER'],
        'ACCCHARGECODE': [
            'AC_PK','AC_CODE','AC_DESC','AC_CHARGETYPE','AC_CHARGEGROUP',
            'AC_CHARGESUBGROUP','AC_AG_REVENUEACCOUNT','AC_AG_COSTACCOUNT',
            'AC_AG_WIPACCOUNT','AC_AG_ACCRUALACCOUNT','AC_ISACTIVE'],
        'JOBCHARGEREVRECOGNITION': [
            'D3_PK','D3_JH','D3_RECOGNITIONTYPE','D3_RECOGNITIONDATE'],
        'GLBSTAFF': [
            'GS_PK','GS_CODE','GS_FULLNAME','GS_FRIENDLYNAME',
            'GS_GIVENNAME','GS_PREFERREDSURNAME','GS_ISACTIVE'],
        'ORGHEADER': [
            'OH_PK','OH_CODE','OH_FULLNAME','OH_ISFORWARDER','OH_ISACTIVE'],
        'ORGADDRESS': ['OA_PK','OA_OH'],
        'JOBSHIPMENT': [
            'JS_PK','JS_RL_NKORIGIN','JS_RL_NKDESTINATION',
            'JS_E_DEP','JS_E_ARV','JS_TRANSPORTMODE','JS_SHIPMENTSTATUS','JS_ISVALID'],
        'JOBDECLARATION': [
            'JE_PK','JE_JS','JE_RL_NKORIGIN','JE_RL_NKFINALDESTINATION',
            'JE_RL_NKPORTOFLOADING','JE_RL_NKPORTOFARRIVAL',
            'JE_EXPORTDATE','JE_DATEOFARRIVAL','JE_DATEATFINALDESTINATION',
            'JE_TRANSPORTMODE','JE_OPERATIONALSTATUS','JE_ENTRYSTATUS',
            'JE_DECLARATIONREFERENCE','JE_GB','JE_GC','JE_ISVALID','JE_ISCANCELLED'],
    }

    total_found = 0
    total_missing = 0
    all_missing = {}

    for table, expected_cols in EXPECTED.items():
        print(f"\n=== STEP 2: {table} columns ===")
        if table not in found_tables:
            print(f"  SKIPPED (table not found)")
            total_missing += len(expected_cols)
            all_missing[table] = expected_cols
            continue

        rows, _ = q(cur, f"""
            SELECT COLUMN_NAME, DATA_TYPE
            FROM {DB}.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '{SCHEMA}' AND TABLE_NAME = '{table}'
            ORDER BY ORDINAL_POSITION
        """)
        actual = {r[0]: r[1] for r in rows} if rows else {}
        found = [c for c in expected_cols if c in actual]
        missing = [c for c in expected_cols if c not in actual]
        total_found += len(found)
        total_missing += len(missing)

        print(f"  {len(found)}/{len(expected_cols)} columns found")
        if missing:
            print(f"  MISSING: {missing}")
            all_missing[table] = missing
        extra = sorted(set(actual.keys()) - set(expected_cols))
        if extra:
            print(f"  EXTRA (not in spec, {len(extra)} cols): {extra[:15]}{'...' if len(extra)>15 else ''}")

    print(f"\n{'='*60}")
    print(f"COLUMN SUMMARY: {total_found} found, {total_missing} missing out of 118")
    if all_missing:
        for t, cols in all_missing.items():
            print(f"  {t}: {cols}")
    print(f"{'='*60}")

    # ── Step 3: Cardinality checks ────────────────────────────────────────
    if 'JOBSHIPMENT' in found_tables:
        print(f"\n=== STEP 3a: JOBSHIPMENT 1:1 check ===")
        rows, _ = q(cur, f"SELECT JS_PK, COUNT(*) c FROM {DB}.{SCHEMA}.JOBSHIPMENT GROUP BY JS_PK HAVING COUNT(*)>1 LIMIT 5")
        if rows is not None:
            print(f"  Duplicates: {len(rows)} {'(1:1 OK)' if len(rows)==0 else 'WARNING: 1:many!'}")
        else:
            print(f"  Error: {_}")

    if 'JOBDECLARATION' in found_tables:
        print(f"\n=== STEP 3b: JOBDECLARATION 1:1 check ===")
        rows, _ = q(cur, f"SELECT JE_PK, COUNT(*) c FROM {DB}.{SCHEMA}.JOBDECLARATION GROUP BY JE_PK HAVING COUNT(*)>1 LIMIT 5")
        if rows is not None:
            print(f"  Duplicates: {len(rows)} {'(1:1 OK)' if len(rows)==0 else 'WARNING: 1:many!'}")
        else:
            print(f"  Error: {_}")

    # ── Step 4: FK integrity ──────────────────────────────────────────────
    if 'JOBCHARGE' in found_tables and 'JOBHEADER' in found_tables:
        print(f"\n=== STEP 4: FK integrity (orphan charges) ===")
        rows, _ = q(cur, f"""
            SELECT COUNT(*) FROM {DB}.{SCHEMA}.JOBCHARGE jr
            LEFT JOIN {DB}.{SCHEMA}.JOBHEADER jh ON jr.JR_JH = jh.JH_PK
            WHERE jh.JH_PK IS NULL AND jr.JR_ISVALID = TRUE
        """)
        if rows:
            print(f"  Orphan active charges: {rows[0][0]}")

    # ── Step 5: Row counts ────────────────────────────────────────────────
    print(f"\n=== STEP 5: Row counts ===")
    for t in REQUIRED:
        if t in found_tables:
            rows, _ = q(cur, f"SELECT COUNT(*) FROM {DB}.{SCHEMA}.{t}")
            if rows:
                print(f"  {t:40s} {rows[0][0]:>12,}")
            else:
                print(f"  {t:40s} ERROR: {_}")

    # ── Step 6: SMOKE TEST ────────────────────────────────────────────────
    if len(found_tables) >= 7:
        print(f"\n=== STEP 6: SMOKE TEST (full join, 10 rows) ===")
        smoke = f"""
        SELECT
            jh.JH_JOBNUM, jh.JH_STATUS, jh.JH_DIRECTION, jh.JH_GB, jh.JH_GE,
            ops.GS_FULLNAME AS OPERATOR,
            sales.GS_FULLNAME AS SALES_REP,
            agent_org.OH_FULLNAME AS OVERSEAS_AGENT,
            local_org.OH_FULLNAME AS LOCAL_CLIENT,
            COALESCE(js.JS_RL_NKORIGIN, je.JE_RL_NKORIGIN) AS ORIGIN,
            COALESCE(js.JS_RL_NKDESTINATION, je.JE_RL_NKFINALDESTINATION) AS DEST,
            COALESCE(js.JS_E_DEP, je.JE_EXPORTDATE) AS ETD,
            COALESCE(js.JS_E_ARV, je.JE_DATEOFARRIVAL) AS ETA,
            CASE WHEN js.JS_PK IS NOT NULL THEN 'SHIP' WHEN je.JE_PK IS NOT NULL THEN 'DECL' ELSE NULL END AS SRC,
            agg.REV, agg.CST, agg.WIP, agg.ACR,
            (COALESCE(agg.REV,0) - COALESCE(agg.CST,0)) AS PL
        FROM {DB}.{SCHEMA}.JOBHEADER jh
        LEFT JOIN (
            SELECT JR_JH,
                SUM(COALESCE(JR_LOCALSELLAMT,0)) REV,
                SUM(COALESCE(JR_LOCALCOSTAMT,0)) CST,
                SUM(CASE WHEN JR_PROFORMACOST=TRUE THEN COALESCE(JR_LOCALCOSTAMT,0) ELSE 0 END) WIP,
                SUM(CASE WHEN JR_PROFORMAREVENUE=TRUE THEN COALESCE(JR_LOCALSELLAMT,0) ELSE 0 END) ACR
            FROM {DB}.{SCHEMA}.JOBCHARGE WHERE JR_ISVALID=TRUE GROUP BY JR_JH
        ) agg ON agg.JR_JH = jh.JH_PK
        LEFT JOIN {DB}.{SCHEMA}.GLBSTAFF ops ON jh.JH_GS_NKREPOPS = ops.GS_PK
        LEFT JOIN {DB}.{SCHEMA}.GLBSTAFF sales ON jh.JH_GS_NKREPSALES = sales.GS_PK
        LEFT JOIN {DB}.{SCHEMA}.ORGADDRESS oa_a ON jh.JH_OA_AGENTCOLLECTADDR = oa_a.OA_PK
        LEFT JOIN {DB}.{SCHEMA}.ORGHEADER agent_org ON oa_a.OA_OH = agent_org.OH_PK
        LEFT JOIN {DB}.{SCHEMA}.ORGADDRESS oa_l ON jh.JH_OA_LOCALCHARGESADDR = oa_l.OA_PK
        LEFT JOIN {DB}.{SCHEMA}.ORGHEADER local_org ON oa_l.OA_OH = local_org.OH_PK
        {"LEFT JOIN " + DB + "." + SCHEMA + ".JOBSHIPMENT js ON js.JS_PK = jh.JH_PK" if 'JOBSHIPMENT' in found_tables else ""}
        {"LEFT JOIN " + DB + "." + SCHEMA + ".JOBDECLARATION je ON je.JE_PK = jh.JH_PK" if 'JOBDECLARATION' in found_tables else ""}
        WHERE agg.REV IS NOT NULL AND agg.REV > 0
        LIMIT 10
        """
        # Fix query if tables missing - need dummy aliases
        if 'JOBSHIPMENT' not in found_tables:
            smoke = smoke.replace("js.JS_RL_NKORIGIN", "NULL").replace("js.JS_RL_NKDESTINATION", "NULL")
            smoke = smoke.replace("js.JS_E_DEP", "NULL").replace("js.JS_E_ARV", "NULL")
            smoke = smoke.replace("js.JS_PK IS NOT NULL", "FALSE").replace("js.JS_TRANSPORTMODE", "NULL")
        if 'JOBDECLARATION' not in found_tables:
            smoke = smoke.replace("je.JE_RL_NKORIGIN", "NULL").replace("je.JE_RL_NKFINALDESTINATION", "NULL")
            smoke = smoke.replace("je.JE_EXPORTDATE", "NULL").replace("je.JE_DATEOFARRIVAL", "NULL")
            smoke = smoke.replace("je.JE_PK IS NOT NULL", "FALSE").replace("je.JE_TRANSPORTMODE", "NULL")

        rows, cols = q(cur, smoke)
        if rows is not None:
            print(f"  PASSED - {len(rows)} rows returned")
            print(f"  Cols: {cols}")
            for i, row in enumerate(rows[:3]):
                print(f"\n  --- Row {i+1} ---")
                for c, v in zip(cols, row):
                    val_str = str(v)
                    if len(val_str) > 60:
                        val_str = val_str[:60] + "..."
                    print(f"    {c:25s} = {val_str}")
        else:
            print(f"  FAILED: {cols}")

    print(f"\nDONE")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
