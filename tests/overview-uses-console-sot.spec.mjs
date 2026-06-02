import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("owner Overview preloads and renders console SOT summary", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const summary = extractFunction(worker, "phase0OwnerOverviewComparativeSummary");
  const render = extractFunction(ui, "renderOwnerOverview", true);

  assert.match(summary, /current_receivables_sot/);
  assert.match(summary, /consoleSummary/);
  assert.match(summary, /due_today_count/);
  assert.match(summary, /due_soon_count/);
  assert.match(render, /ownerOverviewConsoleSotCloud/);
  assert.match(render, /hasConsoleSot/);
  assert.match(render, /consoleRiskNote/);
});
