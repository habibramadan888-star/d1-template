import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const signature = `function ${name}(`;
  const start = source.lastIndexOf(signature);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("clicking saved unchanged feedback returns before production write approval warning", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractLastFunction(html, "saveEmployeeDirectiveFollowup");

  const noOpIndex = save.indexOf("if(hasPersisted&&!dirty)");
  const warningIndex = save.indexOf("production_write_approval_required");
  const apiIndex = save.indexOf("apiFetch(");
  const noOpBlock = save.slice(noOpIndex, apiIndex);

  assert.ok(noOpIndex > -1, "saved unchanged branch must exist");
  assert.ok(warningIndex > -1, "write-gate warning branch must still exist");
  assert.ok(noOpIndex < warningIndex, "saved unchanged branch must run before gated warning handling");
  assert.match(noOpBlock, /return;/);
  assert.doesNotMatch(noOpBlock, /production_write_approval_required/);
});

test("write-gate warning remains limited to changed or new feedback path", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractLastFunction(html, "saveEmployeeDirectiveFollowup");

  assert.match(save, /toast\(hasPersisted\?/);
  assert.match(save, /apiFetch\(`\/api\/employee\/arrears\/directives\/\$\{encodeURIComponent\(taskId\)\}\/followup`/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
