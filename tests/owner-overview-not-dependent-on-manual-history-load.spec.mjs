import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
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

test("owner overview comparative cards are not dependent on manual history import/load", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractLastFunction(ui, "loadOwnerOverviewComparativeSummary");

  assert.match(load, /apiFetch\('\/api\/owner\/overview\/comparative-summary/);
  assert.doesNotMatch(load, /renderHistory\(/);
  assert.doesNotMatch(load, /syncImportedSessionsToCloud/);
  assert.doesNotMatch(load, /analysisSessions\.push/);
});
