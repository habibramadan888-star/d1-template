import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer supports paid and waived fee statuses", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("async function handleEmployeeBedTransferCreate");
  const end = worker.indexOf("__name(handleEmployeeBedTransferCreate", start);
  const h = worker.slice(start, end);

  assert.match(h, /rawFeeInput==="paid"\?"charged":rawFeeInput/);
  assert.match(h, /feeMode==="waived"\?"waived":"paid"/);
  assert.match(h, /feeMode==="waived"\?0:5000/);
  assert.match(h, /payment_method:paymentMethod/);
  assert.match(h, /payment_method_required/);
  assert.match(h, /waiver_reason:waiverReason/);
});

test("employee UI sends fee status and payment method", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /payment_method:bedTransferPaymentMethod\(\)/);
  assert.match(html, /fee_status:e\.fee_mode==='waived'\?'waived':'paid'/);
  assert.match(html, /amount_fils:\$\(\'feePaid\'\)\.value==='N'\?0:5000/);
});
