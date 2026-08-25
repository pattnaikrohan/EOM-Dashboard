import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def inspect_operator_columns():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_OPERATOR_CODE,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            CHARGE_CREATED_BY
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER = 'S00177282'
        LIMIT 10
    """)
    for r in cur.fetchall():
        print(f"Job: {r[0]} | HeaderOp: {r[1]} | LineOp: {r[2]} | LineOpName: {r[3]} | CreatedBy: {r[4]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect_operator_columns()
