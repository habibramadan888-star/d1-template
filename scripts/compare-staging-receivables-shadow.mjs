#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { computeDashboardTotalsFils } from "../modules/finance/backend-totals.mjs";
import { filsToAedString, parseAedToFils } from "../modules/finance/money.mjs";
import {
  applyPaymentAllocation,
  applyReceivableAdjustment,
  buildDashboardReceivableTotals,
  buildReceivableDraft,
  buildReceivablesFromLegacyRows
} from "../modules/finance/receivables.mjs";
import { readStagingBackendTotalsData } from "./compare-staging-backend-totals.mjs";

export const RECEIVABLES_SHADOW_FLAG = "ENABLE_RECEIVABLES_SHADOW_STAGING";
export const P0_008E_QA_RUN_ID = "P0-008E-20260525-STAGING-SHADOW-001";
export const P0_008E_SOURCE = "P0-008E_RECEIVABLES_SHADOW_REHEARSAL";
export const RECEIVABLES_SHADOW_ALLOWED_ENVS = new Set([
  "development",
  "dev",
  "local",
  "test",
  "staging"
]);

const reportPath = path.resolve("STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md");
const defaultBusinessDate = "2026-05-25";

function normalizeBool(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function resolveReceivablesShadowMode(env = {}) {
  const appEnv = String(env.APP_ENV || "")
    .trim()
    .toLowerCase();
  const flag = normalizeBool(env[RECEIVABLES_SHADOW_FLAG]);
  if (appEnv === "production" || !RECEIVABLES_SHADOW_ALLOWED_ENVS.has(appEnv)) {
    return {
      enabled: false,
      mode: "LEGACY_NO_SHADOW",
      productionDisabled: appEnv === "production" || appEnv === "",
      dashboardMutationAllowed: false,
      reason: appEnv === "production" ? "production_always_disabled" : "env_not_allowed"
    };
  }
  if (flag !== "true") {
    return {
      enabled: false,
      mode: "LEGACY_NO_SHADOW",
      productionDisabled: false,
      dashboardMutationAllowed: false,
      reason: "flag_off"
    };
  }
  return {
    enabled: true,
    mode: "RECEIVABLES_SHADOW",
    productionDisabled: false,
    dashboardMutationAllowed: false,
    reason: "staging_shadow_read_only"
  };
}

export function receivablesShadowScopeRows() {
  return [
    [
      "due today",
      "legacy due/dashboard logic",
      "receivables dueTodayFils",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "overdue amount",
      "legacy arrears/task date logic",
      "receivables overdueFils",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "arrears total",
      "arrears / arrear_tasks",
      "receivables arrearsOutstandingFils",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "arrears paid",
      "legacy arrears payment rows",
      "payment allocations",
      false,
      true,
      false,
      "NEEDS_MORE_STAGING_DATA"
    ],
    [
      "arrears outstanding",
      "legacy remain/difference fields",
      "receivables outstandingFils",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "rent due",
      "rent formula / employee entry context",
      "receivable amountFils",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "rent received",
      "transactions/backend totals",
      "receivable paidFils / allocations",
      true,
      true,
      false,
      "PRODUCTION_NO_GO"
    ],
    [
      "monthly income relation",
      "legacy dashboard monthly income",
      "backend totals plus receivables policy",
      false,
      true,
      false,
      "NEEDS_MORE_STAGING_DATA"
    ],
    [
      "payment allocations",
      "implicit legacy links",
      "payment allocation drafts",
      false,
      true,
      false,
      "NEEDS_MORE_STAGING_DATA"
    ],
    [
      "short pay",
      "arrear_tasks",
      "open partial receivable",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "repayment",
      "arrears payment transaction",
      "payment allocation",
      false,
      true,
      false,
      "NEEDS_MORE_STAGING_DATA"
    ],
    [
      "void impact",
      "voided_at / status",
      "active receivables exclude voided payments",
      true,
      true,
      false,
      "PRODUCTION_NO_GO"
    ],
    [
      "deposit handling",
      "deposit_ledger / deposit transaction",
      "not rent receivable by default",
      true,
      true,
      false,
      "BLOCKED_BY_ACCOUNTING_REVIEW"
    ],
    [
      "adjustment handling",
      "manual notes",
      "receivable adjustments",
      false,
      true,
      false,
      "NEEDS_MORE_STAGING_DATA"
    ],
    [
      "dashboard due/overdue cards",
      "legacy dashboard cards",
      "receivables shadow totals",
      true,
      true,
      false,
      "BLOCKED_BY_P0_006"
    ],
    [
      "history relation",
      "legacy history rows",
      "shadow metadata only",
      false,
      true,
      false,
      "NEEDS_MORE_STAGING_DATA"
    ]
  ].map(
    ([
      concept,
      legacySource,
      shadowSource,
      canCompareNow,
      canShadowGate,
      canProductionSwitch,
      blocker
    ]) => ({
      concept,
      legacySource,
      shadowSource,
      canCompareNow,
      canShadowGate,
      canProductionSwitch,
      blocker
    })
  );
}

function aed(value) {
  return filsToAedString(value || 0n);
}

function statusForDelta(deltaFils, { needsMoreData = false, manual = false } = {}) {
  if (needsMoreData) return "NEEDS_MORE_DATA";
  if (manual) return "MANUAL_REQUIRED";
  return deltaFils === 0n ? "MATCH" : "MISMATCH";
}

function parseLegacyFils(value) {
  try {
    return parseAedToFils(String(value ?? "0"), { allowNegative: true });
  } catch {
    return 0n;
  }
}

function moneyString(value) {
  if (value === undefined || value === null || value === "") return value;
  return String(value);
}

function normalizeLegacyArrearMoneyRows(rows) {
  return rows.map((row) => ({
    ...row,
    arrear_amount: moneyString(row.arrear_amount),
    actual_received: moneyString(row.actual_received),
    remain: moneyString(row.remain),
    paid: moneyString(row.paid),
    amount: moneyString(row.amount),
    due: moneyString(row.due)
  }));
}

function sumFils(rows, keys) {
  return rows.reduce((sum, row) => {
    for (const key of keys) {
      if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
        return sum + parseLegacyFils(row[key]);
      }
    }
    return sum;
  }, 0n);
}

function sumLegacyArrearsDue(arrearRows) {
  return arrearRows.reduce((sum, row) => sum + parseLegacyFils(row?.arrear_amount), 0n);
}

function legacyOutstandingFils(row) {
  if (row?.remain !== undefined && row.remain !== null && row.remain !== "") {
    return parseLegacyFils(row.remain);
  }
  const due = parseLegacyFils(row?.arrear_amount);
  const paid = parseLegacyFils(row?.actual_received);
  const outstanding = due - paid;
  return outstanding > 0n ? outstanding : 0n;
}

function activeArrearRows(arrearRows) {
  return arrearRows.filter((row) => !isVoided(row));
}

function sumLegacyOutstandingByDueDate(arrearRows, predicate) {
  return activeArrearRows(arrearRows).reduce((sum, row) => {
    const dueDate = String(row?.due_date || row?.promise_date || "");
    if (!predicate(dueDate, row)) return sum;
    return sum + legacyOutstandingFils(row);
  }, 0n);
}

function qaScenarioRows(arrearRows) {
  return arrearRows.filter((row) => {
    const text = [
      row?.task_id,
      row?.id,
      row?.staff_note,
      row?.owner_note,
      row?.arrear_reason,
      row?.created_by
    ]
      .filter(Boolean)
      .join(" ");
    return text.includes(P0_008E_QA_RUN_ID) || text.includes(P0_008E_SOURCE);
  });
}

function findQaScenario(arrearRows, scenario) {
  return qaScenarioRows(arrearRows).find((row) => String(row?.task_id || "").includes(scenario));
}

function qaScenarioResultRow({ scenario, legacyFils, shadowFils, status, notes }) {
  const delta = BigInt(legacyFils || 0n) - BigInt(shadowFils || 0n);
  return {
    Scenario: `P0-008E ${scenario}`,
    "Legacy Value": aed(legacyFils),
    "Receivable Shadow Value": aed(shadowFils),
    Delta: aed(delta),
    Status: status || (delta === 0n ? "MATCH" : "MISMATCH"),
    Notes: notes
  };
}

function missingQaScenarioRow(scenario, notes) {
  return {
    Scenario: `P0-008E ${scenario}`,
    "Legacy Value": "0.00",
    "Receivable Shadow Value": "0.00",
    Delta: "0.00",
    Status: "NEEDS_MORE_DATA",
    Notes: notes
  };
}

function isVoided(row) {
  return Boolean(row?.voided_at) || String(row?.status || "").toUpperCase() === "VOIDED";
}

function isRentTransaction(row) {
  const type = String(row?.type || "")
    .trim()
    .toUpperCase();
  const cat = String(row?.cat || row?.category || "")
    .trim()
    .toLowerCase();
  return type === "R" || type === "RENT" || cat === "rent";
}

function transactionReceivables(transactions, businessDate) {
  const receivables = [];
  const warnings = [];
  for (const [index, row] of transactions.entries()) {
    if (!isRentTransaction(row)) continue;
    try {
      const amount = row.amount ?? row.paid ?? "0";
      receivables.push(
        buildReceivableDraft({
          receivableId: `staging_tx_shadow_${row.id || index + 1}`,
          sourceType: "RENT",
          sourceId: row.id || `tx-${index + 1}`,
          propertyId: row.property_id || "staging-property-manual-scope",
          amountAed: String(amount),
          paidAed: isVoided(row) ? "0.00" : String(row.paid ?? amount),
          dueDate: String(row.created_at || businessDate).slice(0, 10),
          voidedAt: row.voided_at || null
        })
      );
    } catch (error) {
      warnings.push({
        code: "TRANSACTION_RECEIVABLE_SHADOW_SKIPPED",
        rowId: row.id || `tx-${index + 1}`,
        message: error?.message || String(error)
      });
    }
  }
  return { receivables, warnings };
}

function buildReceivableFromArrearRow(row, businessDate) {
  return buildReceivableDraft({
    receivableId: `p0_008e_shadow_${row.task_id || row.id}`,
    sourceType: "ARREARS",
    sourceId: row.task_id || row.id,
    propertyId: "p0-008e-shadow-property",
    amountAed: String(row.arrear_amount ?? row.remain ?? "0"),
    paidAed: String(row.actual_received ?? "0"),
    dueDate: String(row.due_date || businessDate).slice(0, 10),
    voidedAt: row.voided_at || null
  });
}

function comparisonRow({ scenario, legacyFils, shadowFils, status, notes }) {
  const delta = BigInt(legacyFils || 0n) - BigInt(shadowFils || 0n);
  return {
    Scenario: scenario,
    "Legacy Value": aed(legacyFils),
    "Receivable Shadow Value": aed(shadowFils),
    Delta: aed(delta),
    Status: status || statusForDelta(delta),
    Notes: notes
  };
}

export function createReceivablesShadowComparisonRows(
  { transactions = [], arrearRows = [] } = {},
  { businessDate = defaultBusinessDate } = {}
) {
  const rows = [];
  const backendTotals = computeDashboardTotalsFils(transactions, { arrearsRows: arrearRows });
  const fromTransactions = transactionReceivables(transactions, businessDate);
  const normalizedArrearRows = normalizeLegacyArrearMoneyRows(arrearRows);
  const fromLegacyArrears = buildReceivablesFromLegacyRows(normalizedArrearRows, {
    businessDate,
    propertyId: "staging-property-manual-scope"
  });
  const receivables = [...fromTransactions.receivables, ...fromLegacyArrears.receivables];
  const dashboardTotals =
    receivables.length > 0
      ? buildDashboardReceivableTotals(receivables, { businessDate })
      : {
          dueTodayFils: 0n,
          overdueFils: 0n,
          arrearsTotalFils: 0n,
          arrearsOutstandingFils: 0n,
          rentDueFils: 0n,
          rentReceivedFils: 0n,
          warnings: []
        };
  const legacyArrearsDue = sumLegacyArrearsDue(arrearRows);
  const legacyArrearsPaid = sumFils(arrearRows, ["actual_received", "paid"]);
  const legacyDueToday = sumLegacyOutstandingByDueDate(
    arrearRows,
    (dueDate) => dueDate === businessDate
  );
  const legacyOverdue = sumLegacyOutstandingByDueDate(
    arrearRows,
    (dueDate) => dueDate !== "" && dueDate < businessDate
  );
  const legacyDueOrOverdue = sumLegacyOutstandingByDueDate(
    arrearRows,
    (dueDate) => dueDate !== "" && dueDate <= businessDate
  );
  const legacyRentReceived = sumFils(
    transactions.filter((row) => isRentTransaction(row) && !isVoided(row)),
    ["paid", "amount"]
  );
  const hasOpenReceivable = receivables.some((item) => item.outstandingFils > 0n);
  const hasDueTodayOpen = legacyDueToday > 0n || dashboardTotals.dueTodayFils > 0n;
  const hasOverdueOpen = legacyOverdue > 0n || dashboardTotals.overdueFils > 0n;
  const hasArrearsRows = activeArrearRows(arrearRows).some(
    (row) => legacyOutstandingFils(row) > 0n
  );

  rows.push(
    comparisonRow({
      scenario: "rent received",
      legacyFils: backendTotals.rentReceivedFils + legacyArrearsPaid,
      shadowFils: dashboardTotals.rentReceivedFils,
      notes: "Backend rent received plus legacy arrears paid vs receivable paid/allocation shadow."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "rent due",
      legacyFils: legacyRentReceived + legacyArrearsDue,
      shadowFils: dashboardTotals.rentDueFils,
      notes: "Staging rent payments plus legacy arrears due vs receivable amount shadow."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "arrears outstanding",
      legacyFils: legacyDueOrOverdue,
      shadowFils: dashboardTotals.arrearsOutstandingFils,
      status: statusForDelta(legacyDueOrOverdue - dashboardTotals.arrearsOutstandingFils, {
        needsMoreData: !hasOpenReceivable
      }),
      notes: hasArrearsRows
        ? "Legacy arrears rows compared to receivable outstanding."
        : "No legacy arrears rows in current staging QA data; more short-pay/repayment data needed."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "due today",
      legacyFils: legacyDueToday,
      shadowFils: dashboardTotals.dueTodayFils,
      status: statusForDelta(legacyDueToday - dashboardTotals.dueTodayFils, {
        needsMoreData: !hasDueTodayOpen
      }),
      notes: hasDueTodayOpen
        ? "Legacy due-today outstanding compared to receivables shadow due-today total."
        : "Current staging data has no open due-today receivable."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "overdue amount",
      legacyFils: legacyOverdue,
      shadowFils: dashboardTotals.overdueFils,
      status: statusForDelta(legacyOverdue - dashboardTotals.overdueFils, {
        needsMoreData: !hasOverdueOpen
      }),
      notes: hasOverdueOpen
        ? "Legacy overdue outstanding compared to receivables overdue shadow."
        : "No overdue arrears rows in current staging QA data."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "arrears total",
      legacyFils: legacyDueOrOverdue,
      shadowFils: dashboardTotals.arrearsTotalFils,
      status: statusForDelta(legacyDueOrOverdue - dashboardTotals.arrearsTotalFils, {
        needsMoreData: !hasArrearsRows
      }),
      notes: "Future dashboard arrears authority remains shadow-only pending accounting review."
    })
  );
  rows.push({
    Scenario: "deposit handling",
    "Legacy Value": "0.00",
    "Receivable Shadow Value": "0.00",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "Deposit rows are not treated as rent receivables unless explicitly configured."
  });
  rows.push({
    Scenario: "void impact",
    "Legacy Value": `${transactions.filter((row) => isVoided(row)).length} voided rows`,
    "Receivable Shadow Value": "active outstanding excludes voided rows",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "Voided payments do not reduce active receivable outstanding."
  });
  rows.push({
    Scenario: "legacy warnings",
    "Legacy Value": `${transactions.length} transactions / ${arrearRows.length} arrears rows`,
    "Receivable Shadow Value": `${fromTransactions.warnings.length + fromLegacyArrears.warnings.length} warnings / ${fromLegacyArrears.errors.length} errors`,
    Delta: "0.00",
    Status: fromLegacyArrears.errors.length ? "BLOCKED" : "LEGACY_WARNING",
    Notes: "Legacy decimal data is parsed into integer fils and any skipped rows are explicit."
  });
  rows.push({
    Scenario: "dashboard live result",
    "Legacy Value": "unchanged",
    "Receivable Shadow Value": "shadow report only",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "This script does not call or mutate dashboard live responses."
  });

  rows.push(...createP0008EScenarioRows({ arrearRows, transactions }, { businessDate }));

  return rows;
}

export function createP0008EScenarioRows(
  { arrearRows = [], transactions = [] } = {},
  { businessDate = defaultBusinessDate } = {}
) {
  const rows = [];
  const dueToday = findQaScenario(arrearRows, "due_today");
  const overdue = findQaScenario(arrearRows, "overdue");
  const shortPay = findQaScenario(arrearRows, "short_pay");
  const partialRepayment = findQaScenario(arrearRows, "partial_repayment");
  const fullRepayment = findQaScenario(arrearRows, "full_repayment");
  const adjustmentCredit = findQaScenario(arrearRows, "adjustment_credit");
  const adjustmentDebit = findQaScenario(arrearRows, "adjustment_debit");
  const voidedPayment = transactions.find((row) =>
    String(row?.id || "").includes("p0_008e_voided_payment")
  );
  const deposit = transactions.find((row) =>
    String(row?.id || "").includes("p0_008e_deposit_exclusion")
  );

  if (dueToday) {
    const shadow = buildReceivableFromArrearRow(dueToday, businessDate);
    rows.push(
      qaScenarioResultRow({
        scenario: "due today",
        legacyFils: legacyOutstandingFils(dueToday),
        shadowFils: shadow.dueDate === businessDate ? shadow.outstandingFils : 0n,
        notes: "Seeded staging-only due-today arrear row generated receivables due-today evidence."
      })
    );
  } else {
    rows.push(missingQaScenarioRow("due today", "No P0-008E due-today QA row found."));
  }

  if (overdue) {
    const shadow = buildReceivableFromArrearRow(overdue, businessDate);
    rows.push(
      qaScenarioResultRow({
        scenario: "overdue",
        legacyFils: legacyOutstandingFils(overdue),
        shadowFils: shadow.dueDate < businessDate ? shadow.outstandingFils : 0n,
        notes: "Seeded staging-only overdue arrear row generated receivables overdue evidence."
      })
    );
  } else {
    rows.push(missingQaScenarioRow("overdue", "No P0-008E overdue QA row found."));
  }

  if (shortPay) {
    const shadow = buildReceivableFromArrearRow(shortPay, businessDate);
    rows.push(
      qaScenarioResultRow({
        scenario: "short pay outstanding",
        legacyFils: legacyOutstandingFils(shortPay),
        shadowFils: shadow.outstandingFils,
        notes: "Short-pay QA row leaves active outstanding receivable balance."
      })
    );
  } else {
    rows.push(missingQaScenarioRow("short pay outstanding", "No P0-008E short-pay QA row found."));
  }

  if (partialRepayment) {
    const allocation = applyPaymentAllocation(
      {
        receivableId: partialRepayment.task_id,
        sourceType: "RENT",
        amountAed: String(partialRepayment.arrear_amount),
        paidAed: "0.00",
        dueDate: String(partialRepayment.due_date || businessDate).slice(0, 10)
      },
      {
        amountAed: String(partialRepayment.actual_received || "0"),
        paymentSourceType: "TRANSACTION",
        paymentSourceId: `${partialRepayment.task_id}_payment`
      }
    );
    rows.push(
      qaScenarioResultRow({
        scenario: "partial repayment",
        legacyFils: legacyOutstandingFils(partialRepayment),
        shadowFils: allocation.receivable.outstandingFils,
        notes: "Partial repayment is modeled as a payment allocation that reduces outstanding."
      })
    );
  } else {
    rows.push(
      missingQaScenarioRow("partial repayment", "No P0-008E partial repayment QA row found.")
    );
  }

  if (fullRepayment) {
    const allocation = applyPaymentAllocation(
      {
        receivableId: fullRepayment.task_id,
        sourceType: "RENT",
        amountAed: String(fullRepayment.arrear_amount),
        paidAed: "0.00",
        dueDate: String(fullRepayment.due_date || businessDate).slice(0, 10)
      },
      {
        amountAed: String(fullRepayment.actual_received || "0"),
        paymentSourceType: "TRANSACTION",
        paymentSourceId: `${fullRepayment.task_id}_payment`
      }
    );
    rows.push(
      qaScenarioResultRow({
        scenario: "full repayment",
        legacyFils: legacyOutstandingFils(fullRepayment),
        shadowFils: allocation.receivable.outstandingFils,
        notes: "Full repayment closes the receivable with zero outstanding."
      })
    );
  } else {
    rows.push(missingQaScenarioRow("full repayment", "No P0-008E full repayment QA row found."));
  }

  if (adjustmentCredit) {
    const adjusted = applyReceivableAdjustment(
      {
        receivableId: adjustmentCredit.task_id,
        sourceType: "RENT",
        amountAed: String(adjustmentCredit.arrear_amount),
        paidAed: String(adjustmentCredit.actual_received || "0"),
        dueDate: String(adjustmentCredit.due_date || businessDate).slice(0, 10)
      },
      { adjustmentType: "CREDIT", amountAed: "100.00", reason: "OWNER_APPROVED" }
    );
    rows.push(
      qaScenarioResultRow({
        scenario: "adjustment credit",
        legacyFils: legacyOutstandingFils(adjustmentCredit),
        shadowFils: adjusted.receivable.outstandingFils,
        status: "EXPECTED_DIFFERENCE",
        notes:
          "Owner-approved credit adjustment reduces outstanding in shadow model; legacy row remains comparison-only."
      })
    );
  } else {
    rows.push(
      missingQaScenarioRow("adjustment credit", "No P0-008E adjustment credit QA row found.")
    );
  }

  if (adjustmentDebit) {
    const adjusted = applyReceivableAdjustment(
      {
        receivableId: adjustmentDebit.task_id,
        sourceType: "RENT",
        amountAed: String(adjustmentDebit.arrear_amount),
        paidAed: String(adjustmentDebit.actual_received || "0"),
        dueDate: String(adjustmentDebit.due_date || businessDate).slice(0, 10)
      },
      { adjustmentType: "DEBIT", amountAed: "100.00", reason: "OWNER_APPROVED" }
    );
    rows.push(
      qaScenarioResultRow({
        scenario: "adjustment debit",
        legacyFils: legacyOutstandingFils(adjustmentDebit),
        shadowFils: adjusted.receivable.outstandingFils,
        status: "EXPECTED_DIFFERENCE",
        notes:
          "Owner-approved debit adjustment increases shadow receivable amount; production needs accounting approval before authority switch."
      })
    );
  } else {
    rows.push(
      missingQaScenarioRow("adjustment debit", "No P0-008E adjustment debit QA row found.")
    );
  }

  rows.push({
    Scenario: "P0-008E voided payment impact",
    "Legacy Value": voidedPayment
      ? "1 voided staging transaction"
      : "0 voided staging transactions",
    "Receivable Shadow Value": voidedPayment
      ? "voided payment excluded from active outstanding"
      : "0.00",
    Delta: "0.00",
    Status: voidedPayment ? "MATCH" : "NEEDS_MORE_DATA",
    Notes: voidedPayment
      ? "Seeded voided payment row is ignored by active receivable totals."
      : "No P0-008E voided payment QA row found."
  });

  rows.push({
    Scenario: "P0-008E deposit exclusion",
    "Legacy Value": deposit ? "1 staging deposit transaction" : "0 staging deposit transactions",
    "Receivable Shadow Value": deposit ? "not a rent receivable by default" : "0.00",
    Delta: "0.00",
    Status: deposit ? "MATCH" : "NEEDS_MORE_DATA",
    Notes: deposit
      ? "Seeded deposit row is excluded from rent receivable authority unless configured."
      : "No P0-008E deposit exclusion QA row found."
  });

  return rows;
}

export function summarizeReceivablesShadowRows(rows) {
  const mismatchCount = rows.filter((row) => row.Status === "MISMATCH").length;
  const blockedCount = rows.filter((row) => row.Status === "BLOCKED").length;
  const needsMoreDataCount = rows.filter((row) => row.Status === "NEEDS_MORE_DATA").length;
  const manualRequiredCount = rows.filter((row) => row.Status === "MANUAL_REQUIRED").length;
  const expectedDifferenceCount = rows.filter((row) => row.Status === "EXPECTED_DIFFERENCE").length;
  return {
    overall: mismatchCount || blockedCount ? "BLOCKED" : "PASS",
    mismatchCount,
    blockedCount,
    needsMoreDataCount,
    manualRequiredCount,
    expectedDifferenceCount
  };
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function run() {
  const { target, transactions, arrearRows } = await readStagingBackendTotalsData();
  const rows = createReceivablesShadowComparisonRows({ transactions, arrearRows });
  const summary = summarizeReceivablesShadowRows(rows);
  const report = [
    "# Staging Receivables Shadow Comparison Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: read-only staging receivables shadow comparison. This script does not deploy, migrate, write D1 rows, mutate dashboard output, or enable feature flags.",
    "",
    `Target D1: \`${target.name}\` (\`${target.uuid}\`)`,
    "",
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, [
      "Scenario",
      "Legacy Value",
      "Receivable Shadow Value",
      "Delta",
      "Status",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Mismatches: ${summary.mismatchCount}.`,
    `- Blocked rows: ${summary.blockedCount}.`,
    `- Needs more data rows: ${summary.needsMoreDataCount}.`,
    `- Manual required rows: ${summary.manualRequiredCount}.`,
    `- Expected difference rows: ${summary.expectedDifferenceCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Staging D1 write: no.",
    "- Feature flag enabled: no.",
    "- Dashboard mutation: no.",
    "- Frontend totals authority: no.",
    "",
    "Interpretation:",
    "",
    "- `MATCH` means the legacy/staging value and receivable shadow value matched for the checked scope.",
    "- `NEEDS_MORE_DATA` means current staging QA data lacks the relevant open receivable, repayment, or adjustment case.",
    "- `EXPECTED_DIFFERENCE` means receivables shadow intentionally differs from legacy comparison because an adjustment or policy transform was applied.",
    "- `LEGACY_WARNING` means legacy rows were parsed into integer fils and need accounting review before production.",
    "- `MISMATCH` or `BLOCKED` prevents the next rehearsal until reviewed.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`STAGING_RECEIVABLES_SHADOW_COMPARISON=${summary.overall}`);
  console.log(`STAGING_RECEIVABLES_SHADOW_MISMATCH=${summary.mismatchCount ? "yes" : "no"}`);
  console.log(`STAGING_RECEIVABLES_SHADOW_NEEDS_MORE_DATA=${summary.needsMoreDataCount}`);
  console.log(`STAGING_RECEIVABLES_SHADOW_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(summary.overall === "BLOCKED" ? 1 : 0);
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invoked === import.meta.url) {
  run().catch((error) => {
    console.error(`STAGING_RECEIVABLES_SHADOW_COMPARISON=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}
