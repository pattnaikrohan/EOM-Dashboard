"""
In-memory data store for parsed EOM data.
Acts as the data layer between the parser and the API.
"""
from __future__ import annotations
from typing import Optional
from app.services.rules import FLAG_COLOURS, FLAG_PRIORITY


class DataStore:
    """Singleton-style store holding the current parsed dataset."""

    def __init__(self):
        self.branch: str = ""
        self.period: str = ""
        self.operators: list[str] = []
        self.jobs: list[dict] = []
        self.available_branches: list[str] = []
        self.available_departments: list[str] = []
        self._loaded: bool = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load(self, parsed: dict, merge: bool = False):
        """Load parsed data from the Excel parser. If merge is True, combine with existing data."""
        if merge and self._loaded:
            # Combine branches and periods by taking unique comma-separated values
            existing_branches = set(b.strip() for b in self.branch.split(",") if b.strip())
            new_branch = parsed.get("branch", "")
            if new_branch and new_branch not in existing_branches:
                self.branch = f"{self.branch}, {new_branch}" if self.branch else new_branch
                
            existing_periods = set(p.strip() for p in self.period.split(",") if p.strip())
            new_period = parsed.get("period", "")
            if new_period and new_period not in existing_periods:
                self.period = f"{self.period}, {new_period}" if self.period else new_period
                
            self.operators = list(set(self.operators + parsed.get("operators", [])))
            
            # Deduplicate jobs by job_number
            existing_jobs = {j["job_number"]: j for j in self.jobs}
            for j in parsed.get("jobs", []):
                job_id = j["job_number"]
                if job_id in existing_jobs:
                    old_j = existing_jobs[job_id]
                    # Smart merge
                    for k, v in j.items():
                        if k in ("revenue", "wip", "cost", "profit_loss", "margin_pct"):
                            if v != 0.0:
                                old_j[k] = v
                        elif k == "accrual":
                            # Accrual from Job Billing (which might be the only one > 0) takes precedence
                            if v != 0.0:
                                old_j[k] = v
                        elif k in ("flags", "primary_flag", "ops_section"):
                            continue # we will recompute
                        elif k == "open_date":
                            if v and not old_j.get(k):
                                old_j[k] = v
                        else:
                            if v and (not old_j.get(k) or old_j.get(k) == "—"):
                                old_j[k] = v
                    
                    # Recompute flags
                    from app.services.rules import get_flags, priority_flag, get_ops_section
                    # Pick the first period string to pass for current_month checks
                    first_period = self.period.split(",")[0].strip() if self.period else ""
                    old_j["flags"] = get_flags(old_j, first_period)
                    old_j["primary_flag"] = priority_flag(old_j["flags"])
                    old_j["ops_section"] = get_ops_section(old_j)
                else:
                    existing_jobs[job_id] = j
                    
            self.jobs = list(existing_jobs.values())
        else:
            self.branch = parsed.get("branch", "")
            self.period = parsed.get("period", "")
            self.operators = parsed.get("operators", [])
            self.jobs = parsed.get("jobs", [])
        
        self.available_branches = sorted(list(set(j.get("branch", "") for j in self.jobs if j.get("branch"))))
        self.available_departments = sorted(list(set(j.get("department", "") for j in self.jobs if j.get("department"))))
        
        self._loaded = True

    def clear(self):
        self.branch = ""
        self.period = ""
        self.operators = []
        self.jobs = []
        self.available_branches = []
        self.available_departments = []
        self._loaded = False

    # ── Query helpers ──────────────────────────────────────────────────────

    def get_all_jobs(self, operator: Optional[str] = None, flags: Optional[list[str]] = None,
                     branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> list[dict]:
        """Filter jobs by operator, flags, branches, and departments if specified."""
        jobs = self.jobs
        if operator and operator.upper() != "ALL":
            jobs = [j for j in jobs if j["operator"] == operator]
            
        if branches:
            jobs = [j for j in jobs if j.get("branch") in branches]
            
        if departments:
            jobs = [j for j in jobs if j.get("department") in departments]
            
        if flags:
            filtered = []
            for j in jobs:
                j_flags = j.get("flags", [])
                p_flag = j.get("primary_flag")
                if any(f in flags for f in j_flags) or (p_flag in flags):
                    filtered.append(j)
            jobs = filtered
            
        return jobs

    def get_kpi(self, operator: Optional[str] = None, flags: Optional[list[str]] = None,
                branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> dict:
        """Compute KPI summary for all or a specific operator, optionally filtered by flags, branches, depts."""
        jobs = self.get_all_jobs(operator, flags, branches, departments)
        return {
            "total_jobs":      len(jobs),
            "export_jobs":     sum(1 for j in jobs if j.get("is_export")),
            "import_jobs":     sum(1 for j in jobs if not j.get("is_export")),
            "no_revenue":      sum(1 for j in jobs if j.get("revenue", 0) == 0),
            "has_wip":         sum(1 for j in jobs if j.get("wip", 0) != 0),
            "negative_profit": sum(1 for j in jobs if j.get("profit_loss", 0) < 0),
            "loss_jobs":       sum(1 for j in jobs if "LOSS" in j.get("flags", [])),
            "margin_below_5":  sum(1 for j in jobs if "MARGIN <5%" in j.get("flags", [])),
            "jfc_jobs":        sum(1 for j in jobs if "JFC" in j.get("flags", [])),
            "zero_rev_3m":     sum(1 for j in jobs if "ZERO REV >3M" in j.get("flags", [])),
            "jfc_opportunity": sum(1 for j in jobs if "JFC OPPORTUNITY" in j.get("flags", [])),
            "accrual_check":   sum(1 for j in jobs if "ACCRUAL CHECK" in j.get("flags", [])),
            "total_revenue":   round(sum(j.get("revenue", 0) for j in jobs), 2),
            "total_wip":       round(sum(j.get("wip", 0) for j in jobs), 2),
            "total_cost":      round(sum(j.get("cost", 0) for j in jobs), 2),
            "total_profit":    round(sum(j.get("profit_loss", 0) for j in jobs), 2),
        }

    def get_operator_summaries(self, flags: Optional[list[str]] = None,
                               branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> list[dict]:
        """Get summary for each operator, optionally filtered."""
        summaries = []
        for op in self.operators:
            jobs = self.get_all_jobs(op, flags, branches, departments)
            if len(jobs) == 0:
                continue
                
            op_branches = [j.get("branch") for j in jobs if j.get("branch")]
            op_branch = max(set(op_branches), key=op_branches.count) if op_branches else "Unknown"

            summaries.append({
                "code":          op,
                "branch":        op_branch,
                "total_jobs":    len(jobs),
                "export_jobs":   sum(1 for j in jobs if j.get("is_export")),
                "import_jobs":   sum(1 for j in jobs if not j.get("is_export")),
                "loss_count":    sum(1 for j in jobs if "LOSS" in j.get("flags", [])),
                "wip_count":     sum(1 for j in jobs if "WIP" in j.get("flags", [])),
                "margin_count":  sum(1 for j in jobs if "MARGIN <5%" in j.get("flags", [])),
                "zero_rev_count": sum(1 for j in jobs if "ZERO REV >3M" in j.get("flags", [])),
                "total_revenue": round(sum(j.get("revenue", 0) for j in jobs), 2),
                "total_profit":  round(sum(j.get("profit_loss", 0) for j in jobs), 2),
            })
        return summaries

    def get_flag_distribution(self, operator: Optional[str] = None, flags: Optional[list[str]] = None,
                              branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> dict[str, int]:
        """Count jobs per flag type, optionally filtered."""
        jobs = self.get_all_jobs(operator, flags, branches, departments)
        dist = {}
        for f in FLAG_PRIORITY:
            dist[f] = sum(1 for j in jobs if f in j.get("flags", []))
        return dist

    def get_jobs_by_flag(self, operator: Optional[str] = None, flags: Optional[list[str]] = None,
                         branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> dict[str, list[dict]]:
        """Group jobs by their primary flag, optionally filtered."""
        jobs = self.get_all_jobs(operator, flags, branches, departments)
        grouped: dict[str, list[dict]] = {}
        for f in FLAG_PRIORITY:
            grouped[f] = [j for j in jobs if j.get("primary_flag") == f]
        return {k: v for k, v in grouped.items() if v}  # remove empty groups

    def get_ops_review_jobs(self, flags: Optional[list[str]] = None,
                            branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> list[dict]:
        """Get jobs that need Ops Manager review, filtered."""
        jobs = self.get_all_jobs(None, flags, branches, departments)
        return [
            {"job": j, "ops_label": j.get("ops_section", "")}
            for j in jobs
            if j.get("ops_section")
        ]

    def get_legend(self) -> list[dict]:
        """Return flag legend definitions."""
        rules = {
            "EXPORTS Jobs pending invoicing": "Exports Jobs with a Departure date within the current month",
            "CROSS-TRADE Jobs pending invoicing": "Cross-Trade Jobs with a Departure date within the current month",
            "IMPORTS B Jobs pending invoicing": "Imports Jobs (FIB) with an Arrival date within the current month",
            "IMPORTS S Jobs pending invoicing": "Imports Jobs (FIS) with an Arrival date within the current month",
            "Unbilled Jobs with PROFIT": "Revenue = $0 AND Job Profit > $0",
            "Unbilled Jobs with LOSS": "Revenue = $0 AND Job Profit < $0",
            "Jobs with WIPs": "WIP > $40 AND (Accrual or Cost > $40)",
            "Billed Jobs with LOSS": "Revenue > $0 AND Job Profit < $0 at CMP/IHL",
            "Billed Jobs with LOW MARGIN": "Revenue > $0 AND Job Margin < 5% at CMP/IHL",
            "Billed Jobs — EXTREME Profit": "Revenue > $0 AND Job Profit >= $5,000 at CMP/IHL",
            "Jobs at INV Status": "Revenue > $0 AND Job Status = INV",
            "Jobs at CMP — Ready to CLOSE": "Revenue > $0, Job Profit > $0, Accrual = 0, WIP = 0 at CMP",
            "Jobs with Aged Accruals": "Accrual Recognised Date > 90 Days",
        }
        return [
            {
                "flag": f,
                "colour": FLAG_COLOURS[f]["colour"],
                "hex_code": FLAG_COLOURS[f]["hex"],
                "rule": rules.get(f, ""),
            }
            for f in FLAG_PRIORITY
        ]


# Global singleton
data_store = DataStore()
