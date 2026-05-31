import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

test("employee mobile inbox renders the approved boss-assigned task fields", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractFunction(html, "employeeDirectiveCard");

  assert.match(card, /老板下发任务/);
  assert.match(card, /room_bed/);
  assert.match(card, /customer_code/);
  assert.match(card, /amount/);
  assert.match(card, /directivePromise_/);
  assert.match(card, /directiveNote_/);
});

test("employee directive card does not expose amount editing", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractFunction(html, "employeeDirectiveCard");

  assert.match(card, /金额不可在这里修改/);
  assert.doesNotMatch(card, /promised_amount|promise_amount|amount_fils.*input|arrear_amount.*input/i);
});

test("mobile acceptance evidence records Abdul inbox pass without production cutover", async () => {
  const doc = await readFile("ARREARS_DIRECTIVE_ABDUL_EMPLOYEE_INBOX_MOBILE_ACCEPTANCE.md", "utf8");

  assert.match(doc, /Abdul sees boss assigned task \| yes \| yes \| PASS/);
  assert.match(doc, /Task shows 144 \| yes \| yes \| PASS/);
  assert.match(doc, /Task shows customer 139780080 \| yes \| yes \| PASS/);
  assert.match(doc, /Task shows 50 AED \| yes \| yes \| PASS/);
  assert.match(doc, /Submit writes production \| no, gate off \| blocked by approval \| EXPECTED/);
  assert.match(doc, /Production cutover \| PRODUCTION_NO_GO \| PRODUCTION_NO_GO \| PASS/);
});
