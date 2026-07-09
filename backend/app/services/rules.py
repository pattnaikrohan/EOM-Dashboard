"""
EOM Business Rules Engine.

Implements the V3 consolidated flag system (Pending Invoicing & Month End Closing Checkers).
"""
from __future__ import annotations
from datetime import datetime

# ── Flag priority order (highest first) ────────────────────────────────────────
FLAG_PRIORITY = [
    "EXPORTS Jobs pending invoicing",
    "CROSS-TRADE Jobs pending invoicing",
    "IMPORTS B Jobs pending invoicing",
    "IMPORTS S Jobs pending invoicing",
    "Unbilled Jobs with PROFIT",
    "Unbilled Jobs with LOSS",
    "Jobs with WIPs",
    "Billed Jobs with LOSS",
    "Billed Jobs with LOW MARGIN",
    "Billed Jobs — EXTREME Profit",
    "Jobs at INV Status",
    "Jobs at CMP — Ready to CLOSE",
    "Jobs with Aged Accruals"
]

# ── Flag colour mapping ───────────────────────────────────────────────────────
FLAG_COLOURS = {
    "EXPORTS Jobs pending invoicing":     {"colour": "Blue",   "hex": "#3B82F6"},
    "CROSS-TRADE Jobs pending invoicing": {"colour": "Violet", "hex": "#8B5CF6"},
    "IMPORTS B Jobs pending invoicing":   {"colour": "Indigo", "hex": "#6366F1"},
    "IMPORTS S Jobs pending invoicing":   {"colour": "Cyan",   "hex": "#06B6D4"},
    "Unbilled Jobs with PROFIT":          {"colour": "Emerald","hex": "#10B981"},
    "Unbilled Jobs with LOSS":            {"colour": "Red",    "hex": "#EF4444"},
    "Jobs with WIPs":                     {"colour": "Orange", "hex": "#F97316"},
    "Billed Jobs with LOSS":              {"colour": "Rose",   "hex": "#F43F5E"},
    "Billed Jobs with LOW MARGIN":        {"colour": "Yellow", "hex": "#EAB308"},
    "Billed Jobs — EXTREME Profit":       {"colour": "Green",  "hex": "#22C55E"},
    "Jobs at INV Status":                 {"colour": "Slate",  "hex": "#64748B"},
    "Jobs at CMP — Ready to CLOSE":       {"colour": "Teal",   "hex": "#14B8A6"},
    "Jobs with Aged Accruals":            {"colour": "Amber",  "hex": "#F59E0B"}
}

# ── Acceptable department codes ────────────────────────────────────────────────
ACCEPTABLE_DEPTS = [
    "FIJ", "FEJ", "FES", "FIS", "FEA", "FIA", "FEB", "FIB",
    "FIC", "FEC", "BEX", "BIX",
]

def is_export_dept(dept: str) -> bool:
    """Determine direction from department code. Second char E = export, I = import."""
    d = (dept or "").strip().upper()
    if len(d) >= 2:
        if d[1] == "E":
            return True
        if d[1] == "I":
            return False
    return True  # default to export

def is_current_month(date_str: str, report_period: str = "") -> bool:
    if not date_str:
        return True
    try:
        # Expected format: DD/MM/YYYY
        d = datetime.strptime(date_str, "%d/%m/%Y")
        now = datetime.now()
        if d.year == now.year and d.month == now.month:
            return True
        if report_period:
            # Check against any of the merged periods like "June 2026, July 2026"
            periods = [p.strip() for p in report_period.split(",")]
            for p_str in periods:
                try:
                    p = datetime.strptime(p_str, "%B %Y")
                    if d.year == p.year and d.month == p.month:
                        return True
                except ValueError:
                    pass
        return False
    except ValueError:
        return True

def is_current_or_past_month(date_str: str, report_period: str = "") -> bool:
    """True if date is in the current month or any previous month (ETD/ETA has occurred or is occurring)."""
    if not date_str:
        return True  # no date = assume eligible
    try:
        d = datetime.strptime(date_str, "%d/%m/%Y")
        now = datetime.now()
        # Current or past: date's year-month <= current year-month
        if (d.year, d.month) <= (now.year, now.month):
            return True
        # Also check against report period(s)
        if report_period:
            for p_str in report_period.split(","):
                try:
                    p = datetime.strptime(p_str.strip(), "%B %Y")
                    if (d.year, d.month) <= (p.year, p.month):
                        return True
                except ValueError:
                    pass
        return False
    except ValueError:
        return True

def get_flags(job: dict, report_period: str = "") -> list[str]:
    """Compute all applicable V3 flags for a job."""
    flags = []
    pl     = float(job.get("profit_loss", 0) or 0)
    wip    = float(job.get("wip", 0) or 0)
    status = str(job.get("job_status", "")).strip().upper()
    margin = float(job.get("margin_pct", 0) or 0)
    rev    = float(job.get("revenue", 0) or 0)
    age    = int(job.get("job_age_days", 0) or 0)
    accr   = float(job.get("accrual", 0) or 0)
    cost   = float(job.get("cost", 0) or 0)
    dept   = str(job.get("department", "")).strip().upper()
    job_num = str(job.get("job_number", "")).strip().upper()
    is_exp = bool(job.get("is_export", is_export_dept(dept)))
    
    # If job number explicitly starts with B or S, it is an Import job
    if job_num.startswith("B") or job_num.startswith("S"):
        is_exp = False
        
    origin = str(job.get("origin", "")).strip().upper()
    dest   = str(job.get("destination", "")).strip().upper()
    
    # Use ETD for exports/cross-trade, ETA for imports (as specified in feedback)
    etd_str = str(job.get("etd", "") or "").strip()
    eta_str = str(job.get("eta", "") or "").strip()
    
    # Only exclude CMP and CLS from pending invoicing (IHL is allowed)
    pending_statuses = ("CMP", "CLS")

    # Cross-Trade check
    is_cross_trade = False
    if origin and dest and not origin.startswith("AU") and not dest.startswith("AU"):
        is_cross_trade = True

    # 1. CROSS-TRADE Jobs pending invoicing (uses ETD)
    if is_cross_trade and status not in pending_statuses and is_current_or_past_month(etd_str, report_period):
        flags.append("CROSS-TRADE Jobs pending invoicing")
        
    # 2. EXPORTS Jobs pending invoicing (uses ETD)
    elif is_exp and status not in pending_statuses and is_current_or_past_month(etd_str, report_period):
        flags.append("EXPORTS Jobs pending invoicing")
    
    # 3. IMPORTS B Jobs pending invoicing (uses ETA)
    elif not is_exp and (job_num.startswith("B") or dept == "FIB") and status not in pending_statuses and is_current_or_past_month(eta_str, report_period):
        flags.append("IMPORTS B Jobs pending invoicing")
    
    # 4. IMPORTS S Jobs pending invoicing (uses ETA)
    elif not is_exp and (job_num.startswith("S") or dept == "FIS") and status not in pending_statuses and is_current_or_past_month(eta_str, report_period):
        flags.append("IMPORTS S Jobs pending invoicing")

    # 5. Unbilled Jobs with PROFIT
    if rev == 0 and pl > 0:
        flags.append("Unbilled Jobs with PROFIT")
    
    # 6. Unbilled Jobs with LOSS
    if rev == 0 and pl < 0:
        flags.append("Unbilled Jobs with LOSS")
    
    # 7. Jobs with WIPs
    if wip > 40 and (abs(accr) > 40 or abs(cost) > 40):
        flags.append("Jobs with WIPs")
    
    # 8. Billed Jobs with LOSS
    if rev > 0 and pl < 0 and status in ("CMP", "IHL"):
        flags.append("Billed Jobs with LOSS")
    
    # 9. Billed Jobs with LOW MARGIN
    if rev > 0 and margin < 5 and status in ("CMP", "IHL"):
        flags.append("Billed Jobs with LOW MARGIN")
    
    # 10. Billed Jobs — EXTREME Profit
    if rev > 0 and pl >= 5000 and status in ("CMP", "IHL"):
        flags.append("Billed Jobs — EXTREME Profit")
    
    # 11. Jobs at INV Status
    if rev > 0 and status == "INV":
        flags.append("Jobs at INV Status")
    
    # 12. Jobs at CMP — Ready to CLOSE
    if rev > 0 and pl > 0 and accr == 0 and wip == 0 and status == "CMP":
        flags.append("Jobs at CMP — Ready to CLOSE")
        
    # 13. Jobs with Aged Accruals — trust source file OR computed age
    if job.get("has_aged_accruals") or (abs(accr) > 0 and age > 90):
        flags.append("Jobs with Aged Accruals")

    return flags

def priority_flag(flags: list[str]) -> str:
    """Return the highest-priority flag from the list."""
    for f in FLAG_PRIORITY:
        if f in flags:
            return f
    return ""

def get_ops_section(job: dict) -> str | None:
    """
    Determine if a job should appear in the Ops Manager Review,
    and under which section label.
    """
    pf = str(job.get("primary_flag", ""))

    if pf:
        return pf
    return None
