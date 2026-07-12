import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: employee Bed Transfer API writes recorded entry-ledger records", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});

test("legacy assertion superseded: employee Bed Transfer API records audit, trace, and idempotency evidence", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});
