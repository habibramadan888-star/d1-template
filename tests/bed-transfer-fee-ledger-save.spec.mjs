import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer save supports charged and waived ledger anchors", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: Bed Transfer response copy reflects fee outcome", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: Bed Transfer fee schema columns are declared", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});
