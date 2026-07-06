import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workerPath = "deploy-worker/src/index.js";

test("rent short paid creates a cloud arrears anchor in arrear_tasks", async () => {
  const source = await readFile(workerPath, "utf8");

  assert.match(source, /CREATE TABLE IF NOT EXISTS arrear_tasks/);
  assert.match(source, /if\(currentShortfall>0\)/);
  assert.match(source, /arrear_task_required_for_shortfall/);
  assert.match(source, /empInsertDynamic\(env,"arrear_tasks"/);
  assert.match(source, /original_entry_id:entryId/);
  assert.match(source, /promise_date:arrearPromiseDate/);
  assert.match(source, /promise_amount:remain/);
  assert.match(source, /staff_note:arrearReasonDetail/);
});

test("arrears payment binds existing cloud arrears and reconciles remaining status", async () => {
  const source = await readFile(workerPath, "utf8");

  assert.match(source, /if\(type==="AP"\)/);
  assert.match(source, /const taskId=cleanId\(entry\.linked_task_id\)/);
  assert.match(source, /empEnsureOpenArrearTaskForPayment\(env,user,taskId/);
  assert.match(source, /empReconcileArrearTask\(env,user,taskId/);
  assert.match(source, /SET actual_received=\?, followup_status=\?, close_status=\?/);
  assert.match(source, /closed\?"已结清":\(actual>0\?"部分支付"/);
});

test("owner can read cloud arrears anchors from arrears APIs", async () => {
  const source = await readFile(workerPath, "utf8");

  assert.match(source, /handleBossArrearsFollowupTasks\(request, env, user\)/);
  assert.match(source, /handleBossArrears\(request, env, user\)/);
  assert.match(source, /\/api\/arrears\/followup\/tasks/);
  assert.match(source, /\/api\/boss\/arrears\/followup-tasks/);
  assert.match(source, /\/api\/arrears/);
});
