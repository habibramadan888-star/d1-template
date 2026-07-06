import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview today action card uses current receivables SOT buckets", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /const todayTodo=hasConsoleSot\?Number\(consoleSummary\.action_count\?\?0\):0/);
  assert.match(ui, /consoleSummary\.overdue_count/);
  assert.match(ui, /consoleSummary\.due_today_count/);
  assert.match(ui, /consoleSummary\.due_soon_count/);
  assert.match(ui, /function ownerOverviewShowTodayActionsPreview\(\)/);
  assert.match(ui, /const rows=ownerOverviewConsoleSotRows\(\)/);
  assert.doesNotMatch(ui, /todayTodo=.*broken_promise_count/);
  assert.match(ui, /TODAY ACTIONS/);
});
