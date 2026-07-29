import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee top tabs share one Chinese-over-English structure", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  for (const [cn, en] of [
    ["录入", "ENTRY"],
    ["跟进", "FOLLOW-UP"],
    ["导出", "EXPORT"]
  ]) {
    assert.match(
      html,
      new RegExp(`<span class="tab-cn">${cn}</span><span class="en">${en}</span>`)
    );
  }
  assert.match(html, /\.tab\{[^}]*flex-direction:column/);
  assert.match(html, /\.tab \.en\{[^}]*white-space:nowrap/);
});

test("employee top tab English labels are not truncated", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /text-overflow:clip!important/);
  assert.match(html, /overflow:visible!important/);
  assert.doesNotMatch(html, /max-width:48px;\s*overflow:hidden;\s*text-overflow:ellipsis;/);
});
