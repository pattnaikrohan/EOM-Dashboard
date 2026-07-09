/*
 * ============================================================================
 *  VW_EOM_JOB_CHARGES — Unified EOM Dashboard View
 * ============================================================================
 *  Database: PROD
 *  Schema:   CORE
 *
 *  Purpose:  Single denormalised view that joins all 7 source tables into one
 *            queryable surface for the EOM Dashboard.  Provides job context,
 *            charge lines, cost/revenue breakdowns, WIP/accrual flags,
 *            people resolution, overseas agent names, and a full audit trail.
 *
 *  Joins:
 *    JOBHEADER  ←  JOBCHARGE (charge lines)
 *                  ACCCHARGECODE (charge code reference)
 *                  JOBCHARGEREVRECOGNITION (WIP release events)
 *                  GLBSTAFF × 2 (operator + sales rep)
 *                  ORGADDRESS → ORGHEADER (overseas agent)
 *                  JOBHEADER self-join (parent job)
 *
 *  Filtering (done at query time, NOT baked into the view):
 *    - Active records:    WHERE CHARGE_IS_ACTIVE = TRUE
 *    - Incremental sync:  WHERE CHARGE_LAST_MODIFIED_UTC >= <last_sync>
 *    - WIP costs only:    WHERE IS_WIP_COST = TRUE
 *    - Accrued rev only:  WHERE IS_ACCRUED_REVENUE = TRUE
 *    - Finalised only:    WHERE IS_FINALISED = TRUE
 * ============================================================================
 */

CREATE OR REPLACE VIEW PROD.CORE.VW_EOM_JOB_CHARGES
AS
SELECT
    -- ═══════════════════════════════════════════════════════════════════════
    --  CHARGE LINE (JOBCHARGE)
    -- ═══════════════════════════════════════════════════════════════════════
    jr.JR_PK                                    AS CHARGE_PK,
    jr.JR_JH                                    AS CHARGE_JOB_FK,
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

    -- Margin & status flags
    jr.JR_MARGINPERCENTAGE                      AS CHARGE_MARGIN_PCT,
    jr.JR_PROFORMACOST                          AS IS_WIP_COST,
    jr.JR_PROFORMAREVENUE                       AS IS_ACCRUED_REVENUE,
    CASE
        WHEN jr.JR_PROFORMACOST = FALSE
         AND jr.JR_PROFORMAREVENUE = FALSE
        THEN TRUE
        ELSE FALSE
    END                                         AS IS_FINALISED,
    jr.JR_ISINCLUDEDINPROFITSHARE               AS IS_IN_PROFIT_SHARE,
    jr.JR_ISVALID                               AS CHARGE_IS_ACTIVE,

    -- Charge-level org / branch / dept
    jr.JR_GE                                    AS CHARGE_DEPARTMENT,
    jr.JR_GB                                    AS CHARGE_BRANCH,
    jr.JR_GC                                    AS CHARGE_COMPANY,

    -- Charge audit trail
    jr.JR_SYSTEMCREATETIMEUTC                   AS CHARGE_CREATED_UTC,
    jr.JR_SYSTEMCREATEUSER                      AS CHARGE_CREATED_BY,
    jr.JR_SYSTEMLASTEDITTIMEUTC                 AS CHARGE_LAST_MODIFIED_UTC,
    jr.JR_SYSTEMLASTEDITUSER                    AS CHARGE_LAST_MODIFIED_BY,

    -- ═══════════════════════════════════════════════════════════════════════
    --  CHARGE CODE REFERENCE (ACCCHARGECODE)
    -- ═══════════════════════════════════════════════════════════════════════
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

    -- ═══════════════════════════════════════════════════════════════════════
    --  JOB HEADER (JOBHEADER)
    -- ═══════════════════════════════════════════════════════════════════════
    jh.JH_PK                                    AS JOB_PK,
    jh.JH_JOBNUM                                AS JOB_NUMBER,
    jh.JH_NAME                                  AS JOB_NAME,
    jh.JH_DESCRIPTION                           AS JOB_DESCRIPTION,
    jh.JH_STATUS                                AS JOB_STATUS,
    jh.JH_HEADERTYPE                            AS JOB_TYPE,
    jh.JH_DIRECTION                             AS JOB_DIRECTION,
    jh.JH_JOBLOCALREFERENCE                     AS JOB_LOCAL_REF,
    jh.JH_HOLDREASON                            AS JOB_HOLD_REASON,
    jh.JH_PROFITLOSSREASONCODE                  AS JOB_PL_REASON_CODE,
    jh.JH_LOCALCHARGESCFX                       AS JOB_LOCAL_CHARGES_AMT,
    jh.JH_GB                                    AS JOB_BRANCH,
    jh.JH_GE                                    AS JOB_DEPARTMENT,
    jh.JH_GC                                    AS JOB_COMPANY,
    jh.JH_A_JOP                                 AS JOB_OPENED_DATE,
    jh.JH_A_JCL                                 AS JOB_CLOSED_DATE,
    jh.JH_ISACTIVE                              AS JOB_IS_ACTIVE,
    jh.JH_SYSTEMCREATETIMEUTC                   AS JOB_CREATED_UTC,
    jh.JH_SYSTEMCREATEUSER                      AS JOB_CREATED_BY,
    jh.JH_SYSTEMLASTEDITUSER                    AS JOB_LAST_MODIFIED_BY,

    -- ═══════════════════════════════════════════════════════════════════════
    --  PEOPLE — Operator (GLBSTAFF)
    -- ═══════════════════════════════════════════════════════════════════════
    ops.GS_PK                                   AS OPERATOR_PK,
    ops.GS_CODE                                 AS OPERATOR_CODE,
    ops.GS_FULLNAME                             AS OPERATOR_FULLNAME,
    ops.GS_FRIENDLYNAME                         AS OPERATOR_FRIENDLY_NAME,

    -- ═══════════════════════════════════════════════════════════════════════
    --  PEOPLE — Sales Rep (GLBSTAFF)
    -- ═══════════════════════════════════════════════════════════════════════
    sales.GS_PK                                 AS SALES_REP_PK,
    sales.GS_CODE                               AS SALES_REP_CODE,
    sales.GS_FULLNAME                           AS SALES_REP_FULLNAME,
    sales.GS_FRIENDLYNAME                       AS SALES_REP_FRIENDLY_NAME,

    -- ═══════════════════════════════════════════════════════════════════════
    --  OVERSEAS AGENT (ORGADDRESS → ORGHEADER)
    -- ═══════════════════════════════════════════════════════════════════════
    oh.OH_PK                                    AS AGENT_ORG_PK,
    oh.OH_CODE                                  AS AGENT_ORG_CODE,
    oh.OH_FULLNAME                              AS AGENT_ORG_NAME,

    -- ═══════════════════════════════════════════════════════════════════════
    --  LOCAL CHARGES CONTACT (ORGADDRESS → ORGHEADER)
    -- ═══════════════════════════════════════════════════════════════════════
    lc_oh.OH_CODE                               AS LOCAL_CHARGES_ORG_CODE,
    lc_oh.OH_FULLNAME                           AS LOCAL_CHARGES_ORG_NAME,

    -- ═══════════════════════════════════════════════════════════════════════
    --  PARENT JOB (JOBHEADER self-join)
    -- ═══════════════════════════════════════════════════════════════════════
    parent.JH_JOBNUM                            AS PARENT_JOB_NUMBER,
    parent.JH_STATUS                            AS PARENT_JOB_STATUS,

    -- ═══════════════════════════════════════════════════════════════════════
    --  WIP RECOGNITION (JOBCHARGEREVRECOGNITION — latest event per job)
    -- ═══════════════════════════════════════════════════════════════════════
    wrr.RECOGNITION_TYPE                        AS WIP_RECOGNITION_TYPE,
    wrr.RECOGNITION_DATE                        AS WIP_RECOGNITION_DATE,

    -- ═══════════════════════════════════════════════════════════════════════
    --  COMPUTED HELPER COLUMNS
    -- ═══════════════════════════════════════════════════════════════════════
    -- Net position per charge line (local currency)
    COALESCE(jr.JR_LOCALSELLAMT, 0)
      - COALESCE(jr.JR_LOCALCOSTAMT, 0)         AS NET_LOCAL_AMT,

    -- Variance: estimated vs actual cost
    COALESCE(jr.JR_ESTIMATEDCOST, 0)
      - COALESCE(jr.JR_LOCALCOSTAMT, 0)         AS COST_VARIANCE,

    -- Variance: estimated vs actual revenue
    COALESCE(jr.JR_ESTIMATEDREVENUE, 0)
      - COALESCE(jr.JR_LOCALSELLAMT, 0)         AS REVENUE_VARIANCE,

    -- Job age in days (from job opened to today, or to job closed)
    DATEDIFF('day',
        jh.JH_A_JOP,
        COALESCE(jh.JH_A_JCL, CURRENT_TIMESTAMP())
    )                                           AS JOB_AGE_DAYS

FROM
    PROD.CORE.JOBCHARGE             jr

    -- Job master
    INNER JOIN PROD.CORE.JOBHEADER  jh
        ON jr.JR_JH = jh.JH_PK

    -- Charge code lookup
    LEFT JOIN PROD.CORE.ACCCHARGECODE ac
        ON jr.JR_AC = ac.AC_PK

    -- Operator (staff)
    LEFT JOIN PROD.CORE.GLBSTAFF    ops
        ON jh.JH_GS_NKREPOPS = ops.GS_PK

    -- Sales Rep (staff)
    LEFT JOIN PROD.CORE.GLBSTAFF    sales
        ON jh.JH_GS_NKREPSALES = sales.GS_PK

    -- Overseas Agent: JOBHEADER → ORGADDRESS → ORGHEADER
    LEFT JOIN PROD.CORE.ORGADDRESS  oa_agent
        ON jh.JH_OA_AGENTCOLLECTADDR = oa_agent.OA_PK
    LEFT JOIN PROD.CORE.ORGHEADER   oh
        ON oa_agent.OA_OH = oh.OH_PK

    -- Local Charges Contact: JOBHEADER → ORGADDRESS → ORGHEADER
    LEFT JOIN PROD.CORE.ORGADDRESS  oa_lc
        ON jh.JH_OA_LOCALCHARGESADDR = oa_lc.OA_PK
    LEFT JOIN PROD.CORE.ORGHEADER   lc_oh
        ON oa_lc.OA_OH = lc_oh.OH_PK

    -- Parent Job (self-join)
    LEFT JOIN PROD.CORE.JOBHEADER   parent
        ON jh.JH_JH_PARENTJOB = parent.JH_PK

    -- WIP Recognition (latest event per job)
    LEFT JOIN (
        SELECT
            D3_JH,
            D3_RECOGNITIONTYPE              AS RECOGNITION_TYPE,
            D3_RECOGNITIONDATE              AS RECOGNITION_DATE,
            ROW_NUMBER() OVER (
                PARTITION BY D3_JH
                ORDER BY D3_RECOGNITIONDATE DESC
            )                               AS rn
        FROM PROD.CORE.JOBCHARGEREVRECOGNITION
    ) wrr
        ON wrr.D3_JH = jh.JH_PK
       AND wrr.rn = 1
;
