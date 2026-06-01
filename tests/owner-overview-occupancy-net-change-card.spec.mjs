import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview occupancy card reports net change and excludes transfers", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(ui, /const netChange=Number\(flow\.new_tenants\|\|0\)-Number\(flow\.checkouts\|\|0\)/);
  assert.match(ui, /换床不计入/);
  assert.match(worker, /isTransfer/);
  assert.match(worker, /transfer_rule:"bed transfers are not counted as new tenants or checkouts"/);
});

