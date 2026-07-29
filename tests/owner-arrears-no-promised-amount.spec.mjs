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

test("owner arrears card does not render promised amount", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");
  const details = extractFunction(js, "showArrearTaskDetails");
  const exportText = extractFunction(js, "exportArrearsWhatsApp");

  for (const source of [card, details, exportText]) {
    assert.doesNotMatch(source, /承诺金额/);
    assert.doesNotMatch(source, /arrearPromiseAmountLabel/);
    assert.doesNotMatch(source, /promised_amount|promise_amount/i);
  }

  assert.match(card, /arrearAmountLabel/);
  assert.match(card, /arrearPromiseDateLabel/);
  assert.match(card, /arrearFollowupNoteLabel/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
