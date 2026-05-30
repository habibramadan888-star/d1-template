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

test("owner arrears render path has no raw debug labels", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");

  assert.doesNotMatch(render, /directive:/);
  assert.doesNotMatch(render, /promise:/);
  assert.doesNotMatch(render, /staff:/);
  assert.doesNotMatch(render, /老板指令字段|员工回执字段|debug/i);
});
