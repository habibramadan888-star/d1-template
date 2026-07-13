import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = "deploy-worker/public/employee-v3.html";

test("Current Session uses Preview & Copy only and never a WhatsApp deep link", async () => {
  const source = await readFile(path, "utf8");
  const sessionHead = source.slice(source.indexOf('id="btnPreviewSession"') - 200, source.indexOf('id="btnExportSession"') + 250);
  const preview = source.slice(source.lastIndexOf("previewSession=function"), source.indexOf("function closePreviewModal", source.lastIndexOf("previewSession=function")));
  assert.match(sessionHead, /Preview &amp; Copy/);
  assert.doesNotMatch(sessionHead, /WhatsApp Export|btnWhatsAppSession/);
  assert.doesNotMatch(source, /wa\.me\/?text|exportEntrySessionWhatsApp/);
  assert.match(preview, /buildEntrySessionLedgerText\(\)/);
  assert.match(preview, /id="btnCopyLedger"/);
  assert.match(preview, /navigator\.clipboard\.writeText\(ledger\)/);
  assert.match(preview, /已复制，可以粘贴到WhatsApp/);
});

test("compact controls retain the seven-event 4+3 grid, payment selector, collapsible summaries, and rent exception confirmation", async () => {
  const source = await readFile(path, "utf8");
  assert.match(source, /#eventChips\{grid-template-columns:repeat\(12,minmax\(0,1fr\)\)!important\}/);
  assert.match(source, /event-chip\[data-type="CO"\]\{grid-column:2 \/ span 3!important\}/);
  assert.match(source, /#paymentStep \.step-title\{display:none!important\}/);
  assert.match(source, /data-session-summary-toggle/);
  assert.match(source, /session-summary-section collapsed/);
  assert.match(source, /employeeRentPeriodRequiresConfirmation/);
  assert.match(source, /periodExceptionConfirmed/);
  assert.match(source, /Confirm Period requires explicit confirmation/);
});
