import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("USE DATABASE PROD")

    print("==================================================")
    print("SY1 BRANCH DETAILED VALIDATION")
    print("==================================================")
    cur.execute("""
        SELECT 
            LEFT(JOB_NUMBER, 1) AS PREFIX,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            JOB_STATUS,
            COUNT(DISTINCT JOB_NUMBER) AS DISTINCT_JOBS,
            COUNT(*) AS TOTAL_CHARGES,
            SUM(SELL_LOCAL_AMT) AS TOTAL_REV,
            SUM(COST_LOCAL_AMT) AS TOTAL_COST
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_BRANCH_CODE = 'SY1'
        GROUP BY 1, 2, 3, 4
        ORDER BY 1, 5 DESC
    """)
    print(f"{'PREFIX':<6} | {'DEPT':<6} | {'DEPT_DESC':<30} | {'STATUS':<6} | {'JOBS':<6} | {'CHARGES':<8} | {'REVENUE ($)':<12} | {'COST ($)':<12}")
    print("-" * 105)
    for r in cur.fetchall():
        print(f"{str(r[0]):<6} | {str(r[1]):<6} | {str(r[2])[:30]:<30} | {str(r[3]):<6} | {r[4]:<6} | {r[5]:<8} | {r[6] or 0:<12.2f} | {r[7] or 0:<12.2f}")

    print("\n==================================================")
    print("CHECK NEWLY ADDED COLUMNS SAMPLE FOR SY1")
    print("==================================================")
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            JOB_COMPANY_CODE,
            JOB_COMPANY_NAME,
            COST_CREDITOR_ACCOUNT_NAME,
            SELL_DEBTOR_ACCOUNT_NAME,
            COST_GST,
            SELL_GST
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_BRANCH_CODE = 'SY1'
        LIMIT 5
    """)
    for r in cur.fetchall():
        print(r)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
