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

test("employee directive read API returns only assigned employee directives", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleEmployeeArrearsDirectives");

  assert.match(worker, /path==="\/api\/employee\/arrears\/directives"&&request\.method==="GET"/);
  assert.match(fn, /if\(!isStaffRoleValue\(user\?\.role\)\)return forbidden\(\)/);
  assert.match(fn, /WHERE corpid=\? AND userid=\?/);
  assert.match(fn, /directive_status/);
  assert.match(fn, /empTaskToEmployeeDirective/);
});

test("employee directive response exposes business fields only", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const mapper = worker.slice(worker.indexOf("function empTaskToEmployeeDirective"), worker.indexOf("__name(empTaskToEmployeeDirective"));

  for (const field of [
    "directive_id",
    "room_bed",
    "customer_code",
    "amount_fils",
    "source_type",
    "due_date",
    "overdue_days",
    "directive_status",
    "promised_payment_date",
    "followup_note"
  ]) {
    assert.match(mapper, new RegExp(field));
  }
});
