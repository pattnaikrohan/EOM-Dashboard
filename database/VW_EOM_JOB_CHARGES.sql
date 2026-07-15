/*
 * ============================================================================
 *  VW_EOM_JOB_CHARGES  — Unified EOM Dashboard View (v3 — CDC-aware)
 * ============================================================================
 *  Database: DEV
 *  Schema:   CORE
 *
 *  CRITICAL: All tables in PROD.CORE are CDC (Change Data Capture) logs.
 *  Every row is a versioned snapshot. We MUST deduplicate using:
 *     ROW_NUMBER() OVER (PARTITION BY <PK> ORDER BY CRE_DT DESC)
 *     + WHERE ACTV_IND = TRUE
 *  to get the CURRENT state of each record.
 *
 *  Additional join corrections discovered via live validation:
 *    - JH_GB is a UUID FK → GLBBRANCH.GB_PK (not a code)
 *    - JH_GS_NKREPOPS/NKREPSALES are CODES → join on GS_CODE (not GS_PK!)
 *    - GLBDEPARTMENT does NOT exist; JH_GE is a UUID with no lookup table
 *    - JOBSHIPMENT/JOBDECLARATION have massive duplication (CDC versions)
 *    - ORGADDRESS/ORGHEADER also need CDC deduplication
 *    - Added GLBBRANCH (11th table) for branch code/name resolution
 *
 *  Tables joined (10 source tables):
 *    1. JOBCHARGE            — Charge lines (375K unique)
 *    2. JOBHEADER            — Job master (43K unique)
 *    3. ACCCHARGECODE        — Charge code ref (277 unique)
 *    4. JOBCHARGEREVRECOGNITION — WIP events (35K unique)
 *    5. GLBSTAFF × 2         — Operator + Sales Rep (187 unique)
 *    6. ORGHEADER × 2        — Agent + Local Client org (16K unique)
 *    7. ORGADDRESS × 2       — Address bridge (10K unique)
 *    8. JOBSHIPMENT          — Forwarding routing (39K unique)
 *    9. JOBDECLARATION       — Customs routing (37K unique)
 *   10. GLBBRANCH            — Branch code/name lookup (11 unique)
 * ============================================================================
 */

CREATE OR REPLACE VIEW DEV.CORE.VW_EOM_JOB_CHARGES
AS
WITH
-- ═══════════════════════════════════════════════════════════════════════════
--  CDC DEDUPLICATION CTEs
--  Each CTE: filter ACTV_IND = TRUE, then ROW_NUMBER by PK descending CRE_DT
-- ═══════════════════════════════════════════════════════════════════════════

-- JOBCHARGE: latest version per JR_PK
jr_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JR_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBCHARGE
    WHERE ACTV_IND = TRUE
),
jr AS (SELECT * FROM jr_dedup WHERE _rn = 1),

-- JOBHEADER: latest version per JH_PK
jh_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JH_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBHEADER
    WHERE ACTV_IND = TRUE
),
jh AS (SELECT * FROM jh_dedup WHERE _rn = 1),

-- ACCCHARGECODE: latest version per AC_PK
ac_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY AC_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.ACCCHARGECODE
    WHERE ACTV_IND = TRUE
),
ac AS (SELECT * FROM ac_dedup WHERE _rn = 1),

-- GLBSTAFF: latest version per GS_CODE (not GS_PK — FK is by code!)
gs_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY GS_CODE ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.GLBSTAFF
    WHERE ACTV_IND = TRUE
),
gs AS (SELECT * FROM gs_dedup WHERE _rn = 1),

-- GLBBRANCH: latest version per GB_PK
gb_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY GB_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.GLBBRANCH
    WHERE ACTV_IND = TRUE
),
gb AS (SELECT * FROM gb_dedup WHERE _rn = 1),

-- ORGADDRESS: latest version per OA_PK
oa_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY OA_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.ORGADDRESS
    WHERE ACTV_IND = TRUE
),
oa AS (SELECT * FROM oa_dedup WHERE _rn = 1),

-- ORGHEADER: latest version per OH_PK
oh_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY OH_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.ORGHEADER
    WHERE ACTV_IND = TRUE
),
oh AS (SELECT * FROM oh_dedup WHERE _rn = 1),

-- JOBSHIPMENT: latest version per JS_PK (valid only)
js_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JS_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBSHIPMENT
    WHERE ACTV_IND = TRUE AND JS_ISVALID = TRUE
),
js AS (SELECT * FROM js_dedup WHERE _rn = 1),

-- JOBDECLARATION: latest version per JE_PK (valid, not cancelled)
je_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JE_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBDECLARATION
    WHERE ACTV_IND = TRUE AND JE_ISVALID = TRUE AND JE_ISCANCELLED = FALSE
),
je AS (SELECT * FROM je_dedup WHERE _rn = 1),

-- JOBCHARGEREVRECOGNITION: latest event per job (D3_JH)
wrr_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY D3_JH ORDER BY D3_RECOGNITIONDATE DESC, CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBCHARGEREVRECOGNITION
    WHERE ACTV_IND = TRUE
),
wrr AS (SELECT * FROM wrr_dedup WHERE _rn = 1)


-- ═══════════════════════════════════════════════════════════════════════════
--  MAIN SELECT — Charge-line level (one row per charge line per job)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT
    -- ── CHARGE LINE (JOBCHARGE) ──────────────────────────────────────────
    jr.JR_PK                                    AS CHARGE_PK,
    jr.JR_JH                                    AS CHARGE_JOB_FK,
    jr.JR_AC                                    AS CHARGE_CHARGECODE_FK,
    jr.JR_DESC                                  AS CHARGE_DESCRIPTION,
    jr.JR_CHARGETYPE                            AS CHARGE_TYPE,
    jr.JR_LINETYPE                              AS CHARGE_LINE_TYPE,
    jr.JR_DISPLAYSEQUENCE                       AS CHARGE_DISPLAY_SEQ,

    -- Cost side
    jr.JR_OSCOSTAMT                             AS COST_OS_AMT,
    jr.JR_LOCALCOSTAMT                          AS COST_LOCAL_AMT,
    jr.JR_RX_NKCOSTCURRENCY                     AS COST_CURRENCY,
    jr.JR_OSCOSTEXRATE                          AS COST_EXCHANGE_RATE,
    jr.JR_ESTIMATEDCOST                         AS COST_ESTIMATED,
    jr.JR_AT_COSTGSTRATE                        AS COST_GST_RATE,
    jr.JR_OSCOSTGSTAMT                          AS COST_GST_AMT,
    jr.JR_OH_COSTACCOUNT                        AS COST_CREDITOR_ACCOUNT,
    jr.JR_APLINEPOSTINGSTATUS                   AS COST_AP_POSTING_STATUS,
    jr.JR_APINVOICENUM                          AS COST_AP_INVOICE_NUM,
    jr.JR_APINVOICEDATE                         AS COST_AP_INVOICE_DATE,

    -- Sell / Revenue side
    jr.JR_OSSELLAMT                             AS SELL_OS_AMT,
    jr.JR_LOCALSELLAMT                          AS SELL_LOCAL_AMT,
    jr.JR_RX_NKSELLCURRENCY                     AS SELL_CURRENCY,
    jr.JR_OSSELLEXRATE                          AS SELL_EXCHANGE_RATE,
    jr.JR_ESTIMATEDREVENUE                      AS SELL_ESTIMATED_REVENUE,
    jr.JR_AT_SELLGSTRATE                        AS SELL_GST_RATE,
    jr.JR_OH_SELLACCOUNT                        AS SELL_DEBTOR_ACCOUNT,
    jr.JR_ARLINEPOSTINGSTATUS                   AS SELL_AR_POSTING_STATUS,
    jr.JR_INVOICETYPE                           AS SELL_INVOICE_TYPE,

    -- Margin & proforma flags
    jr.JR_MARGINPERCENTAGE                      AS CHARGE_MARGIN_PCT,
    jr.JR_PROFORMACOST                          AS IS_WIP_COST,
    jr.JR_PROFORMAREVENUE                       AS IS_ACCRUED_REVENUE,
    CASE
        WHEN jr.JR_PROFORMACOST = FALSE
         AND jr.JR_PROFORMAREVENUE = FALSE
        THEN TRUE ELSE FALSE
    END                                         AS IS_FINALISED,
    jr.JR_ISINCLUDEDINPROFITSHARE               AS IS_IN_PROFIT_SHARE,
    jr.JR_ISVALID                               AS CHARGE_IS_ACTIVE,

    -- Charge org context
    jr.JR_GE                                    AS CHARGE_DEPARTMENT,
    jr.JR_GB                                    AS CHARGE_BRANCH,
    jr.JR_GC                                    AS CHARGE_COMPANY,

    -- Charge audit
    jr.JR_SYSTEMCREATETIMEUTC                   AS CHARGE_CREATED_UTC,
    jr.JR_SYSTEMCREATEUSER                      AS CHARGE_CREATED_BY,
    jr.JR_SYSTEMLASTEDITTIMEUTC                 AS CHARGE_LAST_MODIFIED_UTC,
    jr.JR_SYSTEMLASTEDITUSER                    AS CHARGE_LAST_MODIFIED_BY,

    -- ── CHARGE CODE (ACCCHARGECODE) ──────────────────────────────────────
    ac.AC_PK                                    AS CHARGECODE_PK,
    ac.AC_CODE                                  AS CHARGECODE,
    ac.AC_DESC                                  AS CHARGECODE_DESC,
    ac.AC_CHARGETYPE                            AS CHARGECODE_TYPE,
    ac.AC_CHARGEGROUP                           AS CHARGECODE_GROUP,
    ac.AC_CHARGESUBGROUP                        AS CHARGECODE_SUBGROUP,
    ac.AC_AG_REVENUEACCOUNT                     AS GL_REVENUE_ACCOUNT,
    ac.AC_AG_COSTACCOUNT                        AS GL_COST_ACCOUNT,
    ac.AC_AG_WIPACCOUNT                         AS GL_WIP_ACCOUNT,
    ac.AC_AG_ACCRUALACCOUNT                     AS GL_ACCRUAL_ACCOUNT,
    ac.AC_ISACTIVE                              AS CHARGECODE_IS_ACTIVE,

    -- ── JOB HEADER ───────────────────────────────────────────────────────
    jh.JH_PK                                    AS JOB_PK,
    jh.JH_JOBNUM                                AS JOB_NUMBER,
    jh.JH_NAME                                  AS JOB_NAME,
    jh.JH_DESCRIPTION                           AS JOB_DESCRIPTION,
    jh.JH_STATUS                                AS JOB_STATUS,
    jh.JH_HEADERTYPE                            AS JOB_TYPE,
    jh.JH_DIRECTION                             AS JOB_DIRECTION,
    jh.JH_JOBLOCALREFERENCE                     AS JOB_LOCAL_REF,
    jh.JH_JH_PARENTJOB                          AS JOB_PARENT_FK,
    jh.JH_HOLDREASON                            AS JOB_HOLD_REASON,
    jh.JH_PROFITLOSSREASONCODE                  AS JOB_PL_REASON_CODE,
    jh.JH_LOCALCHARGESCFX                       AS JOB_LOCAL_CHARGES_AMT,
    jh.JH_GB                                    AS JOB_BRANCH_FK,
    jh.JH_GE                                    AS JOB_DEPARTMENT_FK,
    jh.JH_GC                                    AS JOB_COMPANY_FK,
    jh.JH_GS_NKREPOPS                           AS JOB_OPERATOR_CODE,
    jh.JH_GS_NKREPSALES                         AS JOB_SALES_REP_CODE,
    jh.JH_A_JOP                                 AS JOB_OPENED_DATE,
    jh.JH_A_JCL                                 AS JOB_CLOSED_DATE,
    jh.JH_ISACTIVE                              AS JOB_IS_ACTIVE,
    jh.JH_SYSTEMCREATETIMEUTC                   AS JOB_CREATED_UTC,
    jh.JH_SYSTEMCREATEUSER                      AS JOB_CREATED_BY,
    jh.JH_SYSTEMLASTEDITUSER                    AS JOB_LAST_MODIFIED_BY,

    -- ── BRANCH (GLBBRANCH — resolved from UUID FK) ───────────────────────
    branch.GB_CODE                              AS BRANCH_CODE,
    branch.GB_BRANCHNAME                        AS BRANCH_NAME,
    branch.GB_RN_NKCOUNTRYCODE                  AS BRANCH_COUNTRY_CODE,

    -- ── OPERATOR (GLBSTAFF — joined on CODE, not PK!) ────────────────────
    ops.GS_PK                                   AS OPERATOR_PK,
    ops.GS_CODE                                 AS OPERATOR_CODE,
    ops.GS_FULLNAME                             AS OPERATOR_FULLNAME,
    ops.GS_FRIENDLYNAME                         AS OPERATOR_FRIENDLY_NAME,
    ops.GS_GIVENNAME                            AS OPERATOR_GIVEN_NAME,
    ops.GS_PREFERREDSURNAME                     AS OPERATOR_SURNAME,
    ops.GS_ISACTIVE                             AS OPERATOR_IS_ACTIVE,

    -- ── SALES REP (GLBSTAFF — joined on CODE, not PK!) ──────────────────
    sales.GS_PK                                 AS SALES_REP_PK,
    sales.GS_CODE                               AS SALES_REP_CODE,
    sales.GS_FULLNAME                           AS SALES_REP_FULLNAME,
    sales.GS_FRIENDLYNAME                       AS SALES_REP_FRIENDLY_NAME,
    sales.GS_GIVENNAME                          AS SALES_REP_GIVEN_NAME,
    sales.GS_PREFERREDSURNAME                   AS SALES_REP_SURNAME,
    sales.GS_ISACTIVE                           AS SALES_REP_IS_ACTIVE,

    -- ── OVERSEAS AGENT (ORGADDRESS → ORGHEADER) ──────────────────────────
    oa_agent.OA_PK                              AS AGENT_ADDR_PK,
    agent_org.OH_PK                             AS AGENT_ORG_PK,
    agent_org.OH_CODE                           AS AGENT_ORG_CODE,
    agent_org.OH_FULLNAME                       AS AGENT_ORG_NAME,
    agent_org.OH_ISFORWARDER                    AS AGENT_IS_FORWARDER,
    agent_org.OH_ISACTIVE                       AS AGENT_ORG_IS_ACTIVE,

    -- ── LOCAL CLIENT (ORGADDRESS → ORGHEADER) ────────────────────────────
    oa_local.OA_PK                              AS LOCAL_CLIENT_ADDR_PK,
    local_org.OH_PK                             AS LOCAL_CLIENT_ORG_PK,
    local_org.OH_CODE                           AS LOCAL_CLIENT_CODE,
    local_org.OH_FULLNAME                       AS LOCAL_CLIENT_NAME,
    local_org.OH_ISFORWARDER                    AS LOCAL_CLIENT_IS_FORWARDER,
    local_org.OH_ISACTIVE                       AS LOCAL_CLIENT_ORG_IS_ACTIVE,

    -- ── PARENT JOB (JOBHEADER self-join) ─────────────────────────────────
    parent.JH_JOBNUM                            AS PARENT_JOB_NUMBER,
    parent.JH_STATUS                            AS PARENT_JOB_STATUS,
    parent.JH_DIRECTION                         AS PARENT_JOB_DIRECTION,

    -- ── WIP RECOGNITION ──────────────────────────────────────────────────
    wrr.D3_PK                                   AS WIP_RECOGNITION_PK,
    wrr.D3_RECOGNITIONTYPE                      AS WIP_RECOGNITION_TYPE,
    wrr.D3_RECOGNITIONDATE                      AS WIP_RECOGNITION_DATE,

    -- ── ROUTING: JOBSHIPMENT ─────────────────────────────────────────────
    ship.JS_PK                                  AS SHIPMENT_PK,
    ship.JS_RL_NKORIGIN                         AS SHIPMENT_ORIGIN,
    ship.JS_RL_NKDESTINATION                    AS SHIPMENT_DESTINATION,
    ship.JS_E_DEP                               AS SHIPMENT_ETD,
    ship.JS_E_ARV                               AS SHIPMENT_ETA,
    ship.JS_TRANSPORTMODE                       AS SHIPMENT_TRANSPORT_MODE,
    ship.JS_SHIPMENTSTATUS                      AS SHIPMENT_STATUS,

    -- ── ROUTING: JOBDECLARATION ──────────────────────────────────────────
    decl.JE_PK                                  AS DECLARATION_PK,
    decl.JE_JS                                  AS DECLARATION_SHIPMENT_FK,
    decl.JE_RL_NKORIGIN                         AS DECLARATION_ORIGIN,
    decl.JE_RL_NKFINALDESTINATION               AS DECLARATION_FINAL_DEST,
    decl.JE_RL_NKPORTOFLOADING                  AS DECLARATION_PORT_OF_LOADING,
    decl.JE_RL_NKPORTOFARRIVAL                  AS DECLARATION_PORT_OF_ARRIVAL,
    decl.JE_EXPORTDATE                          AS DECLARATION_EXPORT_DATE,
    decl.JE_DATEOFARRIVAL                       AS DECLARATION_ARRIVAL_DATE,
    decl.JE_DATEATFINALDESTINATION              AS DECLARATION_FINAL_DEST_DATE,
    decl.JE_TRANSPORTMODE                       AS DECLARATION_TRANSPORT_MODE,
    decl.JE_OPERATIONALSTATUS                   AS DECLARATION_OP_STATUS,
    decl.JE_ENTRYSTATUS                         AS DECLARATION_ENTRY_STATUS,
    decl.JE_DECLARATIONREFERENCE                AS DECLARATION_REFERENCE,
    decl.JE_GB                                  AS DECLARATION_BRANCH,
    decl.JE_GC                                  AS DECLARATION_COMPANY,

    -- ── ROUTING: COALESCED (Shipment priority over Declaration) ──────────
    COALESCE(ship.JS_RL_NKORIGIN,      decl.JE_RL_NKORIGIN)         AS ROUTING_ORIGIN,
    COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION) AS ROUTING_DESTINATION,
    COALESCE(ship.JS_E_DEP,            decl.JE_EXPORTDATE)           AS ROUTING_ETD,
    COALESCE(ship.JS_E_ARV,            decl.JE_DATEOFARRIVAL)        AS ROUTING_ETA,
    COALESCE(ship.JS_TRANSPORTMODE,    decl.JE_TRANSPORTMODE)        AS ROUTING_TRANSPORT_MODE,
    CASE
        WHEN ship.JS_PK IS NOT NULL THEN 'SHIPMENT'
        WHEN decl.JE_PK IS NOT NULL THEN 'DECLARATION'
        ELSE NULL
    END                                         AS ROUTING_SOURCE,

    -- ── COMPUTED HELPERS ─────────────────────────────────────────────────
    LEFT(COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN), 2)
                                                AS ROUTING_ORIGIN_COUNTRY,
    LEFT(COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION), 2)
                                                AS ROUTING_DESTINATION_COUNTRY,
    CASE
        WHEN LEFT(COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN), 2) != 'AU'
         AND LEFT(COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION), 2) != 'AU'
         AND COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN) IS NOT NULL
        THEN TRUE ELSE FALSE
    END                                         AS IS_CROSS_TRADE,

    COALESCE(jr.JR_LOCALSELLAMT, 0) - COALESCE(jr.JR_LOCALCOSTAMT, 0)
                                                AS NET_LOCAL_AMT,
    COALESCE(jr.JR_ESTIMATEDCOST, 0) - COALESCE(jr.JR_LOCALCOSTAMT, 0)
                                                AS COST_VARIANCE,
    COALESCE(jr.JR_ESTIMATEDREVENUE, 0) - COALESCE(jr.JR_LOCALSELLAMT, 0)
                                                AS REVENUE_VARIANCE,
    DATEDIFF('day', jh.JH_A_JOP, COALESCE(jh.JH_A_JCL, CURRENT_TIMESTAMP()))
                                                AS JOB_AGE_DAYS,
    DATEDIFF('day', wrr.D3_RECOGNITIONDATE, CURRENT_TIMESTAMP())
                                                AS WIP_RECOGNITION_AGE_DAYS

FROM jr

-- Job master (deduped)
INNER JOIN jh ON jr.JR_JH = jh.JH_PK

-- Charge code (deduped)
LEFT JOIN ac ON jr.JR_AC = ac.AC_PK

-- Branch lookup (deduped, UUID FK)
LEFT JOIN gb AS branch ON jh.JH_GB = branch.GB_PK

-- Operator (deduped, joined on CODE not PK!)
LEFT JOIN gs AS ops ON jh.JH_GS_NKREPOPS = ops.GS_CODE

-- Sales Rep (deduped, joined on CODE not PK!)
LEFT JOIN gs AS sales ON jh.JH_GS_NKREPSALES = sales.GS_CODE

-- Overseas Agent (deduped)
LEFT JOIN oa AS oa_agent ON jh.JH_OA_AGENTCOLLECTADDR = oa_agent.OA_PK
LEFT JOIN oh AS agent_org ON oa_agent.OA_OH = agent_org.OH_PK

-- Local Client (deduped)
LEFT JOIN oa AS oa_local ON jh.JH_OA_LOCALCHARGESADDR = oa_local.OA_PK
LEFT JOIN oh AS local_org ON oa_local.OA_OH = local_org.OH_PK

-- Parent Job (deduped)
LEFT JOIN jh AS parent ON jh.JH_JH_PARENTJOB = parent.JH_PK

-- Routing: Shipment (deduped)
LEFT JOIN js AS ship ON ship.JS_PK = jh.JH_PK

-- Routing: Declaration (deduped)
LEFT JOIN je AS decl ON decl.JE_PK = jh.JH_PK

-- WIP Recognition (latest per job, deduped)
LEFT JOIN wrr ON wrr.D3_JH = jh.JH_PK

-- Only active charge lines
WHERE jr.JR_ISVALID = TRUE
;


/*
 * ============================================================================
 *  VW_EOM_JOBS_SUMMARY — Aggregated Job-Level View (CDC-aware)
 * ============================================================================
 */

CREATE OR REPLACE VIEW DEV.CORE.VW_EOM_JOBS_SUMMARY
AS
WITH
-- CDC deduplication CTEs (same pattern)
jh_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JH_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBHEADER WHERE ACTV_IND = TRUE
),
jh AS (SELECT * FROM jh_dedup WHERE _rn = 1),

gs_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY GS_CODE ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.GLBSTAFF WHERE ACTV_IND = TRUE
),
gs AS (SELECT * FROM gs_dedup WHERE _rn = 1),

gb_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY GB_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.GLBBRANCH WHERE ACTV_IND = TRUE
),
gb AS (SELECT * FROM gb_dedup WHERE _rn = 1),

oa_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY OA_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.ORGADDRESS WHERE ACTV_IND = TRUE
),
oa AS (SELECT * FROM oa_dedup WHERE _rn = 1),

oh_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY OH_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.ORGHEADER WHERE ACTV_IND = TRUE
),
oh AS (SELECT * FROM oh_dedup WHERE _rn = 1),

js_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JS_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBSHIPMENT WHERE ACTV_IND = TRUE AND JS_ISVALID = TRUE
),
js AS (SELECT * FROM js_dedup WHERE _rn = 1),

je_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JE_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBDECLARATION WHERE ACTV_IND = TRUE AND JE_ISVALID = TRUE AND JE_ISCANCELLED = FALSE
),
je AS (SELECT * FROM je_dedup WHERE _rn = 1),

wrr_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY D3_JH ORDER BY D3_RECOGNITIONDATE DESC, CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBCHARGEREVRECOGNITION WHERE ACTV_IND = TRUE
),
wrr AS (SELECT * FROM wrr_dedup WHERE _rn = 1),

-- Aggregate financials from deduped charges
jr_dedup AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY JR_PK ORDER BY CRE_DT DESC) AS _rn
    FROM PROD.CORE.JOBCHARGE WHERE ACTV_IND = TRUE AND JR_ISVALID = TRUE
),
jr AS (SELECT * FROM jr_dedup WHERE _rn = 1),

agg AS (
    SELECT
        JR_JH,
        SUM(COALESCE(JR_LOCALSELLAMT, 0))                                      AS TOTAL_REVENUE,
        SUM(COALESCE(JR_LOCALCOSTAMT, 0))                                      AS TOTAL_COST,
        SUM(CASE WHEN JR_PROFORMACOST = TRUE THEN COALESCE(JR_LOCALCOSTAMT, 0) ELSE 0 END)   AS TOTAL_WIP,
        SUM(CASE WHEN JR_PROFORMAREVENUE = TRUE THEN COALESCE(JR_LOCALSELLAMT, 0) ELSE 0 END) AS TOTAL_ACCRUAL,
        SUM(COALESCE(JR_ESTIMATEDCOST, 0))                                     AS TOTAL_ESTIMATED_COST,
        SUM(COALESCE(JR_ESTIMATEDREVENUE, 0))                                  AS TOTAL_ESTIMATED_REVENUE,
        COUNT(*)                                                                AS CHARGE_LINE_COUNT,
        MAX(JR_SYSTEMLASTEDITTIMEUTC)                                           AS LATEST_CHARGE_MODIFIED_UTC
    FROM jr
    GROUP BY JR_JH
)

SELECT
    -- Job identity
    jh.JH_PK                                    AS JOB_PK,
    jh.JH_JOBNUM                                AS JOB_NUMBER,
    jh.JH_NAME                                  AS JOB_NAME,
    jh.JH_STATUS                                AS JOB_STATUS,
    jh.JH_HEADERTYPE                            AS JOB_TYPE,
    jh.JH_DIRECTION                             AS JOB_DIRECTION,
    jh.JH_JOBLOCALREFERENCE                     AS JOB_LOCAL_REF,
    jh.JH_HOLDREASON                            AS JOB_HOLD_REASON,
    jh.JH_PROFITLOSSREASONCODE                  AS JOB_PL_REASON_CODE,

    -- Branch (resolved)
    branch.GB_CODE                              AS BRANCH_CODE,
    branch.GB_BRANCHNAME                        AS BRANCH_NAME,
    branch.GB_RN_NKCOUNTRYCODE                  AS BRANCH_COUNTRY,
    jh.JH_GE                                    AS DEPARTMENT_FK,
    jh.JH_GC                                    AS COMPANY_FK,

    -- Dates
    jh.JH_A_JOP                                 AS JOB_OPENED_DATE,
    jh.JH_A_JCL                                 AS JOB_CLOSED_DATE,
    jh.JH_ISACTIVE                              AS JOB_IS_ACTIVE,

    -- People
    ops.GS_CODE                                 AS OPERATOR_CODE,
    ops.GS_FULLNAME                             AS OPERATOR_NAME,
    sales.GS_CODE                               AS SALES_REP_CODE,
    sales.GS_FULLNAME                           AS SALES_REP_NAME,

    -- Organisations
    agent_org.OH_CODE                           AS OVERSEAS_AGENT_CODE,
    agent_org.OH_FULLNAME                       AS OVERSEAS_AGENT_NAME,
    local_org.OH_CODE                           AS LOCAL_CLIENT_CODE,
    local_org.OH_FULLNAME                       AS LOCAL_CLIENT_NAME,

    -- Parent job
    parent.JH_JOBNUM                            AS PARENT_JOB_NUMBER,

    -- Routing (coalesced)
    COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN)         AS ROUTING_ORIGIN,
    COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION) AS ROUTING_DESTINATION,
    COALESCE(ship.JS_E_DEP, decl.JE_EXPORTDATE)                 AS ROUTING_ETD,
    COALESCE(ship.JS_E_ARV, decl.JE_DATEOFARRIVAL)              AS ROUTING_ETA,
    COALESCE(ship.JS_TRANSPORTMODE, decl.JE_TRANSPORTMODE)       AS ROUTING_TRANSPORT_MODE,
    CASE WHEN ship.JS_PK IS NOT NULL THEN 'SHIPMENT'
         WHEN decl.JE_PK IS NOT NULL THEN 'DECLARATION'
         ELSE NULL END                          AS ROUTING_SOURCE,
    LEFT(COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN), 2) AS ORIGIN_COUNTRY,
    LEFT(COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION), 2) AS DEST_COUNTRY,
    CASE
        WHEN LEFT(COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN), 2) != 'AU'
         AND LEFT(COALESCE(ship.JS_RL_NKDESTINATION, decl.JE_RL_NKFINALDESTINATION), 2) != 'AU'
         AND COALESCE(ship.JS_RL_NKORIGIN, decl.JE_RL_NKORIGIN) IS NOT NULL
        THEN TRUE ELSE FALSE
    END                                         AS IS_CROSS_TRADE,

    -- WIP recognition
    wrr.D3_RECOGNITIONTYPE                      AS WIP_RECOGNITION_TYPE,
    wrr.D3_RECOGNITIONDATE                      AS WIP_RECOGNITION_DATE,

    -- Aggregated financials
    COALESCE(agg.TOTAL_REVENUE, 0)              AS TOTAL_REVENUE,
    COALESCE(agg.TOTAL_COST, 0)                 AS TOTAL_COST,
    COALESCE(agg.TOTAL_WIP, 0)                  AS TOTAL_WIP,
    COALESCE(agg.TOTAL_ACCRUAL, 0)              AS TOTAL_ACCRUAL,
    COALESCE(agg.TOTAL_REVENUE, 0) - COALESCE(agg.TOTAL_COST, 0) AS PROFIT_LOSS,
    CASE
        WHEN COALESCE(agg.TOTAL_REVENUE, 0) != 0
        THEN ROUND(((COALESCE(agg.TOTAL_REVENUE, 0) - COALESCE(agg.TOTAL_COST, 0))
             / agg.TOTAL_REVENUE) * 100, 2)
        ELSE 0
    END                                         AS MARGIN_PCT,
    COALESCE(agg.CHARGE_LINE_COUNT, 0)          AS CHARGE_LINE_COUNT,
    agg.LATEST_CHARGE_MODIFIED_UTC,

    -- Computed helpers
    DATEDIFF('day', jh.JH_A_JOP, COALESCE(jh.JH_A_JCL, CURRENT_TIMESTAMP())) AS JOB_AGE_DAYS

FROM jh

LEFT JOIN gb AS branch ON jh.JH_GB = branch.GB_PK
LEFT JOIN gs AS ops ON jh.JH_GS_NKREPOPS = ops.GS_CODE
LEFT JOIN gs AS sales ON jh.JH_GS_NKREPSALES = sales.GS_CODE
LEFT JOIN oa AS oa_agent ON jh.JH_OA_AGENTCOLLECTADDR = oa_agent.OA_PK
LEFT JOIN oh AS agent_org ON oa_agent.OA_OH = agent_org.OH_PK
LEFT JOIN oa AS oa_local ON jh.JH_OA_LOCALCHARGESADDR = oa_local.OA_PK
LEFT JOIN oh AS local_org ON oa_local.OA_OH = local_org.OH_PK
LEFT JOIN jh AS parent ON jh.JH_JH_PARENTJOB = parent.JH_PK
LEFT JOIN js AS ship ON ship.JS_PK = jh.JH_PK
LEFT JOIN je AS decl ON decl.JE_PK = jh.JH_PK
LEFT JOIN wrr ON wrr.D3_JH = jh.JH_PK
LEFT JOIN agg ON agg.JR_JH = jh.JH_PK
;
