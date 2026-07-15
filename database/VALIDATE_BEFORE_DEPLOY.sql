/*
 * ============================================================================
 *  PRE-DEPLOYMENT VALIDATION SCRIPT
 * ============================================================================
 *  Run this BEFORE creating the views to confirm:
 *    1. All 9 tables exist and are accessible
 *    2. All expected columns exist with correct names
 *    3. Join cardinality assumptions are correct (1:1 for shipment/declaration)
 *    4. Data volume expectations
 *
 *  Execute each section one at a time in a Snowflake worksheet.
 * ============================================================================
 */


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Verify all 9 tables exist in PROD.CORE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 9 rows returned

SELECT TABLE_NAME, ROW_COUNT, BYTES
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME IN (
    'JOBCHARGE',
    'JOBHEADER',
    'ACCCHARGECODE',
    'JOBCHARGEREVRECOGNITION',
    'GLBSTAFF',
    'ORGHEADER',
    'ORGADDRESS',
    'JOBSHIPMENT',
    'JOBDECLARATION'
  )
ORDER BY TABLE_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Verify JOBCHARGE columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 39 rows matching the column list

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'JOBCHARGE'
  AND COLUMN_NAME IN (
    'JR_PK','JR_JH','JR_AC','JR_DESC','JR_CHARGETYPE','JR_LINETYPE',
    'JR_DISPLAYSEQUENCE','JR_OSCOSTAMT','JR_LOCALCOSTAMT','JR_RX_NKCOSTCURRENCY',
    'JR_OSCOSTEXRATE','JR_ESTIMATEDCOST','JR_AT_COSTGSTRATE','JR_OSCOSTGSTAMT',
    'JR_OH_COSTACCOUNT','JR_APLINEPOSTINGSTATUS','JR_APINVOICENUM','JR_APINVOICEDATE',
    'JR_OSSELLAMT','JR_LOCALSELLAMT','JR_RX_NKSELLCURRENCY','JR_OSSELLEXRATE',
    'JR_ESTIMATEDREVENUE','JR_AT_SELLGSTRATE','JR_OH_SELLACCOUNT',
    'JR_ARLINEPOSTINGSTATUS','JR_INVOICETYPE','JR_MARGINPERCENTAGE',
    'JR_PROFORMACOST','JR_PROFORMAREVENUE','JR_ISINCLUDEDINPROFITSHARE',
    'JR_ISVALID','JR_GE','JR_GB','JR_GC',
    'JR_SYSTEMCREATETIMEUTC','JR_SYSTEMCREATEUSER',
    'JR_SYSTEMLASTEDITTIMEUTC','JR_SYSTEMLASTEDITUSER'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Verify JOBHEADER columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 25 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'JOBHEADER'
  AND COLUMN_NAME IN (
    'JH_PK','JH_JOBNUM','JH_NAME','JH_DESCRIPTION','JH_STATUS',
    'JH_HEADERTYPE','JH_DIRECTION','JH_JOBLOCALREFERENCE',
    'JH_JH_PARENTJOB','JH_HOLDREASON','JH_PROFITLOSSREASONCODE',
    'JH_LOCALCHARGESCFX','JH_OA_LOCALCHARGESADDR','JH_OA_AGENTCOLLECTADDR',
    'JH_GB','JH_GE','JH_GC','JH_GS_NKREPOPS','JH_GS_NKREPSALES',
    'JH_A_JOP','JH_A_JCL','JH_ISACTIVE',
    'JH_SYSTEMCREATETIMEUTC','JH_SYSTEMCREATEUSER','JH_SYSTEMLASTEDITUSER'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Verify ACCCHARGECODE columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 11 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'ACCCHARGECODE'
  AND COLUMN_NAME IN (
    'AC_PK','AC_CODE','AC_DESC','AC_CHARGETYPE','AC_CHARGEGROUP',
    'AC_CHARGESUBGROUP','AC_AG_REVENUEACCOUNT','AC_AG_COSTACCOUNT',
    'AC_AG_WIPACCOUNT','AC_AG_ACCRUALACCOUNT','AC_ISACTIVE'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Verify JOBCHARGEREVRECOGNITION columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 4 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'JOBCHARGEREVRECOGNITION'
  AND COLUMN_NAME IN (
    'D3_PK','D3_JH','D3_RECOGNITIONTYPE','D3_RECOGNITIONDATE'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Verify GLBSTAFF columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 7 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'GLBSTAFF'
  AND COLUMN_NAME IN (
    'GS_PK','GS_CODE','GS_FULLNAME','GS_FRIENDLYNAME',
    'GS_GIVENNAME','GS_PREFERREDSURNAME','GS_ISACTIVE'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7: Verify ORGHEADER columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 5 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'ORGHEADER'
  AND COLUMN_NAME IN (
    'OH_PK','OH_CODE','OH_FULLNAME','OH_ISFORWARDER','OH_ISACTIVE'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 8: Verify ORGADDRESS columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 2 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'ORGADDRESS'
  AND COLUMN_NAME IN ('OA_PK','OA_OH')
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 9: Verify JOBSHIPMENT columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 8 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'JOBSHIPMENT'
  AND COLUMN_NAME IN (
    'JS_PK','JS_RL_NKORIGIN','JS_RL_NKDESTINATION',
    'JS_E_DEP','JS_E_ARV','JS_TRANSPORTMODE',
    'JS_SHIPMENTSTATUS','JS_ISVALID'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 10: Verify JOBDECLARATION columns exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 17 rows

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'CORE'
  AND TABLE_CATALOG = 'PROD'
  AND TABLE_NAME = 'JOBDECLARATION'
  AND COLUMN_NAME IN (
    'JE_PK','JE_JS','JE_RL_NKORIGIN','JE_RL_NKFINALDESTINATION',
    'JE_RL_NKPORTOFLOADING','JE_RL_NKPORTOFARRIVAL',
    'JE_EXPORTDATE','JE_DATEOFARRIVAL','JE_DATEATFINALDESTINATION',
    'JE_TRANSPORTMODE','JE_OPERATIONALSTATUS','JE_ENTRYSTATUS',
    'JE_DECLARATIONREFERENCE','JE_GB','JE_GC','JE_ISVALID','JE_ISCANCELLED'
  )
ORDER BY COLUMN_NAME;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 11: Verify 1:1 cardinality — JOBSHIPMENT.JS_PK = JOBHEADER.JH_PK
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 0 rows (no duplicates). If rows appear, the join is 1:many!

SELECT JS_PK, COUNT(*) AS cnt
FROM PROD.CORE.JOBSHIPMENT
GROUP BY JS_PK
HAVING COUNT(*) > 1
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 12: Verify 1:1 cardinality — JOBDECLARATION.JE_PK = JOBHEADER.JH_PK
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 0 rows (no duplicates). If rows appear, the join is 1:many!

SELECT JE_PK, COUNT(*) AS cnt
FROM PROD.CORE.JOBDECLARATION
GROUP BY JE_PK
HAVING COUNT(*) > 1
LIMIT 10;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 13: Verify JOBCHARGE FK integrity — do all JR_JH values exist in JOBHEADER?
-- ═══════════════════════════════════════════════════════════════════════════════
-- Expected: 0 rows (no orphan charges). If rows appear, the INNER JOIN will drop them.

SELECT COUNT(*) AS orphan_charges
FROM PROD.CORE.JOBCHARGE jr
LEFT JOIN PROD.CORE.JOBHEADER jh ON jr.JR_JH = jh.JH_PK
WHERE jh.JH_PK IS NULL
  AND jr.JR_ISVALID = TRUE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 14: Data volume check — how many rows will each view produce?
-- ═══════════════════════════════════════════════════════════════════════════════

-- Charge-line view row estimate (one row per active charge line)
SELECT COUNT(*) AS estimated_charge_view_rows
FROM PROD.CORE.JOBCHARGE
WHERE JR_ISVALID = TRUE;

-- Job summary view row estimate (one row per job)
SELECT COUNT(*) AS estimated_job_summary_rows
FROM PROD.CORE.JOBHEADER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 15: Smoke test — Run the core of VW_EOM_JOBS_SUMMARY on 100 rows
-- ═══════════════════════════════════════════════════════════════════════════════
-- If this runs without error, the full view will work.

SELECT
    jh.JH_PK,
    jh.JH_JOBNUM,
    jh.JH_STATUS,
    jh.JH_DIRECTION,
    jh.JH_GB,
    jh.JH_GE,
    ops.GS_FULLNAME                              AS OPERATOR_NAME,
    sales.GS_FULLNAME                            AS SALES_REP_NAME,
    agent_org.OH_FULLNAME                        AS OVERSEAS_AGENT,
    local_org.OH_FULLNAME                        AS LOCAL_CLIENT,
    COALESCE(js.JS_RL_NKORIGIN, je.JE_RL_NKORIGIN)       AS ORIGIN,
    COALESCE(js.JS_RL_NKDESTINATION, je.JE_RL_NKFINALDESTINATION) AS DESTINATION,
    COALESCE(js.JS_E_DEP, je.JE_EXPORTDATE)      AS ETD,
    COALESCE(js.JS_E_ARV, je.JE_DATEOFARRIVAL)   AS ETA,
    CASE
        WHEN js.JS_PK IS NOT NULL THEN 'SHIPMENT'
        WHEN je.JE_PK IS NOT NULL THEN 'DECLARATION'
        ELSE NULL
    END                                           AS ROUTING_SOURCE,
    agg.TOTAL_REVENUE,
    agg.TOTAL_COST,
    agg.TOTAL_WIP,
    agg.TOTAL_ACCRUAL,
    (agg.TOTAL_REVENUE - agg.TOTAL_COST)          AS PROFIT_LOSS
FROM PROD.CORE.JOBHEADER jh
LEFT JOIN (
    SELECT
        JR_JH,
        SUM(COALESCE(JR_LOCALSELLAMT, 0)) AS TOTAL_REVENUE,
        SUM(COALESCE(JR_LOCALCOSTAMT, 0)) AS TOTAL_COST,
        SUM(CASE WHEN JR_PROFORMACOST = TRUE THEN COALESCE(JR_LOCALCOSTAMT, 0) ELSE 0 END) AS TOTAL_WIP,
        SUM(CASE WHEN JR_PROFORMAREVENUE = TRUE THEN COALESCE(JR_LOCALSELLAMT, 0) ELSE 0 END) AS TOTAL_ACCRUAL
    FROM PROD.CORE.JOBCHARGE
    WHERE JR_ISVALID = TRUE
    GROUP BY JR_JH
) agg ON agg.JR_JH = jh.JH_PK
LEFT JOIN PROD.CORE.GLBSTAFF ops ON jh.JH_GS_NKREPOPS = ops.GS_PK
LEFT JOIN PROD.CORE.GLBSTAFF sales ON jh.JH_GS_NKREPSALES = sales.GS_PK
LEFT JOIN PROD.CORE.ORGADDRESS oa_agent ON jh.JH_OA_AGENTCOLLECTADDR = oa_agent.OA_PK
LEFT JOIN PROD.CORE.ORGHEADER agent_org ON oa_agent.OA_OH = agent_org.OH_PK
LEFT JOIN PROD.CORE.ORGADDRESS oa_local ON jh.JH_OA_LOCALCHARGESADDR = oa_local.OA_PK
LEFT JOIN PROD.CORE.ORGHEADER local_org ON oa_local.OA_OH = local_org.OH_PK
LEFT JOIN PROD.CORE.JOBSHIPMENT js ON js.JS_PK = jh.JH_PK
LEFT JOIN PROD.CORE.JOBDECLARATION je ON je.JE_PK = jh.JH_PK
LIMIT 100;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE — If all 15 steps pass, you can safely run VW_EOM_JOB_CHARGES.sql
-- ═══════════════════════════════════════════════════════════════════════════════
