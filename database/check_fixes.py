import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import get_connection

def main():
    conn = get_connection()
    cur = conn.cursor()

    print("==================================================")
    print("CHECK IF PROBLEMS 1 & 2 ARE FIXED")
    print("==================================================")

    # Get column list and data types
    print("\n--- 1. Check all columns and their data types ---")
    cur.execute("""
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION
        FROM PROD.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'AI_AUTO'
          AND TABLE_NAME = 'VW_EOM_JOB_CHARGES_UPDATED'
        ORDER BY ORDINAL_POSITION
    """)
    date_cols = []
    has_job_age_days = False
    for r in cur.fetchall():
        col_name, dtype, char_len, num_prec = r
        # Highlight date-related columns
        is_date_col = any(k in col_name for k in ['DATE', 'UTC', 'ETD', 'ETA', 'OPENED', 'CLOSED', 'EXPORT', 'ARRIVAL', 'RECOGNITION', 'INVOICE_DATE', 'DEST_DATE'])
        if is_date_col:
            date_cols.append((col_name, dtype))
            marker = " <<<< DATE COLUMN"
        elif col_name == 'JOB_AGE_DAYS':
            has_job_age_days = True
            marker = " <<<< FOUND IT!"
        else:
            marker = ""
        print(f"  {col_name:<45} {dtype:<15}{marker}")

    print("\n--- 2. Date column types summary ---")
    if date_cols:
        for col, dtype in date_cols:
            status = "✅ NATIVE DATE" if dtype in ('DATE', 'TIMESTAMP_NTZ', 'TIMESTAMP_LTZ', 'TIMESTAMP_TZ') else "❌ STILL STRING"
            print(f"  {col:<45} {dtype:<15} {status}")
    else:
        print("  No date-related columns found!")

    print(f"\n--- 3. JOB_AGE_DAYS column exists? {'✅ YES' if has_job_age_days else '❌ NO'} ---")

    # Sample actual values to verify
    print("\n--- 4. Sample actual values from date columns ---")
    cur.execute("""
        SELECT 
            JOB_NUMBER,
            JOB_OPENED_DATE,
            JOB_CLOSED_DATE,
            JOB_CREATED_UTC,
            SHIPMENT_ETD,
            SHIPMENT_ETA,
            CHARGE_CREATED_UTC,
            WIP_RECOGNITION_DATE,
            COST_AP_INVOICE_DATE
        FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
        WHERE JOB_OPENED_DATE IS NOT NULL
        LIMIT 5
    """)
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    for row in rows:
        print(f"\n  Job: {row[0]}")
        for i, col in enumerate(cols[1:], 1):
            val = row[i]
            val_type = type(val).__name__
            print(f"    {col:<30} = {str(val):<25} (Python type: {val_type})")

    # Check JOB_AGE_DAYS if it exists
    if has_job_age_days:
        print("\n--- 5. Sample JOB_AGE_DAYS values ---")
        cur.execute("""
            SELECT JOB_NUMBER, JOB_OPENED_DATE, JOB_AGE_DAYS
            FROM PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED
            WHERE JOB_AGE_DAYS IS NOT NULL
            LIMIT 5
        """)
        for r in cur.fetchall():
            print(f"  {r[0]}: Opened={r[1]}, Age={r[2]} days")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
