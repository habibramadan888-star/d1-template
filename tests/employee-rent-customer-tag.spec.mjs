import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

const employeeSource = await readFile(
  new URL("../deploy-worker/public/employee-v3.html", import.meta.url),
  "utf8"
);

test("Rent customer status uses the existing tag field with O as the default", () => {
  assert.match(
    employeeSource,
    /id="rentCustomerTag"[^>]*><option value="O" selected>[^<]*<\/option><option value="N">/
  );
  assert.match(
    employeeSource,
    /function employeeRentCustomerTagValue\(\)\{return employeeFieldValue\('rentCustomerTag'\)==='N'\?'N':'O';\}/
  );
  assert.match(
    employeeSource,
    /function buildRentAnchor\(\)[\s\S]*?employeeBaseEntryPayload\('R',\{\s*tag:employeeRentCustomerTagValue\(\),/
  );
});

test("Rent tag selection is Rent-only and resets to legacy O behavior", () => {
  assert.match(
    employeeSource,
    /rent:\{[\s\S]*?fields:\[[^\]]*'rentCustomerTagWrap'[^\]]*\]/
  );
  assert.doesNotMatch(
    employeeSource,
    /deposit_in:\{[\s\S]*?fields:\[[^\]]*'rentCustomerTagWrap'[^\]]*\]/
  );
  assert.match(
    employeeSource,
    /if\(prev!==type\)\{\s*if\(\$\('rentCustomerTag'\)\)\$\('rentCustomerTag'\)\.value='O';/
  );
  assert.match(
    employeeSource,
    /function resetForm\(\)[\s\S]*?if\(\$\('rentCustomerTag'\)\)\$\('rentCustomerTag'\)\.value='O';/
  );
});

test("Deposit In retains its existing N tag contract", () => {
  assert.match(
    employeeSource,
    /function buildDepositInAnchor\(\)[\s\S]*?employeeBaseEntryPayload\('D',\{reason_code:'D',tag:'N',/
  );
});

test("one Session represents Rent 700 N plus Deposit 200 N without double counting", async () => {
  const sessionId = "S-RENT-DEPOSIT-N";
  const text = await buildWhatsappTextWithDrafts([
    {
      id: "rent-700",
      session_id: sessionId,
      type: "R",
      tag: "N",
      room: "211",
      amount: 700,
      paid: 700,
      due: 700,
      period_due: 700,
      pay_type: "C",
      created_at: "2026-07-07T10:00:00Z"
    },
    {
      id: "deposit-200",
      session_id: sessionId,
      type: "D",
      tag: "N",
      room: "211",
      amount: 200,
      deposit_amount: 200,
      pay_type: "C",
      created_at: "2026-07-07T10:01:00Z"
    }
  ]);

  assert.match(text, /\[211\] paid 700 N cash 1000/);
  assert.match(text, /\[211\] deposit 200 N cash 1001/);
  assert.match(text, /Cash Received .* AED 900/);
  assert.match(text, /Deposit Included .* AED 200/);
  assert.doesNotMatch(text, /Cash Received .* AED 1800/);
});
