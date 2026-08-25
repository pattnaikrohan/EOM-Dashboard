import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def inspect_all_charges_s00177282():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_BRANCH_CODE,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            JOB_OPERATOR_CODE,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            OPERATOR_FRIENDLY_NAME,
            JOB_STATUS,
            JOB_DIRECTION,
            SHIPMENT_ORIGIN,
            SHIPMENT_DESTINATION,
            SHIPMENT_ETD,
            SHIPMENT_ETA,
            SELL_LOCAL_AMT,
            COST_LOCAL_AMT,
            CHARGECODE,
            CHARGE_DESCRIPTION,
            COST_AP_POSTING_STATUS,
            SELL_AR_POSTING_STATUS
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER = 'S00177282'
        ORDER BY CHARGE_PK
    """)
    rows = cur.fetchall()
    print(f"Total charges for S00177282 in VW_EOM_JOB_CHARGES_UPDATED: {len(rows)}")
    for idx, r in enumerate(rows, 1):
        print(f"[{idx:3d}] Branch: '{r[1]}' ('{r[2]}') | Dept: '{r[3]}' | HeaderOp: '{r[5]}' | LineOp: '{r[6]}' ('{r[7]}') | Status: '{r[9]}' | ETD: {r[13]} | ETA: {r[14]} | Rev: ${r[15]} | Cost: ${r[16]} | AR: '{r[20]}' | AP: '{r[19]}'")

    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect_all_charges_s00177282()
