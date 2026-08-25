import sys
import os
from collections import Counter
sys.path.append(os.path.abspath('backend'))

from app.services.snowflake_client import fetch_jobs_from_snowflake
from app.services.data_store import data_store
from app.services.rules import FLAG_PRIORITY, FLAG_COLOURS
from app.services.neg_movement_store import neg_movement_store

def verify():
    print("=================================================================")
    print("1. RUNNING LIVE SYNC & LOADING INTO DATA_STORE")
    print("=================================================================")
    parsed = fetch_jobs_from_snowflake()
    data_store.load(parsed, merge=False)
    
    jobs = data_store.jobs
    print(f"Total jobs loaded into data_store: {len(jobs):,}")
    print(f"Total operators discovered: {len(data_store.operators)}")
    print(f"Available branches: {data_store.available_branches}")
    print(f"Available departments: {data_store.available_departments}")

    print("\n=================================================================")
    print("2. DIRECTION & TAB DISTRIBUTION")
    print("=================================================================")
    direction_counts = Counter(j.get("direction") for j in jobs)
    is_export_counts = Counter(j.get("is_export") for j in jobs)
    for d, cnt in direction_counts.items():
        print(f"  Direction '{d}': {cnt:,} jobs")
    print(f"  is_export True (Exports tab): {is_export_counts[True]:,}")
    print(f"  is_export False (Imports tab): {is_export_counts[False]:,}")

    print("\n=================================================================")
    print("3. ALL 13 FLAGS DISTRIBUTION")
    print("=================================================================")
    flag_dist = data_store.get_flag_distribution()
    for idx, (flag, count) in enumerate(flag_dist.items(), 1):
        color = FLAG_COLOURS.get(flag, {}).get('colour', 'N/A')
        print(f"  {idx:2d}. {flag:<40} [{color:<7}]: {count:>6,} jobs")

    print("\n=================================================================")
    print("4. PRIMARY FLAG DISTRIBUTION")
    print("=================================================================")
    primary_counts = Counter(j.get("primary_flag") for j in jobs)
    for flag, cnt in primary_counts.most_common():
        print(f"  Primary '{flag or 'NO FLAG'}': {cnt:,} jobs")

    print("\n=================================================================")
    print("5. KPI METRICS (GLOBAL)")
    print("=================================================================")
    kpi = data_store.get_kpi()
    for k, v in kpi.items():
        if isinstance(v, float):
            print(f"  {k:<20}: ${v:,.2f}")
        else:
            print(f"  {k:<20}: {v:,}")

    print("\n=================================================================")
    print("6. BRANCH FILTER VALIDATION")
    print("=================================================================")
    for b in data_store.available_branches:
        b_jobs = data_store.get_all_jobs(branches=[b])
        b_kpi = data_store.get_kpi(branches=[b])
        print(f"  Branch '{b}': {len(b_jobs):>5,} jobs | Revenue: ${b_kpi['total_revenue']:>12,.2f} | Profit: ${b_kpi['total_profit']:>10,.2f}")

    print("\n=================================================================")
    print("7. DEPARTMENT FILTER VALIDATION (Top 10)")
    print("=================================================================")
    for d in data_store.available_departments[:10]:
        d_jobs = data_store.get_all_jobs(departments=[d])
        print(f"  Dept '{d}': {len(d_jobs):>5,} jobs")

    print("\n=================================================================")
    print("8. OPERATOR SUMMARY & FILTER VALIDATION (Top 5 Operators)")
    print("=================================================================")
    summaries = data_store.get_operator_summaries()
    print(f"Total operator summaries generated: {len(summaries)}")
    for s in summaries[:5]:
        op_code = s['code']
        op_jobs = data_store.get_all_jobs(operator=op_code)
        print(f"  Operator '{op_code}' ({s['branch']}): {s['total_jobs']} jobs (Matched: {len(op_jobs)}) | Rev: ${s['total_revenue']:,.2f} | P/L: ${s['total_profit']:,.2f} | WIP: {s['wip_count']}")

    print("\n=================================================================")
    print("9. OPS MANAGER REVIEW SECTIONS VALIDATION")
    print("=================================================================")
    ops_jobs = data_store.get_ops_review_jobs()
    print(f"Total entries in Ops Review: {len(ops_jobs):,}")
    ops_labels = Counter(item['ops_label'] for item in ops_jobs)
    for label, cnt in ops_labels.most_common():
        print(f"  Section '{label}': {cnt:,} jobs")

    print("\n=================================================================")
    print("10. NEGATIVE MOVEMENT STORE POPULATION")
    print("=================================================================")
    neg_movement_store.populate_from_snowflake(data_store.jobs, data_store.branch, data_store.period)
    neg_sec = neg_movement_store.sections
    print(f"  Negative movement section: {len(neg_sec.get('negative_movement', [])):,} jobs")
    print(f"  Excess profit section:     {len(neg_sec.get('excess_profit', [])):,} jobs")
    print(f"  Jobs with losses section:  {len(neg_sec.get('jobs_with_losses', [])):,} jobs")

    print("\n=================================================================")
    print("11. DATA SANITY CHECKS")
    print("=================================================================")
    # Check for None / NaN values
    jobs_with_missing_num = [j for j in jobs if not j.get('job_number')]
    jobs_with_nan_rev = [j for j in jobs if j.get('revenue') is None]
    jobs_with_nan_profit = [j for j in jobs if j.get('profit_loss') is None]
    jobs_with_no_branch = [j for j in jobs if not j.get('branch')]
    
    print(f"  Jobs with missing job number: {len(jobs_with_missing_num)}")
    print(f"  Jobs with null revenue: {len(jobs_with_nan_rev)}")
    print(f"  Jobs with null profit/loss: {len(jobs_with_nan_profit)}")
    print(f"  Jobs with no branch assigned: {len(jobs_with_no_branch)}")
    
    print("\nALL CHECKS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    verify()
