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

test("numeric note immediately after a four-digit ledger time is labelled without changing other ledger text", async () => {
  const source = await readFile(path, "utf8");
  const start = source.indexOf('function entryStatementNote');
  const end = source.indexOf('function entrySearchableArrearsTokens');
  const format = new Function('entryWhatsappSafe', `${source.slice(start, end)}; return entryStatementTimeAndNote;`)(value => String(value || '').trim());
  assert.equal(`[144] deposit refund 100 cash ${format('2210', '11')}`, '[144] deposit refund 100 cash Time:2210 · Note:11');
  assert.doesNotMatch(`[144] deposit refund 100 cash ${format('2210', '11')}`, /2210 11/);
  assert.equal(format('2210', 'room_issue'), '2210 room_issue');
  assert.equal(format('2210', ''), '2210');
  assert.equal(format('time', '11'), 'time 11');
});

test("rent period disclosure keeps real DOM state collapsed until a completed real amount mismatch", async () => {
  const source = await readFile(path, "utf8");
  const start = source.indexOf('function employeeRentPeriodDisclosureState');
  const end = source.indexOf('function validateRentEntry');
  const classes = new Set();
  const step = {
    open: true,
    dataset: {},
    classList: { toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) }
  };
  const fields = {
    entryType: { value: 'R' }, cycle: { value: '1M' }, amount: { value: '', dataset: {} },
    periodStart: { value: '2026-08-02' }, periodEnd: { value: '2026-09-02' },
    periodStep: step, periodCompactSummary: { textContent: '', dataset: {} }
  };
  const api = new Function('$', 'num', 'rentForBed', 'state', 'fmtMoney', `${source.slice(start, end)}; return { state: employeeRentPeriodDisclosureState, update: employeeUpdatePeriodDisclosure };`)(id => fields[id], Number, () => 770, { current: { end: '2026-08-02' } }, value => Number(value).toFixed(2));
  const assertClosed = () => { api.update(); assert.equal(step.open, false); assert.equal(classes.has('collapsed'), true); };
  assertClosed(); // initial page and selecting Rent
  fields.amount.value = '700';
  assertClosed(); // incomplete draft
  fields.amount.dataset.periodAmountComplete = 'true';
  assert.equal(api.state().realMismatch, true);
  api.update();
  assert.equal(step.open, true);
  assert.equal(classes.has('collapsed'), false);
  fields.amount.value = '770';
  api.update();
  assert.equal(step.open, false);
  fields.amount.value = '';
  api.update();
  assert.equal(step.open, false); // reset and re-render
  fields.amount.value = '700';
  fields.amount.dataset.periodAmountComplete = 'true';
  const noExpiryApi = new Function('$', 'num', 'rentForBed', 'state', 'fmtMoney', `${source.slice(start, end)}; return { state: employeeRentPeriodDisclosureState, update: employeeUpdatePeriodDisclosure };`)(id => fields[id], Number, () => 770, { current: {} }, value => Number(value).toFixed(2));
  noExpiryApi.update();
  assert.equal(step.open, false);
  assert.match(fields.periodCompactSummary.textContent, /日期待查看/);
});
