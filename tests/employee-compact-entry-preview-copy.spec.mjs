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

test("compact controls retain the seven-event 4+3 grid, payment selector, collapsible summaries, and no period confirmation checkbox", async () => {
  const source = await readFile(path, "utf8");
  assert.match(source, /#eventChips\{grid-template-columns:repeat\(12,minmax\(0,1fr\)\)!important\}/);
  assert.match(source, /event-chip\[data-type="CO"\]\{grid-column:2 \/ span 3!important\}/);
  assert.match(source, /#paymentStep \.step-title\{display:none!important\}/);
  assert.match(source, /data-session-summary-toggle/);
  assert.match(source, /session-summary-section collapsed/);
  assert.match(source, /employeeRentPeriodNeedsAttention/);
  assert.doesNotMatch(source, /periodExceptionConfirmed|I confirm the period, due, paid amount, and difference|confirmation required/);
});

test("system calculation is one collapsed, read-only disclosure with both computed fields", async () => {
  const source = await readFile(path, "utf8");
  const systemStart = source.lastIndexOf('<div class="employee-system-calculation', source.indexOf('id="systemCalculation"'));
  const system = source.slice(systemStart, source.indexOf('id="exceptionStep"'));
  assert.match(system, /employee-system-calculation collapsed/);
  assert.match(system, /id="systemCalculationToggle"/);
  assert.match(system, /id="paid"[\s\S]*readonly/);
  assert.match(system, /id="entryClr" disabled/);
  assert.match(source, /employee-system-calculation\.collapsed \.employee-system-calculation-body\{display:none\}/);
  assert.match(source, /employeeUpdateSystemCalculationDisclosure\(\)/);
});

test("ledger arrears metadata is searchable and Preview/Copy keeps one ledger generator", async () => {
  const source = await readFile(path, "utf8");
  const helper = source.slice(source.indexOf('function entrySearchableArrearsTokens'), source.indexOf('function entryStatementType'));
  const statement = source.slice(source.indexOf('function entryStatementLine'), source.indexOf('function entryStatementAmount', source.indexOf('function entryStatementLine')));
  assert.match(helper, /DUE:\$\{entryStatementDate\(dueValue\)\}/);
  assert.match(helper, /NOTE:\$\{note\}/);
  assert.match(statement, /entrySearchableArrearsTokens/);
  assert.doesNotMatch(statement, /due \$\{due\}/);
  assert.match(source, /buildEntrySessionLedgerText\(\)/);
});

test("searchable arrears tokens distinguish due date and note", async () => {
  const source = await readFile(path, "utf8");
  const start = source.indexOf('function entryStatementDate');
  const end = source.indexOf('function entryStatementType');
  const helper = new Function('today', 'entryWhatsappSafe', `${source.slice(start, end)}; return entrySearchableArrearsTokens;`)(() => '2026-07-13', value => String(value || '').trim());
  assert.equal(helper('2026-07-17', '11'), 'DUE:0717 | NOTE:11');
  assert.equal(helper('2026-07-17', ''), 'DUE:0717');
  assert.equal(helper('', '11'), 'NOTE:11');
});

test("rent period is collapsed only for a TTLock-anchored matching one-month payment", async () => {
  const source = await readFile(path, "utf8");
  const start = source.indexOf('function employeeRentPeriodNeedsAttention');
  const end = source.indexOf('function employeeUpdatePeriodDisclosure');
  const fields = { entryType: { value: 'R' }, cycle: { value: '1M' }, amount: { value: '770' }, periodStart: { value: '2026-08-02' }, periodEnd: { value: '2026-09-02' } };
  const attention = new Function('$', 'num', 'rentForBed', 'state', `${source.slice(start, end)}; return employeeRentPeriodNeedsAttention;`)(id => fields[id], Number, () => 770, { current: { end: '2026-08-02' } });
  assert.equal(attention(), false);
  fields.amount.value = '700';
  assert.equal(attention(), true);
  fields.amount.value = '770';
  fields.cycle.value = '15D';
  assert.equal(attention(), true);
});
