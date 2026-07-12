import test from "node:test";
import {
  assertCanonicalArchiveWrite,
  assertCanonicalContextAndSummary,
  assertCanonicalEmployeeUi,
  assertCanonicalFeeContract,
  assertCanonicalNoMutation,
  assertLegacyRecordOnlyPathSuperseded
} from "./helpers/bed-transfer-current-contract.mjs";

test("legacy assertion superseded: fee ledger Bed Transfer writes only event, audit, and idempotency anchors", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});

test("legacy assertion superseded: production cutover remains blocked", () => {
  assertLegacyRecordOnlyPathSuperseded();
  assertCanonicalFeeContract();
});
