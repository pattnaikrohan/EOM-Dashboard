-- ==============================================================================
-- UPDATE VIEW: PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED_V3
--
-- Purpose:
--   1. Eliminates P&L discrepancies with CargoWise by excluding internal month-end
--      accounting WIP/revenue adjustment journal lines (REV/WIP ADJUSTMENT%).
--   2. Fixes CDC status tracking to ensure closed jobs accurately reflect 'CLS'.
-- ==============================================================================

CREATE OR REPLACE VIEW PROD.AI_AUTO.VW_EOM_JOB_CHARGES_UPDATED_V3 AS

WITH jh_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY JH_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.JOBHEADER_DEDUP
    WHERE JH_PARENTTABLECODE IN ('JS','JE')
),

jh_all AS (SELECT * FROM jh_dedup WHERE _rn = 1),

jh AS (
    SELECT * FROM jh_all
    WHERE JH_SYSTEMCREATETIMEUTC >= DATE('2026-04-01')
      AND JH_ISACTIVE = TRUE
),

jr_dedup AS (
    SELECT *,
    ROW_NUMBER() OVER (
        PARTITION BY JR_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.JOBCHARGE_DEDUP
    WHERE JR_JH IN (SELECT JH_PK FROM jh)
),

-- Filter out internal accounting journal lines (REV/WIP ADJUSTMENT) to match CargoWise Job Costing totals
jr AS (
    SELECT * FROM jr_dedup 
    WHERE _rn = 1
      AND (JR_DESC IS NULL OR (JR_DESC NOT ILIKE 'REV/WIP ADJUSTMENT%' AND JR_DESC NOT ILIKE '%WIP ADJUSTMENT%'))
),

js_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY JS_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.JOBSHIPMENT_DEDUP
    WHERE JS_PK IN (SELECT JH_PARENTID FROM jh WHERE JH_PARENTTABLECODE = 'JS')
),

js AS (SELECT * FROM js_dedup WHERE _rn = 1),

je_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY JE_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST 
    ) AS _rn
    FROM CORE.JOBDECLARATION_DEDUP
    WHERE JE_PK IN (SELECT JH_PARENTID FROM jh WHERE JH_PARENTTABLECODE = 'JE')
),

je AS (SELECT * FROM je_dedup WHERE _rn = 1),

oa_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY OA_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.ORGADDRESS_DEDUP
    WHERE OA_PK IN (
        SELECT JH_OA_LOCALCHARGESADDR FROM jh WHERE JH_OA_LOCALCHARGESADDR IS NOT NULL
        UNION
        SELECT JH_OA_AGENTCOLLECTADDR FROM jh WHERE JH_OA_AGENTCOLLECTADDR IS NOT NULL
    )
),

oa AS (SELECT * FROM oa_dedup WHERE _rn = 1),

oh_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY OH_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.ORGHEADER_DEDUP
    WHERE OH_PK IN (
        SELECT OA_OH FROM oa WHERE OA_OH IS NOT NULL
        UNION
        SELECT JR_OH_COSTACCOUNT FROM jr WHERE JR_OH_COSTACCOUNT IS NOT NULL
        UNION
        SELECT JR_OH_SELLACCOUNT FROM jr WHERE JR_OH_SELLACCOUNT IS NOT NULL
    )
),

oh AS (SELECT * FROM oh_dedup WHERE _rn = 1),

al_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY AL_PK
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.ACCTRANSACTIONLINES_DEDUP
),

al AS (SELECT * FROM al_dedup WHERE _rn = 1),

rev_agg AS (
    SELECT JR_JH, SUM(COALESCE(JR_LOCALSELLAMT,0)) AS REVENUE_PROVISIONAL,
           COUNT(*) AS JR_LINE_COUNT
    FROM jr
    GROUP BY JR_JH
),

cost_agg AS (
    SELECT AL_JH, SUM(AL_LINEAMOUNT) AS COST_CONFIRMED,
           COUNT(*) AS CST_LINE_COUNT
    FROM al
    WHERE AL_LINETYPE = 'CST'
    GROUP BY AL_JH
),

acr_agg AS (
    SELECT 
        AL_JH,
        MIN(AL_POSTDATE)                                  AS ACR_RECOGNITION_DATE,
        MAX(AL_POSTDATE)                                  AS ACR_LATEST_POST_DATE,
        SUM(AL_LINEAMOUNT)                                AS TOTAL_ACCRUAL_AMT,
        COUNT(*)                                          AS ACR_LINE_COUNT,
        DATEDIFF('day', MIN(AL_POSTDATE), CURRENT_DATE()) AS ACR_AGE_DAYS
    FROM al
    WHERE AL_LINETYPE = 'ACR'
      AND (AL_REVERSEDATE IS NULL OR AL_REVERSEDATE = '1900-01-01 00:00:00')
      AND (AL_REVERSETOGL IS NULL OR AL_REVERSETOGL = 'N')
    GROUP BY AL_JH
),

wrr_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY D3_JH
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.JOBCHARGEREVRECOGNITION_DEDUP
    WHERE D3_JH IN (SELECT JH_PK FROM jh)
),

wrr AS (SELECT * FROM wrr_dedup WHERE _rn = 1),

gs_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY GS_CODE
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST
    ) AS _rn
    FROM CORE.GLBSTAFF_DEDUP
),

gs AS (SELECT * FROM gs_dedup WHERE _rn = 1),

ac_dedup AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY AC_PK 
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST 
    ) AS _rn
    FROM CORE.ACCCHARGECODE_DEDUP
),

ac AS (SELECT * FROM ac_dedup WHERE _rn = 1),

acct_transact_dedup AS (   
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY AT_PK 
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST 
    ) AS _rn
    FROM CORE.ACCTAXRATE_DEDUP
),

AT AS (SELECT * FROM acct_transact_dedup WHERE _rn = 1),

acct_gl_dedup AS (   
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY AG_PK 
        ORDER BY CDC_LSN DESC NULLS LAST, CDC_SEQVAL DESC NULLS LAST 
    ) AS _rn
    FROM CORE.ACCGLHEADER_DEDUP
),

AG AS (SELECT * FROM acct_gl_dedup WHERE _rn = 1)

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
    at_cost.AT_CODE                             AS COST_GST,
    jr.JR_OSCOSTGSTAMT                          AS COST_GST_AMT,
    CCA.OH_CODE                                 AS COST_CREDITOR_ACCOUNT_CODE,
    CCA.OH_FULLNAME                             AS COST_CREDITOR_ACCOUNT_NAME,
    jr.JR_APLINEPOSTINGSTATUS                   AS COST_AP_POSTING_STATUS,
    jr.JR_APINVOICENUM                          AS COST_AP_INVOICE_NUM,
    jr.JR_APINVOICEDATE                         AS COST_AP_INVOICE_DATE,

    -- Sell / Revenue side
    jr.JR_OSSELLAMT                             AS SELL_OS_AMT,
    jr.JR_LOCALSELLAMT                          AS SELL_LOCAL_AMT,
    jr.JR_RX_NKSELLCURRENCY                     AS SELL_CURRENCY,
    jr.JR_OSSELLEXRATE                          AS SELL_EXCHANGE_RATE,
    jr.JR_ESTIMATEDREVENUE                      AS SELL_ESTIMATED_REVENUE,
    at_sell.AT_CODE                             AS SELL_GST,
    jr.JR_AT_SELLGSTRATE                        AS SELL_GST_RATE,
    SDA.OH_CODE                                 AS SELL_DEBTOR_ACCOUNT_CODE,
    SDA.OH_FULLNAME                             AS SELL_DEBTOR_ACCOUNT_NAME,
    jr.JR_ARLINEPOSTINGSTATUS                   AS SELL_AR_POSTING_STATUS,
    jr.JR_INVOICETYPE                           AS SELL_INVOICE_TYPE,

    -- Margin & proforma flags
    jr.JR_MARGINPERCENTAGE                      AS CHARGE_MARGIN_PCT,
    jr.JR_PROFORMACOST                          AS IS_WIP_COST,
    jr.JR_PROFORMAREVENUE                       AS IS_ACCRUED_REVENUE,
    CASE
        WHEN jr.JR_PROFORMACOST = FALSE AND jr.JR_PROFORMAREVENUE = FALSE
        THEN TRUE ELSE FALSE
    END                                         AS IS_FINALISED,
    jr.JR_ISINCLUDEDINPROFITSHARE               AS IS_IN_PROFIT_SHARE,
    jr.JR_ISVALID                               AS CHARGE_IS_ACTIVE,

    -- Charge org context
    DEPT_CHARGE.GE_CODE                         AS CHARGE_DEPARTMENT_CODE,
    DEPT_CHARGE.GE_DESC                         AS CHARGE_DEPARTMENT_DESCRIPTION,
    BRANCH_CHARGE.GB_CODE                       AS CHARGE_BRANCH_CODE,
    BRANCH_CHARGE.GB_BRANCHNAME                 AS CHARGE_BRANCH_NAME,
    BRANCH_CHARGE.GB_RN_NKCOUNTRYCODE           AS CHARGE_BRANCH_COUNTRY_CODE,
    COMP_CHARGE.GC_CODE                         AS CHARGE_COMPANY_CODE,
    COMP_CHARGE.GC_NAME                         AS CHARGE_COMPANY_NAME,
    COMP_CHARGE.GC_CITY                         AS CHARGE_COMPANY_CITY,
    COMP_CHARGE.GC_STATE                        AS CHARGE_COMPANY_STATE,

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
    ac.AC_ISACTIVE                              AS CHARGECODE_IS_ACTIVE,
    AG_REVENUE.AG_ACCOUNTNUM                    AS GL_REVENUE_ACCOUNT_NUM,
    AG_REVENUE.AG_DESCRIPTION                   AS GL_REVENUE_ACCOUNT_DESCRIPTION,
    AG_REVENUE.AG_ACCOUNTTYPE                   AS GL_REVENUE_ACCOUNT_TYPE,
    AG_REVENUE.AG_DEBITCREDIT                   AS GL_REVENUE_ACCOUNT_TRANSACTION_TYPE,
    AG_COST.AG_ACCOUNTNUM                       AS GL_COST_ACCOUNT_NUM,
    AG_COST.AG_DESCRIPTION                      AS GL_COST_ACCOUNT_DESCRIPTION,
    AG_COST.AG_ACCOUNTTYPE                      AS GL_COST_ACCOUNT_TYPE,
    AG_COST.AG_DEBITCREDIT                      AS GL_COST_ACCOUNT_TRANSACTION_TYPE,
    AG_WIP.AG_ACCOUNTNUM                        AS GL_WIP_ACCOUNT_NUM,
    AG_WIP.AG_DESCRIPTION                       AS GL_WIP_ACCOUNT_DESCRIPTION,
    AG_WIP.AG_ACCOUNTTYPE                       AS GL_WIP_ACCOUNT_TYPE,
    AG_WIP.AG_DEBITCREDIT                       AS GL_WIP_ACCOUNT_TRANSACTION_TYPE,
    AG_ACCRUAL.AG_ACCOUNTNUM                    AS GL_ACCRUAL_ACCOUNT_NUM,
    AG_ACCRUAL.AG_DESCRIPTION                   AS GL_ACCRUAL_ACCOUNT_DESCRIPTION,
    AG_ACCRUAL.AG_ACCOUNTTYPE                   AS GL_ACCRUAL_ACCOUNT_TYPE,
    AG_ACCRUAL.AG_DEBITCREDIT                   AS GL_ACCRUAL_ACCOUNT_TRANSACTION_TYPE,

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
    jh.JH_GS_NKREPOPS                           AS JOB_OPERATOR_CODE,
    jh.JH_GS_NKREPSALES                         AS JOB_SALES_REP_CODE,
    jh.JH_A_JOP                                 AS JOB_OPENED_DATE,
    jh.JH_A_JCL                                 AS JOB_CLOSED_DATE,
    jh.JH_ISACTIVE                              AS JOB_IS_ACTIVE,
    DATEDIFF('day', jh.JH_A_JOP, CURRENT_DATE()) AS JOB_AGE_DAYS,
    jh.JH_SYSTEMCREATETIMEUTC                   AS JOB_CREATED_UTC,
    jh.JH_SYSTEMCREATEUSER                      AS JOB_CREATED_BY,
    jh.JH_SYSTEMLASTEDITUSER                    AS JOB_LAST_MODIFIED_BY,

    -- Job org context
    DEPT_JOB.GE_CODE                            AS JOB_DEPARTMENT_CODE,
    DEPT_JOB.GE_DESC                            AS JOB_DEPARTMENT_DESCRIPTION,
    BRANCH_JOB.GB_CODE                          AS JOB_BRANCH_CODE,
    BRANCH_JOB.GB_BRANCHNAME                    AS JOB_BRANCH_NAME,
    BRANCH_JOB.GB_RN_NKCOUNTRYCODE              AS JOB_BRANCH_COUNTRY_CODE,
    COMP_JOB.GC_CODE                            AS JOB_COMPANY_CODE,
    COMP_JOB.GC_NAME                            AS JOB_COMPANY_NAME,
    COMP_JOB.GC_CITY                            AS JOB_COMPANY_CITY,
    COMP_JOB.GC_STATE                           AS JOB_COMPANY_STATE,

    -- ── OPERATOR & SALES REP (GLBSTAFF) ──────────────────────────────────
    ops.GS_CODE                                 AS OPERATOR_CODE,
    ops.GS_FULLNAME                             AS OPERATOR_FULLNAME,
    ops.GS_FRIENDLYNAME                         AS OPERATOR_FRIENDLY_NAME,
    ops.GS_GIVENNAME                            AS OPERATOR_GIVEN_NAME,
    ops.GS_SURNAME                              AS OPERATOR_SURNAME,
    ops.GS_ISACTIVE                             AS OPERATOR_IS_ACTIVE,
    sales.GS_CODE                               AS SALES_REP_CODE,
    sales.GS_FULLNAME                           AS SALES_REP_FULLNAME,
    sales.GS_FRIENDLYNAME                       AS SALES_REP_FRIENDLY_NAME,
    sales.GS_GIVENNAME                          AS SALES_REP_GIVEN_NAME,
    sales.GS_SURNAME                            AS SALES_REP_SURNAME,
    sales.GS_ISACTIVE                           AS SALES_REP_IS_ACTIVE,

    -- ── OVERSEAS AGENT (ORGHEADER / ORGADDRESS) ──────────────────────────
    agent_org.OH_FULLNAME                       AS AGENT_ORG_NAME,
    agent_org.OH_CODE                           AS AGENT_ORG_CODE,

    -- ── LOCAL CLIENT (ORGHEADER / ORGADDRESS) ────────────────────────────
    local_org.OH_FULLNAME                       AS LOCAL_CLIENT_NAME,
    local_org.OH_CODE                           AS LOCAL_CLIENT_CODE,

    -- ── PARENT JOB ───────────────────────────────────────────────────────
    parent.JH_JOBNUM                            AS PARENT_JOB_NUMBER,
    parent.JH_STATUS                            AS PARENT_JOB_STATUS,
    parent.JH_A_JOP                             AS PARENT_JOB_OPENED_DATE,
    parent.JH_A_JCL                             AS PARENT_JOB_CLOSED_DATE,
    parent.JH_LOCALCHARGESCFX                   AS PARENT_JOB_LOCAL_CHARGES_AMT,

    -- Parent job context
    DEPT_JOB_PAR.GE_CODE                        AS PARENT_JOB_DEPARTMENT_CODE,
    DEPT_JOB_PAR.GE_DESC                        AS PARENT_JOB_DEPARTMENT_DESCRIPTION,
    BRANCH_JOB_PAR.GB_CODE                      AS PARENT_JOB_BRANCH_CODE,
    BRANCH_JOB_PAR.GB_BRANCHNAME                AS PARENT_JOB_BRANCH_NAME,
    BRANCH_JOB_PAR.GB_RN_NKCOUNTRYCODE          AS PARENT_JOB_BRANCH_COUNTRY_CODE,
    COMP_JOB_PAR.GC_CODE                        AS PARENT_JOB_COMPANY_CODE,
    COMP_JOB_PAR.GC_NAME                        AS PARENT_JOB_COMPANY_NAME,
    COMP_JOB_PAR.GC_CITY                        AS PARENT_JOB_COMPANY_CITY,
    COMP_JOB_PAR.GC_STATE                       AS PARENT_JOB_COMPANY_STATE,

    -- ── WIP / ACCRUAL RECOGNITION ─────────────────────────────────────────
    wrr.D3_RECOGNITIONTYPE                      AS WIP_RECOGNITION_TYPE,
    COALESCE(acr.ACR_RECOGNITION_DATE, wrr.D3_RECOGNITIONDATE) AS WIP_RECOGNITION_DATE,
    COALESCE(acr.ACR_RECOGNITION_DATE, wrr.D3_RECOGNITIONDATE) AS ACR_RECOGNITION_DATE,
    CASE 
        WHEN acr.ACR_AGE_DAYS IS NOT NULL THEN acr.ACR_AGE_DAYS
        WHEN (jr.JR_PROFORMACOST = TRUE OR jr.JR_PROFORMAREVENUE = TRUE) 
             AND wrr.D3_RECOGNITIONDATE > '1900-01-01' 
        THEN DATEDIFF('day', wrr.D3_RECOGNITIONDATE, CURRENT_DATE()) 
        ELSE NULL
    END                                         AS WIP_AGE_DAYS,

    -- ── ROUTING: JOBSHIPMENT ─────────────────────────────────────────────
    ship.JS_RL_NKORIGIN                         AS SHIPMENT_ORIGIN,
    ship.JS_RL_NKDESTINATION                    AS SHIPMENT_DESTINATION,
    ship.JS_E_DEP                               AS SHIPMENT_ETD,
    ship.JS_E_ARV                               AS SHIPMENT_ETA,
    ship.JS_TRANSPORTMODE                       AS SHIPMENT_TRANSPORT_MODE,
    ship.JS_SHIPMENTSTATUS                      AS SHIPMENT_STATUS,

    -- ── ROUTING: JOBDECLARATION ──────────────────────────────────────────
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

    -- Declaration context
    BRANCH_DECL.GB_CODE                         AS DECLARATION_BRANCH_CODE,
    BRANCH_DECL.GB_BRANCHNAME                   AS DECLARATION_BRANCH_NAME,
    BRANCH_DECL.GB_RN_NKCOUNTRYCODE             AS DECLARATION_BRANCH_COUNTRY_CODE,
    COMP_DECL.GC_CODE                           AS DECLARATION_COMPANY_CODE,
    COMP_DECL.GC_NAME                           AS DECLARATION_COMPANY_NAME,
    COMP_DECL.GC_CITY                           AS DECLARATION_COMPANY_CITY,
    COMP_DECL.GC_STATE                          AS DECLARATION_COMPANY_STATE

FROM jr 
INNER JOIN jh ON jr.JR_JH = jh.JH_PK
LEFT JOIN jh_all AS parent ON jh.JH_JH_PARENTJOB = parent.JH_PK
LEFT JOIN ac ON jr.JR_AC = ac.AC_PK
LEFT JOIN gs AS ops ON jh.JH_GS_NKREPOPS = ops.GS_CODE
LEFT JOIN gs AS sales ON jh.JH_GS_NKREPSALES = sales.GS_CODE
LEFT JOIN oa AS oa_local ON jh.JH_OA_LOCALCHARGESADDR = oa_local.OA_PK
LEFT JOIN oh AS local_org ON oa_local.OA_OH = local_org.OH_PK
LEFT JOIN oh AS CCA ON jr.JR_OH_COSTACCOUNT = CCA.OH_PK
LEFT JOIN oh AS SDA ON jr.JR_OH_SELLACCOUNT = SDA.OH_PK
LEFT JOIN AG AG_REVENUE ON AG_REVENUE.AG_PK = ac.AC_AG_REVENUEACCOUNT
LEFT JOIN AG AG_COST ON AG_COST.AG_PK = ac.AC_AG_COSTACCOUNT
LEFT JOIN AG AG_WIP ON AG_WIP.AG_PK = ac.AC_AG_WIPACCOUNT
LEFT JOIN AG AG_ACCRUAL ON AG_ACCRUAL.AG_PK = ac.AC_AG_ACCRUALACCOUNT
LEFT JOIN oa AS oa_agent ON jh.JH_OA_AGENTCOLLECTADDR = oa_agent.OA_PK
LEFT JOIN oh AS agent_org ON oa_agent.OA_OH = agent_org.OH_PK
LEFT JOIN js AS ship ON ship.JS_PK = jh.JH_PARENTID AND jh.JH_PARENTTABLECODE = 'JS'
LEFT JOIN je AS decl ON decl.JE_PK = jh.JH_PARENTID AND jh.JH_PARENTTABLECODE = 'JE'
LEFT JOIN wrr ON wrr.D3_JH = jh.JH_PK
LEFT JOIN acr_agg AS acr ON acr.AL_JH = jh.JH_PK
LEFT JOIN MART.VW_DIM_DEPARTMENT DEPT_CHARGE ON DEPT_CHARGE.GE_PK = jr.JR_GE
LEFT JOIN MART.VW_DIM_DEPARTMENT DEPT_JOB ON DEPT_JOB.GE_PK = jh.JH_GE
LEFT JOIN MART.VW_DIM_DEPARTMENT DEPT_JOB_PAR ON DEPT_JOB_PAR.GE_PK = parent.JH_GE
LEFT JOIN MART.VW_DIM_COMPANY COMP_CHARGE ON COMP_CHARGE.GC_PK = jr.JR_GC
LEFT JOIN MART.VW_DIM_COMPANY COMP_JOB ON COMP_JOB.GC_PK = jh.JH_GC
LEFT JOIN MART.VW_DIM_COMPANY COMP_JOB_PAR ON COMP_JOB_PAR.GC_PK = parent.JH_GC
LEFT JOIN MART.VW_DIM_COMPANY COMP_DECL ON COMP_DECL.GC_PK = decl.JE_GC
LEFT JOIN MART.VW_DIM_BRANCH BRANCH_CHARGE ON BRANCH_CHARGE.GB_PK = jr.JR_GB
LEFT JOIN MART.VW_DIM_BRANCH BRANCH_JOB ON BRANCH_JOB.GB_PK = jh.JH_GB
LEFT JOIN MART.VW_DIM_BRANCH BRANCH_JOB_PAR ON BRANCH_JOB_PAR.GB_PK = parent.JH_GB
LEFT JOIN MART.VW_DIM_BRANCH BRANCH_DECL ON BRANCH_DECL.GB_PK = decl.JE_GB
LEFT JOIN AT at_cost ON at_cost.AT_PK = jr.JR_AT_COSTGSTRATE
LEFT JOIN AT at_sell ON at_sell.AT_PK = jr.JR_AT_SELLGSTRATE
;
