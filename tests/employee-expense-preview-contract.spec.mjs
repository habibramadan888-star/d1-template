import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

const employeePath = "deploy-worker/public/employee-v3.html";

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing ${start}..${end}`);
  return source.slice(from, to);
}

test("Expense has only room, amount, payment, and description without a bed lookup", async () => {
  const source = await readFile(employeePath, "utf8");
  const expenseHtml = source.match(/<div class="grid" id="expenseFields">[\s\S]*?<\/div>\s*<\/div>/)?.[0] || "";
  assert.ok(expenseHtml, "Expense field block must exist");
  const template = between(source, "  expense:{", "  bed_transfer:{");
  const inputListener = between(source, "$('bed').addEventListener('input'", "$('transferFromBed').addEventListener('input'");

  assert.match(source, /id="genericBedFieldLabel"/);
  assert.match(source, /employeeSetFieldLabel\('bed','Room Number','房间号'\)/);
  assert.doesNotMatch(source, /employeeSetFieldLabel\('bed','Target Bed \/ Room'/);
  assert.match(expenseHtml, /Expense Description/);
  assert.doesNotMatch(expenseHtml, /expenseCategory|Evidence Ref|expenseEvidenceRef|Remark/);
  assert.match(template, /fields:\['selectedEventWrap','genericBedFieldWrap','paymentStep','amount','expenseFields'\]/);
  assert.match(template, /required_fields:\['target_bed','expense_amount','payment_method','reason'\]/);
  assert.match(inputListener, /if\(type==='E'\)\{syncForm\(\);return;\}/);
  assert.ok(inputListener.indexOf("type==='E'") < inputListener.indexOf("employeeScheduleLookupBed"));
  assert.ok(
    source.includes("if(['TF','E','DR','CO'].includes($('entryType')?.value)"),
    "Expense, Deposit Refund and Checkout must use the existing no-TTLock dispatch path",
  );
});

test("Preview renders the exact WhatsApp ledger text and empty sessions stay disabled", async () => {
  const source = await readFile(employeePath, "utf8");
  const preview = between(source, "previewSession=function(){", "function closePreviewModal");
  const actionState = between(source, "updateEntrySessionActionState=function(){", "function refreshSessionViews");
  const text = await buildWhatsappTextWithDrafts([
    { type: "E", room: "204", expense_amount: 100, amount: 100, pay_type: "C", expense_desc: "AC repair", created_at: "2026-07-13T10:00:00Z" }
  ]);

  assert.match(preview, /const ledger=buildEntrySessionLedgerText\(\)/);
  assert.match(preview, /data-session-ledger-preview/);
  assert.match(preview, /<pre>\$\{esc\(ledger\)\}<\/pre>/);
  assert.match(actionState, /preview\.disabled=!hasRows/);
  assert.match(text, /^HOMELINK LEDGER/m);
  assert.match(text, /\[204\] expense 100 cash/);
});
