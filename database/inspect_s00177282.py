import sys
import os
sys.path.append(os.path.abspath('backend'))

from app.services.snowflake_client import fetch_jobs_from_snowflake
from app.services.data_store import data_store
from app.services.rules import get_flags, priority_flag

def inspect_job_s00177282():
    print("==================================================")
    print("1. RUN LIVE SYNC TO FIND S00177282")
    print("==================================================")
    parsed = fetch_jobs_from_snowflake()
    data_store.load(parsed, merge=False)
    
    target = "S00177282"
    job = next((j for j in data_store.jobs if j.get("job_number") == target), None)
    
    if not job:
        print(f"Job {target} NOT FOUND in data_store!")
        return

    print(f"FOUND Job {target}:")
    for k, v in sorted(job.items()):
        print(f"  {k:<25}: {v}")

    print("\n==================================================")
    print("2. FLAGS & SECTION EVALUATION FOR S00177282")
    print("==================================================")
    flags = get_flags(job)
    p_flag = priority_flag(flags)
    print(f"  Flags list ({len(flags)}): {flags}")
    print(f"  Primary Flag       : {p_flag or 'NONE (Clean Job)'}")
    
    print("\n==================================================")
    print("3. WHERE DOES IT APPEAR IN THE UI?")
    print("==================================================")
    print(f"  Branch             : '{job.get('branch')}'")
    print(f"  Department         : '{job.get('department')}'")
    print(f"  Operator           : '{job.get('operator')}'")
    print(f"  Direction Tab      : '{job.get('direction')}' (is_export={job.get('is_export')})")
    print(f"  Job Status         : '{job.get('job_status')}'")
    print(f"  ETD                : '{job.get('etd')}'")
    print(f"  ETA                : '{job.get('eta')}'")
    print(f"  Revenue            : ${job.get('revenue'):,.2f}")
    print(f"  Cost               : ${job.get('cost'):,.2f}")
    print(f"  Profit/Loss        : ${job.get('profit_loss'):,.2f}")
    print(f"  WIP                : ${job.get('wip'):,.2f}")
    print(f"  Accrual            : ${job.get('accrual'):,.2f}")
    
    # Check if visible in Ops Review
    ops_entries = [item for item in data_store.get_ops_review_jobs() if item['job']['job_number'] == target]
    print(f"\n  Visible in Ops Review? {len(ops_entries) > 0} ({len(ops_entries)} sections: {[e['ops_label'] for e in ops_entries]})")

    # Check if visible in Operator View for its operator
    op_jobs = data_store.get_all_jobs(operator=job.get('operator'))
    in_op_view = any(j['job_number'] == target for j in op_jobs)
    print(f"  Visible under Operator '{job.get('operator')}'? {in_op_view}")

if __name__ == "__main__":
    inspect_job_s00177282()
