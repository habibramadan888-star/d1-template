import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: review flags are warnings, not hard blockers", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});

test("legacy assertion superseded: backend records review flags without rejecting the save", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});
