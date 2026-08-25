import os
import glob
import pandas as pd

def search_excel_files():
    excel_files = glob.glob('d:/EOM DASHBOARDS PROTO/**/*.xlsx', recursive=True) + glob.glob('d:/EOM DASHBOARDS PROTO/**/*.XLSX', recursive=True)
    print(f"Searching {len(excel_files)} Excel files for 'Claire' or 'AAB'...")
    
    for f in excel_files:
        try:
            xl = pd.ExcelFile(f)
            for sheet in xl.sheet_names:
                df = pd.read_excel(f, sheet_name=sheet, nrows=5000)
                # Search across all columns
                for col in df.columns:
                    matches = df[df[col].astype(str).str.contains('Claire|AAB|Brotherton', case=False, na=False)]
                    if len(matches) > 0:
                        print(f"\nFOUND in file: {os.path.basename(f)} (Sheet: {sheet}, Column: {col}) -> {len(matches)} rows")
                        sample_job_col = [c for c in df.columns if 'job' in c.lower() or 'num' in c.lower()]
                        if sample_job_col:
                            print(f"  Sample Jobs: {matches[sample_job_col[0]].head(5).tolist()}")
                        sample_branch_col = [c for c in df.columns if 'branch' in c.lower()]
                        if sample_branch_col:
                            print(f"  Branch column values: {matches[sample_branch_col[0]].head(5).tolist()}")
        except Exception as e:
            # print(f"Error reading {f}: {e}")
            pass

if __name__ == "__main__":
    search_excel_files()
