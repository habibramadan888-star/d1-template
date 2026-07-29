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

test("owner arrears uses natural room bed sort as display adapter", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const compare = extractLastFunction(js, "ownerArrearsNaturalCompare");
  const rows = extractLastFunction(js, "ownerArrearsFilteredRows");
  const render = extractLastFunction(js, "renderArrearsPanel");

  assert.match(compare, /localeCompare\(naturalArrearRoomBedKey\(b\),undefined,\{numeric:true,sensitivity:'base'\}\)/);
  assert.match(compare, /overdueDelta/);
  assert.match(compare, /customerCode/);
  assert.match(rows, /\.sort\(ownerArrearsNaturalCompare\)/);
  assert.match(render, /ownerArrearsFilteredRows\(active\)/);
  assert.doesNotMatch(render, /dueDate\|\|'9999'/);
});

test("sort does not change source counts or backend SOT payload", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const rows = extractLastFunction(js, "ownerArrearsFilteredRows");

  assert.match(rows, /\.slice\(\)\s*\.\s*sort/);
  assert.doesNotMatch(rows, /state\.arrears\s*=/);
});
