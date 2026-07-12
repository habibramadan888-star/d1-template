import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer save is an Entry Ledger event first", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});

test("legacy assertion superseded: Bed Transfer response exposes Current Session entry", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});
