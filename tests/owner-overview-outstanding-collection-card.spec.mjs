import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview outstanding card is sourced from cloud arrears SOT when loaded", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /const outstandingAmount=Number\.isFinite\(Number\(cloudArrears\.outstanding_amount\)\)/);
  assert.match(ui, /const outstandingCount=Number\.isFinite\(Number\(cloudArrears\.open_count\)\)/);
  assert.match(ui, /OUTSTANDING COLLECTION/);
});

