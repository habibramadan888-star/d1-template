import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("accounting control keeps rent deposits refunds expenses and arrears separate", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const doc = await readFile("OWNER_OVERVIEW_ACCOUNTING_CONTROL_RESULT.md", "utf8");

  for (const field of [
    "rent_received",
    "deposit_received",
    "arrears_recovered",
    "deposit_refund",
    "expenses",
    "net_cashflow"
  ]) {
    assert.match(worker, new RegExp(field));
    assert.match(ui, new RegExp(field));
    assert.match(doc, new RegExp(field.replace("_", " "), "i"));
  }

  assert.match(doc, /Existing dashboard calculation was not changed/);
});
