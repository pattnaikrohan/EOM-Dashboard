import sys
import os
sys.path.append(os.path.abspath('backend'))

from app.services.snowflake_client import fetch_jobs_from_snowflake
from app.services.data_store import data_store

def check_ginalyn_melbourne():
    parsed = fetch_jobs_from_snowflake()
    data_store.load(parsed, merge=False)

    print("==================================================")
    print("ALL JOBS FOR GINALYN LU IN MELBOURNE BRANCH")
    print("==================================================")
    
    # 1. Look for S00177282 specifically
    job_target = next((j for j in data_store.jobs if j.get("job_number") == "S00177282"), None)
    print("S00177282 in all jobs:")
    if job_target:
        print(f"  job_number: {job_target.get('job_number')}")
        print(f"  operator: '{job_target.get('operator')}'")
        print(f"  branch: '{job_target.get('branch')}'")
        print(f"  department: '{job_target.get('department')}'")
        print(f"  flags: {job_target.get('flags')}")
    else:
        print("  NOT FOUND")

    # 2. Get jobs for Ginalyn Lu with Melbourne branch filter
    mel_jobs = data_store.get_all_jobs(branches=["AAW Global Logistics - Melbourne"], operator="Ginalyn Lu")
    print(f"\ndata_store.get_all_jobs(branches=['AAW Global Logistics - Melbourne'], operator='Ginalyn Lu') -> {len(mel_jobs)} jobs:")
    for j in mel_jobs:
        print(f"  {j.get('job_number')} | Branch: {j.get('branch')} | Op: {j.get('operator')} | Flags: {j.get('flags')}")

    # 3. Check what get_operator_detail returns for Ginalyn Lu in Melbourne
    op_detail = data_store.get_operator_detail("Ginalyn Lu", branches=["AAW Global Logistics - Melbourne"])
    print(f"\nop_detail jobs_by_flag for Ginalyn Lu:")
    for flag, jobs in op_detail.get("jobs_by_flag", {}).items():
        if jobs:
            print(f"  Flag '{flag}': {[j['job_number'] for j in jobs]}")

    # 4. Check what operator summaries say for Ginalyn Lu
    summaries = data_store.get_operator_summaries(branches=["AAW Global Logistics - Melbourne"])
    g_sum = next((s for s in summaries if 'ginalyn' in s['name'].lower()), None)
    print(f"\nOperator summary for Ginalyn Lu in Melbourne: {g_sum}")

    # 5. Check all jobs where operator code is JL2 or name is Ginalyn Lu across all branches
    all_g_jobs = [j for j in data_store.jobs if 'ginalyn' in str(j.get('operator')).lower()]
    print(f"\nTotal jobs for Ginalyn Lu across ALL branches: {len(all_g_jobs)}")
    from collections import Counter
    print("Branch distribution for Ginalyn Lu:", Counter(j.get('branch') for j in all_g_jobs))

if __name__ == "__main__":
    check_ginalyn_melbourne()
