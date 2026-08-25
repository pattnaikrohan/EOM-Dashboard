import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def check_latest_operator_s00177282():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("TIMELINE & LATEST OPERATOR ACTIVITY ON S00177282")
    print("==================================================")
    
    cur.execute("""
        SELECT 
            CHARGE_PK,
            CHARGE_CREATED_BY,
            CHARGE_LAST_MODIFIED_BY,
            OPERATOR_CODE,
            OPERATOR_FULLNAME,
            JOB_BRANCH_NAME,
            JOB_DEPARTMENT_CODE,
            CHARGE_DESCRIPTION,
            SELL_LOCAL_AMT,
            COST_LOCAL_AMT
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_NUMBER = 'S00177282'
        ORDER BY CHARGE_PK DESC
    """)
    
    rows = cur.fetchall()
    print(f"Total charges: {len(rows)}")

    # Query PROD.CORE.JOBCHARGELINES directly for exact timestamps
    cur.execute("""
        SELECT 
            jl.JL_JOBNUM,
            jl.JL_SYSTEMCREATETIMEUTC,
            jl.JL_SYSTEMLASTEDITTIMEUTC,
            jl.JL_SYSTEMCREATEUSER,
            jl.JL_SYSTEMLASTEDITUSER,
            jl.JL_GS_NKREPOPS,
            s.GS_FULLNAME,
            jl.JL_DESC
        FROM PROD.CORE.JOBCHARGELINES jl
        LEFT JOIN PROD.CORE.GLBSTAFF s ON jl.JL_GS_NKREPOPS = s.GS_CODE
        WHERE jl.JL_JOBNUM = 'S00177282' AND jl.ACTV_IND = TRUE
        ORDER BY jl.JL_SYSTEMLASTEDITTIMEUTC DESC
        LIMIT 15
    """)
    recent_charges = cur.fetchall()
    print("\nMost recently created/edited charge lines on S00177282 (from CargoWise database):")
    for r in recent_charges:
        print(f"  Created: {r[1]} | LastEdited: {r[2]} | EditUser: {r[4]} | OpsCode: {r[5]} ({r[6]}) | Desc: {r[7]}")

    # Check JOBHEADER current operator and edit time
    cur.execute("""
        SELECT 
            j.JH_JOBNUM,
            j.JH_SYSTEMCREATETIMEUTC,
            j.JH_SYSTEMLASTEDITTIMEUTC,
            j.JH_GS_NKREPOPS,
            s.GS_FULLNAME,
            j.JH_SYSTEMCREATEUSER,
            j.JH_SYSTEMLASTEDITUSER,
            j.JH_STATUS
        FROM PROD.CORE.JOBHEADER j
        LEFT JOIN PROD.CORE.GLBSTAFF s ON j.JH_GS_NKREPOPS = s.GS_CODE
        WHERE j.JH_JOBNUM = 'S00177282' AND j.ACTV_IND = TRUE
    """)
    job_headers = cur.fetchall()
    print("\nJobHeader records for S00177282:")
    for jh in job_headers:
        print(f"  JobNum: {jh[0]} | Created: {jh[1]} | LastEdited: {jh[2]} | HeaderOps: {jh[3]} ({jh[4]}) | EditUser: {jh[6]} | Status: {jh[7]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    check_latest_operator_s00177282()
