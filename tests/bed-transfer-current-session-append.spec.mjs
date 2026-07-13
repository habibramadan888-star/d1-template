import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

function block(name, asyncFunction = false) {
  const marker = `${asyncFunction ? "async " : ""}function ${name}`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const rest = html.slice(start + marker.length);
  const next = rest.match(/\n(?:async\s+)?function\s+/);
  return html.slice(start, next ? start + marker.length + next.index : html.length);
}

test("Save Transfer appends exactly one local draft and performs zero API writes", async () => {
  const source = block("saveCanonicalBedTransferDraft", true);
  let apiWrites = 0;
  const state = { drafts: [], uploadValidationFailedIndex: 9, uploadValidationFailedMessage: "old" };
  const button = { dataset: {}, disabled: false, innerHTML: "" };
  const context = {
    state,
    employeeBedTransferValidateEnabled: () => true,
    employeeBedTransferUiGateState: () => ({ error_code: "" }),
    validateBedTransferEntry: () => ({ errors: [] }),
    buildBedTransferAnchor: () => ({ id: "local-transfer", type: "TF", event_type: "bed_transfer" }),
    currentSessionId: () => "stable-session",
    saveDrafts: () => true,
    refreshSessionViews: () => {}, buildExport: () => {}, resetForm: () => {},
    applyEmployeeBedTransferUiGate: () => {}, renderEmployeeButtonLabel: () => "Save Transfer / 保存换床",
    toast: () => {}, showStatus: () => {},
    apiFetch: () => { apiWrites += 1; },
    $: id => id === "btnSaveEntry" ? button : { innerHTML: "" }
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.saveTransfer=saveCanonicalBedTransferDraft`, context);
  assert.equal(await context.saveTransfer(), true);
  assert.equal(state.drafts.length, 1);
  assert.equal(state.drafts[0].session_id, "stable-session");
  assert.equal(state.drafts[0].sync_status, "DRAFT");
  assert.equal(state.lastSavedBedTransferDraftId, "local-transfer");
  assert.equal(apiWrites, 0);
  assert.doesNotMatch(source, /apiFetch\(|validateEmployeeUploadDryRun|recordCanonicalBedTransfer/);
});

test("Bed Transfer keeps the shared Save and Reset action row visible while gate controls disabled state", () => {
  assert.match(html, /visible\(\['btnSaveEntry'\],true\)/);
  assert.doesNotMatch(html, /visible\(\['btnSaveEntry'\],type!=='TF'\)/);
  const source = block("applyEmployeeBedTransferUiGate");
  const actionRow = { hidden: false };
  const parking = { hidden: true, contains: () => false };
  const save = {
    hidden: false, disabled: true, readOnly: false, title: "",
    parentElement: actionRow,
    setAttribute(name, value) { this[name] = value; }
  };
  const entryType = { value: "TF" };
  const context = {
    state: { bedTransferContext: { status: "ready" } },
    employeeBedTransferUiGateState: () => ({ fields_enabled: true, validate_enabled: true, final_upload_enabled: true, error_code: "" }),
    document: { querySelectorAll: () => [], querySelector: () => ({ disabled: false, title: "" }) },
    $: id => ({ btnSaveEntry: save, entryType, bedTransferWriteDisabledNotice: { textContent: "" }, employeeTemplateFieldParking: parking }[id] || null)
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.applyGate=applyEmployeeBedTransferUiGate`, context);
  context.applyGate();
  assert.equal(save.hidden, false);
  assert.equal(save.disabled, false);
  assert.equal(save.readOnly, false);
  assert.equal(parking.contains(save), false);
});

test("Bed Context loading is scheduled from actual From and To Bed input without duplicate ready reads", () => {
  const source = block("employeeScheduleBedTransferContexts");
  assert.match(html, /transferFromBed'\)\.addEventListener\('input',[\s\S]{0,400}employeeScheduleBedTransferContexts/);
  assert.match(html, /bedTo'\)\.addEventListener\('input',[\s\S]{0,160}employeeScheduleBedTransferContexts/);
  const timers = [];
  const state = { bedTransferContext: { status: "idle", requestKey: "" } };
  const fields = { entryType: { value: "TF" }, transferFromBed: { value: "411" }, bedTo: { value: "414" } };
  let loads = 0;
  const context = {
    state, clearTimeout: () => {}, setTimeout: fn => { timers.push(fn); return timers.length; },
    employeeBedTransferContextTimer: null,
    $: id => fields[id], employeeBedTransferBed: value => String(value || "").trim(),
    employeeFieldValue: id => fields[id].value,
    employeeLoadBedTransferContexts: () => { loads += 1; return Promise.resolve(); }
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.scheduleContexts=employeeScheduleBedTransferContexts`, context);
  context.scheduleContexts();
  assert.equal(timers.length, 1);
  timers.shift()();
  assert.equal(loads, 1);
  state.bedTransferContext = { status: "ready", requestKey: "411->414" };
  context.scheduleContexts();
  assert.equal(timers.length, 0);
});

test("Reset removes only the just-saved local Bed Transfer draft", () => {
  const source = block("resetEmployeeEntryForm");
  const state = {
    lastSavedBedTransferDraftId: "local-transfer",
    drafts: [
      { id: "local-transfer", type: "TF", sync_status: "DRAFT" },
      { id: "rent-entry", type: "R", sync_status: "DRAFT" }
    ]
  };
  let persisted = 0;
  const context = {
    state,
    saveDrafts: () => { persisted += 1; },
    refreshSessionViews: () => {}, buildExport: () => {}, resetForm: () => {}, showStatus: () => {}, toast: () => {}
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.resetEntry=resetEmployeeEntryForm`, context);
  context.resetEntry();
  assert.deepEqual(state.drafts.map(entry => entry.id), ["rent-entry"]);
  assert.equal(state.lastSavedBedTransferDraftId, null);
  assert.equal(persisted, 1);
});

test("Reset of the final local Bed Transfer rotates only the next ticket session identity", () => {
  const source = block("resetEmployeeEntryForm");
  const state = {
    sessionId: "conflicted-session",
    lastSavedBedTransferDraftId: "local-transfer",
    drafts: [{ id: "local-transfer", type: "TF", sync_status: "DRAFT" }]
  };
  const removed = [];
  const context = {
    state,
    employeeStorageKey: key => `${key}:abdul`,
    localStorage: { removeItem: key => removed.push(key) },
    saveDrafts: () => true,
    refreshSessionViews: () => {}, buildExport: () => {}, resetForm: () => {}, showStatus: () => {}, toast: () => {}
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.resetEntry=resetEmployeeEntryForm`, context);
  context.resetEntry();
  assert.equal(state.drafts.length, 0);
  assert.equal(state.sessionId, "");
  assert.deepEqual(removed, ["empv3:sessionId:abdul"]);
});

test("Bed Transfer upload preserves its local Entry ID across validate and write retries", () => {
  const source = block("cloneEntryForUpload");
  const context = {
    String,
    uid: () => "unexpected-new-id",
    normalizeEntryAnchor: value => value
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.cloneForUpload=cloneEntryForUpload`, context);
  const local = { id: "E20260713-aichb", type: "TF", event_type: "bed_transfer", from_bed: "144", to_bed: "111" };
  const first = context.cloneForUpload(local, "S-new-ticket", "upload-one", 0);
  const retry = context.cloneForUpload(local, "S-new-ticket", "upload-two", 0);
  assert.equal(first.id, "E20260713-aichb");
  assert.equal(retry.id, "E20260713-aichb");
  assert.equal(first.idempotency_key, retry.idempotency_key);
  assert.equal(first.idempotency_key, "bed-transfer-S-new-ticket-E20260713-aichb");
});

test("Current Session card derives beds, due, paid, cash, difference and reason from transfer fields", () => {
  const source = block("employeeBedTransferSessionCardModel");
  const context = { Number, String, fmtMoney: value => Number(value || 0).toFixed(2) };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.card=employeeBedTransferSessionCardModel`, context);
  const card = context.card({
    from_bed: "144", to_bed: "111", fee_mode: "paid", fee_amount_aed: 50,
    payment_method: "cash", bed_price_difference_amount_aed: 25,
    transfer_reason: "customer_request"
  });
  assert.equal(card.beds, "144 → 111");
  assert.match(card.detail, /Due AED 50\.00 \/ 应收50\.00/);
  assert.match(card.detail, /Paid AED 50\.00 \/ 已收50\.00/);
  assert.match(card.detail, /Cash \/ 现金/);
  assert.match(card.detail, /Bed Transfer \/ 换床/);
  assert.match(card.detail, /Bed Difference AED 25\.00/);
  assert.match(card.detail, /customer_request/);
  assert.doesNotMatch(`${card.beds} ${card.detail}`, /#\s*→\s*#|Canonical accepted/);
});

test("Upload Session includes TF, validates it, writes only canonical entry, and clears it after cloud confirmation", () => {
  const upload = html.slice(html.lastIndexOf("async function commitSessionAndExport"));
  assert.doesNotMatch(upload, /sessionOnlyDrafts/);
  assert.match(upload, /employeeBedTransferValidatePayload\(e,sessionForEntry\)/);
  assert.match(upload, /validateEmployeeUploadDryRun\(requestPayload\?\.entry\|\|e/);
  assert.match(upload, /bedTransferUploadPayloads\[i\]=employeeBedTransferRecordPayload\(requestPayload\)/);
  assert.match(upload, /apiFetch\('\/api\/employee\/entry'/);
  assert.match(upload, /if\(cloudConfirmed&&includesBedTransfer\)/);
  assert.match(upload, /state\.drafts=state\.drafts\.filter/);
  assert.match(upload, /state\.lastSavedBedTransferDraftId=null/);
  assert.match(upload, /localStorage\.removeItem\(employeeStorageKey\('empv3:sessionId'\)\)/);
  for (const forbidden of ["/api/employee/bed-transfers", "/api/save_session", "event-ledger"])
    assert.equal(upload.includes(forbidden), false);
});

test("Bed Transfer validate-only and write reuse the same sanitized business payload", () => {
  const validate = block("employeeBedTransferValidatePayload");
  const record = block("employeeBedTransferRecordPayload");
  const context = { Object, String, state: { bedTransferCapabilities: null } };
  vm.createContext(context);
  vm.runInContext(`${validate};${record};globalThis.validatePayload=employeeBedTransferValidatePayload;globalThis.recordPayload=employeeBedTransferRecordPayload`, context);
  const validation = context.validatePayload({ event_type: "bed_transfer", type: "TF", source: "employee_entry", from_bed: "144", to_bed: "111", transfer_reason: "customer_request", fee_mode: "paid", fee_amount_aed: 50, payment_method: "cash", dry_run: true, no_write: true }, { id: "S-new-ticket" });
  const recordPayload = context.recordPayload(validation);
  assert.deepEqual(recordPayload.entry, validation.entry);
  assert.equal("dry_run" in recordPayload.entry, false);
  assert.equal("validate_only" in recordPayload.entry, false);
  assert.equal("no_write" in recordPayload.entry, false);
  assert.equal(recordPayload.session.id, validation.session.id);
});

test("failed upload restores original Current Session and repeat clicks are busy-guarded", () => {
  const upload = html.slice(html.lastIndexOf("async function commitSessionAndExport"));
  assert.match(upload, /if\(btns\.some\(b=>b\.dataset\.busy==='1'\)\)return/);
  assert.ok((upload.match(/state\.drafts=originalDrafts/g) || []).length >= 2);
  assert.match(upload, /state\.sessionId=originalSessionId/);
  assert.match(upload, /upload_validation_error=firstUploadFailure\.result/);
});

test("failed record actions are above collapsed diagnostics and remove clears only local session state", () => {
  const finalRender = html.slice(html.lastIndexOf("renderSessionPreview=function"));
  assert.match(finalRender, /const failedActions=failed\?`<div class="preview-tools">\$\{remove\}<button[^`]+data-retry-session-record/);
  assert.ok(finalRender.indexOf("${failedActions}") < finalRender.indexOf("${failNote}"));
  assert.match(html, /<details class="uv-list"><summary><span class="uv-label">Raw Validation Debug/);
  assert.doesNotMatch(html, /<details class="uv-list" open><summary><span class="uv-label">Raw Validation Debug/);
  const source = block("removeCurrentSessionRecord");
  const state = { drafts: [{ id: "failed-transfer", upload_validation_error: { error_code: "SERVER_PROCESSING_TIMEOUT" } }], sessionId: "S-failed", uploadValidationFailedIndex: 0, uploadValidationFailedMessage: "failed" };
  const removed = [];
  let apiCalls = 0;
  const context = {
    state, confirm: () => true, employeeSessionRecordState: () => ({ key: "VALIDATION_FAILED" }), employeeStorageKey: key => `${key}:employee`,
    localStorage: { removeItem: key => removed.push(key) }, refreshSessionViews: () => {}, buildExport: () => {}, toast: () => {}, saveDrafts: () => { apiCalls += 1; }
  };
  vm.createContext(context);
  vm.runInContext(`${source};globalThis.removeRecord=removeCurrentSessionRecord`, context);
  context.removeRecord("failed-transfer");
  assert.deepEqual(state.drafts, []);
  assert.equal(state.sessionId, "");
  assert.deepEqual(removed, ["empv3:drafts:employee", "empv3:sessionId:employee"]);
  assert.equal(apiCalls, 0);
});

test("non-JSON 503 is summarized without rendering Cloudflare HTML", () => {
  const validate = block("validateEmployeeUploadDryRun", true);
  assert.match(validate, /SERVER_PROCESSING_TIMEOUT/);
  assert.match(validate, /服务器处理超时，请重试。/);
  assert.match(validate, /raw_body:r\.status===503\?'':String\(raw\|\|''\)\.slice\(0,400\)/);
  assert.doesNotMatch(validate, /slice\(0,4000\)/);
});

test("independent Validate and Record buttons are absent", () => {
  assert.doesNotMatch(html, /id="btnValidateBedTransfer"|id="btnRecordBedTransfer"/);
  assert.match(html, /Save Transfer/);
  assert.match(html, /Upload Session/);
});
