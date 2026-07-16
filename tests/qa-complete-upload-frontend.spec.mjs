import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

function functionBlock(source, name, last = false) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "g");
  const starts = Array.from(source.matchAll(pattern), match => match.index);
  const start = last ? starts.at(-1) ?? -1 : starts[0] ?? -1;
  assert.notEqual(start, -1, `${name} must exist`);
  const parameterStart = source.indexOf("(", start);
  let parameterDepth = 0, bodyStart = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    if (source[index] === ")" && --parameterDepth === 0) { bodyStart = source.indexOf("{", index); break; }
  }
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} must close`);
}

function assignedFunctionBlock(source, name) {
  const start = source.lastIndexOf(`${name}=function(`);
  assert.notEqual(start, -1, `${name} assignment must exist`);
  const parameterStart = source.indexOf("(", start);
  let parameterDepth = 0, bodyStart = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    if (source[index] === "(") parameterDepth += 1;
    if (source[index] === ")" && --parameterDepth === 0) { bodyStart = source.indexOf("{", index); break; }
  }
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return `${source.slice(start, index + 1)};`;
  }
  assert.fail(`${name} assignment must close`);
}

test("16 persisted QA records render one enabled Complete Upload action", () => {
  const exportButton = { dataset: {}, innerHTML: "", title: "", disabled: true, classList: { add() {}, remove() {}, toggle() {} } };
  const previewButton = { disabled: false, title: "", classList: { toggle() {} } };
  const state = {
    drafts: Array.from({ length: 16 }, (_, index) => ({ id: `E${index + 1}`, type: index === 13 ? "TF" : "R" })),
    qaAcceptance: { runId: "QA-20260716-4FB51FAF", status: "MANUAL_EMPLOYEE_ACCEPTED", loadStatus: "READY", serverRecordCount: 16, alreadyPersistedCount: 16, remainingCount: 0, conflictingEntryCount: 0, duplicateEntryIdCount: 0 },
  };
  const sandbox = {
    state,
    $: id => id === "btnExportSession" ? exportButton : id === "btnPreviewSession" ? previewButton : null,
    employeeQaAcceptanceStatePolicy: () => ({ upload_allowed: true, readonly: false }),
    currentSessionHasUploadBlockingError: () => false,
    employeeBedTransferWriteEnabled: () => false,
    employeeEntryCloudConfirmed: () => false,
    entrySessionUploaded: () => false,
    renderEmployeeButtonLabel: (en, detail) => `${en}|${detail}`,
    BED_TRANSFER_WRITE_DISABLED_MESSAGE: "disabled",
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(employee, "employeeQaAcceptanceFinalizeOnlyReady"),
    assignedFunctionBlock(employee, "updateEntrySessionActionState"),
    "updateEntrySessionActionState()",
  ].join("\n"), sandbox);
  assert.equal(exportButton.disabled, false);
  assert.match(exportButton.innerHTML, /^Complete Upload\|All 16 records are saved\. Complete the upload\.$/);
  assert.equal(exportButton.title, "All 16 records are saved. Complete the upload.");
});

test("fully persisted accepted QA Run displays the finalization-pending handoff", () => {
  const banner = functionBlock(employee, "employeeQaAcceptanceBanner");
  assert.match(banner, /saved · finalization pending/);
  assert.match(banner, /alreadyPersistedCount/);
  assert.match(banner, /remainingCount/);
  assert.match(banner, /conflictingEntryCount/);
  assert.match(banner, /duplicateEntryIdCount/);
});

test("Complete Upload sends only the persisted-run finalization intent", async () => {
  const requests = [];
  const state = { qaAcceptance: { runId: "QA-20260716-4FB51FAF", artifactSha: "a".repeat(64), payloadHash: "b".repeat(64), validationAttemptId: "qa-val-accepted", status: "MANUAL_EMPLOYEE_ACCEPTED" } };
  const sandbox = {
    state,
    employeeEntryStableIdentity: entry => entry.id,
    unwrapStandardResponse: body => body?.data || body,
    apiFetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: { status: "UPLOAD_PASS", already_persisted_count: 16, remaining_count: 0, conflicting_entry_count: 0, duplicate_entry_id_count: 0, formal_write_count: 16, new_write_count: 0, write_attempted: false } }) };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${functionBlock(employee, "employeeQaAcceptanceSessionResume")};this.resume=employeeQaAcceptanceSessionResume`, sandbox);
  const entries = Array.from({ length: 16 }, (_, index) => ({ id: `E${index + 1}` }));
  await sandbox.resume({}, entries, { finalizationOnly: true });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/qa/acceptance/runs/QA-20260716-4FB51FAF/session-resume");
  assert.equal(requests[0].body.resume_intent, "EMPLOYEE_FINALIZE_PERSISTED_RUN");
  assert.equal(Object.hasOwn(requests[0].body, "entries"), false);
  assert.equal(Object.hasOwn(requests[0].body, "validation_requests"), false);
  assert.equal(state.qaAcceptance.status, "UPLOAD_PASS");
});

test("Complete Upload bypasses aggregate validation while missing-record Resume keeps it", () => {
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  const finalizeCall = upload.indexOf("employeeQaAcceptanceSessionResume({},uploadList,{finalizationOnly:true})");
  const aggregateCall = upload.indexOf("validateEmployeeUploadAggregateDryRun(validationRequests)");
  const resumeCall = upload.indexOf("employeeQaAcceptanceSessionResume(aggregatePreflight,uploadList)");
  assert.ok(finalizeCall >= 0 && aggregateCall > finalizeCall);
  assert.ok(resumeCall > aggregateCall);
  assert.match(upload, /employeeQaAcceptanceFinalizeOnlyReady\(uploadList\.length\)/);
});
