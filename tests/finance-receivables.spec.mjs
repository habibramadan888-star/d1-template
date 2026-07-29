import assert from "node:assert/strict";
import test from "node:test";

import { evaluateReceivableSettlement } from "../modules/finance/receivables.mjs";
import { formatFilsAsAed, parseAedToFils } from "../modules/finance/money.mjs";

function fils(value) {
  return parseAedToFils(value);
}

test("evaluateReceivableSettlement closes exact payments without creating arrears", () => {
  const result = evaluateReceivableSettlement({
    bed: "144",
    dueFils: fils("770.00"),
    paidFils: fils("770.00"),
    settlementDate: "2026-05-23"
  });

  assert.equal(result.status, "SETTLED");
  assert.equal(result.arrearsTaskDraft, null);
  assert.equal(formatFilsAsAed(result.shortfallFils), "0.00");
});

test("evaluateReceivableSettlement records overpayment separately from arrears", () => {
  const result = evaluateReceivableSettlement({
    bed: "144",
    dueFils: fils("770.00"),
    paidFils: fils("800.00"),
    settlementDate: "2026-05-23"
  });

  assert.equal(result.status, "OVERPAID");
  assert.equal(formatFilsAsAed(result.overpaidFils), "30.00");
  assert.equal(result.arrearsTaskDraft, null);
});

test("evaluateReceivableSettlement creates an arrears task draft for short payments", () => {
  const result = evaluateReceivableSettlement({
    bed: "144",
    tenantSnapshot: "144 D200 0101",
    dueFils: fils("770.00"),
    paidFils: fils("80.00"),
    settlementDate: "2026-05-23",
    reasonCode: "partial_payment",
    promiseDate: "2026-05-29",
    operatorId: "abdul"
  });

  assert.equal(result.status, "PARTIAL_ARREARS");
  assert.equal(formatFilsAsAed(result.shortfallFils), "690.00");
  assert.deepEqual(result.arrearsTaskDraft, {
    bed: "144",
    tenantSnapshot: "144 D200 0101",
    arrearAmountFils: fils("690.00"),
    arrearReason: "PARTIAL_PAYMENT",
    promiseDate: "2026-05-29",
    followupStatus: "待跟进",
    source: "EMPLOYEE_ENTRY",
    createdBy: "abdul",
    createdAtDate: "2026-05-23"
  });
});

test("evaluateReceivableSettlement requires promise date and reason anchors for arrears", () => {
  assert.throws(
    () =>
      evaluateReceivableSettlement({
        dueFils: fils("770.00"),
        paidFils: fils("80.00"),
        settlementDate: "2026-05-23",
        reasonCode: "partial_payment"
      }),
    /promiseDate/
  );

  assert.throws(
    () =>
      evaluateReceivableSettlement({
        dueFils: fils("770.00"),
        paidFils: fils("80.00"),
        settlementDate: "2026-05-23",
        promiseDate: "2026-05-29",
        reasonCode: "discount"
      }),
    /Unsupported arrears reason/
  );
});

test("evaluateReceivableSettlement allows explicit approved adjustment instead of arrears", () => {
  const result = evaluateReceivableSettlement({
    bed: "144",
    dueFils: fils("770.00"),
    paidFils: fils("700.00"),
    settlementDate: "2026-05-23",
    shortfallTreatment: "approved_adjustment",
    reasonCode: "owner_approved",
    approvedBy: "owner"
  });

  assert.equal(result.status, "APPROVED_ADJUSTMENT");
  assert.equal(result.arrearsTaskDraft, null);
  assert.equal(formatFilsAsAed(result.adjustmentDraft.adjustmentAmountFils), "70.00");
  assert.equal(result.adjustmentDraft.reasonCode, "OWNER_APPROVED");
});

test("evaluateReceivableSettlement rejects unsafe money and date inputs", () => {
  assert.throws(
    () =>
      evaluateReceivableSettlement({
        dueFils: 770,
        paidFils: fils("80.00"),
        settlementDate: "2026-05-23"
      }),
    /minor-unit/
  );
  assert.throws(
    () =>
      evaluateReceivableSettlement({
        dueFils: fils("770.00"),
        paidFils: -1n,
        settlementDate: "2026-05-23"
      }),
    /non-negative/
  );
  assert.throws(
    () =>
      evaluateReceivableSettlement({
        dueFils: fils("770.00"),
        paidFils: fils("80.00"),
        settlementDate: "05/23/2026"
      }),
    /YYYY-MM-DD/
  );
});
