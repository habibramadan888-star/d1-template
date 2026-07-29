import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: employee Bed Transfer display sanitizes TTLock account phone numbers", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalArchiveWrite();
});

test("legacy assertion superseded: Bed Transfer context uses sanitized occupant and TTLock display", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});

test("legacy assertion superseded: Bed Transfer Step 8 note uses sanitizer before rendering", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalContextAndSummary();
});
