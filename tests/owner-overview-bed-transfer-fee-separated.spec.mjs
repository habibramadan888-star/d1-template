import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview separates bed transfer fee from rent in read-only cloud summary", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /isBedTransferFee/);
  assert.match(worker, /isRent:isReceived&&!isDeposit&&!isArrearsRecovery&&!isBedTransferFee/);
  assert.match(worker, /bed_transfer_fee/);
  assert.match(ui, /换床费/);
  assert.match(ui, /bed_transfer_fee/);
});

