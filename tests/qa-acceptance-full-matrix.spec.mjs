import assert from "node:assert/strict";
import test from "node:test";

import {
  QA_FULL_AUTOMATION_ONLY,
  QA_FULL_SCENARIOS,
  QA_MATRIX_VERSION,
  QA_QUICK_SCENARIOS,
  qaAcceptanceMatrix,
} from "./fixtures/employee-qa-acceptance-matrices.mjs";

test("Quick reuses the exact 073 sixteen-scenario engine", () => {
  assert.equal(QA_QUICK_SCENARIOS.length, 16);
  assert.equal(qaAcceptanceMatrix("quick").scenarios.length, 16);
  assert.equal(qaAcceptanceMatrix("quick").matrix_version, QA_MATRIX_VERSION);
});

test("Full derives at least 35 legal upload scenarios plus explicit automation-only rejection boundaries", () => {
  assert.equal(QA_FULL_SCENARIOS.length >= 35, true);
  assert.equal(QA_FULL_SCENARIOS.every(row => row.upload_enabled === true && row.expected_validation === "pass"), true);
  assert.equal(QA_FULL_AUTOMATION_ONLY.length >= 5, true);
  const text = JSON.stringify([...QA_FULL_SCENARIOS, ...QA_FULL_AUTOMATION_ONLY]);
  for (const term of ["rent", "arrears_payment", "deposit_in", "deposit_out", "checkout", "expense", "bed_transfer", "source-vacant", "target-occupied", "existing-fingerprint", "missing-legacy-entry-id", "same-bed"]) assert.match(text, new RegExp(term));
});

test("Full fixtures contain no real identity provider or secret material", () => {
  const text = JSON.stringify(QA_FULL_SCENARIOS);
  assert.doesNotMatch(text, /\+971|00971|99099|tenant_card|card_id|provider|access_token|client_secret|password/i);
});
