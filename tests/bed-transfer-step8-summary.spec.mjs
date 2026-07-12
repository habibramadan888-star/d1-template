import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer Step 8 uses a dedicated transfer summary before generic entry fields", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});

test("legacy assertion superseded: Bed Transfer Step 8 branch does not show generic payment or arrears fields", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});
