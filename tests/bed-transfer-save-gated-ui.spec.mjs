import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer save path is disabled by the phase 1 safety gate", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalEmployeeUi();
});

test("legacy assertion superseded: Bed Transfer is recorded separately, not added to handover drafts", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalEmployeeUi();
});
