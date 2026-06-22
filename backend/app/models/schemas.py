"""
Pydantic models for the EOM Review Agent API.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


# ── Job record ─────────────────────────────────────────────────────────────────
class Job(BaseModel):
    job_number: str = Field(..., alias="job_number")
    job_status: str = ""
    branch: str = ""
    department: str = ""
    open_date: Optional[str] = None
    operator: str = ""
    sales_rep: str = ""
    local_charges: str = ""
    overseas_agent: str = ""
    revenue: float = 0.0
    wip: float = 0.0
    cost: float = 0.0
    accrual: float = 0.0
    profit_loss: float = 0.0
    margin_pct: float = 0.0
    job_age_days: int = 0
    flags: list[str] = Field(default_factory=list)
    primary_flag: str = "CLEAN"
    is_export: bool = True
    ops_section: Optional[str] = None

    class Config:
        populate_by_name = True


# ── KPI summary ────────────────────────────────────────────────────────────────
class KPISummary(BaseModel):
    total_jobs: int = 0
    export_jobs: int = 0
    import_jobs: int = 0
    no_revenue: int = 0
    has_wip: int = 0
    negative_profit: int = 0
    loss_jobs: int = 0
    margin_below_5: int = 0
    jfc_jobs: int = 0
    zero_rev_3m: int = 0
    jfc_opportunity: int = 0
    cmp_opportunity: int = 0
    accrual_check: int = 0
    clean_jobs: int = 0
    total_revenue: float = 0.0
    total_wip: float = 0.0
    total_cost: float = 0.0
    total_profit: float = 0.0


# ── Operator summary ──────────────────────────────────────────────────────────
class OperatorSummary(BaseModel):
    code: str
    total_jobs: int = 0
    export_jobs: int = 0
    import_jobs: int = 0
    loss_count: int = 0
    wip_count: int = 0
    margin_count: int = 0
    zero_rev_count: int = 0
    clean_count: int = 0
    total_revenue: float = 0.0
    total_profit: float = 0.0


# ── Dashboard response ────────────────────────────────────────────────────────
class DashboardResponse(BaseModel):
    branch: str
    period: str
    kpi: KPISummary
    operators: list[OperatorSummary]
    flag_distribution: dict[str, int] = Field(default_factory=dict)


# ── Operator detail response ──────────────────────────────────────────────────
class OperatorDetailResponse(BaseModel):
    operator: str
    branch: str
    period: str
    kpi: KPISummary
    jobs_by_flag: dict[str, list[Job]] = Field(default_factory=dict)


# ── Flag legend ────────────────────────────────────────────────────────────────
class FlagDefinition(BaseModel):
    flag: str
    colour: str
    hex_code: str
    rule: str


# ── Upload response ────────────────────────────────────────────────────────────
class UploadResponse(BaseModel):
    success: bool
    message: str
    branch: str = ""
    period: str = ""
    total_jobs: int = 0
    operators: list[str] = Field(default_factory=list)


# ── Ops Review item ───────────────────────────────────────────────────────────
class OpsReviewJob(BaseModel):
    job: Job
    ops_label: str = ""
