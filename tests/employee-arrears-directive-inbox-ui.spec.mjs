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

test("employee directive inbox renders assigned directive business cards", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractFunction(html, "employeeDirectiveCard");

  assert.match(card, /data-employee-boss-directive-card/);
  assert.match(card, /老板下发任务/);
  assert.match(card, /room_bed/);
  assert.match(card, /amount/);
  assert.match(card, /due_date/);
  assert.match(card, /owner_note/);
});

test("employee directive card only asks for promise date and note", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractFunction(html, "employeeDirectiveCard");

  assert.match(card, /directivePromise_/);
  assert.match(card, /directiveNote_/);
  assert.match(card, /提交反馈/);
  assert.doesNotMatch(card, /promised_amount|promise_amount|amount_fils.*input|close_status|void/i);
});
