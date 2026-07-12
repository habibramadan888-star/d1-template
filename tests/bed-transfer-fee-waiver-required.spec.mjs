import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: waived Bed Transfer requires waiver reason in API and UI", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});
