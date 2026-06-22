"""
EOM Business Rules Engine.

Implements the consolidated flag system from EOM Agent v1, v2, v3.
"""
from __future__ import annotations

# ── Flag priority order (highest first) ────────────────────────────────────────
FLAG_PRIORITY = [
    "LOSS", "WIP", "JFC", "MARGIN <5%", "ZERO REV >3M",
    "JFC OPPORTUNITY", "ACCRUAL CHECK", "CMP OPPORTUNITY", "CLEAN"
]

# ── Flag colour mapping ───────────────────────────────────────────────────────
FLAG_COLOURS = {
    "LOSS":            {"colour": "Red",    "hex": "#FF4C4C"},
    "WIP":             {"colour": "Orange", "hex": "#FFB347"},
    "JFC":             {"colour": "Purple", "hex": "#C084FC"},
    "MARGIN <5%":      {"colour": "Yellow", "hex": "#FFF176"},
    "ZERO REV >3M":    {"colour": "Pink",   "hex": "#FDA4AF"},
    "JFC OPPORTUNITY": {"colour": "Blue",   "hex": "#93C5FD"},
    "ACCRUAL CHECK":   {"colour": "Amber",  "hex": "#F59E0B"},
    "CMP OPPORTUNITY": {"colour": "Green",  "hex": "#6EE7B7"},
    "CLEAN":           {"colour": "White",  "hex": "#E2E8F0"},
}

# ── Acceptable department codes ────────────────────────────────────────────────
ACCEPTABLE_DEPTS = [
    "FIJ", "FEJ", "FES", "FIS", "FEA", "FIA", "FEB", "FIB",
    "FIC", "FEC", "BEX", "BIX",
]


def get_flags(job: dict) -> list[str]:
    """Compute all applicable flags for a job."""
    flags = []
    pl     = float(job.get("profit_loss", 0) or 0)
    wip    = float(job.get("wip", 0) or 0)
    status = str(job.get("job_status", "")).strip().upper()
    margin = float(job.get("margin_pct", 0) or 0)
    rev    = float(job.get("revenue", 0) or 0)
    age    = int(job.get("job_age_days", 0) or 0)
    accr   = float(job.get("accrual", 0) or 0)

    if pl < -40:
        flags.append("LOSS")
    if wip != 0:
        flags.append("WIP")
    if status == "JFC":
        flags.append("JFC")
    if 0 <= margin < 5:
        flags.append("MARGIN <5%")
    if rev == 0 and age > 91:
        flags.append("ZERO REV >3M")
    if age > 91 and wip == 0 and status == "CMP" and rev > 1:
        flags.append("JFC OPPORTUNITY")
    if status == "CMP" and wip == 0 and accr < -1 and age < 90:
        flags.append("ACCRUAL CHECK")
    if rev > 500 and wip == 0 and status != "CMP" and age > 91:
        flags.append("CMP OPPORTUNITY")

    return flags if flags else ["CLEAN"]


def priority_flag(flags: list[str]) -> str:
    """Return the highest-priority flag from the list."""
    for f in FLAG_PRIORITY:
        if f in flags:
            return f
    return "CLEAN"


def get_ops_section(job: dict) -> str | None:
    """
    Determine if a job should appear in the Ops Manager Review,
    and under which section label.
    """
    status = str(job.get("job_status", "")).strip().upper()
    margin = float(job.get("margin_pct", 0) or 0)
    dept   = str(job.get("department", "")).strip().upper()
    jn     = str(job.get("job_number", "")).strip()
    op     = str(job.get("operator", "")).strip()
    pf     = str(job.get("primary_flag", ""))

    if status == "JFC":
        return "JFC"
    if status == "RDD" and margin < 5:
        return "RDD <5%"
    if jn.startswith("B"):
        return "B-Jobs"
    if dept and dept not in ACCEPTABLE_DEPTS:
        return "Unacceptable Department Codes"
    if pf == "JFC OPPORTUNITY":
        return "JFC Opportunity"
    if pf == "LOSS":
        return "Loss"
    if pf == "MARGIN <5%":
        return "Margin <5%"
    return None


def is_export_dept(dept: str) -> bool:
    """Determine direction from department code. Second char E = export, I = import."""
    d = (dept or "").strip().upper()
    if len(d) >= 2:
        if d[1] == "E":
            return True
        if d[1] == "I":
            return False
    return True  # default to export


# ── V3 Month-End Closing Checks ───────────────────────────────────────────────
def get_v3_checks(job: dict) -> list[str]:
    """Return which V3 month-end closing checks this job matches."""
    checks = []
    rev    = float(job.get("revenue", 0) or 0)
    margin = float(job.get("margin_pct", 0) or 0)
    pl     = float(job.get("profit_loss", 0) or 0)
    wip    = float(job.get("wip", 0) or 0)
    accr   = float(job.get("accrual", 0) or 0)
    cost   = float(job.get("cost", 0) or 0)
    status = str(job.get("job_status", "")).strip().upper()
    age    = int(job.get("job_age_days", 0) or 0)

    if rev == 0 and pl > 0:
        checks.append("Unbilled with Profit")
    if rev == 0 and pl < 0:
        checks.append("Unbilled with Loss")
    if abs(wip) > 40 and (abs(accr) > 40 or abs(cost) > 40):
        checks.append("Jobs with WIPs")
    if rev > 0 and pl < 0:
        checks.append("Billed with Loss")
    if rev > 0 and 0 < margin < 5:
        checks.append("Billed Low Margin")
    if rev > 0 and pl >= 5000:
        checks.append("Extreme Profit")
    if rev > 0 and status == "INV":
        checks.append("INV Status")
    if rev > 0 and pl > 0 and accr == 0 and wip == 0:
        checks.append("Ready to Close")
    if abs(accr) > 0 and age > 90:
        checks.append("Aged Accruals")

    return checks
