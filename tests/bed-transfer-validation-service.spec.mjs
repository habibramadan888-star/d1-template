import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("validation service defines block and review outcomes", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function bedTransferValidationSummary\(fromBed,toBed,context=\{\}\)/);
  assert.match(html, /status:errors\.length\?'blocked':\(review\.length\?'pending_review':'validated'\)/);
  assert.match(html, /deposit_review_required/);
  assert.match(html, /rent_period_review_required/);
  assert.match(html, /ttlock_review_required/);
  assert.match(html, /rent_difference_review/);
  assert.match(html, /pending_transfer_exists/);
});

test("validation result document lists required checks", async () => {
  const doc = await readFile("BED_TRANSFER_VALIDATION_SERVICE_RESULT.md", "utf8");

  assert.match(doc, /from_bed not empty/);
  assert.match(doc, /to_bed not empty/);
  assert.match(doc, /from_bed != to_bed/);
  assert.match(doc, /from_bed has active occupant/);
  assert.match(doc, /to_bed available/);
  assert.match(doc, /validation summary generated/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
