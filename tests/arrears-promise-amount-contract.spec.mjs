import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("employee follow-up payload uses promised date and note, not promised amount", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractFunction(html, "saveFollowup");

  assert.match(save, /promised_payment_date:promise/);
  assert.match(save, /followup_note:note/);
  assert.doesNotMatch(save, /promise_amount|promised_amount|promised_amount_fils/);
});

test("owner default arrears card shows system amount, promise date, note, and status only", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(card, /arrearAmountLabel/);
  assert.match(card, /arrearPromiseDateLabel/);
  assert.match(card, /arrearFollowupNoteLabel/);
  assert.match(card, /arrearBusinessState/);
  assert.doesNotMatch(card, /arrearPromiseAmountLabel/);
  assert.doesNotMatch(card, /promise_amount|promised_amount|promisedAmountFils|promiseAmount/i);
});

test("backend accepts legacy promise amount fields without making them staff update fields", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const update = extractFunction(worker, "handleArrearTaskUpdate");
  const staffBranch = update.slice(update.indexOf("const staffAllowed="));

  assert.match(staffBranch, /"promise_amount"/);
  assert.match(staffBranch, /"promised_amount"/);
  assert.match(staffBranch, /"promised_amount_fils"/);
  assert.match(staffBranch, /"promised_payment_date"/);
  assert.match(staffBranch, /"followup_note"/);
  assert.match(staffBranch, /legacy optional compatibility fields/);
  assert.doesNotMatch(staffBranch, /updateValues\.promise_amount/);
  assert.doesNotMatch(staffBranch, /updateValues\.promised_amount/);
  assert.doesNotMatch(staffBranch, /updateValues\.promised_amount_fils/);
});

test("promise amount is documented as legacy optional and production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  const contract = await readFile("ARREARS_PROMISE_AMOUNT_CONTRACT_CLEANUP_RESULT.md", "utf8");

  assert.match(contract, /legacy optional/i);
  assert.match(contract, /Default UI does not display `?promise_amount`?/i);
  assert.match(gate, /PRODUCTION_NO_GO/);
  assert.doesNotMatch(gate, /PRODUCTION_READY_GO/);
});
