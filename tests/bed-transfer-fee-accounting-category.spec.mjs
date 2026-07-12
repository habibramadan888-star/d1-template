import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: bed_transfer_fee is a distinct income category, not rent, deposit, or arrears", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: waived Bed Transfer records zero amount and no income effect", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});
