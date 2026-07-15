import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
const worker = await readFile("deploy-worker/src/index.js", "utf8");

function block(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.ok(start >= 0, `${startText} not found`);
  const end = source.indexOf(endText, start);
  assert.ok(end > start, `${endText} not found after ${startText}`);
  return source.slice(start, end);
}

test("payment method keeps only accessible Cash and Bank controls for every payment event", () => {
  const paymentStart = employee.indexOf('<div class="step payment-compact" id="paymentStep"');
  const paymentEnd = employee.indexOf('<div class="step">', paymentStart + 1);
  assert.ok(paymentStart >= 0 && paymentEnd > paymentStart);
  const payment = employee.slice(paymentStart, paymentEnd);
  assert.doesNotMatch(payment, /step-title/);
  assert.match(payment, /role="group" aria-label="Payment Method \/ 付款方式"/);
  assert.match(payment, /class="employee-sr-only"/);
  assert.equal((payment.match(/class="pay-option/g) || []).length, 2);
  assert.match(payment, />Cash</);
  assert.match(payment, />Bank</);

  const templates = block(employee, "const entryTemplates=", "const employeeEntryTemplates=");
  for (const key of ["rent", "arrears_payment", "deposit_in", "deposit_out", "expense", "bed_transfer"]) {
    const start = templates.indexOf(`${key}:{`);
    assert.ok(start >= 0, `${key} template missing`);
    const next = templates.indexOf("validator:", start);
    assert.match(templates.slice(start, next), /paymentStep/);
  }
  const checkout = templates.slice(templates.indexOf("checkout:{"), templates.indexOf("expense:{"));
  assert.match(checkout, /fields:\['selectedEventWrap','genericBedFieldWrap','leftWithArrearsMode','checkoutDate','leftWithArrearsFields','remark'\]/);
  assert.match(employee, /transferFeePaymentMethodWrap"><select[^>]+aria-label="Transfer fee payment method"/);
  assert.match(employee, /const sharedPaymentMethod=employeePaymentMethodValue\(\)==='B'\?'bank':'cash'/);
});

test("New Session exists once in Current Session actions and rotates browser-only identity", () => {
  assert.equal((employee.match(/id="btnNewSessionTop"/g) || []).length, 1);
  assert.doesNotMatch(employee, /btnNewSessionQuick/);
  const card = block(employee, '<div class="card employee-session-card" id="employeeSessionRecordsCard">', '</section>');
  assert.match(card, /employee-session-actions-primary/);
  assert.match(card, /id="btnPreviewSession"/);
  assert.match(card, /id="btnExportSession"/);
  assert.match(card, /id="btnNewSessionTop"/);

  const fn = block(employee, "function newSessionFinal()", "newSession=newSessionFinal");
  const removed = [];
  const context = {
    state: { drafts: [{ id: "old" }], sessionId: "S-old", uploadValidationFailedIndex: 1, uploadValidationFailedEntryId: "old", uploadValidationFailedMessage: "bad" },
    confirm: () => true,
    localStorage: { removeItem: key => removed.push(key) },
    employeeStorageKey: key => key,
    currentSessionId() { context.state.sessionId = "S-new"; return context.state.sessionId; },
    saveDrafts() {}, resetForm() {}, buildExport() {}, refreshSessionViews() {}, toast() {}
  };
  vm.createContext(context);
  vm.runInContext(`${fn}\nnewSessionFinal();`, context);
  assert.equal(context.state.drafts.length, 0);
  assert.equal(context.state.sessionId, "S-new");
  assert.deepEqual(removed.sort(), ["empv3:drafts", "empv3:sessionId"]);
  assert.doesNotMatch(fn, /apiFetch|fetch\(|delete_session|DB\.|D1/);
});

test("formal closed arrears remain stale while stable legacy-manual refs bypass only the client open-ref guard", () => {
  const state = block(employee, "function employeeEntryArrearsRef", "function renderSessionRecordValidationDetails");
  assert.match(state, /function employeeLegacyArrearsReferenceIsStable/);
  assert.match(state, /legacy-manual-\$\{sessionId\}-\$\{entryId\}/);
  assert.match(state, /!employeeLegacyArrearsReferenceIsStable\(entry\)&&!openRefs\.has\(ref\)/);
  assert.match(state, /ARREARS_REF_STALE_REFRESH_REQUIRED/);
  assert.match(state, /client_stale_arrears_ref_check/);

  const validation = block(worker, '}else if(type==="AP"){', 'if(["R","TF","TFF"].includes(type))');
  assert.match(validation, /const legacyManual=cleanText\(entry\.arrears_source,40\)==="legacy_manual"/);
  assert.match(validation, /LEGACY_ARREARS_CANONICAL_REF_INVALID/);
  assert.match(validation, /empFindProjectionArrearsForPayment/);
  assert.match(validation, /ARREARS_REF_STALE_REFRESH_REQUIRED/);
});

test("validation errors are rebound to stable Entry identity without inner event-index drift", () => {
  const bind = block(employee, "function employeeEntryStableIdentity", "function employeeInvalidateBedTransferValidation");
  assert.match(bind, /entry_identity:employeeEntryStableIdentity\(entry\)/);
  assert.match(bind, /boundTrace=.*event_index:outerIndex/s);
  assert.match(bind, /raw_validation_response:raw/);
  assert.doesNotMatch(bind, /event_index:Number\(normalized\.event_index/);
});

test("whole-ticket upload validates all rows before the first write and preserves retry identities", () => {
  const upload = block(employee, "async function commitSessionAndExport()", "function normalizeEmployeeView");
  const validateLoop = upload.indexOf("for(let i=0;i<uploadList.length;i++)");
  const failureGate = upload.indexOf("if(dryRunFailed.length)", validateLoop);
  const firstWrite = upload.indexOf("apiFetch('/api/employee/entry'", failureGate);
  assert.ok(validateLoop >= 0 && failureGate > validateLoop && firstWrite > failureGate);
  assert.match(upload, /prepareRepeatableUploadRows\(originalDrafts,uploadSessionId\)/);
  assert.match(upload, /state\.drafts=allOriginalDrafts/);
  assert.match(upload, /if\(cloudConfirmed\)\{\s*state\.drafts=\[\]/s);
  assert.match(upload, /currentSessionId\(\)/);
});

test("Bed Transfer keeps paid AED 50 Cash in the Current Session canonical payload", () => {
  const builder = block(employee, "function buildBedTransferAnchor", "function uploadValidationByEventType");
  assert.match(builder, /const amount=feeMode==='waived'\?0:50/);
  assert.match(builder, /fee_amount_aed:amount/);
  assert.match(builder, /amount:feeMode==='paid'\?amount:0,due:feeMode==='waived'\?0:amount,paid:feeMode==='paid'\?amount:0/);
  assert.match(builder, /payment_method:paymentMethod/);
  const card = block(employee, "function employeeBedTransferSessionCardModel", "function renderEmployeeBedTransferCanonicalReceipt");
  assert.match(card, /Due AED \$\{fmtMoney\(due\)\}/);
  assert.match(card, /Paid AED \$\{fmtMoney\(paid\)\}/);
});

test("legacy Arrears Payment finance is one received/repaid flow and not Rent or arrears opened", () => {
  const finance = block(worker, "function canonicalFinanceProjectionApplyAnchor", "function canonicalFinanceProjectionApplyCorrectionEffectiveTotals");
  const branch = finance.slice(finance.indexOf('type==="arrears_payment"'), finance.indexOf('type==="left_with_arrears"'));
  assert.match(branch, /canonicalFinanceProjectionAddInflow\(totals,method,amount\)/);
  assert.match(branch, /totals\.arrears_repaid\+=amount/);
  assert.doesNotMatch(branch, /rent_income|arrears_opened/);
  const duplicate = block(worker, "const existingTx=await env.DB.prepare", "if(!room||!Number.isFinite(amount)");
  assert.match(duplicate, /if\(existingTx\)/);
  assert.match(duplicate, /duplicate:true/);
});
