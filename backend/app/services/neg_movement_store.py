"""
In-memory data store for Negative Movement data.
Manages the 3 report sections and supports in-app commentary workflow.
Comments are persisted independently via Azure Blob Storage.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional


# Default P&L reason categories (user can customise via Settings)
DEFAULT_PL_CATEGORIES = [
    "Accrued incorrectly",
    "Additional unbillable charges",
    "Consolidation parent job",
    "Exchange rate variance",
    "Dispute — awaiting credit",
    "Other",
]

VALID_STATUSES = ("pending", "responded", "reviewed", "closed")


class NegMovementStore:
    """Singleton-style store for Negative Movement report data."""

    def __init__(self):
        self.branch: str = ""
        self.period: str = ""
        self.sections: dict[str, list[dict]] = {
            "negative_movement": [],
            "excess_profit": [],
            "jobs_with_losses": [],
        }
        self.pl_categories: list[str] = list(DEFAULT_PL_CATEGORIES)
        self._loaded: bool = False
        # Separate comment store keyed by (section, job_number) to survive data refreshes
        self._comments: dict[str, dict] = {}

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load(self, parsed: dict):
        """Load parsed Negative Movement data from the Excel parser.
        Preserves any existing comments that match by job_number+section.
        """
        self.branch = parsed.get("branch", "")
        self.period = parsed.get("period", "")
        
        sections_data = parsed.get("sections", {})
        
        for section_name in ("negative_movement", "excess_profit", "jobs_with_losses"):
            jobs = sections_data.get(section_name, [])
            
            # Merge with existing comments
            for job in jobs:
                comment_key = f"{section_name}:{job['job_number']}"
                if comment_key in self._comments:
                    saved = self._comments[comment_key]
                    job["comment"] = saved.get("comment", job.get("comment", ""))
                    job["category"] = saved.get("category", job.get("category", ""))
                    job["notes_ho"] = saved.get("notes_ho", job.get("notes_ho", ""))
                    job["resolution_status"] = saved.get("resolution_status", job.get("resolution_status", "pending"))
                    job["updated_at"] = saved.get("updated_at", job.get("updated_at", ""))
                    
            self.sections[section_name] = jobs
            
        self._loaded = True

    def load_comments(self, comments_data: dict):
        """Load persisted comments from blob storage."""
        self._comments = comments_data.get("comments", {})
        self.pl_categories = comments_data.get("pl_categories", list(DEFAULT_PL_CATEGORIES))
        
        # Re-apply to loaded jobs
        if self._loaded:
            for section_name, jobs in self.sections.items():
                for job in jobs:
                    comment_key = f"{section_name}:{job['job_number']}"
                    if comment_key in self._comments:
                        saved = self._comments[comment_key]
                        job["comment"] = saved.get("comment", "")
                        job["category"] = saved.get("category", "")
                        job["notes_ho"] = saved.get("notes_ho", "")
                        job["resolution_status"] = saved.get("resolution_status", "pending")
                        job["updated_at"] = saved.get("updated_at", "")

    def clear(self):
        """Clear all data including comments."""
        self.branch = ""
        self.period = ""
        self.sections = {
            "negative_movement": [],
            "excess_profit": [],
            "jobs_with_losses": [],
        }
        self._comments = {}
        self._loaded = False

    def get_serializable_comments(self) -> dict:
        """Return comments data suitable for blob persistence."""
        return {
            "comments": self._comments,
            "pl_categories": self.pl_categories,
        }

    # ── Query helpers ──────────────────────────────────────────────────────

    def get_summary(self) -> dict:
        """Get KPI summary across all 3 sections."""
        result = {}
        total_overdue = 0
        
        for section_name, jobs in self.sections.items():
            pending = sum(1 for j in jobs if j.get("resolution_status") == "pending")
            responded = sum(1 for j in jobs if j.get("resolution_status") == "responded")
            reviewed = sum(1 for j in jobs if j.get("resolution_status") == "reviewed")
            closed = sum(1 for j in jobs if j.get("resolution_status") == "closed")
            
            # Count overdue (pending > 48 hours)
            overdue = 0
            now = datetime.now()
            for j in jobs:
                if j.get("resolution_status") == "pending":
                    created = j.get("created_at", "")
                    if created:
                        try:
                            created_dt = datetime.fromisoformat(created)
                            hours = (now - created_dt).total_seconds() / 3600
                            if hours > 48:
                                overdue += 1
                        except (ValueError, TypeError):
                            pass
            
            total_overdue += overdue
            
            result[section_name] = {
                "count": len(jobs),
                "total_profit": round(sum(j.get("job_profit", 0) for j in jobs), 2),
                "total_revenue": round(sum(j.get("revenue", 0) for j in jobs), 2),
                "total_cost": round(sum(j.get("cost", 0) for j in jobs), 2),
                "pending": pending,
                "responded": responded,
                "reviewed": reviewed,
                "closed": closed,
                "overdue": overdue,
            }
        
        result["overdue_count"] = total_overdue
        result["total_jobs"] = sum(r["count"] for r in result.values() if isinstance(r, dict) and "count" in r)
        
        return result

    def get_jobs(self, section: Optional[str] = None, 
                 status_filter: Optional[str] = None,
                 branch_filter: Optional[str] = None) -> list[dict]:
        """Get jobs, optionally filtered by section, status, and branch."""
        if section and section in self.sections:
            jobs = list(self.sections[section])
        else:
            jobs = []
            for section_jobs in self.sections.values():
                jobs.extend(section_jobs)
        
        if status_filter:
            jobs = [j for j in jobs if j.get("resolution_status") == status_filter]
        
        if branch_filter:
            jobs = [j for j in jobs if j.get("branch") == branch_filter]
        
        return jobs

    def update_comment(self, job_number: str, section: str, 
                       comment: Optional[str] = None,
                       category: Optional[str] = None,
                       notes_ho: Optional[str] = None,
                       resolution_status: Optional[str] = None) -> dict | None:
        """Update commentary fields for a specific job. Returns the updated job or None."""
        if section not in self.sections:
            return None
        
        for job in self.sections[section]:
            if job["job_number"] == job_number:
                now_iso = datetime.now().isoformat()
                
                if comment is not None:
                    job["comment"] = comment
                if category is not None:
                    job["category"] = category
                if notes_ho is not None:
                    job["notes_ho"] = notes_ho
                if resolution_status is not None and resolution_status in VALID_STATUSES:
                    job["resolution_status"] = resolution_status
                
                # Auto-set status to "responded" if comment is provided and status is still pending
                if comment and job["resolution_status"] == "pending":
                    job["resolution_status"] = "responded"
                    
                job["updated_at"] = now_iso
                
                # Persist to comments store
                comment_key = f"{section}:{job_number}"
                self._comments[comment_key] = {
                    "comment": job["comment"],
                    "category": job["category"],
                    "notes_ho": job["notes_ho"],
                    "resolution_status": job["resolution_status"],
                    "updated_at": now_iso,
                }
                
                return job
        
        return None

    def get_overdue_jobs(self, hours: int = 48) -> list[dict]:
        """Get all jobs that are still pending after the specified hours."""
        overdue = []
        now = datetime.now()
        
        for section_name, jobs in self.sections.items():
            for job in jobs:
                if job.get("resolution_status") != "pending":
                    continue
                created = job.get("created_at", "")
                if not created:
                    continue
                try:
                    created_dt = datetime.fromisoformat(created)
                    elapsed = (now - created_dt).total_seconds() / 3600
                    if elapsed > hours:
                        overdue.append(job)
                except (ValueError, TypeError):
                    continue
        
        return overdue

    def update_pl_categories(self, categories: list[str]):
        """Update the configurable P&L reason categories."""
        self.pl_categories = categories


# Global singleton
neg_movement_store = NegMovementStore()
