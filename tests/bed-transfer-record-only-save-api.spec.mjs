import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: Bed Transfer save API records events with status recorded", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});

test("legacy assertion superseded: recorded status is supported by the active and upgrade migrations", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});
