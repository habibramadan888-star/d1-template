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

test("mixed Deposit In and Bed Transfer validation binds the failure to stable Entry ID", () => {
  const source = block(employee, "function employeeEntryStableIdentity", "function employeeInvalidateBedTransferValidation");
  const context = {
    result: null,
    normalizeEmployeeUploadDryRunError: value => ({ ...value }),
    entryEventType: type => ({ D: "deposit_in", TF: "bed_transfer" })[type] || "entry",
    String,
    Number
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nresult={identity:employeeEntryStableIdentity,bind:employeeBindUploadValidationResult};`, context);

  const deposit = { id: "entry-deposit-1", type: "D", event_type: "deposit_in" };
  const transfer = { id: "entry-transfer-2", type: "TF", event_type: "bed_transfer" };
  const serverFailure = { event_index: 0, event_type: "bed_transfer", error_code: "BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS" };
  const bound = context.result.bind(serverFailure, transfer, 1);

  assert.equal(context.result.identity(deposit), "entry-deposit-1");
  assert.equal(bound.entry_identity, "entry-transfer-2");
  assert.equal(bound.event_index, 1);
  assert.equal(bound.event_type, "bed_transfer");
  assert.notEqual(bound.entry_identity, deposit.id);
});

test("Deposit In dispatch and finance remain independent from Bed Transfer", () => {
  const dispatch = block(worker, "function validateEmployeeEntryUploadEventFields", "__name(validateEmployeeEntryUploadEventFields");
  assert.match(dispatch, /D:validateDepositInUploadFields/);
  assert.match(dispatch, /TF:validateBedTransferUploadFields/);

  const depositValidator = block(worker, "function validateDepositInUploadFields", "__name(validateDepositInUploadFields");
  assert.match(depositValidator, /event_type:"deposit_in"/);
  assert.doesNotMatch(depositValidator, /BED_TRANSFER_|validateBedTransfer|source.context/i);

  const finance = block(worker, "function canonicalFinanceProjectionApplyAnchor", "function canonicalFinanceProjectionApplyCorrectionEffectiveTotals");
  const depositBranch = finance.slice(finance.indexOf('type==="deposit_in"'), finance.indexOf('type==="deposit_out"'));
  assert.match(depositBranch, /deposit_received/);
  assert.match(depositBranch, /canonicalFinanceProjectionAddInflow/);
  assert.doesNotMatch(depositBranch, /rent_income|arrears_repaid|bed_transfer_fee/);
});

test("mixed preflight stops all formal writes and removing failed transfer retains Deposit In", () => {
  const upload = block(employee, "async function commitSessionAndExport()", "function normalizeEmployeeView");
  const validateLoop = upload.indexOf("for(let i=0;i<uploadList.length;i++)");
  const failureGate = upload.indexOf("if(dryRunFailed.length)", validateLoop);
  const formalWrite = upload.indexOf("apiFetch('/api/employee/entry'", failureGate);
  assert.ok(validateLoop >= 0 && failureGate > validateLoop && formalWrite > failureGate);
  assert.match(upload, /failedIdentity=employeeEntryStableIdentity\(firstDryRunFailure\.entry\)/);
  assert.match(upload, /state\.uploadValidationFailedEntryId=failedIdentity/);
  assert.match(upload, /e\.upload_status='VALIDATION_PASSED'/);
  assert.match(upload, /uploadList\.filter\(row=>row\.upload_status==='VALIDATION_PASSED'\)/);

  const recordState = block(employee, "function employeeSessionRecordState", "function renderSessionRecordValidationDetails");
  assert.match(recordState, /VALIDATION_PASSED/);
  assert.match(recordState, /label:'Validation Passed'/);

  const remove = block(employee, "function removeCurrentSessionRecord", "renderSessionPreview=function(){");
  assert.match(remove, /state\.drafts=state\.drafts\.filter\(e=>e\.id!==id\)/);
  assert.match(remove, /state\.uploadValidationFailedEntryId=''/);
  assert.doesNotMatch(remove, /apiFetch|fetch\(|\/api\//);

  const clone = block(employee, "function cloneEntryForUpload", "function prepareRepeatableUploadRows");
  assert.match(clone, /employee-entry-\$\{sessionId\}-\$\{entryId\}/);
  assert.doesNotMatch(clone, /uid\('entry'\)|uid\('ent'\)/);
});

test("all seven entry forms keep editable empty controls free of placeholder text", () => {
  const form = employee.slice(employee.indexOf('id="genericBedFieldWrap"'), employee.indexOf('id="employeeSessionRecordsCard"'));
  const editableControls = [...form.matchAll(/<(input|textarea)\b([^>]*)>/gi)]
    .map(match => match[0])
    .filter(tag => !/\breadonly\b/i.test(tag) && !/\bdisabled\b/i.test(tag));
  assert.ok(editableControls.length > 10);
  for (const tag of editableControls) assert.doesNotMatch(tag, /\bplaceholder\s*=/i);

  const blankOptions = [...form.matchAll(/<option\s+value="">([\s\S]*?)<\/option>/gi)].map(match => match[1].trim());
  assert.ok(blankOptions.length >= 5);
  assert.deepEqual(blankOptions, blankOptions.map(() => ""));

  for (const type of ["R", "AP", "D", "DR", "CO", "E", "TF"]) assert.match(employee, new RegExp(`code:'${type}'`));
});

test("empty amount is calculated as zero, reset clears inputs, and labels remain associated", () => {
  const numSource = employee.match(/const num=v=>[^;]+;/)?.[0] || "";
  const numContext = { result: null, Number, String };
  vm.createContext(numContext);
  vm.runInContext(`${numSource}\nresult=num('');`, numContext);
  assert.equal(numContext.result, 0);

  const reset = block(employee, "function resetForm()", "function hasLocalOnly");
  assert.match(reset, /\.value=''/);
  assert.match(reset, /'amount'/);
  assert.match(reset, /forEach\(id=>\{if\(\$\(id\)\)\$\(id\)\.value=''\}\)/);

  const labels = block(employee, "function employeeAssociateEntryFieldLabels", "const employeeCollapsedLegacyValidate");
  assert.match(labels, /label\.htmlFor=control\.id/);
  assert.match(labels, /input,:scope > select,:scope > textarea/);
});

test("sticky summary is English-only, centered, responsive, and uses the shared calculator", () => {
  const fn = block(employee, "function employeeRefreshWorkspaceStatus()", "function employeeAssociateEntryFieldLabels");
  assert.match(fn, /calculateEmployeeSessionSummary\(state\.drafts\)/);
  assert.match(fn, /Records/);
  assert.match(fn, /Cash Net/);
  assert.match(fn, /Bank Received/);
  assert.doesNotMatch(fn, /本票|现金净额|银行收款|Outstanding|Total Received/);

  assert.match(employee, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(employee, /employee-session-status-item\{[^}]*align-items:center[^}]*text-align:center/s);
  assert.match(employee, /employee-session-status-label\{[^}]*font-size:clamp\(/s);
  assert.match(employee, /employee-session-status-item strong\{[^}]*white-space:nowrap[^}]*font-variant-numeric:tabular-nums/s);
  assert.equal((employee.match(/id="employeeSessionStatusBar"/g) || []).length, 1);
});

test("summary fixture renders Records 10, Cash Net AED 770.00, Bank Received AED 700.00", () => {
  const fn = block(employee, "function employeeRefreshWorkspaceStatus()", "function employeeAssociateEntryFieldLabels");
  const nodes = {
    employeeSessionStatusBar: { innerHTML: "", setAttribute(name, value) { this[name] = value; } },
    workspaceSessionCount: { textContent: "" }
  };
  const context = {
    state: { drafts: Array.from({ length: 10 }) },
    calculateEmployeeSessionSummary: () => ({ rows: Array.from({ length: 10 }), cashNet: 770, bankReceived: 700 }),
    fmtDisplayMoney: value => Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    $: id => nodes[id],
    Number
  };
  vm.createContext(context);
  vm.runInContext(`${fn}\nemployeeRefreshWorkspaceStatus();`, context);
  assert.match(nodes.employeeSessionStatusBar.innerHTML, />Records</);
  assert.match(nodes.employeeSessionStatusBar.innerHTML, />10</);
  assert.match(nodes.employeeSessionStatusBar.innerHTML, /Cash Net<\/span><strong>AED 770\.00/);
  assert.match(nodes.employeeSessionStatusBar.innerHTML, /Bank Received<\/span><strong>AED 700\.00/);
  assert.equal(nodes.workspaceSessionCount.textContent, "Current Session (10)");
});

test("summary keeps stable formatting for 0, 1, 20 records and large AED values", () => {
  const fn = block(employee, "function employeeRefreshWorkspaceStatus()", "function employeeAssociateEntryFieldLabels");
  for (const fixture of [
    { count: 0, cashNet: 0, bankReceived: 0, cash: "AED 0.00", bank: "AED 0.00" },
    { count: 1, cashNet: 1234, bankReceived: 5678, cash: "AED 1,234.00", bank: "AED 5,678.00" },
    { count: 20, cashNet: 12345.67, bankReceived: 98765.43, cash: "AED 12,345.67", bank: "AED 98,765.43" }
  ]) {
    const nodes = {
      employeeSessionStatusBar: { innerHTML: "", setAttribute(name, value) { this[name] = value; } },
      workspaceSessionCount: { textContent: "" }
    };
    const context = {
      state: { drafts: Array.from({ length: fixture.count }) },
      calculateEmployeeSessionSummary: () => ({ rows: Array.from({ length: fixture.count }), cashNet: fixture.cashNet, bankReceived: fixture.bankReceived }),
      fmtDisplayMoney: value => Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      $: id => nodes[id],
      Number
    };
    vm.createContext(context);
    vm.runInContext(`${fn}\nemployeeRefreshWorkspaceStatus();`, context);
    assert.match(nodes.employeeSessionStatusBar.innerHTML, new RegExp(`>Records<\\/span><strong>${fixture.count}<`));
    assert.ok(nodes.employeeSessionStatusBar.innerHTML.includes(fixture.cash));
    assert.ok(nodes.employeeSessionStatusBar.innerHTML.includes(fixture.bank));
  }
});
