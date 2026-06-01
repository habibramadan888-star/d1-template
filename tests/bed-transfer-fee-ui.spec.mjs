import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee Bed Transfer UI exposes charged and waived fee paths", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /data-bed-transfer-fee-mode="true"/);
  assert.match(html, /Charge 50 AED \/ 收取 50 AED/);
  assert.match(html, /Waive fee \/ 豁免费用/);
  assert.match(html, /id="transferWaiverReason"/);
  assert.match(html, /data-bed-transfer-waiver-reason="true"/);
  assert.match(html, /visible\(\['transferWaiverReasonWrap'\],type==='TF'&&\$\('feePaid'\)\.value==='N'\)/);
});

test("employee Bed Transfer submit payload carries fee ledger fields", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /fee_mode:\$\('feePaid'\)\.value==='N'\?'waived':'charged'/);
  assert.match(html, /amount_fils:\$\('feePaid'\)\.value==='N'\?0:5000/);
  assert.match(html, /fee_waiver_reason:\$\('feePaid'\)\.value==='N'\?\$\('transferWaiverReason'\)\.value\.trim\(\):''/);
  assert.match(html, /fee_mode:e\.fee_mode/);
  assert.match(html, /amount_fils:e\.amount_fils/);
  assert.match(html, /waiver_reason:e\.fee_waiver_reason/);
});

test("step context explains fee accounting effect", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /Bed Transfer Fee income \/ 换床费收入/);
  assert.match(html, /No income \/ 不计收入/);
  assert.match(html, /Waiver Reason<small>豁免原因<\/small>/);
});
