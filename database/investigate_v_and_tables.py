import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("USE DATABASE PROD")
    cur.execute("USE SCHEMA CORE")

    print("==================================================")
    print("1. INVESTIGATE V000XXXXX JOBS (What is V prefix?)")
    print("==================================================")
    cur.execute("""
        SELECT 
            JH_JOBNUM,
            JH_HEADERTYPE,
            JH_DIRECTION,
            JH_STATUS,
            JH_PARENTTABLECODE,
            JH_PARENTID,
            JH_NAME,
            JH_DESCRIPTION,
            JH_GE,
            JH_GB,
            JH_SYSTEMCREATETIMEUTC
        FROM PROD.CORE.JOBHEADER
        WHERE ACTV_IND = TRUE AND JH_JOBNUM LIKE 'V%'
        LIMIT 10
    """)
    for r in cur.fetchall():
        print(r)

    print("\n==================================================")
    print("2. PREFIX BREAKDOWN BY DEPARTMENT & BRANCH IN PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED")
    print("==================================================")
    cur.execute("""
        SELECT 
            LEFT(JOB_NUMBER, 1) AS PREFIX,
            JOB_DEPARTMENT_CODE,
            JOB_DEPARTMENT_DESCRIPTION,
            JOB_DIRECTION,
            COUNT(DISTINCT JOB_NUMBER) AS DISTINCT_JOBS
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        GROUP BY 1, 2, 3, 4
        ORDER BY 1, 5 DESC
    """)
    for r in cur.fetchall():
        print(r)

    print("\n==================================================")
    print("3. WHAT TABLES EXIST IN PROD.CORE?")
    print("==================================================")
    cur.execute("""
        SELECT TABLE_NAME, ROW_COUNT 
        FROM PROD.INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'CORE'
        ORDER BY TABLE_NAME
    """)
    for r in cur.fetchall():
        print(f"  {r[0]:<35} {r[1]}")

    print("\n==================================================")
    print("4. CHECK WHAT TABLES 'TH', 'D4', 'JS', 'JE' CORRESPOND TO")
    print("==================================================")
    cur.execute("""
        SELECT JH_PARENTTABLECODE, LEFT(JH_JOBNUM, 1) AS PREFIX, COUNT(*) AS CNT
        FROM PROD.CORE.JOBHEADER
        WHERE ACTV_IND = TRUE
        GROUP BY 1, 2
        ORDER BY 1, 2
    """)
    for r in cur.fetchall():
        print(r)

    print("\n==================================================")
    print("5. CHECK V-JOBS VS S-JOBS VS B-JOBS IN SHIPMENT / DECLARATION TABLES")
    print("==================================================")
    # Check if V-jobs join to JOBSHIPMENT (JS) or something else
    cur.execute("""
        SELECT 
            LEFT(j.JH_JOBNUM, 1) AS PREFIX,
            j.JH_PARENTTABLECODE,
            COUNT(DISTINCT j.JH_JOBNUM) AS TOTAL_JOBS,
            COUNT(s.JS_PK) AS MATCHED_SHIPMENT,
            COUNT(d.JE_PK) AS MATCHED_DECLARATION
        FROM PROD.CORE.JOBHEADER j
        LEFT JOIN PROD.CORE.JOBSHIPMENT s ON j.JH_PARENTID = s.JS_PK AND j.JH_PARENTTABLECODE = 'JS'
        LEFT JOIN PROD.CORE.JOBDECLARATION d ON j.JH_PARENTID = d.JE_PK AND j.JH_PARENTTABLECODE = 'JE'
        WHERE j.ACTV_IND = TRUE AND j.JH_SYSTEMCREATETIMEUTC >= '2026-04-01'
        GROUP BY 1, 2
        ORDER BY 1, 2
    """)
    for r in cur.fetchall():
        print(r)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
