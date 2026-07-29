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

test("owner arrears main card does not render internal IDs", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");
  const dueLine = extractFunction(js, "arrearDueLine");

  assert.doesNotMatch(card, /arrearCustomerLabel/);
  assert.doesNotMatch(
    card,
    /ttlock-expired|#ttlock|sourceRef|source_ref|dedupe|packageCode|cardCode|ttlock_card/
  );
  assert.doesNotMatch(dueLine, /packageCode|cardCode|type|ttlock_card|D-/);
  assert.match(card, /data-owner-arrears-business-title/);
  assert.match(card, /<strong>\$\{bed\}<\/strong><b>｜\$\{amount\}<\/b>/);
});

test("internal task identifiers remain hidden from business title", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  const identityMatch = card.match(/<div class="owner-arrears-identity"[\s\S]*?<\/div>/);
  assert.ok(identityMatch, "business identity block must exist");
  const identity = identityMatch[0];

  assert.match(identity, /\$\{bed\}/);
  assert.match(identity, /\$\{amount\}/);
  assert.doesNotMatch(identity, /customer|taskId|source|ttlock|dedupe/i);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
