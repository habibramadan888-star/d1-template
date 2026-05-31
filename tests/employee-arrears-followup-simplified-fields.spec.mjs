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

test("employee v3 follow-up form keeps date and note, not promised amount", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractFunction(html, "followupCard");
  const save = extractFunction(html, "saveFollowup");

  assert.match(card, /id="promise_\$\{id\}"/);
  assert.match(card, /id="note_\$\{id\}"/);
  assert.doesNotMatch(card, /promise_amount|promised_amount|承诺金额/);

  assert.match(save, /promise_date:promise/);
  assert.match(save, /staff_note:note/);
  assert.match(save, /status==='承诺付款'&&!promise/);
  assert.doesNotMatch(save, /promise_amount/);
});

test("legacy employee v2 does not render promised amount input", async () => {
  const html = await readFile("deploy-worker/public/employee-v2.html", "utf8");
  const render = extractFunction(html, "renderTasks");
  const update = extractFunction(html, "updateTask");
  const buildExport = extractFunction(html, "buildExport");

  assert.match(render, /data-k="promise_date"/);
  assert.match(render, /data-k="staff_note"/);
  assert.doesNotMatch(render, /data-k="promise_amount"|承诺金额/);
  assert.doesNotMatch(update, /promise_amount/);
  assert.doesNotMatch(buildExport, /promise_amt|promise_amount/);
});
