import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("1. GET DDL OF VW_EOM_JOB_CHARGES_UPDATED")
    print("==================================================")
    try:
        cur.execute("SELECT GET_DDL('view', 'PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED')")
        ddl = cur.fetchone()[0]
        with open('database/ddl_eom_updated.sql', 'w', encoding='utf-8') as f:
            f.write(ddl)
        print("DDL saved to database/ddl_eom_updated.sql (length: ", len(ddl), ")")
        print("DDL snippet (first 1000 chars):")
        print(ddl[:1000])
    except Exception as e:
        print("Error getting DDL:", e)

    print("\n==================================================")
    print("2. EXAMINE JOB TYPES AND PREFIXES (S, B, V, etc.)")
    print("==================================================")
    try:
        cur.execute("""
            SELECT 
                LEFT(JOB_NUMBER, 1) AS PREFIX,
                JOB_TYPE,
                JOB_DIRECTION,
                COUNT(DISTINCT JOB_NUMBER) AS DISTINCT_JOBS,
                COUNT(*) AS TOTAL_CHARGE_ROWS,
                MIN(JOB_NUMBER) AS SAMPLE_MIN,
                MAX(JOB_NUMBER) AS SAMPLE_MAX
            FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
            GROUP BY 1, 2, 3
            ORDER BY 1, 2, 3
        """)
        print(f"{'PREFIX':<8} | {'JOB_TYPE':<12} | {'DIRECTION':<10} | {'DISTINCT_JOBS':<14} | {'CHARGE_ROWS':<12} | {'SAMPLE_MIN':<15} | {'SAMPLE_MAX':<15}")
        print("-" * 95)
        for r in cur.fetchall():
            print(f"{str(r[0]):<8} | {str(r[1]):<12} | {str(r[2]):<10} | {str(r[3]):<14} | {str(r[4]):<12} | {str(r[5]):<15} | {str(r[6]):<15}")
    except Exception as e:
        print("Error querying prefixes:", e)

    print("\n==================================================")
    print("3. EXAMINE V000XXXXX JOBS SPECIFICALLY")
    print("==================================================")
    try:
        cur.execute("""
            SELECT 
                JOB_NUMBER,
                JOB_TYPE,
                JOB_DIRECTION,
                JOB_STATUS,
                JOB_DEPARTMENT_CODE,
                JOB_DEPARTMENT_DESCRIPTION,
                JOB_BRANCH_CODE,
                JOB_NAME,
                JOB_DESCRIPTION
            FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
            WHERE JOB_NUMBER LIKE 'V%'
            LIMIT 10
        """)
        for r in cur.fetchall():
            print(r)
    except Exception as e:
        print("Error querying V jobs:", e)

    print("\n==================================================")
    print("4. EXAMINE PARENT JOBS IN RAW PROD.CORE.JOBHEADER vs VIEW")
    print("==================================================")
    try:
        # Check raw JOBHEADER for JH_JH_PARENTJOB population
        cur.execute("""
            SELECT 
                COUNT(*) AS TOTAL_ACTIVE_JH,
                COUNT(JH_JH_PARENTJOB) AS WITH_PARENT_FK,
                COUNT(CASE WHEN JH_SYSTEMCREATETIMEUTC >= '2026-04-01' THEN 1 END) AS CREATED_SINCE_APRIL,
                COUNT(CASE WHEN JH_SYSTEMCREATETIMEUTC >= '2026-04-01' AND JH_JH_PARENTJOB IS NOT NULL THEN 1 END) AS APR_WITH_PARENT_FK
            FROM PROD.CORE.JOBHEADER
            WHERE ACTV_IND = TRUE
        """)
        r = cur.fetchone()
        print(f"Raw JOBHEADER: Total={r[0]}, WithParentFK={r[1]}, CreatedSinceApr={r[2]}, AprWithParentFK={r[3]}")

        # Check sample jobs with parent FK in raw table
        cur.execute("""
            SELECT 
                j.JH_JOBNUM, j.JH_STATUS, j.JH_SYSTEMCREATETIMEUTC, j.JH_JH_PARENTJOB,
                p.JH_JOBNUM AS PARENT_NUM, p.JH_SYSTEMCREATETIMEUTC AS PARENT_CRE_TIME
            FROM PROD.CORE.JOBHEADER j
            LEFT JOIN PROD.CORE.JOBHEADER p ON j.JH_JH_PARENTJOB = p.JH_PK
            WHERE j.ACTV_IND = TRUE AND j.JH_JH_PARENTJOB IS NOT NULL
            LIMIT 10
        """)
        print("\nSample raw jobs with parent FK:")
        for r in cur.fetchall():
            print(f"Child: {r[0]} (created {r[2]}), ParentFK: {r[3]}, ParentNum: {r[4]} (parent created {r[5]})")

    except Exception as e:
        print("Error querying parent jobs:", e)

    print("\n==================================================")
    print("5. CHECK PARENT_JOB_NUMBER IN VW_EOM_JOB_CHARGES_UPDATED")
    print("==================================================")
    try:
        cur.execute("""
            SELECT 
                COUNT(*) AS TOTAL_ROWS,
                COUNT(DISTINCT JOB_NUMBER) AS TOTAL_JOBS,
                COUNT(PARENT_JOB_NUMBER) AS WITH_PARENT_NUM,
                COUNT(DISTINCT PARENT_JOB_NUMBER) AS DISTINCT_PARENTS
            FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        """)
        r = cur.fetchone()
        print(f"In VW_EOM_JOB_CHARGES_UPDATED: TotalRows={r[0]}, TotalJobs={r[1]}, RowsWithParentNum={r[2]}, DistinctParents={r[3]}")
    except Exception as e:
        print("Error checking parent in updated view:", e)

    print("\n==================================================")
    print("6. CHECK SY1 BRANCH STATS")
    print("==================================================")
    try:
        cur.execute("""
            SELECT 
                JOB_BRANCH_CODE,
                JOB_BRANCH_NAME,
                COUNT(DISTINCT JOB_NUMBER) AS DISTINCT_JOBS,
                COUNT(*) AS TOTAL_ROWS,
                MIN(JOB_OPENED_DATE) AS MIN_OPEN_DT,
                MAX(JOB_OPENED_DATE) AS MAX_OPEN_DT
            FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
            WHERE JOB_BRANCH_CODE = 'SY1' OR JOB_BRANCH_NAME LIKE '%Sydney%'
            GROUP BY 1, 2
        """)
        for r in cur.fetchall():
            print(r)
    except Exception as e:
        print("Error checking SY1:", e)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
