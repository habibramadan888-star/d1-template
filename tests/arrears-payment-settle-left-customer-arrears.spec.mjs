import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee Arrears Payment can select left customer Cloud Arrears and keep contact context visible", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(html, /function employeeParseLeftWithArrearsMeta/);
  assert.match(html, /function employeeTaskLeftWithArrearsMeta/);
  assert.match(html, /Left With Arrears \/ 离店未清欠款/);
  assert.match(html, /Phone \$\{esc\(left\.whatsapp_phone/);
  assert.match(html, /selected_arrears_ref/);
  assert.match(html, /settlement_status:type==='AP'\?\(apRemaining<=0\?'settled':'partial'\):''/);
  assert.match(worker, /empEnsureOpenArrearTaskForPayment\(env,user,taskId/);
  assert.match(worker, /empReconcileArrearTask\(env,user,taskId/);
});
