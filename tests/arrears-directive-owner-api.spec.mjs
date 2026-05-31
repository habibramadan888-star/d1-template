import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
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

test("owner directive API requires manager and idempotency key", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleBossArrearsDirectives");

  assert.match(worker, /path === "\/api\/boss\/arrears\/directives" && method === "POST"/);
  assert.match(fn, /if\(!requireManager\(user\)\)return forbidden\(\)/);
  assert.match(fn, /idempotency_key_required/);
  assert.match(fn, /task_ids_required/);
});

test("owner directive API blocks writes unless explicitly approved", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleBossArrearsDirectives");

  assert.match(fn, /if\(!arrearsDirectiveWriteApproved\(env\)\)return arrearsDirectiveApprovalRequired/);
  assert.match(fn, /skippedDuplicateCount/);
  assert.match(fn, /directive_status='assigned'/);
  assert.match(fn, /duplicate/i);
  assert.match(fn, /boss\.arrears\.directives\.create/);
});
