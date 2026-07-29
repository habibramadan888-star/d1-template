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

test("owner comparative panel is Chinese-first and mobile-card based", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractLastFunction(ui, "renderOwnerOverviewComparativePanel");

  for (const label of ["经营对比", "当前账期实收", "租金收入", "净现金流", "欠款回收", "会计口径", "Cloud Arrears Collection", "欠款与回收", "待办与风险"]) {
    assert.match(render, new RegExp(label));
  }
  assert.match(render, /hist-card/);
  assert.match(render, /ana-kpi-grid/);
});

