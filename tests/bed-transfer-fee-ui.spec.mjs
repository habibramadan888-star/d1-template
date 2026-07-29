import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: employee Bed Transfer UI exposes charged and waived fee paths", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: employee Bed Transfer submit payload carries fee ledger fields", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: step context explains fee accounting effect", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});
