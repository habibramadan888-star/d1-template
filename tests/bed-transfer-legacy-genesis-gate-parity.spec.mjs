import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolveBedTransferSourceContext, resolveOwnerConfirmedLegacyGenesis } from "../modules/employees/bed-transfer-source-context-resolver.mjs";

const worker = await readFile(new URL("../deploy-worker/src/index.js", import.meta.url), "utf8");
const employee = await readFile(new URL("../deploy-worker/public/employee-v3.html", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../deploy-worker/wrangler.toml", import.meta.url), "utf8");

function fn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} missing`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} marker missing`);
  return source.slice(start, end);
}

function asyncFn(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start >= 0, `${name} missing`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} marker missing`);
  return source.slice(start, end);
}

function gate(env, user) {
  const source = [
    fn(worker, "bedTransferWriteApproved"),
    fn(worker, "ownerTodayTodoAcknowledgmentWriteEnabled"),
    fn(worker, "ownerBedTransferVoidWriteEnabled"),
    fn(worker, "bedTransferDeploymentCapabilities"),
    fn(worker, "employeeBedTransferLegacyGenesisGate"),
    "result=employeeBedTransferLegacyGenesisGate(env,user);"
  ].join("\n");
  const sandbox = { env, user, result: null, cleanText: (value, max) => String(value ?? "").trim().slice(0, max) };
  vm.runInNewContext(source, sandbox);
  return structuredClone(sandbox.result);
}

const safeLegacy = (extra = {}) => ({
  base_resolution: { resolution_status: "ambiguous", error_code: "BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS", candidate_group_count: 0, ambiguity_reasons: ["no_legacy_mmdd_match"] },
  corpid: "homelink",
  from_bed: "111",
  to_bed: "112",
  app_env: "internal_beta",
  write_approved: true,
  legacy_genesis_mode: "server_verified",
  source_context: { corpid: "homelink", physical_bed_status: "not_marked_vacant", parsed_vacancy_marker: false, candidate_count: 1, ambiguous: false, conflict: false, stale: false, parsed_deposit_amount: 100, parsed_checkin_mmdd: "0713", normalized_expiry_value: "2026-08-13T08:00:00.000Z", snapshot_fingerprint: "source-safe-fingerprint" },
  target_context: { corpid: "homelink", physical_bed_status: "vacant", parsed_vacancy_marker: true, candidate_count: 1, ambiguous: false, conflict: false, stale: false, snapshot_fingerprint: "target-safe-fingerprint" },
  open_arrears: [],
  ...extra
});

test("production config restores only the existing internal-beta legacy genesis gates", () => {
  assert.match(wrangler, /^APP_ENV = "internal_beta"$/m);
  assert.match(wrangler, /^BED_TRANSFER_WRITE_APPROVED = "true"$/m);
  assert.match(wrangler, /^BED_TRANSFER_LEGACY_GENESIS_MODE = "server_verified"$/m);
  assert.equal((wrangler.match(/^BED_TRANSFER_LEGACY_GENESIS_MODE\s*=/gm) || []).length, 1);
});

test("single validate, mixed dry-run and canonical write converge on one server gate", () => {
  const validate = asyncFn(worker, "handleEmployeeEntryValidate");
  const write = asyncFn(worker, "handleEmployeeEntry");
  const payload = asyncFn(worker, "validateEmployeeEntryUploadPayload");
  const canonical = asyncFn(worker, "validateEmployeeBedTransferCanonicalLink");
  assert.match(validate, /canonical_transfer_link_anchor:true/);
  assert.match(write, /canonical_transfer_link_anchor:\["TF","TFF"\]\.includes\(writeGateType\)/);
  assert.match(payload, /validateEmployeeBedTransferCanonicalLink\(env,user,entry,normalized,opts\)/);
  assert.equal((canonical.match(/employeeBedTransferLegacyGenesisGate\(env,user\)/g) || []).length, 1);
  assert.match(canonical, /resolveEmployeeOwnerConfirmedLegacyGenesis\([^;]+legacyGenesisGate\)/);
  assert.doesNotMatch(payload, /body\.(legacy_genesis|server_verified)|entry\.(legacy_genesis|server_verified)/);
});

test("shared gate requires exact server config and authenticated Employee role", () => {
  const env = { APP_ENV: "internal_beta", BED_TRANSFER_WRITE_APPROVED: "true", BED_TRANSFER_LEGACY_GENESIS_MODE: "server_verified" };
  const enabled = gate(env, { role: "STAFF", corpid: "homelink" });
  assert.equal(enabled.bed_transfer_validate_enabled, true);
  assert.equal(enabled.bed_transfer_write_enabled, true);
  assert.equal(enabled.server_verified_permission, true);
  for (const user of [{ role: "owner", corpid: "homelink" }, { role: "staff", corpid: "" }]) assert.equal(gate(env, user).server_verified_permission, false);
  assert.equal(gate({ ...env, BED_TRANSFER_WRITE_APPROVED: "false" }, { role: "staff", corpid: "homelink" }).server_verified_permission, false);
  assert.equal(gate({ ...env, BED_TRANSFER_LEGACY_GENESIS_MODE: "" }, { role: "staff", corpid: "homelink" }).server_verified_permission, false);
});

test("source and target reuse one request-scoped canonical snapshot path", () => {
  const canonical = asyncFn(worker, "validateEmployeeBedTransferCanonicalLink");
  assert.match(canonical, /const archiveSnapshot=await cloudArrearsFetchActiveSessionRows/);
  assert.equal((canonical.match(/archive_snapshot:archiveSnapshot/g) || []).length, 3);
  assert.equal((canonical.match(/request_context:opts\.request_context/g) || []).length, 2);
  assert.match(canonical, /Promise\.all\(\[/);
});

test("zero canonical candidates pass only for safe occupied-to-vacant internal-beta context", () => {
  const passed = resolveOwnerConfirmedLegacyGenesis(safeLegacy());
  assert.equal(passed.resolution_status, "resolved");
  assert.equal(passed.resolution_method, "server_verified_legacy_genesis");
  assert.equal(passed.lineage_genesis, true);
  assert.equal(resolveOwnerConfirmedLegacyGenesis(safeLegacy({ target_context: { ...safeLegacy().target_context, physical_bed_status: "occupied", parsed_vacancy_marker: false } })).error_code, "BED_TRANSFER_TARGET_NOT_VACANT");
  assert.equal(resolveOwnerConfirmedLegacyGenesis(safeLegacy({ source_context: { ...safeLegacy().source_context, physical_bed_status: "vacant", parsed_vacancy_marker: true } })).error_code, "BED_TRANSFER_LEGACY_GENESIS_SOURCE_NOT_OCCUPIED");
  assert.equal(resolveOwnerConfirmedLegacyGenesis(safeLegacy({ base_resolution: { resolution_status: "discontinuous", error_code: "BED_TRANSFER_LINEAGE_DISCONTINUITY", candidate_group_count: 2, ambiguity_reasons: ["active_transfer_lineage_broken"] } })).error_code, "BED_TRANSFER_LINEAGE_DISCONTINUITY");
  assert.equal(resolveOwnerConfirmedLegacyGenesis(safeLegacy({ to_bed: "111" })).error_code, "BED_TRANSFER_LEGACY_GENESIS_SCOPE_MISMATCH");
  assert.equal(resolveOwnerConfirmedLegacyGenesis(safeLegacy({ from_bed: "334" })).error_code, "BED_TRANSFER_LEGACY_GENESIS_SCOPE_MISMATCH");
});

test("same-bed Deposit In stays outside Bed Transfer source candidates", () => {
  const base = resolveBedTransferSourceContext({ corpid: "homelink", from_bed: "111", archive_entries: [{ event_type: "deposit_in", anchor_id: "deposit-111", bed: "111", accepted_at: "2026-07-15T10:00:00Z", effective_status: "active" }], access_snapshot: { parsed_checkin_mmdd: "0713" } });
  assert.equal(base.candidate_group_count, 0);
  assert.deepEqual(base.ambiguity_reasons, ["no_legacy_mmdd_match"]);
  assert.equal(resolveOwnerConfirmedLegacyGenesis(safeLegacy({ base_resolution: base })).resolution_status, "resolved");
});

test("mixed upload remains validate-before-write, stable-id bound and AED 50 Cash", () => {
  const uploadStart = employee.indexOf("async function commitSessionAndExport()");
  const uploadEnd = employee.indexOf("function normalizeEmployeeView", uploadStart);
  const upload = employee.slice(uploadStart, uploadEnd);
  assert.ok(uploadStart >= 0 && uploadEnd > uploadStart);
  const validateLoop = upload.indexOf("for(let i=0;i<uploadList.length;i++)");
  const failureGate = upload.indexOf("if(dryRunFailed.length)", validateLoop);
  const firstWrite = upload.indexOf("apiFetch('/api/employee/entry'", failureGate);
  assert.ok(validateLoop >= 0 && failureGate > validateLoop && firstWrite > failureGate);
  assert.match(upload, /failedIdentity=employeeEntryStableIdentity\(firstDryRunFailure\.entry\)/);
  assert.match(upload, /prepareRepeatableUploadRows\(originalDrafts,uploadSessionId\)/);
  assert.match(employee, /fee_amount_aed:amount/);
  assert.match(employee, /payment_method:paymentMethod/);
  assert.match(employee, /Due AED \$\{fmtMoney\(due\)\}/);
  assert.match(employee, /Paid AED \$\{fmtMoney\(paid\)\}/);
});
