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
    "IMPORTS Jobs pending invoicing",
    "DOMESTIC Jobs pending invoicing",
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
    "IMPORTS Jobs pending invoicing":     {"colour": "Indigo", "hex": "#6366F1"},
    "DOMESTIC Jobs pending invoicing":    {"colour": "Lime",   "hex": "#84CC16"},
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

# ── Section descriptions (shown as subtitles in the UI) ────────────────────────
FLAG_DESCRIPTIONS = {
    "EXPORTS Jobs pending invoicing":     "Jobs departing this month requiring invoicing",
    "IMPORTS Jobs pending invoicing":     "Jobs arriving this month requiring invoicing",
    "CROSS-TRADE Jobs pending invoicing": "Jobs arriving this month requiring invoicing",
    "DOMESTIC Jobs pending invoicing":    "Jobs departing this month requiring invoicing",
    "Jobs at INV Status":                 "Jobs to be updated to CMP upon invoice completion and accruals entered",
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

def _parse_date_robust(date_str: str) -> datetime | None:
    if not date_str:
        return None
    s = str(date_str).strip()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            return datetime.strptime(s[:19], fmt if len(s) >= 19 and " " in fmt else fmt)
        except ValueError:
            pass
    return None

def is_current_month(date_str: str, report_period: str = "") -> bool:
    if not date_str:
        return True
    d = _parse_date_robust(date_str)
    if not d:
        return True
    now = datetime.now()
    if d.year == now.year and d.month == now.month:
        return True
    if report_period:
        periods = [p.strip() for p in report_period.split(",")]
        for p_str in periods:
            try:
                p = datetime.strptime(p_str, "%B %Y")
                if d.year == p.year and d.month == p.month:
                    return True
            except ValueError:
                pass
    return False

def is_current_or_past_month(date_str: str, report_period: str = "") -> bool:
    """True if date is in the current month or any previous month (ETD/ETA has occurred or is occurring)."""
    if not date_str:
        return True  # no date = assume eligible
    d = _parse_date_robust(date_str)
    if not d:
        return True
    now = datetime.now()
    if (d.year, d.month) <= (now.year, now.month):
        return True
    if report_period:
        for p_str in report_period.split(","):
            try:
                p = datetime.strptime(p_str.strip(), "%B %Y")
                if (d.year, d.month) <= (p.year, p.month):
                    return True
            except ValueError:
                pass
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
    job_num = str(job.get("job_number", "")).strip().upper()
    is_exp = bool(job.get("is_export", is_export_dept(dept)))
    
    # Use source_type from filename to determine the job's category
    source_type = str(job.get("source_type", "")).strip().lower()
    job_direction = str(job.get("job_direction", "")).strip().upper()
        
    origin = str(job.get("origin", "")).strip().upper()
    dest   = str(job.get("destination", "")).strip().upper()
    
    # Use ETD for exports/cross-trade, ETA for imports (as specified in feedback)
    etd_str = str(job.get("etd", "") or "").strip()
    eta_str = str(job.get("eta", "") or "").strip()
    
    # Only exclude CMP and CLS from pending invoicing (IHL is allowed)
    pending_statuses = ("CMP", "CLS")

    # Cross-Trade check: either from is_cross_trade field, source_type, or origin/dest both non-AU
    is_cross_trade = bool(job.get("is_cross_trade", False)) or source_type == "cross_trade"
    if not is_cross_trade and origin and dest and not origin.startswith("AU") and not dest.startswith("AU"):
        is_cross_trade = True

    # ── Determine direction (works for BOTH Snowflake and Excel uploads) ──
    # Priority: job_direction field > department code pattern > source_type > is_export flag
    is_import = False
    is_domestic = False
    
    if job_direction in ('EXP', 'E'):
        is_exp = True
    elif job_direction in ('IMP', 'I'):
        is_exp = False
        is_import = True
    elif job_direction == 'DOM':
        is_exp = False
        is_domestic = True
    elif job_direction == 'OTH':
        is_exp = False
    elif source_type == "exports":
        is_exp = True
    elif source_type == "domestic":
        is_exp = False
        is_domestic = True
    elif source_type in ("imports_b", "imports_s"):
        is_exp = False
        is_import = True
    elif len(dept) >= 2:
        # Legacy Excel dept codes: 2nd char E=export, I=import (e.g. FEJ, FIS, FIB)
        if dept[1] == 'E':
            is_exp = True
        elif dept[1] == 'I':
            is_exp = False
            is_import = True
        # else: keep is_exp from job dict fallback
    # else: keep is_exp from job.get("is_export") fallback above

    # ── Enforce explicit department mapping ──
    if dept in ("FEA", "FES"):
        is_exp, is_import, is_domestic, is_cross_trade = True, False, False, False
    elif dept in ("FIA", "FIS", "CIA", "CIS"):
        is_exp, is_import, is_domestic, is_cross_trade = False, True, False, False
    elif dept == "FDS":
        is_exp, is_import, is_domestic, is_cross_trade = False, False, True, False
    elif dept == "XTA":
        is_exp, is_import, is_domestic, is_cross_trade = False, False, False, True

    # ── Assign direction field and is_export for frontend tabs ──
    job["is_export"] = is_exp
    if is_cross_trade:
        job["direction"] = "crosstrade"
    elif is_import:
        job["direction"] = "import"
    elif is_domestic:
        job["direction"] = "domestic"
    else:
        job["direction"] = "export"

    # ── Pending Invoicing Flags ──────────────────────────────────────────
    # 1. CROSS-TRADE Jobs pending invoicing (uses ETA — arriving this month)
    if is_cross_trade and status not in pending_statuses and is_current_or_past_month(eta_str, report_period):
        flags.append("CROSS-TRADE Jobs pending invoicing")
        
    # 2. EXPORTS Jobs pending invoicing (uses ETD — departing this month)
    elif is_exp and not is_cross_trade and status not in pending_statuses and is_current_or_past_month(etd_str, report_period):
        flags.append("EXPORTS Jobs pending invoicing")
    
    # 3. DOMESTIC Jobs pending invoicing (uses ETD — departing this month)
    elif is_domestic and status not in pending_statuses and is_current_or_past_month(etd_str, report_period):
        flags.append("DOMESTIC Jobs pending invoicing")
    
    # 4. IMPORTS Jobs pending invoicing (uses ETA — arriving this month)
    elif is_import and not is_cross_trade and status not in pending_statuses and is_current_or_past_month(eta_str, report_period):
        flags.append("IMPORTS Jobs pending invoicing")

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
        
    # 13. Jobs with Aged Accruals — trust source file OR computed age (age ≥ 90 required)
    if (job.get("has_aged_accruals") and age >= 90) or (abs(accr) > 0 and age >= 90):
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
