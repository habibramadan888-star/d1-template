import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("arrears page reuses history card visual tokens", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(
    html,
    /\.hist-card\{background:var\(--surface\);border:1px solid var\(--border\);border-radius:var\(--r2\);padding:16px/
  );
  assert.match(html, /\.hist-stat\{display:flex;justify-content:space-between/);
  assert.match(card, /class="hist-card owner-arrears-task-card/);
  assert.match(card, /class="hist-anchor owner-arrears-due-line"/);
  assert.match(card, /class="hist-stat"/);
});

test("arrears page does not render vertical text or debug fields", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.doesNotMatch(html, /writing-mode:\s*vertical/i);
  assert.doesNotMatch(card, /directive:|promise:|staff:|source_type|followup_status|金额待核对/i);
});

test("commercial launch remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
});
