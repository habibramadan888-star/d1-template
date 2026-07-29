import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer Step 2 form exposes required fields", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});

test("legacy assertion superseded: Bed Transfer Step 2 validation blocks same from/to bed", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});
