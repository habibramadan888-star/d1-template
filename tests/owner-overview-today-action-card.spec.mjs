import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview today action card uses overdue promise and review risk counts", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /cloudRisk\.overdue_count/);
  assert.match(ui, /cloudRisk\.broken_promise_count/);
  assert.match(ui, /cloudRisk\.needs_review_count/);
  assert.match(ui, /TODAY ACTIONS/);
});

