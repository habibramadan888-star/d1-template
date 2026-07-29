import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("arrears detail modal renders compact mobile list rows", async () => {
  const js = await readFile("deploy-worker/public/index-51-cp.js", "utf8");
  const css = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(js, /arrears-compact-row/);
  assert.match(js, /arrears-compact-main/);
  assert.match(js, /arrears-compact-meta/);
  assert.match(js, /截止 \$\{esc\(endStr\)\}/);
  assert.match(js, /\$\{esc\(overdue\)\}/);
  assert.match(js, /\$\{esc\(amount\)\}/);
  assert.match(css, /#modalOverlay \.arrears-compact-row/);
  assert.match(css, /grid-template-columns:1fr 70px 96px/);
});

test("arrears modal keeps details expandable and avoids horizontal overflow", async () => {
  const js = await readFile("deploy-worker/public/index-51-cp.js", "utf8");
  const css = await readFile("deploy-worker/public/index.html", "utf8");
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(js, /<details class="arrears-compact-detail">/);
  assert.match(js, /<summary>详情<\/summary>/);
  assert.match(css, /white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
  assert.match(css, /max-width:210px/);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});
