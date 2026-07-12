import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: live Bed Transfer save posts to the dedicated ledger endpoint", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});

test("legacy assertion superseded: live Bed Transfer error copy includes the concrete API reason", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalEmployeeUi();
});

test("legacy assertion superseded: backend save tolerates optional schema columns while preserving ledger anchors", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});
