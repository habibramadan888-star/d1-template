import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("TTLock migration rules preserve old lock history and require review when missing", async () => {
  const doc = await readFile("BED_TRANSFER_TTLOCK_MIGRATION_RULES.md", "utf8");

  assert.match(doc, /Old TTLock card\/passcode\/record is never deleted/);
  assert.match(doc, /transfer_out/);
  assert.match(doc, /New bed must generate or wait for a new TTLock record/);
  assert.match(doc, /Old check-in date remains traceable/);
  assert.match(doc, /ttlock_review_required/);
  assert.match(doc, /Overwriting old check-in date/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
