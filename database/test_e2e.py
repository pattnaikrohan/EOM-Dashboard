import sys, os
sys.path.append(os.path.abspath('backend'))
from app.services.snowflake_client import fetch_jobs_from_snowflake

result = fetch_jobs_from_snowflake()
jobs = result['jobs']
print(f"Total jobs: {len(jobs):,}")
print(f"Branches: {result['branch']}")
print(f"Operators: {len(result['operators'])}")

# Check flags will work - verify key fields exist
sample = jobs[0] if jobs else {}
required = ['job_number','job_status','branch','department','open_date','operator',
            'revenue','wip','cost','accrual','profit_loss','margin_pct','job_age_days',
            'is_export','is_cross_trade','etd','eta','job_direction','has_aged_accruals']
missing = [k for k in required if k not in sample]
print(f"Missing required fields: {missing or 'NONE - all present'}")

# Check aged accruals detection
aged = [j for j in jobs if j.get('has_aged_accruals')]
print(f"Jobs with aged accruals (ACR recognition >= 90 days): {len(aged)}")

# Sample 3 jobs
for j in jobs[:3]:
    print(f"  {j['job_number']} | {j['branch']} | Dept:{j['department']} | Rev:${j['revenue']:,.2f} | Cost:${j['cost']:,.2f} | WIP:${j['wip']:,.2f} | Accr:${j['accrual']:,.2f} | AgedAccr:{j['has_aged_accruals']}")
