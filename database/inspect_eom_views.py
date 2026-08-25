import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()
    
    print("=== 1. Find all EOM views across databases ===")
    try:
        cur.execute("SHOW VIEWS LIKE '%EOM%' IN ACCOUNT")
        views = cur.fetchall()
        for v in views:
            # v[1]=name, v[3]=database_name, v[4]=schema_name, v[5]=kind, v[6]=owner
            print(f"View: {v[3]}.{v[4]}.{v[1]}")
    except Exception as e:
        print("Error with SHOW VIEWS IN ACCOUNT, trying current db:", e)
        for db in ['PROD', 'DEV']:
            for schema in ['CORE', 'AI_AUTO', 'PUBLIC']:
                try:
                    cur.execute(f"SHOW VIEWS LIKE '%EOM%' IN {db}.{schema}")
                    for v in cur.fetchall():
                        print(f"View: {v[3]}.{v[4]}.{v[1]}")
                except Exception as ex:
                    pass

    print("\n=== 2. Check definition / columns of VW_EOM_JOB_CHARGES_UPDATED ===")
    target_view = None
    for full_name in [
        "PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED",
        "PROD.CORE.VW_EOM_JOB_CHARGES_UPDATED",
        "DEV.CORE.VW_EOM_JOB_CHARGES_UPDATED",
        "DEV.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED"
    ]:
        try:
            cur.execute(f"SELECT * FROM {full_name} LIMIT 1")
            cols = [d[0] for d in cur.description]
            print(f"Found {full_name}! Total columns: {len(cols)}")
            print("Columns:", cols)
            target_view = full_name
            break
        except Exception as e:
            # print(f"{full_name}: {e}")
            pass

    if not target_view:
        print("Could not find VW_EOM_JOB_CHARGES_UPDATED in standard locations. Searching INFORMATION_SCHEMA...")
        cur.execute("""
            SELECT TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME 
            FROM INFORMATION_SCHEMA.VIEWS 
            WHERE TABLE_NAME LIKE '%EOM%'
        """)
        for r in cur.fetchall():
            print(f"Found view in info schema: {r[0]}.{r[1]}.{r[2]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
