"""
In-memory data store for parsed EOM data.
Acts as the data layer between the parser and the API.
"""
from __future__ import annotations
import functools
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
                if not j.get("department") and j.get("revenue", 0) == 0 and j.get("cost", 0) == 0 and j.get("accrual", 0) == 0 and not j.get("flags") and not j.get("source_type"):
                    continue
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
                    # Preserve aged accrual markers during merge
                    if j.get("has_aged_accruals"):
                        old_j["has_aged_accruals"] = True
                    if j.get("accrual_lines") and not old_j.get("accrual_lines"):
                        old_j["accrual_lines"] = j["accrual_lines"]
                    old_j["job_age_days"] = max(old_j.get("job_age_days", 0), j.get("job_age_days", 0))
                    # Pass the full merged period string to check against all uploaded periods
                    old_j["flags"] = get_flags(old_j, self.period)
                    old_j["primary_flag"] = priority_flag(old_j["flags"])
                    old_j["ops_section"] = get_ops_section(old_j)
                else:
                    existing_jobs[job_id] = j
                    
            self.jobs = [j for j in existing_jobs.values() if j.get("department") or j.get("flags") or j.get("source_type") or j.get("revenue", 0) != 0 or j.get("cost", 0) != 0 or j.get("accrual", 0) != 0]
        else:
            self.branch = parsed.get("branch", "")
            self.period = parsed.get("period", "")
            self.operators = parsed.get("operators", [])
            self.jobs = [j for j in parsed.get("jobs", []) if j.get("department") or j.get("flags") or j.get("source_type") or j.get("revenue", 0) != 0 or j.get("cost", 0) != 0 or j.get("accrual", 0) != 0]

        # Always recompute flags and direction for all jobs using active V3 rules
        from app.services.rules import get_flags, priority_flag, get_ops_section
        for j in self.jobs:
            j["flags"] = get_flags(j, self.period)
            j["primary_flag"] = priority_flag(j["flags"])
            j["ops_section"] = get_ops_section(j)

        # Re-apply any saved workflow states (EOM Review & Triage status)
        self._reapply_workflow_states()

        self.available_branches = sorted(list(set(j.get("branch", "") for j in self.jobs if j.get("branch"))))
        self.available_departments = sorted(list(set(j.get("department", "") for j in self.jobs if j.get("department"))))
        
        self._loaded = True

    def _reapply_workflow_states(self):
        pass

    def clear(self):
        self.branch = ""
        self.period = ""
        self.operators = []
        self.jobs = []
        self.available_branches = []
        self.available_departments = []
        self._loaded = False
        self._get_all_jobs_cached.cache_clear()

    # ── Query helpers ──────────────────────────────────────────────────────

    def get_all_jobs(self, operator: Optional[str] = None, flags: Optional[list[str]] = None,
                     branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> list[dict]:
        """Filter jobs by operator, flags, branches, and departments if specified."""
        flags_tuple = tuple(flags) if flags else None
        branches_tuple = tuple(branches) if branches else None
        departments_tuple = tuple(departments) if departments else None
        return self._get_all_jobs_cached(operator, flags_tuple, branches_tuple, departments_tuple)

    @functools.lru_cache(maxsize=128)
    def _get_all_jobs_cached(self, operator, flags, branches, departments):
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
            "visible_jobs":    len([j for j in jobs if any(f in j.get("flags", []) for f in [
                "EXPORTS Jobs pending invoicing", "CROSS-TRADE Jobs pending invoicing", 
                "IMPORTS Jobs pending invoicing", "IMPORTS B Jobs pending invoicing", "IMPORTS S Jobs pending invoicing", 
                "DOMESTIC Jobs pending invoicing", "Jobs with WIPs", "Jobs at INV Status", 
                "Jobs with Aged Accruals"
            ])]),
            "export_jobs":     sum(1 for j in jobs if j.get("is_export")),
            "import_jobs":     sum(1 for j in jobs if not j.get("is_export")),
            "cross_trade_jobs": sum(1 for j in jobs if "CROSS-TRADE Jobs pending invoicing" in j.get("flags", [])),
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
            "clean_jobs":      0,
        }

    def get_operator_summaries(self, flags: Optional[list[str]] = None,
                               branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> list[dict]:
        """Get summary for each operator, optionally filtered."""
        summaries = []
        filtered_jobs = self.get_all_jobs(None, flags, branches, departments)
        
        jobs_by_op = {op: [] for op in self.operators}
        for j in filtered_jobs:
            op = j.get("operator")
            if op in jobs_by_op:
                jobs_by_op[op].append(j)

        for op in self.operators:
            jobs = jobs_by_op[op]
            if len(jobs) == 0:
                continue
                
            op_branches = [j.get("branch") for j in jobs if j.get("branch")]
            op_branch = max(set(op_branches), key=op_branches.count) if op_branches else self.branch or "ALL"

            summaries.append({
                "code":          op,
                "branch":        op_branch,
                "total_jobs":    len(jobs),
                "visible_jobs":  len([j for j in jobs if any(f in j.get("flags", []) for f in [
                    "EXPORTS Jobs pending invoicing", "CROSS-TRADE Jobs pending invoicing", 
                    "IMPORTS Jobs pending invoicing", "IMPORTS B Jobs pending invoicing", "IMPORTS S Jobs pending invoicing", 
                    "DOMESTIC Jobs pending invoicing", "Jobs with WIPs", "Jobs at INV Status", 
                    "Jobs with Aged Accruals"
                ])]),
                "export_jobs":   sum(1 for j in jobs if j.get("is_export")),
                "import_jobs":   sum(1 for j in jobs if not j.get("is_export")),
                "loss_count":    sum(1 for j in jobs if any("LOSS" in f for f in j.get("flags", []))),
                "wip_count":     sum(1 for j in jobs if any("WIP" in f for f in j.get("flags", []))),
                "margin_count":  sum(1 for j in jobs if any("LOW MARGIN" in f for f in j.get("flags", []))),
                "zero_rev_count": sum(1 for j in jobs if any("Aged Accrual" in f for f in j.get("flags", []))),
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
        """Group jobs by ALL flags they have (a job appears in every section it qualifies for)."""
        jobs = self.get_all_jobs(operator, flags, branches, departments)
        grouped: dict[str, list[dict]] = {}
        for f in FLAG_PRIORITY:
            grouped[f] = [j for j in jobs if f in j.get("flags", [])]
        return grouped

    def get_ops_review_jobs(self, flags: Optional[list[str]] = None,
                            branches: Optional[list[str]] = None, departments: Optional[list[str]] = None) -> list[dict]:
        """Get jobs that need Ops Manager review, filtered.
        A job appears once per flag it has, so it shows in every relevant section."""
        jobs = self.get_all_jobs(None, flags, branches, departments)
        result = []
        for j in jobs:
            job_flags = j.get("flags", [])
            if not job_flags:
                continue
            for flag in job_flags:
                result.append({"job": j, "ops_label": flag})
        return result

    def get_legend(self) -> list[dict]:
        """Return flag legend definitions."""
        rules = {
            "EXPORTS Jobs pending invoicing": "Jobs departing this month requiring invoicing",
            "CROSS-TRADE Jobs pending invoicing": "Jobs arriving this month requiring invoicing",
            "IMPORTS B Jobs pending invoicing": "Jobs arriving this month requiring invoicing",
            "IMPORTS S Jobs pending invoicing": "Jobs arriving this month requiring invoicing",
            "DOMESTIC Jobs pending invoicing": "Jobs departing this month requiring invoicing",
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
