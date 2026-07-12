import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer Step 3 uses dedicated system context", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});

test("legacy assertion superseded: generic context is bypassed for Bed Transfer", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});
