import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("employee Bed Transfer display sanitizes TTLock account phone numbers", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /function isTtlockAccountPhone/);
  assert.match(html, /\\\+971\\d\{7,12\}/);
  assert.match(html, /function sanitizeBedTransferDisplay/);
});

test("Bed Transfer context uses sanitized occupant and TTLock display", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const context = extractFunction(html, "renderBedTransferSystemContext");

  assert.match(context, /sanitizeBedTransferDisplay\(\$\(\'tenantName\'\)/);
  assert.match(context, /sanitizeBedTransferDisplay\(\$\(\'tenantCardId\'\)/);
  assert.match(context, /TTLock reference kept in audit/);
});

test("Bed Transfer Step 8 note uses sanitizer before rendering", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const summary = extractFunction(html, "renderSummary");
  const tfBranch = summary.slice(summary.indexOf("if(type==='TF')"), summary.indexOf("const period="));

  assert.match(tfBranch, /sanitizeBedTransferDisplay\(\$\(\'remark\'\)\.value/);
});
