import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("1. JH_JH_PARENTJOB: WHAT VALUES EXIST IN PROD.CORE.JOBHEADER?")
    print("==================================================")
    cur.execute("""
        SELECT 
            CASE 
                WHEN JH_JH_PARENTJOB IS NULL THEN 'NULL'
                WHEN TRIM(JH_JH_PARENTJOB) = '' THEN 'EMPTY_STRING'
                ELSE 'VALID_VALUE'
            END AS PARENT_FK_TYPE,
            COUNT(*) AS CNT
        FROM PROD.CORE.JOBHEADER
        WHERE ACTV_IND = TRUE
        GROUP BY 1
    """)
    for r in cur.fetchall():
        print(r)

    print("\n==================================================")
    print("2. CHECK NON-EMPTY JH_JH_PARENTJOB SAMPLES")
    print("==================================================")
    cur.execute("""
        SELECT JH_JOBNUM, JH_HEADERTYPE, JH_PARENTTABLECODE, JH_JH_PARENTJOB, JH_SYSTEMCREATETIMEUTC
        FROM PROD.CORE.JOBHEADER
        WHERE ACTV_IND = TRUE AND JH_JH_PARENTJOB IS NOT NULL AND TRIM(JH_JH_PARENTJOB) != ''
        LIMIT 10
    """)
    rows = cur.fetchall()
    print(f"Count of non-empty sample rows returned: {len(rows)}")
    for r in rows:
        print(r)

    print("\n==================================================")
    print("3. WHAT TABLES / PARENT CODES EXIST IN JOBHEADER?")
    print("==================================================")
    cur.execute("""
        SELECT 
            JH_PARENTTABLECODE,
            JH_HEADERTYPE,
            COUNT(*) AS TOTAL_RECORDS,
            COUNT(CASE WHEN JH_SYSTEMCREATETIMEUTC >= '2026-04-01' THEN 1 END) AS RECORDS_SINCE_APR_2026
        FROM PROD.CORE.JOBHEADER
        WHERE ACTV_IND = TRUE
        GROUP BY 1, 2
        ORDER BY 3 DESC
    """)
    for r in cur.fetchall():
        print(r)

    print("\n==================================================")
    print("4. HOW ARE PARENT-CHILD RELATIONSHIPS STRUCTURED IN CARGOWISE?")
    print("==================================================")
    # Check if there are other tables like JOBCONSHIPLINK, JOBCONSOL, etc.
    cur.execute("""
        SELECT TABLE_NAME, ROW_COUNT 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'CORE' AND TABLE_CATALOG = 'PROD'
          AND (TABLE_NAME LIKE 'JOB%' OR TABLE_NAME LIKE '%CONSOL%' OR TABLE_NAME LIKE '%LINK%')
        ORDER BY TABLE_NAME
    """)
    for r in cur.fetchall():
        print(r)

    print("\n==================================================")
    print("5. INVESTIGATE V000XXXXX JOBS (What is V prefix in AAW / CargoWise?)")
    print("==================================================")
    cur.execute("""
        SELECT 
            JH_JOBNUM,
            JH_HEADERTYPE,
            JH_DIRECTION,
            JH_STATUS,
            JH_PARENTTABLECODE,
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
    print("6. PREFIX BREAKDOWN BY DEPARTMENT & BRANCH")
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

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
