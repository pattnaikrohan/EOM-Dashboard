import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.services.blob_service import download_parsed_data

def check_blob():
    print("Downloading parsed data from Azure Blob Storage...")
    try:
        data = download_parsed_data()
        if not data:
            print("Blob data is empty / not found.")
            return
        
        print("Blob branch:", data.get("branch"))
        print("Blob period:", data.get("period"))
        print("Total jobs in blob:", len(data.get("jobs", [])))
        print("Total operators in blob:", len(data.get("operators", [])))
        
        jobs = data.get("jobs", [])
        claire_jobs = [j for j in jobs if 'claire' in str(j.get('operator')).lower() or j.get('operator') == 'AAB']
        print(f"\nClaire Brotherton jobs in blob: {len(claire_jobs)}")
        for cj in claire_jobs:
            print("  ", cj.get('job_number'), cj.get('branch'), cj.get('department'), cj.get('operator'), cj.get('revenue'))

        # Check Sydney jobs
        syd_jobs = [j for j in jobs if 'sydney' in str(j.get('branch')).lower() or j.get('branch') == 'SY1']
        print(f"\nSydney jobs in blob: {len(syd_jobs)}")
        from collections import Counter
        syd_ops = Counter(j.get('operator') for j in syd_jobs)
        print("Top operators in Sydney from blob:")
        for op, cnt in syd_ops.most_common(20):
            print(f"  {op}: {cnt}")
            
    except Exception as e:
        print("Error checking blob:", e)

if __name__ == "__main__":
    check_blob()
