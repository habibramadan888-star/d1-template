import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";

test("employee upload writes Left With Arrears metadata to existing Cloud Arrears", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /function empLeftWithArrearsMetaFromEntry/);
  assert.match(worker, /left_with_arrears:true/);
  assert.match(worker, /customer_left:true/);
  assert.match(worker, /former_customer_phone:phone/);
  assert.match(worker, /whatsapp_phone:phone/);
  assert.match(worker, /cloud_arrears_ref:cleanText/);
  assert.match(worker, /LEFT_WITH_ARREARS \$\{JSON\.stringify\(meta\)\}/);
  assert.match(worker, /UPDATE arrear_tasks\s+SET staff_note=\?, owner_note=\?, updated_by=\?, updated_at=\?/);
  assert.match(worker, /left_with_arrears_task:leftWithArrearsTask/);
});

test("Cloud Arrears metadata preserves same-bed new customer isolation fields", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /former_customer_ref/);
  assert.match(worker, /former_customer_name/);
  assert.match(worker, /former_bed/);
  assert.match(worker, /original_session_id/);
  assert.match(worker, /original_event_id/);
});
