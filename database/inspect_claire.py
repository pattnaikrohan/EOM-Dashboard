import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("1. CLAIRE BROTHERTON IN GLBSTAFF")
    print("==================================================")
    cur.execute("""
        SELECT *
        FROM PROD.CORE.GLBSTAFF
        WHERE GS_FULLNAME ILIKE '%Claire%Brotherton%' OR GS_CODE = 'AAB'
    """)
    cols = [d[0] for d in cur.description]
    for r in cur.fetchall():
        d = dict(zip(cols, r))
        print("GLBSTAFF row:", {k: v for k, v in d.items() if v is not None and str(v).strip() != ''})

    print("\n==================================================")
    print("2. JOBS ASSIGNED TO CLAIRE BROTHERTON IN VW_EOM_JOB_CHARGES_UPDATED")
    print("==================================================")
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            JOB_STATUS,
            JOB_OPENED_DATE,
            COUNT(*) AS CHARGE_COUNT,
            SUM(SELL_LOCAL_AMT) AS TOTAL_REV,
            SUM(COST_LOCAL_AMT) AS TOTAL_COST
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE OPERATOR_FULLNAME ILIKE '%Claire%Brotherton%' 
           OR OPERATOR_FRIENDLY_NAME ILIKE '%Claire%Brotherton%'
           OR OPERATOR_CODE = 'AAB'
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
        ORDER BY 1
    """)
    rows = cur.fetchall()
    print(f"Found {len(rows)} jobs assigned to Claire Brotherton in VW_EOM_JOB_CHARGES_UPDATED:")
    for r in rows:
        print(f"  Job: {r[0]} | BranchCode: {r[1]} | BranchName: '{r[2]}' | Dept: {r[3]} ({r[4]}) | Status: {r[7]} | Opened: {r[8]} | Rev: ${r[10]:,.2f}")

    print("\n==================================================")
    print("3. ALL JOBS IN JOBHEADER WHERE JH_GS_NKREPOPS = 'AAB'")
    print("==================================================")
    cur.execute("""
        SELECT 
            j.JH_JOBNUM,
            j.JH_GS_NKREPOPS,
            b.GB_CODE,
            b.GB_BRANCHNAME,
            j.JH_STATUS,
            j.JH_SYSTEMCREATETIMEUTC
        FROM PROD.CORE.JOBHEADER j
        LEFT JOIN PROD.CORE.GLBBRANCH b ON j.JH_GB = b.GB_PK
        WHERE j.JH_GS_NKREPOPS = 'AAB' AND j.ACTV_IND = TRUE
        LIMIT 20
    """)
    for r in cur.fetchall():
        print(f"  JobNum: {r[0]} | OpsCode: {r[1]} | BranchCode: {r[2]} | BranchName: {r[3]} | Status: {r[4]} | Created: {r[5]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
