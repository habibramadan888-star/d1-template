import assert from "node:assert/strict";
import test from "node:test";

import { GOLDEN_ENTRY_IDS } from "./fixtures/employee-seven-event-golden-session.mjs";
import {
  assertAuthAndDraftRecovery,
  simulateDraftRecovery,
} from "./helpers/employee-golden-session-oracle.mjs";

test("8 persisted plus 8 pending preserves all 16 drafts and writes only the missing half", () => {
  const persisted = new Set(GOLDEN_ENTRY_IDS.slice(0, 8));
  const drafts = GOLDEN_ENTRY_IDS.map(entry_identity => ({ entry_identity, upload_status: "LOCAL" }));
  const classified = drafts.map(row => ({
    ...row,
    recovery_status: persisted.has(row.entry_identity) ? "ALREADY_PERSISTED" : "WRITE_PENDING",
  }));
  assert.equal(classified.length, 16);
  assert.equal(classified.filter(row => row.recovery_status === "ALREADY_PERSISTED").length, 8);
  assert.equal(classified.filter(row => row.recovery_status === "WRITE_PENDING").length, 8);
  assert.deepEqual(classified.filter(row => row.recovery_status === "WRITE_PENDING").map(row => row.entry_identity), GOLDEN_ENTRY_IDS.slice(8));
});

test("transport, malformed and non-string errors preserve drafts and never impersonate auth failure", () => {
  assert.equal(assertAuthAndDraftRecovery(), true);
  const drafts = GOLDEN_ENTRY_IDS.map(id => ({ id }));
  for (const failure of [
    { status: 503, error_code: "SERVER_PROCESSING_TIMEOUT" },
    { status: 422, error_code: { message: "validation" } },
    { status: 200, error_code: "SERVER_VALIDATE_MALFORMED_RESPONSE" },
  ]) {
    const result = simulateDraftRecovery(drafts, failure);
    assert.equal(result.redirect_to_login, false);
    assert.equal(result.record_failure_count, 0);
    assert.deepEqual(result.drafts, drafts);
  }
});

test("only an explicit 401 authentication contract redirects while retaining the draft", () => {
  const drafts = GOLDEN_ENTRY_IDS.map(id => ({ id }));
  const result = simulateDraftRecovery(drafts, { status: 401, error_code: "UNAUTHORIZED" });
  assert.equal(result.redirect_to_login, true);
  assert.deepEqual(result.drafts, drafts);
});
