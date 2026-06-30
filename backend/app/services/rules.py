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
        return False
    try:
        # Expected format: DD/MM/YYYY
        d = datetime.strptime(date_str, "%d/%m/%Y")
        if report_period:
            # Parse period like "May 2026"
            try:
                p = datetime.strptime(report_period.strip(), "%B %Y")
                return d.year == p.year and d.month == p.month
            except ValueError:
                pass
        now = datetime.now()
        return d.year == now.year and d.month == now.month
    except ValueError:
        return False

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
    is_exp = bool(job.get("is_export", is_export_dept(dept)))
    open_d = str(job.get("open_date", "")).strip()
    origin = str(job.get("origin", "")).strip().upper()
    dest   = str(job.get("destination", "")).strip().upper()
    
    current_month = is_current_month(open_d, report_period)
    pending_statuses = ("CMP", "IHL", "CLS")

    # Cross-Trade check
    is_cross_trade = False
    if origin and dest and not origin.startswith("AU") and not dest.startswith("AU"):
        is_cross_trade = True

    # 1. EXPORTS Jobs pending invoicing / CROSS-TRADE
    if is_exp and status not in pending_statuses and current_month:
        if is_cross_trade:
            flags.append("CROSS-TRADE Jobs pending invoicing")
        else:
            flags.append("EXPORTS Jobs pending invoicing")
    
    # 2. IMPORTS B Jobs pending invoicing
    if not is_exp and dept == "FIB" and status not in pending_statuses and current_month:
        flags.append("IMPORTS B Jobs pending invoicing")
    
    # 3. IMPORTS S Jobs pending invoicing
    if not is_exp and dept == "FIS" and status not in pending_statuses and current_month:
        flags.append("IMPORTS S Jobs pending invoicing")

    # 4. Unbilled Jobs with PROFIT
    if rev == 0 and pl > 0:
        flags.append("Unbilled Jobs with PROFIT")
    
    # 5. Unbilled Jobs with LOSS
    if rev == 0 and pl < 0:
        flags.append("Unbilled Jobs with LOSS")
    
    # 6. Jobs with WIPs
    if wip > 40 and (abs(accr) > 40 or abs(cost) > 40):
        flags.append("Jobs with WIPs")
    
    # 7. Billed Jobs with LOSS
    if rev > 0 and pl < 0 and status in ("CMP", "IHL"):
        flags.append("Billed Jobs with LOSS")
    
    # 8. Billed Jobs with LOW MARGIN
    if rev > 0 and margin < 5 and status in ("CMP", "IHL"):
        flags.append("Billed Jobs with LOW MARGIN")
    
    # 9. Billed Jobs — EXTREME Profit
    if rev > 0 and pl >= 5000 and status in ("CMP", "IHL"):
        flags.append("Billed Jobs — EXTREME Profit")
    
    # 10. Jobs at INV Status
    if rev > 0 and status == "INV":
        flags.append("Jobs at INV Status")
    
    # 11. Jobs at CMP — Ready to CLOSE
    if rev > 0 and pl > 0 and accr == 0 and wip == 0 and status == "CMP":
        flags.append("Jobs at CMP — Ready to CLOSE")
        
    # 12. Jobs with Aged Accruals
    if abs(accr) > 0 and age > 90:
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
