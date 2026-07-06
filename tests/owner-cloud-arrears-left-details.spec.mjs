import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner Cloud Arrears details decode and render left customer metadata", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /function ownerOverviewParseLeftWithArrearsMeta/);
  assert.match(worker, /LEFT_WITH_ARREARS\\s\+\(\{\[\\s\\S\]\*\?\}\)/);
  assert.match(worker, /left_with_arrears:!!\(leftMeta\.left_with_arrears\|\|leftMeta\.customer_left\)/);
  assert.match(worker, /whatsapp_phone:cleanText\(leftMeta\.whatsapp_phone\|\|leftMeta\.former_customer_phone/);
  assert.match(worker, /promised_return_date:cleanText\(leftMeta\.promised_return_date/);
  assert.match(ui, /Left With Arrears/);
  assert.match(ui, /Phone:/);
  assert.match(ui, /Belongings Held:/);
  assert.match(ui, /Promise Payment:/);
  assert.match(ui, /Deposit Balance:/);
});
