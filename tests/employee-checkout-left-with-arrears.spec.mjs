import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("employee checkout exposes Left With Arrears required fields and validation", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /leftWithArrearsMode/);
  assert.match(html, /Left With Arrears/);
  assert.match(html, /leftWhatsappPhone/);
  assert.match(html, /leftPromisedPaymentDate/);
  assert.match(html, /leftPromisedReturnDate/);
  assert.match(html, /leftBelongingsHeld/);
  assert.match(html, /Blocked: WhatsApp phone is required for left customer arrears/);
  assert.match(html, /Promised Payment Date is required/);
  assert.match(html, /Promised Return Date is required/);
  assert.match(html, /Belongings Note is required when belongings are held/);
});

test("Left With Arrears anchor is added to employee checkout payload", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /checkout_mode:leftMode\?'left_with_arrears':'normal'/);
  assert.match(html, /left_with_arrears:leftMode/);
  assert.match(html, /customer_left:leftMode/);
  assert.match(html, /cloud_arrears_ref:leftArrearsRef/);
  assert.match(html, /former_customer_phone:leftMode\?\$\(\'leftWhatsappPhone\'\)\.value\.trim\(\):''/);
  assert.match(html, /promised_payment_date:leftMode\?\$\(\'leftPromisedPaymentDate\'\)\.value:''/);
  assert.match(html, /promised_return_date:leftMode\?\$\(\'leftPromisedReturnDate\'\)\.value:''/);
  assert.match(html, /deposit_balance:leftMode\?num\(\$\(\'leftDepositBalance\'\)\.value\):depositHeld\(\)/);
});
