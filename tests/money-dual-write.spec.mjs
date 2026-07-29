import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDualWritePatch,
  compareLegacyDecimalToFils,
  createMoneyDualWriteDraft,
  legacyAmountToFilsDraft,
  validateDualWritePatch
} from "../modules/finance/money-dual-write.mjs";

const amountSpecs = [
  { legacyField: "amount", filsField: "amount_fils", required: true },
  { legacyField: "due", filsField: "due_fils" },
  { legacyField: "refund", filsField: "refund_fils", allowNegative: true }
];

test("createMoneyDualWriteDraft creates safe *_fils patch without mutating legacy record", () => {
  const legacy = { id: "tx_1", amount: "100.50", due: "770.00" };
  const draft = createMoneyDualWriteDraft(legacy, amountSpecs);

  assert.equal(draft.ok, true);
  assert.deepEqual(draft.patch, { amount_fils: 10050, due_fils: 77000 });
  assert.equal(draft.metadata.writesDatabase, false);
  assert.deepEqual(legacy, { id: "tx_1", amount: "100.50", due: "770.00" });
});

test("legacy numeric amounts are accepted only as migration draft warnings", () => {
  const draft = createMoneyDualWriteDraft({ amount: 100.5 }, amountSpecs);

  assert.equal(draft.ok, true);
  assert.equal(draft.patch.amount_fils, 10050);
  assert.equal(
    draft.warnings.some((item) => item.code === "LEGACY_NUMBER_SOURCE"),
    true
  );
});

test("unsafe legacy money values are rejected before patch can become authority", () => {
  assert.equal(legacyAmountToFilsDraft("100.999", { legacyField: "amount" }).ok, false);
  assert.equal(legacyAmountToFilsDraft("", { legacyField: "amount", required: true }).ok, false);
  assert.equal(legacyAmountToFilsDraft(Number.NaN, { legacyField: "amount" }).ok, false);
  assert.equal(
    legacyAmountToFilsDraft(Number.POSITIVE_INFINITY, { legacyField: "amount" }).ok,
    false
  );

  const draft = createMoneyDualWriteDraft({ amount: "100.999" }, amountSpecs);
  assert.equal(draft.ok, false);
  assert.equal(
    draft.errors.some((item) => item.code === "INVALID_LEGACY_AMOUNT"),
    true
  );
});

test("negative amounts are rejected unless the field explicitly allows adjustment semantics", () => {
  const rejected = createMoneyDualWriteDraft({ amount: "-25.00" }, [
    { legacyField: "amount", filsField: "amount_fils", required: true }
  ]);
  assert.equal(rejected.ok, false);

  const accepted = createMoneyDualWriteDraft(
    { refund: "-25.00" },
    [{ legacyField: "refund", filsField: "refund_fils", allowNegative: true }],
    { allowEmpty: true }
  );
  assert.equal(accepted.ok, true);
  assert.deepEqual(accepted.patch, { refund_fils: -2500 });
});

test("existing *_fils mismatch is reported for reconciliation instead of auto-fixed", () => {
  const draft = createMoneyDualWriteDraft({ amount: "100.50", amount_fils: 10000 }, [
    { legacyField: "amount", filsField: "amount_fils", required: true }
  ]);

  assert.equal(draft.ok, true);
  assert.equal(draft.patch.amount_fils, 10050);
  assert.equal(draft.comparisons[0].matches, false);
  assert.equal(draft.comparisons[0].deltaAed, "0.50");
  assert.equal(
    draft.warnings.some((item) => item.code === "LEGACY_FILS_MISMATCH"),
    true
  );
});

test("compareLegacyDecimalToFils exposes mismatch comparisons without database writes", () => {
  const comparisons = compareLegacyDecimalToFils({ due: "770.00", due_fils: 77000 }, [
    { legacyField: "due", filsField: "due_fils" }
  ]);

  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].matches, true);
});

test("buildDualWritePatch is strict about fields and integer values", () => {
  assert.deepEqual(buildDualWritePatch({ amount: "0.01" }, amountSpecs), { amount_fils: 1 });
  assert.equal(validateDualWritePatch({ amount_fils: 1 }).ok, true);
  assert.equal(validateDualWritePatch({ amount: 1 }).ok, false);
  assert.equal(validateDualWritePatch({ amount_fils: 1.1 }).ok, false);
  assert.throws(() => buildDualWritePatch({ amount: "100.00" }, ["bad-field"]), /Unsafe field/);
});
