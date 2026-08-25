import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("1. FIND THE 4 JOBS FOR CLAIRE BROTHERTON IN SNOWFLAKE")
    print("==================================================")
    # Search by operator code, friendly name, full name, or staff lookup
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            OPERATOR_FRIENDLY_NAME,
            JOB_STATUS,
            JOB_OPENED_DATE,
            COUNT(*) AS CHARGE_COUNT,
            SUM(SELL_LOCAL_AMT) AS REV,
            SUM(COST_LOCAL_AMT) AS CST
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE OPERATOR_CODE IN ('AAB', 'A.A.B')
           OR OPERATOR_FULLNAME ILIKE '%Claire%Brotherton%'
           OR OPERATOR_FRIENDLY_NAME ILIKE '%Claire%Brotherton%'
           OR JOB_OPERATOR_CODE IN ('AAB', 'A.A.B')
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    """)
    rows = cur.fetchall()
    print(f"Direct match found {len(rows)} jobs in VW_EOM_JOB_CHARGES_UPDATED:")
    for r in rows:
        print(r)

    print("\n==================================================")
    print("2. CHECK STAFF_LOOKUP.PY MAPPING FOR ANY CODES RESOLVING TO 'Claire Brotherton'")
    print("==================================================")
    from app.services.staff_lookup import OPERATOR_NAMES
    codes_for_claire = [k for k, v in OPERATOR_NAMES.items() if v == 'Claire Brotherton']
    print(f"Codes in staff_lookup mapping to Claire Brotherton: {codes_for_claire}")

    # Check if any jobs have those codes in VW_EOM_JOB_CHARGES_UPDATED
    cur.execute(f"""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            OPERATOR_CODE,
            JOB_OPERATOR_CODE,
            OPERATOR_FULLNAME,
            JOB_STATUS
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE OPERATOR_CODE IN ({','.join(repr(c) for c in codes_for_claire)})
           OR JOB_OPERATOR_CODE IN ({','.join(repr(c) for c in codes_for_claire)})
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
    """)
    rows = cur.fetchall()
    print(f"Jobs with operator code in {codes_for_claire}: {len(rows)}")
    for r in rows:
        print(r)

    print("\n==================================================")
    print("3. CHECK ALL JOBS IN SY1 BRANCH (Sydney) WITH OPERATOR DETAILS")
    print("==================================================")
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            OPERATOR_CODE,
            JOB_OPERATOR_CODE,
            OPERATOR_FULLNAME,
            OPERATOR_FRIENDLY_NAME
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_BRANCH_CODE = 'SY1'
          AND (
              OPERATOR_CODE = 'AAB' 
              OR JOB_OPERATOR_CODE = 'AAB'
              OR OPERATOR_FULLNAME ILIKE '%Claire%'
              OR OPERATOR_FRIENDLY_NAME ILIKE '%Claire%'
          )
        GROUP BY 1, 2, 3, 4, 5, 6, 7
    """)
    for r in cur.fetchall():
        print("SY1 Claire match:", r)

    print("\n==================================================")
    print("4. CHECK IF THERE ARE JOBS WHERE OPERATOR IS NULL/BLANK THAT GOT MAPPED TO 'AAB' OR CLAIRE")
    print("==================================================")
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_OPERATOR_CODE,
            OPERATOR_CODE,
            OPERATOR_FULLNAME
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_OPERATOR_CODE IS NOT NULL AND JOB_OPERATOR_CODE != ''
          AND JOB_BRANCH_CODE = 'SY1'
        GROUP BY 1, 2, 3, 4, 5, 6
        ORDER BY 4
        LIMIT 50
    """)
    ops_found = set()
    for r in cur.fetchall():
        ops_found.add((r[3], r[4], r[5]))
    print("Distinct (JOB_OPERATOR_CODE, OPERATOR_CODE, OPERATOR_FULLNAME) in SY1:")
    for op in sorted(ops_found):
        print(op)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
