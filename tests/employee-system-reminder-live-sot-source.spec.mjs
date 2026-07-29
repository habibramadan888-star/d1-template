import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";

function extractFunction(source, name, fromLast = false) {
  const start = fromLast ? source.lastIndexOf(`function ${name}(`) : source.indexOf(`function ${name}(`);
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

test("employee System reminders load from production SOT read-only API", async () => {
  const html = await readFile(htmlPath, "utf8");
  const worker = await readFile(workerPath, "utf8");
  const loader = extractFunction(html, "loadEmployeeSystemReminders");
  const refresh = extractFunction(html, "refreshFollowup");
  const handler = extractFunction(worker, "handleEmployeeSystemReminders");

  assert.match(loader, /\/api\/employee\/system\/reminders\?limit=/);
  assert.match(loader, /encodeURIComponent\(limit\)/);
  assert.match(refresh, /loadEmployeeSystemReminders\(false\)/);
  assert.match(worker, /\/api\/employee\/system\/reminders/);
  assert.match(handler, /resolveCurrentReceivablesSot/);
  assert.match(handler, /source_function:sot\.source_function/);
  assert.match(handler, /source_authority:\["existing_arrears_record","ttlock_expired_unpaid"\]/);
  assert.doesNotMatch(handler, /\.run\(/);
  assert.match(handler, /production_cutover:"PRODUCTION_NO_GO"/);
});
