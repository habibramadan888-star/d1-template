import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer does not expose owner approve or reject actions", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const employeeHtml = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.doesNotMatch(worker, /bed-transfer.*approve/i);
  assert.doesNotMatch(worker, /bed-transfer.*reject/i);
  assert.doesNotMatch(ownerJs, /approve.*bed transfer/i);
  assert.doesNotMatch(ownerJs, /reject.*bed transfer/i);
  assert.doesNotMatch(employeeHtml, /SUBMIT FOR REVIEW/);
});
