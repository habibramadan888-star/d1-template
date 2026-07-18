import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function stablePaymentLegs(entry) {
  const explicit =
    Array.isArray(entry.payment_legs) && entry.payment_legs.length
      ? entry.payment_legs
      : [{ method: entry.payment_method, amount_aed: entry.paid }];

  const seenMethods = new Set();
  const legs = explicit.map((leg) => {
    const method = String(leg.method || "")
      .trim()
      .toLowerCase();
    const amountAed = money(leg.amount_aed);
    assert.ok(method === "cash" || method === "bank", `unsupported payment method: ${method}`);
    assert.ok(amountAed > 0, "payment leg amount must be positive");
    assert.ok(!seenMethods.has(method), `duplicate payment method: ${method}`);
    seenMethods.add(method);
    return {
      leg_id: `${entry.entry_id}-${method.toUpperCase()}`,
      parent_entry_id: entry.entry_id,
      method,
      amount_aed: amountAed
    };
  });

  return legs.sort((left, right) => left.leg_id.localeCompare(right.leg_id));
}

function canonicalRentFingerprint(entry, legs) {
  const stableBusinessInput = {
    contract_version: "rent_entry_v2",
    entry_id: entry.entry_id,
    bed: String(entry.bed),
    period_start: entry.period_start,
    period_end: entry.period_end,
    due: money(entry.due),
    paid: money(entry.paid),
    payment_legs: legs.map(({ leg_id, method, amount_aed }) => ({ leg_id, method, amount_aed }))
  };
  return createHash("sha256").update(JSON.stringify(stableBusinessInput)).digest("hex");
}

function createIsolatedModel() {
  return {
    anchorsByEntryId: new Map(),
    legsByLegId: new Map(),
    compatibilityTransactionsByEntryId: new Map()
  };
}

function persistRentInIsolatedModel(model, entry) {
  assert.equal(entry.type, "rent");
  assert.ok(entry.entry_id, "entry_id is required");
  const due = money(entry.due);
  const paid = money(entry.paid);
  const legs = stablePaymentLegs(entry);
  assert.equal(
    money(legs.reduce((sum, leg) => sum + leg.amount_aed, 0)),
    paid,
    "payment legs must equal paid"
  );

  const fingerprint = canonicalRentFingerprint(entry, legs);
  const existing = model.anchorsByEntryId.get(entry.entry_id);
  if (existing) {
    assert.equal(
      existing.canonical_request_fingerprint,
      fingerprint,
      "same Entry ID with different business input conflicts"
    );
    return { status: "idempotent", anchor: existing };
  }

  const anchor = {
    contract_version: "rent_entry_v2",
    anchor_id: `rent-anchor-${entry.entry_id}`,
    entry_id: entry.entry_id,
    type: "rent",
    bed: String(entry.bed),
    period_start: entry.period_start,
    period_end: entry.period_end,
    due,
    paid,
    outstanding: money(Math.max(0, due - paid)),
    payment_legs: legs,
    canonical_request_fingerprint: fingerprint
  };

  model.anchorsByEntryId.set(entry.entry_id, anchor);
  for (const leg of legs) {
    assert.ok(!model.legsByLegId.has(leg.leg_id), `duplicate leg id: ${leg.leg_id}`);
    model.legsByLegId.set(leg.leg_id, leg);
  }
  // The existing transactions table remains a one-row compatibility projection.
  // Durable payment-leg truth belongs to the versioned canonical anchor in this feasibility model.
  model.compatibilityTransactionsByEntryId.set(entry.entry_id, {
    id: entry.entry_id,
    parent_entry_id: entry.entry_id,
    amount: paid
  });
  return { status: "created", anchor };
}

function projectIsolatedModel(model) {
  const anchors = [...model.anchorsByEntryId.values()];
  const legs = [...model.legsByLegId.values()];
  const cash = money(
    legs.filter((leg) => leg.method === "cash").reduce((sum, leg) => sum + leg.amount_aed, 0)
  );
  const bank = money(
    legs.filter((leg) => leg.method === "bank").reduce((sum, leg) => sum + leg.amount_aed, 0)
  );
  const rent = money(anchors.reduce((sum, anchor) => sum + anchor.paid, 0));
  const outstanding = money(anchors.reduce((sum, anchor) => sum + anchor.outstanding, 0));
  return {
    parentEntryCount: anchors.length,
    anchorCount: anchors.length,
    paymentLegCount: legs.length,
    compatibilityTransactionCount: model.compatibilityTransactionsByEntryId.size,
    cash,
    bank,
    rent,
    totalReceived: money(cash + bank),
    outstanding,
    arrearsOpened: outstanding,
    historyBusinessRowCount: anchors.length,
    detailBusinessRowCount: anchors.length
  };
}

const splitRent = {
  entry_id: "QA-SPLIT-RENT-E01",
  type: "rent",
  bed: "7210",
  period_start: "2026-07-15",
  period_end: "2026-08-15",
  due: 730,
  paid: 730,
  payment_legs: [
    { method: "cash", amount_aed: 700 },
    { method: "bank", amount_aed: 30 }
  ]
};

test("test-only split Rent model preserves one business Entry and two deterministic funding legs", () => {
  const model = createIsolatedModel();
  const first = persistRentInIsolatedModel(model, splitRent);
  const retry = persistRentInIsolatedModel(model, splitRent);
  const projected = projectIsolatedModel(model);

  assert.equal(first.status, "created");
  assert.equal(retry.status, "idempotent");
  assert.deepEqual(
    first.anchor.payment_legs.map((leg) => leg.leg_id),
    ["QA-SPLIT-RENT-E01-BANK", "QA-SPLIT-RENT-E01-CASH"]
  );
  assert.deepEqual(projected, {
    parentEntryCount: 1,
    anchorCount: 1,
    paymentLegCount: 2,
    compatibilityTransactionCount: 1,
    cash: 700,
    bank: 30,
    rent: 730,
    totalReceived: 730,
    outstanding: 0,
    arrearsOpened: 0,
    historyBusinessRowCount: 1,
    detailBusinessRowCount: 1
  });
});

test("payment-leg ordering is canonical and retry identity excludes request time", () => {
  const firstLegs = stablePaymentLegs(splitRent);
  const reordered = { ...splitRent, payment_legs: [...splitRent.payment_legs].reverse() };
  const secondLegs = stablePaymentLegs(reordered);
  assert.deepEqual(firstLegs, secondLegs);
  assert.equal(
    canonicalRentFingerprint(splitRent, firstLegs),
    canonicalRentFingerprint(reordered, secondLegs)
  );
});

test("same parent Entry ID with different funding content fails closed", () => {
  const model = createIsolatedModel();
  persistRentInIsolatedModel(model, splitRent);
  assert.throws(
    () =>
      persistRentInIsolatedModel(model, {
        ...splitRent,
        payment_legs: [
          { method: "cash", amount_aed: 699 },
          { method: "bank", amount_aed: 31 }
        ]
      }),
    /different business input conflicts/
  );
  assert.equal(model.anchorsByEntryId.size, 1);
  assert.equal(model.legsByLegId.size, 2);
});

test("legacy single-channel Rent normalizes to one synthesized leg without backfill", () => {
  const model = createIsolatedModel();
  const legacy = {
    entry_id: "QA-LEGACY-RENT-E01",
    type: "rent",
    bed: "753",
    period_start: "2026-07-15",
    period_end: "2026-08-15",
    due: 680,
    paid: 680,
    payment_method: "bank"
  };
  const result = persistRentInIsolatedModel(model, legacy);
  const projected = projectIsolatedModel(model);
  assert.equal(result.anchor.payment_legs.length, 1);
  assert.deepEqual(result.anchor.payment_legs[0], {
    leg_id: "QA-LEGACY-RENT-E01-BANK",
    parent_entry_id: "QA-LEGACY-RENT-E01",
    method: "bank",
    amount_aed: 680
  });
  assert.equal(projected.parentEntryCount, 1);
  assert.equal(projected.paymentLegCount, 1);
  assert.equal(projected.bank, 680);
  assert.equal(projected.rent, 680);
});

test("source audit locks the current runtime to one payment method and one transaction per Entry", () => {
  const employee = readFileSync("deploy-worker/public/employee-v3.html", "utf8");
  const worker = readFileSync("deploy-worker/src/index.js", "utf8");

  assert.match(
    employee,
    /function employeePaymentMethodValue\(\)\{return employeeFieldValue\('payType'\)\|\|'C';\}/
  );
  assert.match(employee, /if\(received>0&&method==='cash'\)summary\.cashReceived\+=received;/);
  assert.match(employee, /if\(received>0&&method==='bank'\)\{summary\.bankReceived\+=received;/);
  assert.match(
    worker,
    /SELECT id,session_id,type,linked_task_id FROM transactions WHERE id=\? AND corpid=\? LIMIT 1/
  );
  assert.match(worker, /id:entryId,corpid:user\.corpid,userid:user\.userid,session_id:sessionId/);
  assert.match(worker, /entries_count:sessionAnchorEntries\.length\|\|1/);
});
