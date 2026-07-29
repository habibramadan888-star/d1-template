import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee Export tab and visible Export page remain removed", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.doesNotMatch(html, /data-view="export"/);
  assert.doesNotMatch(html, /id="view-export"/);
  assert.match(html, /employee-export-buffer/);
  assert.match(html, /Employee export page removed/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
