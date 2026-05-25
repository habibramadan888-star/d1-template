#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { filsToAedString } from "../modules/finance/money.mjs";
import {
  applyPaymentAllocation,
  applyReceivableAdjustment,
  buildDashboardReceivableTotals,
  buildReceivableDraft,
  buildReceivablesFromLegacyRows,
  compareLegacyArrearsToReceivable
} from "../modules/finance/receivables.mjs";

const fixtureDir = path.resolve("tests", "fixtures", "receivables");
const reportPath = path.resolve("RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md");

function aed(value) {
  return filsToAedString(value || 0n);
}

async function loadFixture(name) {
  const text = await readFile(path.join(fixtureDir, `${name}.json`), "utf8");
  return JSON.parse(text);
}

function row({ scenario, legacyResult, receivableResult, delta = "0.00", status, notes }) {
  return {
    Scenario: scenario,
    "Legacy Result": legacyResult,
    "Receivable Result": receivableResult,
    Delta: delta,
    Status: status,
    Notes: notes
  };
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((item) => `| ${columns.map((column) => item[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function createRows() {
  const rows = [];
  const unpaid = buildReceivableDraft((await loadFixture("rent-due-unpaid")).input);
  const shortPay = buildReceivableDraft((await loadFixture("rent-due-short-pay")).input);
  const fullPaid = buildReceivableDraft((await loadFixture("rent-due-fully-paid")).input);
  const repaymentPartial = await loadFixture("repayment-partial");
  const repaymentFull = await loadFixture("repayment-full");
  const overpayment = await loadFixture("overpayment");
  const voidedPayment = await loadFixture("voided-payment");
  const legacyComparison = await loadFixture("legacy-arrears-comparison");
  const deposit = await loadFixture("deposit-not-receivable");
  const credit = await loadFixture("adjustment-credit");
  const debit = await loadFixture("adjustment-debit");

  const partialResult = applyPaymentAllocation(
    repaymentPartial.receivable,
    repaymentPartial.payment
  );
  const fullResult = applyPaymentAllocation(repaymentFull.receivable, repaymentFull.payment);
  const overpaymentResult = applyPaymentAllocation(overpayment.receivable, overpayment.payment);
  const voidedPaymentResult = applyPaymentAllocation(
    voidedPayment.receivable,
    voidedPayment.payment
  );
  const legacyReceivable = buildReceivableDraft(legacyComparison.receivable);
  const legacyDelta = compareLegacyArrearsToReceivable(
    legacyComparison.legacyArrears,
    legacyReceivable
  );
  const depositResult = buildReceivablesFromLegacyRows(deposit.rows, {
    businessDate: "2026-05-25",
    propertyId: "staging-property"
  });
  const creditResult = applyReceivableAdjustment(credit.receivable, credit.adjustment);
  const debitResult = applyReceivableAdjustment(debit.receivable, debit.adjustment);
  const dashboardTotals = buildDashboardReceivableTotals([unpaid, shortPay, fullPaid], {
    businessDate: "2026-05-25"
  });

  rows.push(
    row({
      scenario: "rent due unpaid",
      legacyResult: "legacy due/arrears task equivalent",
      receivableResult: `${unpaid.status} outstanding ${aed(unpaid.outstandingFils)}`,
      status: unpaid.outstandingFils === 77000n ? "MATCH" : "MISMATCH",
      notes: "Rent due has a draft source-of-truth receivable without writing D1."
    })
  );
  rows.push(
    row({
      scenario: "short pay",
      legacyResult: "legacy arrear task expected",
      receivableResult: `${shortPay.status} outstanding ${aed(shortPay.outstandingFils)}`,
      status: shortPay.outstandingFils === 69000n ? "MATCH" : "MISMATCH",
      notes: "Short pay remains outstanding and is not treated as discount."
    })
  );
  rows.push(
    row({
      scenario: "full payment",
      legacyResult: "no arrear expected",
      receivableResult: `${fullPaid.status} outstanding ${aed(fullPaid.outstandingFils)}`,
      status: fullPaid.outstandingFils === 0n ? "MATCH" : "MISMATCH",
      notes: "Full payment closes the draft receivable."
    })
  );
  rows.push(
    row({
      scenario: "partial repayment",
      legacyResult: "legacy remaining decreases",
      receivableResult: `${partialResult.receivable.status} outstanding ${aed(partialResult.receivable.outstandingFils)}`,
      status: partialResult.receivable.outstandingFils === 49000n ? "MATCH" : "MISMATCH",
      notes: "Allocation reduces outstanding without frontend authority."
    })
  );
  rows.push(
    row({
      scenario: "full repayment",
      legacyResult: "legacy arrear closes",
      receivableResult: `${fullResult.receivable.status} outstanding ${aed(fullResult.receivable.outstandingFils)}`,
      status: fullResult.receivable.outstandingFils === 0n ? "MATCH" : "MISMATCH",
      notes: "Allocation closes the receivable."
    })
  );
  rows.push(
    row({
      scenario: "overpayment",
      legacyResult: "manual accounting review required",
      receivableResult: `${overpaymentResult.receivable.status} overpaid ${aed(overpaymentResult.receivable.overpaidFils)}`,
      status:
        overpaymentResult.receivable.status === "OVERPAID" ? "EXPECTED_DIFFERENCE" : "MISMATCH",
      notes: "Overpayment is separate state, not negative receivable."
    })
  );
  rows.push(
    row({
      scenario: "voided payment",
      legacyResult: "voided payment excluded from active totals",
      receivableResult: `${voidedPaymentResult.allocationDraft.status} outstanding ${aed(voidedPaymentResult.receivable.outstandingFils)}`,
      status: voidedPaymentResult.receivable.outstandingFils === 69000n ? "MATCH" : "MISMATCH",
      notes: "Voided payment does not reduce outstanding."
    })
  );
  rows.push(
    row({
      scenario: "legacy arrears comparison",
      legacyResult: legacyDelta.legacyOutstandingAed,
      receivableResult: legacyDelta.receivableOutstandingAed,
      delta: legacyDelta.deltaAed,
      status: legacyDelta.status,
      notes: "Legacy arrears can be compared to receivable drafts before migration."
    })
  );
  rows.push(
    row({
      scenario: "deposit handling",
      legacyResult: "deposit ledger row",
      receivableResult: `${depositResult.receivables.length} rent receivables`,
      status: depositResult.receivables.length === 0 ? "MATCH" : "MISMATCH",
      notes: "Deposit is not rent receivable unless explicitly configured."
    })
  );
  rows.push(
    row({
      scenario: "credit adjustment",
      legacyResult: "owner-approved waiver",
      receivableResult: `${creditResult.receivable.status} outstanding ${aed(creditResult.receivable.outstandingFils)}`,
      status: creditResult.receivable.outstandingFils === 0n ? "MATCH" : "MISMATCH",
      notes: "Credit adjustment reduces outstanding without pretending cash was received."
    })
  );
  rows.push(
    row({
      scenario: "debit adjustment",
      legacyResult: "correction increases obligation",
      receivableResult: `${debitResult.receivable.status} outstanding ${aed(debitResult.receivable.outstandingFils)}`,
      status: debitResult.receivable.outstandingFils === 3000n ? "MATCH" : "MISMATCH",
      notes: "Debit adjustment increases amount due and outstanding."
    })
  );
  rows.push(
    row({
      scenario: "dashboard due and arrears future authority",
      legacyResult: "blocked by P0-008 today",
      receivableResult: `due today ${aed(dashboardTotals.dueTodayFils)} / arrears ${aed(dashboardTotals.arrearsOutstandingFils)}`,
      status: "MANUAL_REQUIRED",
      notes: "Future dashboard authority is computable, but live dashboard remains unchanged."
    })
  );

  return rows;
}

async function run() {
  const confirmWrite = process.argv.includes("--confirm-staging-receivables-write");
  const fixtures = (await readdir(fixtureDir)).filter((name) => name.endsWith(".json"));
  const rows = await createRows();
  const hasMismatch = rows.some((item) => item.Status === "MISMATCH");
  const hasBlocked = rows.some((item) => item.Status === "BLOCKED");
  const hasManual = rows.some((item) => item.Status === "MANUAL_REQUIRED");
  const overall = hasMismatch || hasBlocked ? "BLOCKED" : "PASS";

  const report = [
    "# Receivables Local/Staging Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: local/staging dry-run receivables rehearsal. This script does not deploy, migrate, write production D1, write staging D1 by default, or change dashboard responses.",
    "",
    `Overall: \`${overall}\``,
    "",
    `Fixtures loaded: ${fixtures.length}`,
    `Manual review rows: ${hasManual ? rows.filter((item) => item.Status === "MANUAL_REQUIRED").length : 0}`,
    "",
    markdownTable(rows, [
      "Scenario",
      "Legacy Result",
      "Receivable Result",
      "Delta",
      "Status",
      "Notes"
    ]),
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    `- Staging D1 write: ${confirmWrite ? "requested but not executed by this rehearsal" : "no."}`,
    "- Dashboard mutation: no.",
    "- Live financial formula mutation: no.",
    "- Frontend totals authority: no.",
    "",
    "Decision:",
    "",
    "- Receivables pure module and fixture rehearsal are sufficient for local/staging shadow planning.",
    "- Production remains blocked by P0-001 reconciliation maturity, P0-003 production approval, P0-006 tenant scope, migration review, and human accounting review.",
    "- Future staging writes require a separate approved P0-008D task with backup, rollback, feature flag, and no production touch.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`RECEIVABLES_LOCAL_STAGING_REHEARSAL=${overall}`);
  console.log(`RECEIVABLES_LOCAL_STAGING_FIXTURES=${fixtures.length}`);
  console.log("RECEIVABLES_STAGING_D1_WRITE=no");
  console.log(`RECEIVABLES_LOCAL_STAGING_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(hasMismatch || hasBlocked ? 1 : 0);
}

run().catch((error) => {
  console.error(`RECEIVABLES_LOCAL_STAGING_REHEARSAL=BLOCKED: ${error?.message || error}`);
  process.exit(1);
});
