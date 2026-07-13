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
  assert.equal(apiWrites, 0);
  assert.doesNotMatch(source, /apiFetch\(|validateEmployeeUploadDryRun|recordCanonicalBedTransfer/);
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
  for (const forbidden of ["/api/employee/bed-transfers", "/api/save_session", "event-ledger"])
    assert.equal(upload.includes(forbidden), false);
});

test("failed upload restores original Current Session and repeat clicks are busy-guarded", () => {
  const upload = html.slice(html.lastIndexOf("async function commitSessionAndExport"));
  assert.match(upload, /if\(btns\.some\(b=>b\.dataset\.busy==='1'\)\)return/);
  assert.ok((upload.match(/state\.drafts=originalDrafts/g) || []).length >= 2);
  assert.match(upload, /state\.sessionId=originalSessionId/);
  assert.match(upload, /upload_validation_error=firstUploadFailure\.result/);
});

test("independent Validate and Record buttons are absent", () => {
  assert.doesNotMatch(html, /id="btnValidateBedTransfer"|id="btnRecordBedTransfer"/);
  assert.match(html, /Save Transfer/);
  assert.match(html, /Upload Session/);
});
