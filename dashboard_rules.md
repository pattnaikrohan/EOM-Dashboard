# EOM Dashboard — Business Rules & Logic Reference

> **Last Updated:** 10 July 2026
> **Source File:** [rules.py](file:///d:/EOM DASHBOARDS PROTO/backend/app/services/rules.py)

---

## 1. Data Sources (Excel Files)

The dashboard accepts the following CargoWise Excel exports. The **filename** determines how jobs are categorised.

| File Name Pattern | Parser | What it provides |
|---|---|---|
| `CargoWise EXPORTS S JOBS PENDING INVOICING` | CargoWise Export | Export jobs with ETD, ETA, Origin, Dest |
| `CargoWise IMPORT B JOBS PENDING INVOICING` | CargoWise Export | Import B jobs with ETD, ETA, Origin, Dest |
| `CargoWise IMPORT S JOBS PENDING INVOICING` | CargoWise Export | Import S jobs with ETD, ETA, Origin, Dest |
| `CROSS TRADE` | CargoWise Export | Cross-trade jobs |
| `Jobs with Aged Accruals (GREATER THAN 3 MONTHS)` | Job Billing | Jobs with accruals > 3 months old |
| `Job Billing – Charges Not Yet Posted as REV or CST` | Job Billing | Charge-level accrual data per job |
| `Billed Jobs with LOW MARGIN` | CargoWise Export | CMP/IHL jobs with low margin |
| `Billed Jobs – EXTREME Profit` | CargoWise Export | CMP/IHL jobs with profit >= $5,000 |
| `Jobs at CMP – Ready to CLOSE` | CargoWise Export | CMP jobs ready for closure |
| `Jobs at INV Status` | CargoWise Export | Jobs at INV billing status |
| `Jobs with WIPs` | CargoWise Export | Jobs with outstanding WIP |
| `Unbilled Jobs with LOSS` | CargoWise Export | Zero-revenue jobs at a loss |
| `Unbilled Jobs with PROFIT` | CargoWise Export | Zero-revenue jobs with profit |

> [!IMPORTANT]
> The **filename** drives categorisation for Pending Invoicing. If a file is named "EXPORTS", all jobs in it are tagged `source_type = "exports"`. This is how the system knows a job is an export even without a department code.

---

## 2. Direction Detection

The system determines if a job is Export, Import, or Cross-Trade using this order of precedence:

1. **Filename** (highest priority): The uploaded file's name sets `source_type` (`exports`, `imports_b`, `imports_s`, `cross_trade`)
2. **Origin/Destination ports**: If both Origin and Destination do NOT start with `AU`, it's Cross-Trade
3. **Department code** (fallback): Second character `E` = Export, `I` = Import (e.g., `FEA` = Export, `FIA` = Import)

---

## 3. Profit/Loss Calculation

| Scenario | Formula |
|---|---|
| Source file has a "Job Profit" / "Profit" column | Use the value directly from file |
| Source file has **no** Profit column | Computed as: `Revenue - abs(Cost)` |

**Margin %** = `(Profit/Loss / Revenue) × 100` (only when Revenue ≠ 0)

---

## 4. The 13 Checker Flags

A job can have **multiple flags** simultaneously. Each flag has its own conditions. In the Ops Manager view, a job appears under **every** section it qualifies for.

### A. Pending Invoicing Checkers (4 flags — mutually exclusive)

These 4 are evaluated as `if / elif` — a job gets at most ONE pending invoicing flag.

---

#### 1. CROSS-TRADE Jobs pending invoicing
Cross-trade shipments (origin and destination outside AU) departing origin in current or previous months awaiting billing.

| Condition | Rule |
|---|---|
| **Direction** | `is_cross_trade = TRUE` (`source_type = "cross_trade"` OR Origin not `AU*` AND Destination not `AU*`) |
| **Status** | `Status NOT IN ('CMP','CLS')` (IHL, WRK, INV etc. are included) |
| **Date check** | `ETD <= Current Month` (ETD is in current month or any previous month, or no ETD) |

> **Colour:** Violet `#8B5CF6`

---

#### 2. EXPORTS Jobs pending invoicing
| Condition | Rule |
|---|---|
| **Direction** | `source_type = "exports"` OR (no source_type AND department indicates export) |
| **Status** | NOT `CMP` and NOT `CLS` |
| **Date check** | ETD is in current month or any previous month (or no ETD) |

> **Colour:** Blue `#3B82F6`

---

#### 3. IMPORTS B Jobs pending invoicing
| Condition | Rule |
|---|---|
| **Direction** | `source_type = "imports_b"` OR (no source_type AND dept = `FIB`) |
| **Status** | NOT `CMP` and NOT `CLS` |
| **Date check** | ETA is in current month or any previous month (or no ETA) |

> **Colour:** Indigo `#6366F1`

---

#### 4. IMPORTS S Jobs pending invoicing
| Condition | Rule |
|---|---|
| **Direction** | `source_type = "imports_s"` OR (no source_type AND dept in `FIS`, `FIA`, `FIJ`, `FIC`) |
| **Status** | NOT `CMP` and NOT `CLS` |
| **Date check** | ETA is in current month or any previous month (or no ETA) |

> **Colour:** Cyan `#06B6D4`

---

### B. Month End Closing Checkers (9 flags — can stack)

These are evaluated independently with `if` (not `elif`). A job can get multiple flags.

---

#### 5. Unbilled Jobs with PROFIT
| Field | Condition |
|---|---|
| Revenue | = $0 |
| Profit/Loss | > $0 |

> **Colour:** Emerald `#10B981`

---

#### 6. Unbilled Jobs with LOSS
| Field | Condition |
|---|---|
| Revenue | = $0 |
| Profit/Loss | < $0 |

> **Colour:** Red `#EF4444`

---

#### 7. Jobs with WIPs
| Field | Condition |
|---|---|
| WIP | > $40 |
| Accrual or Cost | abs(Accrual) > $40 OR abs(Cost) > $40 |

> **Colour:** Orange `#F97316`

---

#### 8. Billed Jobs with LOSS
| Field | Condition |
|---|---|
| Revenue | > $0 |
| Profit/Loss | < $0 |
| Status | `CMP` or `IHL` |

> **Colour:** Rose `#F43F5E`

---

#### 9. Billed Jobs with LOW MARGIN
| Field | Condition |
|---|---|
| Revenue | > $0 |
| Margin % | < 5% |
| Status | `CMP` or `IHL` |

> **Colour:** Yellow `#EAB308`

---

#### 10. Billed Jobs — EXTREME Profit
| Field | Condition |
|---|---|
| Revenue | > $0 |
| Profit/Loss | >= $5,000 |
| Status | `CMP` or `IHL` |

> **Colour:** Green `#22C55E`

---

#### 11. Jobs at INV Status
| Field | Condition |
|---|---|
| Revenue | > $0 |
| Status | = `INV` |

> **Colour:** Slate `#64748B`

---

#### 12. Jobs at CMP — Ready to CLOSE
| Field | Condition |
|---|---|
| Revenue | > $0 |
| Profit/Loss | > $0 |
| Accrual | = $0 |
| WIP | = $0 |
| Status | = `CMP` |

> **Colour:** Teal `#14B8A6`

---

#### 13. Jobs with Aged Accruals
| Path | Condition |
|---|---|
| **File-based** | Job appears in the `"Jobs with Aged Accruals (GREATER THAN 3 MONTHS)"` upload |
| **Computed / Snowflake** | `ABS(Accrual) > 0` AND Age >= 90 days (from `ACR_RECOGNITION_DATE` / `acr_recognised`) |

Jobs carrying unposted vendor accruals where the accrual recognition date (`ACR_RECOGNITION_DATE`) is 90 days or older.
Either path qualifies. The file-based path exists because CargoWise uses calendar-month logic for "3 months" which doesn't always match a strict 90-day calculation.

> **Colour:** Amber `#F59E0B`

---

## 5. Flag Priority Order

When a job has multiple flags, the **primary flag** is the highest in this list:

| Priority | Flag |
|---|---|
| 1 (highest) | EXPORTS Jobs pending invoicing |
| 2 | CROSS-TRADE Jobs pending invoicing |
| 3 | IMPORTS B Jobs pending invoicing |
| 4 | IMPORTS S Jobs pending invoicing |
| 5 | Unbilled Jobs with PROFIT |
| 6 | Unbilled Jobs with LOSS |
| 7 | Jobs with WIPs |
| 8 | Billed Jobs with LOSS |
| 9 | Billed Jobs with LOW MARGIN |
| 10 | Billed Jobs — EXTREME Profit |
| 11 | Jobs at INV Status |
| 12 | Jobs at CMP — Ready to CLOSE |
| 13 (lowest) | Jobs with Aged Accruals |

> [!NOTE]
> The primary flag determines the badge colour shown in the Operator Review. In the Ops Manager view, jobs appear under **every** flag they qualify for (not just the primary).

---

## 6. Date Logic: "Current Month or Previous Months"

The `is_current_or_past_month()` function is used by all 4 Pending Invoicing checkers:

- **Input:** ETD (for Exports/Cross-Trade) or ETA (for Imports)
- **Rule:** The date's year-month must be **<=** the current year-month
- **No date:** If ETD/ETA is blank, the job is **included** (assumed eligible)
- **Future dates:** A job with ETD/ETA in a future month is **excluded**

---

## 7. KPI Cards (Operator Review)

| Card | Formula |
|---|---|
| Total Jobs | Count of all jobs for the operator |
| Export | Count where `is_export = True` |
| Cross-Trade | Count where job has "CROSS-TRADE Jobs pending invoicing" flag |
| Import | Count where `is_export = False` |
| Has WIP | Count where `WIP ≠ 0` |
| Loss Jobs | Count where `Profit/Loss < -$40` |
| No Revenue | Count where `Revenue = $0` |

---

## 8. Columns Shown

### Operator Review (checker sections)
| Column | Always Visible | Notes |
|---|---|---|
| Job Number | Yes | |
| Status | Yes | |
| Dept | Yes | |
| Client Code | Yes | From "Local Client" column in source file |
| ETD | Yes | |
| ETA | Yes | |
| Operator | Compact=hidden | |
| Revenue | **Hidden** | Hidden from operators |
| WIP | Yes | |
| Cost | Yes | |
| Accrual | Yes | |
| Profit/Loss | Yes | Always visible in all views |
| Margin % | **Hidden** | Hidden from operators |
| Age | Yes | Days since open date |
| Flags | Yes | All applicable flags |

### Ops Manager View
All columns are visible including Revenue and Margin %.

---

## 9. Job Merge Logic

When multiple files are uploaded, jobs are merged by **Job Number**:

- **Financial fields** (Revenue, WIP, Cost, Profit/Loss, Margin): Non-zero value wins
- **Accrual**: Non-zero value from Job Billing takes precedence
- **Open Date**: First non-empty value is kept
- **Source Type**: First non-empty value is kept (prevents a generic file overwriting a specific tag)
- **Aged Accruals**: `has_aged_accruals = True` is preserved if any source sets it
- **Job Age**: Maximum value across sources is kept
- **Flags**: Recomputed after every merge using the merged data
