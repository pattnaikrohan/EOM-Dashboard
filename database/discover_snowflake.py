"""
Snowflake Discovery — Find where the 9 tables actually live.
"""
import snowflake.connector
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

SF_ACCOUNT   = "SGLYREN-GG43054"
SF_USER      = "TEST_AI_AUTO"
SF_WAREHOUSE = "PROD_COMPUTE_WH"
SF_DATABASE  = "PROD"
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
        warehouse=SF_WAREHOUSE, database=SF_DATABASE, role=SF_ROLE)

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
    print("CONNECTED OK\n")

    # 1. List ALL databases we can see
    print("=== ALL DATABASES ===")
    rows, cols = q(cur, "SHOW DATABASES")
    if rows:
        for r in rows:
            print(f"  {r[1]}")  # name is typically index 1

    # 2. List ALL schemas in PROD
    print("\n=== SCHEMAS IN PROD ===")
    rows, cols = q(cur, "SHOW SCHEMAS IN DATABASE PROD")
    if rows:
        for r in rows:
            print(f"  {r[1]}")

    # 3. Search for tables with 'JOB' in the name across ALL schemas in PROD
    print("\n=== TABLES WITH 'JOB' IN NAME (ALL SCHEMAS) ===")
    rows, cols = q(cur, """
        SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT
        FROM PROD.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME LIKE '%JOB%'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    """)
    if rows:
        for r in rows:
            print(f"  {r[0]}.{r[1]:40s} rows: {r[2]}")
    else:
        print(f"  None found (or error: {cols})")

    # 4. Search for tables with 'GLBSTAFF' or 'ORG' in name
    print("\n=== TABLES WITH 'GLB' or 'ORG' or 'ACC' IN NAME ===")
    rows, cols = q(cur, """
        SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT
        FROM PROD.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME LIKE '%GLB%' OR TABLE_NAME LIKE '%ORG%' OR TABLE_NAME LIKE '%ACC%'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    """)
    if rows:
        for r in rows:
            print(f"  {r[0]}.{r[1]:40s} rows: {r[2]}")
    else:
        print(f"  None found (or error: {cols})")

    # 5. Also check OTHER databases — maybe it's not in PROD
    print("\n=== SEARCHING OTHER DATABASES FOR JOBHEADER ===")
    rows, cols = q(cur, "SHOW DATABASES")
    if rows:
        db_names = [r[1] for r in rows if r[1] not in ('SNOWFLAKE',)]
        for db in db_names[:10]:
            rows2, _ = q(cur, f"""
                SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT
                FROM {db}.INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = 'JOBHEADER'
            """)
            if rows2:
                for r in rows2:
                    print(f"  {db}.{r[0]}.{r[1]:30s} rows: {r[2]}")

    # 6. List ALL tables in EDW and MART schemas
    print("\n=== ALL TABLES IN PROD.EDW ===")
    rows, cols = q(cur, """
        SELECT TABLE_NAME, ROW_COUNT
        FROM PROD.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'EDW'
        ORDER BY TABLE_NAME
    """)
    if rows:
        for r in rows[:50]:
            print(f"  {r[0]:45s} rows: {r[1]}")
        if len(rows) > 50:
            print(f"  ... and {len(rows)-50} more tables")
    else:
        print(f"  None (or error: {cols})")

    print("\n=== ALL TABLES IN PROD.MART ===")
    rows, cols = q(cur, """
        SELECT TABLE_NAME, ROW_COUNT
        FROM PROD.INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'MART'
        ORDER BY TABLE_NAME
    """)
    if rows:
        for r in rows[:50]:
            print(f"  {r[0]:45s} rows: {r[1]}")
        if len(rows) > 50:
            print(f"  ... and {len(rows)-50} more tables")
    else:
        print(f"  None (or error: {cols})")

    # 7. List ALL views too
    print("\n=== ALL VIEWS IN PROD (ALL SCHEMAS) ===")
    rows, cols = q(cur, """
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM PROD.INFORMATION_SCHEMA.VIEWS
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    """)
    if rows:
        for r in rows[:50]:
            print(f"  {r[0]}.{r[1]}")
        if len(rows) > 50:
            print(f"  ... and {len(rows)-50} more views")
    else:
        print(f"  None (or error: {cols})")

    cur.close()
    conn.close()
    print("\nDONE")

if __name__ == "__main__":
    main()
