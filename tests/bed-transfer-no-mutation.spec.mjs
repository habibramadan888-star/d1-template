import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer Entry Ledger save does not mutate occupancy, deposit, arrears, or TTLock state", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalNoMutation();
});
