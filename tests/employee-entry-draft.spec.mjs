import assert from "node:assert/strict";
import test from "node:test";

import { createRentEntryDraft } from "../modules/employees/entry-draft.mjs";
import { formatFilsAsAed, parseAedToFils } from "../modules/finance/money.mjs";

function baseInput(overrides = {}) {
  return {
    tenantId: "tenant_hl_009",
    propertyId: "property_hl_009",
    sessionId: "S20260523-test",
    operatorId: "abdul",
    eventType: "R",
    bed: "144",
    ttlockRemark: "144 D200 0101",
    paymentMethod: "cash",
    paidAmountAed: "770.00",
    listPriceFils: parseAedToFils("770.00"),
    periodStartDate: "2026-06-01",
    cycle: "1M",
    settlementDate: "2026-05-23",
    ...overrides
  };
}

test("createRentEntryDraft creates a settled rent transaction draft with required anchors", () => {
  const draft = createRentEntryDraft(baseInput());

  assert.equal(draft.transactionDraft.tenantId, "tenant_hl_009");
  assert.equal(draft.transactionDraft.propertyId, "property_hl_009");
  assert.equal(draft.transactionDraft.sessionId, "S20260523-test");
  assert.equal(draft.transactionDraft.operatorId, "abdul");
  assert.equal(draft.transactionDraft.eventType, "RENT");
  assert.equal(draft.transactionDraft.bed, "144");
  assert.equal(draft.transactionDraft.tenantSnapshot, "144 D200 0101");
  assert.equal(draft.transactionDraft.ttlockCheckInMonthDay, "01-01");
  assert.equal(formatFilsAsAed(draft.transactionDraft.ttlockDepositFils), "200.00");
  assert.equal(draft.transactionDraft.paymentMethod, "cash");
  assert.equal(formatFilsAsAed(draft.transactionDraft.paidFils), "770.00");
  assert.equal(formatFilsAsAed(draft.transactionDraft.dueFils), "770.00");
  assert.equal(draft.transactionDraft.periodStartDate, "2026-06-01");
  assert.equal(draft.transactionDraft.displayEndDate, "2026-07-01");
  assert.equal(draft.transactionDraft.nextDueDate, "2026-07-01");
  assert.equal(draft.transactionDraft.settlementStatus, "SETTLED");
  assert.equal(draft.arrearsTaskDraft, null);
  assert.equal(draft.adjustmentDraft, null);
});

test("createRentEntryDraft creates arrears task draft for short-paid rent", () => {
  const draft = createRentEntryDraft(
    baseInput({
      paidAmountAed: "80.00",
      reasonCode: "partial_payment",
      promiseDate: "2026-05-29"
    })
  );

  assert.equal(draft.transactionDraft.settlementStatus, "PARTIAL_WITH_ARREARS");
  assert.equal(formatFilsAsAed(draft.transactionDraft.shortfallFils), "690.00");
  assert.equal(formatFilsAsAed(draft.arrearsTaskDraft.arrearAmountFils), "690.00");
  assert.equal(draft.arrearsTaskDraft.promiseDate, "2026-05-29");
  assert.equal(draft.arrearsTaskDraft.createdBy, "abdul");
});

test("createRentEntryDraft calculates 15D and custom-day pricing from rules, not staff due input", () => {
  const fifteenDay = createRentEntryDraft(
    baseInput({
      paidAmountAed: "400.00",
      cycle: "15D"
    })
  );
  const custom = createRentEntryDraft(
    baseInput({
      paidAmountAed: "120.00",
      cycle: "CUST",
      customDays: 3
    })
  );

  assert.equal(formatFilsAsAed(fifteenDay.transactionDraft.dueFils), "400.00");
  assert.equal(fifteenDay.transactionDraft.displayEndDate, "2026-06-15");
  assert.equal(fifteenDay.transactionDraft.nextDueDate, "2026-06-16");
  assert.equal(formatFilsAsAed(custom.transactionDraft.dueFils), "120.00");
  assert.equal(custom.transactionDraft.billingDays, 3);
});

test("createRentEntryDraft rejects bed mismatches and excluded TTLock remarks", () => {
  assert.throws(
    () => createRentEntryDraft(baseInput({ bed: "145" })),
    /does not match TTLock remark bed/
  );
  assert.throws(
    () => createRentEntryDraft(baseInput({ ttlockRemark: "144 D200 abdul" })),
    /excluded from rent flow/
  );
  assert.throws(
    () => createRentEntryDraft(baseInput({ ttlockRemark: "144 e" })),
    /excluded from rent flow/
  );
});

test("createRentEntryDraft rejects floats and unsupported employee events", () => {
  assert.throws(() => createRentEntryDraft(baseInput({ paidAmountAed: 770 })), /paidAmountAed/);
  assert.throws(() => createRentEntryDraft(baseInput({ eventType: "DR" })), /Unsupported/);
});
