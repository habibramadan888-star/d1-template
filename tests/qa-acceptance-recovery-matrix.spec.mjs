import assert from "node:assert/strict";
import test from "node:test";

import { QA_RECOVERY_SCENARIOS, qaAcceptanceMatrix } from "./fixtures/employee-qa-acceptance-matrices.mjs";

test("Recovery matrix covers all required transport auth partial-write and local-state incidents", () => {
  assert.equal(QA_RECOVERY_SCENARIOS.length, 12);
  const cases = new Set(QA_RECOVERY_SCENARIOS.map(row => row.case_id));
  for (const id of ["aggregate_503", "aggregate_malformed_response", "non_string_error_code", "validation_interrupted", "single_failure_in_16", "eight_written_then_interrupted", "relogin_resume", "duplicate_upload", "response_lost_after_write", "local_storage_memory_dom_divergence", "explicit_401", "transient_error_does_not_logout"]) assert.equal(cases.has(id), true, id);
  assert.equal(qaAcceptanceMatrix("recovery").recovery_scenarios.length, 12);
});

test("only the intentional 8-write interruption permits partial formal writes", () => {
  assert.deepEqual(QA_RECOVERY_SCENARIOS.filter(row => row.formal_write_expected > 0).map(row => [row.case_id, row.formal_write_expected]), [["eight_written_then_interrupted", 8]]);
});
