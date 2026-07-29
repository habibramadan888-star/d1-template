import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer supports paid and waived fee statuses", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: employee UI sends fee status and payment method", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});
