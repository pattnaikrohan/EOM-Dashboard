import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def check_multiple_operators():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("CHECK FOR JOBS WITH MULTIPLE OPERATORS IN VW_EOM_JOB_CHARGES_UPDATED")
    print("==================================================")
    
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            COUNT(DISTINCT OPERATOR_CODE) AS DISTINCT_OP_CODES,
            COUNT(DISTINCT OPERATOR_FULLNAME) AS DISTINCT_OP_NAMES,
            ARRAY_AGG(DISTINCT OPERATOR_CODE) AS OP_CODES,
            ARRAY_AGG(DISTINCT OPERATOR_FULLNAME) AS OP_NAMES,
            COUNT(*) AS TOTAL_CHARGES
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER IS NOT NULL AND JOB_NUMBER != ''
        GROUP BY JOB_NUMBER
        HAVING COUNT(DISTINCT OPERATOR_CODE) > 1 
            OR COUNT(DISTINCT OPERATOR_FULLNAME) > 1
        ORDER BY TOTAL_CHARGES DESC
    """)
    
    rows = cur.fetchall()
    print(f"Total jobs with multiple operators: {len(rows)}")
    
    if rows:
        print("\nTop 10 jobs with multiple operators:")
        for r in rows[:10]:
            print(f"  Job: {r[0]} | Distinct Codes: {r[1]} | Codes: {r[3]} | Names: {r[4]} | Total Charges: {r[5]}")
    else:
        print("Every single job has exactly ONE unique operator across all its charge lines!")

    print("\n==================================================")
    print("CHECK WHERE OPERATOR FIELD ORIGINATES IN VIEW DDL")
    print("==================================================")
    cur.execute("""
        SELECT 
            COUNT(DISTINCT JOB_NUMBER) AS TOTAL_JOBS,
            COUNT(DISTINCT CASE WHEN OPERATOR_CODE IS NOT NULL AND OPERATOR_CODE != '' THEN JOB_NUMBER END) AS JOBS_WITH_OP,
            COUNT(DISTINCT CASE WHEN OPERATOR_CODE IS NULL OR OPERATOR_CODE = '' THEN JOB_NUMBER END) AS JOBS_WITHOUT_OP
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
    """)
    r = cur.fetchone()
    print(f"Total Jobs: {r[0]:,} | Jobs with Operator: {r[1]:,} | Jobs with blank/null Operator: {r[2]:,}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    check_multiple_operators()
