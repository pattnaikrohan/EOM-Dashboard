import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            JOB_STATUS,
            COUNT(*) AS NUM_CHARGES,
            SUM(SELL_LOCAL_AMT) AS REV,
            SUM(COST_LOCAL_AMT) AS CST,
            MIN(WIP_RECOGNITION_DATE) AS EARLIEST_DATE,
            MAX(WIP_RECOGNITION_DATE) AS LATEST_DATE
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER = 'S00177282'
        GROUP BY 1, 2, 3, 4, 5
        ORDER BY LATEST_DATE DESC NULLS LAST, NUM_CHARGES DESC
    """)
    
    print("OPERATOR BREAKDOWN ON JOB S00177282:")
    for r in cur.fetchall():
        print(f"  Op: {r[0]} ({r[1]:<22}) | Branch: '{r[2]:<30}' | Dept: {r[3]} | Status: {r[4]} | Charges: {r[5]:>2d} | Rev: ${r[6]:>10,.2f} | Cost: ${r[7]:>10,.2f} | Latest: {r[9]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
