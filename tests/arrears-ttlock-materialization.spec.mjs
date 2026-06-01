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

test("TTLock virtual rows are materialized into arrear_tasks idempotently", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "materializeArrearsTaskFromSot");

  assert.match(fn, /source_type/);
  assert.match(fn, /source_ref/);
  assert.match(fn, /source_fingerprint/);
  assert.match(fn, /materialized_from:"boss_arrears_followup_sot"/);
  assert.match(fn, /INSERT_OR_IGNORE/);
  assert.match(fn, /SELECT \* FROM arrear_tasks WHERE corpid=\? AND source_type=\? AND source_ref=\?/);
  assert.match(fn, /event_type:"materialized"/);
});

test("materialization preserves financial fields and does not settle arrears", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "materializeArrearsTaskFromSot");

  assert.match(fn, /arrear_amount:cleanMoney\(contract\.amount_fils\/100\)/);
  assert.match(fn, /actual_received:0/);
  assert.match(fn, /close_status:""/);
  assert.doesNotMatch(fn, /accounting_status/);
});
