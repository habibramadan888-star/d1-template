import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { filsToAedString } from "../modules/finance/money.mjs";
import {
  applyPaymentAllocation,
  applyReceivableAdjustment,
  buildDashboardReceivableTotals,
  buildReceivableDraft,
  buildReceivableEvent,
  buildReceivablesFromLegacyRows,
  classifyReceivableStatus,
  compareLegacyArrearsToReceivable,
  computeOutstandingFils,
  validateReceivableDraft,
  voidReceivableEvent
} from "../modules/finance/receivables.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(testDir, "fixtures", "receivables");

async function loadFixture(name) {
  const text = await readFile(path.join(fixtureDir, `${name}.json`), "utf8");
  return JSON.parse(text);
}

function aed(value) {
  return filsToAedString(value);
}

test("receivables fixtures cover required local/staging rehearsal scenarios", async () => {
  const files = (await readdir(fixtureDir)).filter((name) => name.endsWith(".json"));
  assert.deepEqual(
    files.sort(),
    [
      "adjustment-credit.json",
      "adjustment-debit.json",
      "deposit-not-receivable.json",
      "due-today.json",
      "invalid-money.json",
      "legacy-arrears-comparison.json",
      "not-yet-due.json",
      "overdue.json",
      "overpayment.json",
      "rent-due-fully-paid.json",
      "rent-due-short-pay.json",
      "rent-due-unpaid.json",
      "repayment-full.json",
      "repayment-partial.json",
      "voided-payment.json"
    ].sort()
  );
});

test("rent due generates receivable", async () => {
  const fixture = await loadFixture("rent-due-unpaid");
  const draft = buildReceivableDraft(fixture.input);

  assert.equal(draft.status, fixture.expected.status);
  assert.equal(aed(draft.amountFils), "770.00");
  assert.equal(aed(computeOutstandingFils(draft)), fixture.expected.outstandingAed);
  assert.equal(validateReceivableDraft(draft).valid, true);
});

test("full payment sets outstanding zero", async () => {
  const fixture = await loadFixture("rent-due-fully-paid");
  const draft = buildReceivableDraft(fixture.input);

  assert.equal(draft.status, fixture.expected.status);
  assert.equal(aed(draft.outstandingFils), fixture.expected.outstandingAed);
});

test("short pay leaves outstanding", async () => {
  const fixture = await loadFixture("rent-due-short-pay");
  const draft = buildReceivableDraft(fixture.input);

  assert.equal(draft.status, fixture.expected.status);
  assert.equal(aed(draft.outstandingFils), fixture.expected.outstandingAed);
});

test("partial repayment reduces outstanding", async () => {
  const fixture = await loadFixture("repayment-partial");
  const result = applyPaymentAllocation(fixture.receivable, fixture.payment, {
    createdBy: "staging-qa"
  });

  assert.equal(result.receivable.status, fixture.expected.status);
  assert.equal(aed(result.receivable.outstandingFils), fixture.expected.outstandingAed);
  assert.equal(aed(result.allocationDraft.allocatedFils), "200.00");
});

test("full repayment closes receivable", async () => {
  const fixture = await loadFixture("repayment-full");
  const result = applyPaymentAllocation(fixture.receivable, fixture.payment, {
    createdBy: "staging-qa"
  });

  assert.equal(result.receivable.status, fixture.expected.status);
  assert.equal(aed(result.receivable.outstandingFils), fixture.expected.outstandingAed);
});

test("overpayment handled as warning and separate state", async () => {
  const fixture = await loadFixture("overpayment");
  const result = applyPaymentAllocation(fixture.receivable, fixture.payment, {
    createdBy: "staging-qa"
  });

  assert.equal(result.receivable.status, fixture.expected.status);
  assert.equal(aed(result.receivable.outstandingFils), fixture.expected.outstandingAed);
  assert.equal(aed(result.receivable.overpaidFils), fixture.expected.overpaidAed);
  assert.equal(
    result.warnings.some((warning) => warning.code.includes("OVERPAYMENT")),
    true
  );
});

test("voided payment does not reduce outstanding", async () => {
  const fixture = await loadFixture("voided-payment");
  const result = applyPaymentAllocation(fixture.receivable, fixture.payment, {
    createdBy: "staging-qa"
  });

  assert.equal(result.receivable.status, fixture.expected.status);
  assert.equal(aed(result.receivable.outstandingFils), fixture.expected.outstandingAed);
  assert.equal(result.allocationDraft.status, "VOIDED_IGNORED");
});

test("invalid money is rejected", async () => {
  const fixture = await loadFixture("invalid-money");

  assert.throws(() => buildReceivableDraft(fixture.input), /Invalid AED amount/);
  assert.throws(
    () =>
      buildReceivableDraft({
        ...fixture.input,
        amountAed: undefined,
        amountFils: 770
      }),
    /numbers are not authority/
  );
});

test("legacy arrears comparison works", async () => {
  const fixture = await loadFixture("legacy-arrears-comparison");
  const receivable = buildReceivableDraft(fixture.receivable);
  const comparison = compareLegacyArrearsToReceivable(fixture.legacyArrears, receivable);

  assert.equal(comparison.status, fixture.expected.status);
  assert.equal(comparison.deltaAed, fixture.expected.deltaAed);
});

test("due today status works", async () => {
  const fixture = await loadFixture("due-today");
  const receivable = buildReceivableDraft(fixture.input);
  const totals = buildDashboardReceivableTotals([receivable], {
    businessDate: fixture.businessDate
  });

  assert.equal(classifyReceivableStatus(receivable, fixture.businessDate), fixture.expected.status);
  assert.equal(aed(totals.dueTodayFils), fixture.expected.dueTodayAed);
});

test("overdue status works", async () => {
  const fixture = await loadFixture("overdue");
  const receivable = buildReceivableDraft(fixture.input);
  const totals = buildDashboardReceivableTotals([receivable], {
    businessDate: fixture.businessDate
  });

  assert.equal(classifyReceivableStatus(receivable, fixture.businessDate), fixture.expected.status);
  assert.equal(aed(totals.overdueFils), fixture.expected.overdueAed);
});

test("not-yet-due status works", async () => {
  const fixture = await loadFixture("not-yet-due");
  const receivable = buildReceivableDraft(fixture.input);

  assert.equal(classifyReceivableStatus(receivable, fixture.businessDate), fixture.expected.status);
  assert.equal(aed(receivable.outstandingFils), fixture.expected.outstandingAed);
});

test("deposit not treated as rent receivable unless explicitly configured", async () => {
  const fixture = await loadFixture("deposit-not-receivable");
  const result = buildReceivablesFromLegacyRows(fixture.rows, {
    businessDate: "2026-05-25",
    propertyId: "staging-property"
  });

  assert.equal(result.receivables.length, fixture.expected.receivableCount);
  assert.equal(result.warnings[0].code, fixture.expected.warningCode);
});

test("credit adjustment reduces outstanding", async () => {
  const fixture = await loadFixture("adjustment-credit");
  const result = applyReceivableAdjustment(fixture.receivable, fixture.adjustment, {
    createdBy: "owner"
  });

  assert.equal(result.receivable.status, fixture.expected.status);
  assert.equal(aed(result.receivable.outstandingFils), fixture.expected.outstandingAed);
});

test("debit adjustment increases outstanding", async () => {
  const fixture = await loadFixture("adjustment-debit");
  const result = applyReceivableAdjustment(fixture.receivable, fixture.adjustment, {
    createdBy: "owner"
  });

  assert.equal(result.receivable.status, fixture.expected.status);
  assert.equal(aed(result.receivable.outstandingFils), fixture.expected.outstandingAed);
});

test("all money uses fils and frontend totals are not authority", async () => {
  const shortPay = buildReceivableDraft((await loadFixture("rent-due-short-pay")).input);
  const dueToday = buildReceivableDraft((await loadFixture("due-today")).input);
  const frontendSubmittedTotal = "1.00";
  const totals = buildDashboardReceivableTotals([shortPay, dueToday], {
    businessDate: "2026-05-25"
  });

  assert.equal(typeof shortPay.amountFils, "bigint");
  assert.equal(typeof totals.arrearsOutstandingFils, "bigint");
  assert.notEqual(frontendSubmittedTotal, aed(totals.arrearsOutstandingFils));
});

test("receivable events are auditable and voidable without deleting originals", () => {
  const event = buildReceivableEvent(
    "payment_allocated",
    "100.00",
    { receivableId: "rec_event_1", sourceType: "TRANSACTION", sourceId: "tx_event_1" },
    { eventAt: "2026-05-25T10:00:00.000+04:00", createdBy: "staging-qa" }
  );
  const voided = voidReceivableEvent(event, {
    voidedAt: "2026-05-25T10:05:00.000+04:00",
    voidedBy: "owner",
    voidReason: "staging rehearsal rollback evidence"
  });

  assert.equal(event.eventType, "PAYMENT_ALLOCATED");
  assert.equal(voided.eventType, "PAYMENT_ALLOCATED_VOIDED");
  assert.equal(aed(event.amountFils), "100.00");
});
