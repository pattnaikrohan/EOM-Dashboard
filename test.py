import sys
import os

# Add backend to path so we can import app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.parser import parse_excel
from app.services.data_store import data_store

file_path = "D:\\EOM DASHBOARDS PROTO\\CargoWise Export - 20260428112407 - 854.xlsx"

try:
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    print(f"Reading file: {file_path}")
    parsed_data = parse_excel(file_bytes, os.path.basename(file_path))
    
    # Load into data store
    data_store.load(parsed_data)
    
    print("--- Loaded Data ---")
    print(f"Branch: {data_store.branch}")
    print(f"Period: {data_store.period}")
    print(f"Total Operators: {len(data_store.operators)}")
    print(f"Total Jobs: {len(data_store.jobs)}")
    
    print("\n--- KPI Summary ---")
    kpi = data_store.get_kpi()
    for k, v in kpi.items():
        print(f"  {k}: {v}")
        
    print("\n--- Flag Distribution ---")
    flags = data_store.get_flag_distribution()
    for k, v in flags.items():
        if v > 0:
            print(f"  {k}: {v}")
            
    print("\n✅ Successfully tested data with application logic.")
except Exception as e:
    print(f"Error testing data: {e}")
