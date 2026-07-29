import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer record-only save does not mutate business state tables", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalNoMutation();
});

test("legacy assertion superseded: production cutover remains blocked", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalNoMutation();
});
