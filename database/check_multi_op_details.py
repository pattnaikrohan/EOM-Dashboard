import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            CHARGE_PK,
            JOB_OPERATOR_CODE,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            CHARGE_CREATED_BY,
            CHARGE_LAST_MODIFIED_BY
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER = 'S00177282'
          AND OPERATOR_CODE != 'KB2'
        LIMIT 10
    """)
    rows = cur.fetchall()
    print(f"Non-KB2 rows in S00177282: {len(rows)}")
    for r in rows:
        print(r)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
