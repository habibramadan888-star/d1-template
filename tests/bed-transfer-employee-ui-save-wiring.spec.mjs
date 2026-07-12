import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: employee TF save posts the event-ledger payload with required anchors", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalEmployeeUi();
});

test("legacy assertion superseded: employee TF save shows record-only wording instead of owner-review wording", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalEmployeeUi();
});
