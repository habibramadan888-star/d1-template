import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
const worker = await readFile("deploy-worker/src/index.js", "utf8");

function block(source, startText, endText, last = false) {
  const start = last ? source.lastIndexOf(startText) : source.indexOf(startText);
  assert.ok(start >= 0, `${startText} not found`);
  const end = source.indexOf(endText, start);
  assert.ok(end > start, `${endText} not found after ${startText}`);
  return source.slice(start, end);
}

test("New Session is visible, clears browser-only state, rotates identity, and calls no API", () => {
  assert.equal((employee.match(/id="btnNewSessionTop"/g) || []).length, 1);
  assert.doesNotMatch(employee, /id="btnNewSessionQuick"/);
  const actions = block(employee, '<div class="employee-session-actions"', '</div>\n      </div>');
  assert.match(actions, /id="btnPreviewSession"/);
  assert.match(actions, /id="btnExportSession"/);
  assert.match(actions, /id="btnNewSessionTop"/);
  const fn = block(employee, "function newSessionFinal()", "newSession=newSessionFinal");
  assert.match(fn, /state\.drafts=\[\]/);
  assert.match(fn, /state\.uploadValidationFailedIndex=null/);
  assert.match(fn, /localStorage\.removeItem\(employeeStorageKey\('empv3:drafts'\)\)/);
  assert.match(fn, /currentSessionId\(\)/);
  assert.doesNotMatch(fn, /apiFetch|fetch\(|delete_session|DB\.|D1/);
});

test("quick summary uses shared totals and only records, cash net, and bank received", () => {
  const fn = block(employee, "function employeeRefreshWorkspaceStatus()", "const employeeCollapsedLegacyValidate");
  assert.match(fn, /calculateEmployeeSessionSummary\(state\.drafts\)/);
  assert.match(fn, /summary\.cashNet/);
  assert.match(fn, /summary\.bankReceived/);
  assert.doesNotMatch(fn, /summary\.outstanding|summary\.bankNet/);
  assert.match(fn, /Records/);
  assert.match(fn, /Cash Net/);
  assert.match(fn, /Bank Received/);
  assert.doesNotMatch(fn, /本票|现金净额|银行收款/);
});

test("compact bed reference has only safe note, expiry, status, and configured rent", () => {
  const fn = block(employee, "function employeeRenderBedInfoStrip", "let employeeBedInfoStripTimer");
  for (const value of ["Access Card Note", "Card Expiry", "Status:", "System Rent:"]) assert.match(fn, new RegExp(value));
  assert.match(fn, /rentForBed\(bed\)/);
  assert.match(fn, /Not configured/);
  assert.doesNotMatch(fn, /Open Arrears|phone|provider|tenant_card_id|fingerprint/);
  assert.match(employee, /if\(type==='AP'\)\{\s*box\.className='open-arrears-core-alert hidden'/s);
});

test("legacy arrears payment has a stable canonical ref and no live TTLock action", () => {
  assert.match(employee, /Legacy Arrears Payment \/ 历史欠款还款/);
  const builder = block(employee, "function buildArrearsPaymentAnchor()", "function buildDepositInAnchor");
  assert.match(builder, /arrears_source:legacy\?'legacy_manual'/);
  assert.match(builder, /legacy-manual-\$\{currentSessionId\(\)\}-\$\{payload\.id\}/);
  assert.doesNotMatch(builder, /legacy-manual:/);
  const saveGate = block(employee, "async function saveEntryWithTtlockGate()", "saveEntry=saveEntryWithTtlockGate");
  assert.match(saveGate, /employeeLegacyArrearsSelected\(\).*saveEntryWithoutTtlockGate/);
  assert.doesNotMatch(saveGate, /loadLock|api\.sciener|oauth/);
  assert.match(worker, /LEGACY_ARREARS_CANONICAL_REF_INVALID/);
  assert.match(worker, /legacy_arrears_remark_required/);
  assert.match(worker, /arrears_source==="legacy_manual"\?"legacy_arrears_payment"/);
});

test("legacy arrears finance is received and repaid once, never rent or opened", () => {
  const fn = block(worker, "function canonicalFinanceProjectionApplyAnchor", "function canonicalFinanceProjectionApplyCorrectionEffectiveTotals");
  const branch = fn.slice(fn.indexOf('type==="arrears_payment"'), fn.indexOf('type==="left_with_arrears"'));
  assert.match(branch, /canonicalFinanceProjectionAddInflow\(totals,method,amount\)/);
  assert.match(branch, /totals\.arrears_repaid\+=amount/);
  assert.doesNotMatch(branch, /rent_income|arrears_opened/);
});

test("Bed Transfer card uses formal fee fields for paid, waived, and unpaid", () => {
  const source = block(employee, "function employeeBedTransferSessionCardModel", "function renderEmployeeBedTransferCanonicalReceipt");
  const context = { result: null, fmtMoney: n => Number(n).toFixed(2), String, Number };
  vm.createContext(context);
  vm.runInContext(`${source}\nresult=employeeBedTransferSessionCardModel;`, context);
  const paid = context.result({ from_bed: "111", to_bed: "112", fee_mode: "paid", fee_amount_aed: 50, payment_method: "cash", transfer_reason: "room_issue" });
  assert.equal(paid.beds, "111 → 112");
  assert.equal(paid.amount, 50);
  assert.match(paid.detail, /Due AED 50\.00/);
  assert.match(paid.detail, /Paid AED 50\.00/);
  assert.match(paid.detail, /Cash/);
  assert.equal(paid.amountLabel, "+50.00");
  assert.match(context.result({ fee_mode: "waived", fee_amount_aed: 0 }).amountLabel, /Waived/);
  assert.match(context.result({ fee_mode: "unpaid", fee_amount_aed: 50 }).amountLabel, /Unpaid AED 50\.00/);
});

test("Expense card exposes description with remark fallback and keeps evidence rule", () => {
  const render = employee.slice(employee.lastIndexOf("renderSessionPreview=function(){"), employee.indexOf("renderSummary=function(){", employee.lastIndexOf("renderSessionPreview=function(){")));
  assert.match(render, /e\.expense_description\|\|e\.expense_desc\|\|e\.remark\|\|e\.note/);
  assert.match(render, /employee-expense-card-description/);
  assert.doesNotMatch(render, /expenseEvidenceRef|evidence_ref|fingerprint|provider/);
  assert.match(employee, /employee-expense-card-description\{[^}]*-webkit-line-clamp:2/);
  assert.match(worker, /EXPENSE_EVIDENCE_REQUIRED/);
});

test("mixed upload validates every unsynced row before formal writes and clears on confirmation", () => {
  const upload = block(employee, "async function commitSessionAndExport()", "function normalizeEmployeeView", true);
  const validateLoop = upload.indexOf("for(let i=0;i<uploadList.length;i++)");
  const formalWrite = upload.indexOf("apiFetch('/api/employee/entry'", validateLoop);
  const failedGate = upload.indexOf("if(dryRunFailed.length)", validateLoop);
  assert.ok(validateLoop >= 0 && failedGate > validateLoop && formalWrite > failedGate);
  assert.match(upload, /allOriginalDrafts\.filter\(entry=>!employeeEntryCloudConfirmed\(entry\)\)/);
  assert.match(upload, /ordinaryCanonicalEntries=canonicalEntries\.filter/);
  assert.match(upload, /ordinarySummary=calculateEmployeeSessionSummary\(ordinaryCanonicalEntries\)/);
  assert.match(upload, /requestEntries=isBedTransfer\?\[e\]:ordinaryCanonicalEntries/);
  assert.match(upload, /employeeBedTransferValidatePayload/);
  assert.match(upload, /employeeBedTransferRecordPayload/);
  assert.match(upload, /employeeBindUploadValidationResult\(err\?\.dryRunResult\|\|\{\},e,i/);
  assert.match(upload, /failedIdentity=employeeEntryStableIdentity\(firstDryRunFailure\.entry\)/);
  assert.match(upload, /employeeEntryStableIdentity\(row\)===failedIdentity/);
  assert.match(upload, /if\(cloudConfirmed\)\{\s*state\.drafts=\[\]/s);
  assert.match(upload, /currentSessionId\(\)/);
  assert.doesNotMatch(upload, /\/api\/employee\/bed-transfers|\/api\/save_session|event-ledger/);
});

test("each Bed Transfer uses one stable dedicated canonical session in a mixed ticket", () => {
  const idBlock = block(employee, "function employeeBedTransferCanonicalSessionId", "function employeeBedTransferValidatePayload");
  const validateBlock = block(employee, "function employeeBedTransferValidatePayload", "function employeeBedTransferRecordPayload");
  assert.match(idBlock, /bed-transfer-\$\{String\(entry\.id/);
  assert.match(idBlock, /replace\(\/\[\^A-Za-z0-9_-\]\/g,'-'\)\.slice\(0,80\)/);
  assert.match(validateBlock, /id:employeeBedTransferCanonicalSessionId\(entry,session\)/);
  assert.match(validateBlock, /entries:\[clean\]/);
});

test("all seven event templates remain wired and stable upload identities prevent duplicate anchors", () => {
  for (const type of ["R", "AP", "D", "DR", "CO", "E", "TF"]) assert.match(employee, new RegExp(`code:'${type}'`));
  const clone = block(employee, "function cloneEntryForUpload", "function prepareRepeatableUploadRows");
  assert.match(clone, /copy\.idempotency_key=isBedTransfer\?`bed-transfer-\$\{sessionId\}-\$\{entryId\}`:`employee-entry-\$\{sessionId\}-\$\{entryId\}`/);
  assert.doesNotMatch(clone, /uid\('ent'\)/);
});

test("capabilities expose internal beta canonical write gates", () => {
  const fn = block(worker, "function bedTransferDeploymentCapabilities", "function bedTransferWriteDisabledResponse");
  assert.match(fn, /internal_beta:String\(env\.APP_ENV/);
  assert.match(fn, /bed_transfer_validate_enabled:true/);
  assert.match(fn, /bed_transfer_write_enabled:bedTransferWriteApproved\(env\)/);
  assert.match(fn, /canonical_write_path:"\/api\/employee\/entry"/);
});
