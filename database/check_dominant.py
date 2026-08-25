import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection
from collections import Counter

def check_dominant():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            JOB_BRANCH_NAME,
            JOB_BRANCH_CODE,
            JOB_DEPARTMENT_CODE,
            JOB_OPERATOR_CODE,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            OPERATOR_FRIENDLY_NAME,
            SELL_LOCAL_AMT,
            COST_LOCAL_AMT
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER = 'S00177282'
    """)
    rows = cur.fetchall()
    print(f"Total charges for S00177282: {len(rows)}")
    
    branches = Counter(r[0] for r in rows)
    print("\nBranch count distribution:")
    for b, cnt in branches.most_common():
        print(f"  {b}: {cnt} charges")

    ops = Counter(r[5] for r in rows)
    print("\nOperator Fullname distribution:")
    for op, cnt in ops.most_common():
        print(f"  {op}: {cnt} charges")

    header_ops = Counter(r[3] for r in rows)
    print("\nJob Header Operator Code (JOB_OPERATOR_CODE) distribution:")
    for hop, cnt in header_ops.most_common():
        print(f"  {hop}: {cnt} charges")

    cur.close()
    conn.close()

if __name__ == "__main__":
    check_dominant()
