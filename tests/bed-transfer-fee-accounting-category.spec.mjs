import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bed_transfer_fee is a distinct income category, not rent, deposit, or arrears", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const totalsStart = worker.indexOf("function hscCreateTotals");
  const totalsEnd = worker.indexOf("__name(hscCreateTotals", totalsStart);
  assert.notEqual(totalsStart, -1);
  assert.notEqual(totalsEnd, -1);
  const totals = worker.slice(totalsStart, totalsEnd);

  assert.match(worker, /TF:"bed_transfer_fee"/);
  assert.match(worker, /BED_TRANSFER_FEE:"bed_transfer_fee"/);
  assert.match(worker, /new Set\(\["rent","deposit_in","arrears","transfer_fee","bed_transfer_fee"\]\)/);
  assert.match(totals, /row\.category==="transfer_fee"\|\|row\.category==="bed_transfer_fee"/);
  assert.match(worker, /category="bed_transfer_fee"/);
  assert.doesNotMatch(totals, /row\.category==="bed_transfer_fee"\).*rentReceivedFils/s);
  assert.doesNotMatch(totals, /row\.category==="bed_transfer_fee"\).*depositReceivedFils/s);
  assert.doesNotMatch(totals, /row\.category==="bed_transfer_fee"\).*arrearsPaidFils/s);
});

test("waived Bed Transfer records zero amount and no income effect", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(worker, /const amountFils=feeMode==="waived"\?0:5000/);
  assert.match(html, /amount_fils:\$\('feePaid'\)\.value==='N'\?0:5000/);
  assert.match(html, /No income \/ 不计收入/);
});
