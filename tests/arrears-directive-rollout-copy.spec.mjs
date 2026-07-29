import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("40-task rollout decision distinguishes dry-run from persisted delivery", async () => {
  const doc = await readFile("ARREARS_DIRECTIVE_40_TASK_REAL_ROLLOUT_DECISION.md", "utf8");

  assert.match(doc, /40.*dry-run|dry-run.*40/i);
  assert.match(doc, /员工端.*1|1.*员工端/);
  assert.match(doc, /Option A/);
  assert.match(doc, /Option B/);
  assert.match(doc, /Option C/);
  assert.match(doc, /Option D/);
  assert.match(doc, /Recommendation: Option B/);
  assert.match(doc, /PRODUCTION_NO_GO/);
});

test("rollout copy does not approve batch production write", async () => {
  const doc = await readFile("ARREARS_DIRECTIVE_40_TASK_REAL_ROLLOUT_DECISION.md", "utf8");

  assert.match(doc, /Batch write: NOT APPROVED/);
  assert.match(doc, /Write gate: OFF/);
  assert.match(doc, /No production write was executed in this audit/);
});
