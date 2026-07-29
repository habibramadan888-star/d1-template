import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee inbox count is backed by persisted mixed-source directives", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /handleEmployeeArrearsDirectives/);
  assert.match(worker, /FROM arrear_tasks/);
  assert.match(worker, /WHERE corpid=\? AND userid=\?/);
  assert.match(worker, /directive_status/);
  assert.match(worker, /source_type:view\.source_type/);
});

test("employee inbox does not read owner dry-run rows", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  assert.match(html, /\/api\/employee\/arrears\/directives/);
  assert.doesNotMatch(html, /preview_tasks|dry_run_tasks|all_tasks/);
});
