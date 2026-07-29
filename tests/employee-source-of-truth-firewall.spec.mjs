import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

const forbiddenFields = [
  "card_id",
  "tenant_card_id",
  "old_ttlock_ref",
  "provider_phone",
  "phone_99099",
  "provider_metadata",
  "ttlock_metadata"
];

const eventKeys = ["R", "AP", "D", "DR", "CO", "E", "TF"];

function constBlock(source, name) {
  const start = source.indexOf(`const ${name}=`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("};", start);
  assert.ok(end > start, `${name} must end`);
  return source.slice(start, end + 2);
}

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  if (end > start) return source.slice(start, end);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : start + 2500);
}

function exactFunctionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  if (end > start) return source.slice(start, end);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : start + 2500);
}

test("frontend source-of-truth firewall defines all seven event whitelists and forbidden fields", async () => {
  const html = await readFile(employeePath, "utf8");
  const allowed = constBlock(html, "EMPLOYEE_SOURCE_FIREWALL_ALLOWED_FIELDS");
  const forbidden = constBlock(html, "EMPLOYEE_SOURCE_FIREWALL_FORBIDDEN_FIELDS");
  const sanitizer = functionBlock(html, "sanitizeCanonicalEmployeeEntry");

  for (const key of eventKeys) assert.match(allowed, new RegExp(`${key}:\\[`));
  for (const field of forbiddenFields) {
    assert.match(forbidden, new RegExp(field));
    assert.doesNotMatch(allowed, new RegExp(`['"]${field}['"]`));
  }
  assert.match(sanitizer, /delete entry\[field\]/);
  assert.match(sanitizer, /providerLike/);
  assert.match(sanitizer, /ttlock_context=''/);
  assert.doesNotMatch(sanitizer, /old_ttlock_context/);
});

test("server source-of-truth firewall normalizes all employee validation bodies", async () => {
  const worker = await readFile(workerPath, "utf8");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const forbidden = constBlock(worker, "employeeSourceFirewallForbiddenFields");
  const normalizer = functionBlock(worker, "normalizeEmployeeEntryForValidation");
  const bodyNormalizer = functionBlock(worker, "normalizeEmployeeEntryBodyForValidation");
  const validate = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const upload = exactFunctionBlock(worker, "handleEmployeeEntry");

  for (const key of eventKeys) assert.match(allowed, new RegExp(`${key}:\\[`));
  for (const field of forbiddenFields) {
    assert.match(forbidden, new RegExp(field));
    assert.doesNotMatch(allowed, new RegExp(`["']${field}["']`));
  }
  assert.match(normalizer, /delete copy\[field\]/);
  assert.match(bodyNormalizer, /clone\.entry=normalizeEmployeeEntryForValidation/);
  assert.match(bodyNormalizer, /clone\.session\.entries=clone\.session\.entries\.map/);
  assert.match(validate, /body=normalizeEmployeeEntryBodyForValidation\(body\|\|\{\}\)/);
  assert.match(upload, /body=normalizeEmployeeEntryBodyForValidation\(body\|\|\{\}\)/);
});

test("canonical anchor JSON, duplicate fingerprints, projection inputs, and sync keys use sanitized anchors", async () => {
  const worker = await readFile(workerPath, "utf8");
  const normalize = functionBlock(worker, "normalizeEntryAnchor");
  const sourceFirewall = functionBlock(worker, "applyEmployeeEntrySourceFirewall");
  const duplicateRows = functionBlock(worker, "employeeEntryDuplicateIncomingRows");
  const duplicateKeys = functionBlock(worker, "buildEmployeeEntryDuplicateKeys");
  const projection = functionBlock(worker, "buildCloudArrearsProjectionFromSessions");
  const syncKeys = functionBlock(worker, "employeeEntryCloudSyncKeySet");

  assert.match(normalize, /applyEmployeeEntrySourceFirewall\(type,anchor\)/);
  assert.match(sourceFirewall, /if\(!\(field in sanitized\)\)delete entry\[field\]/);
  assert.match(duplicateRows, /rows\.map\(row=>normalizeEntryAnchor\(row\)\)/);
  assert.match(duplicateKeys, /const anchor=normalizeEntryAnchor\(row\)/);
  assert.match(projection, /const anchor=normalizeEntryAnchor\(anchors\[index\]\)/);
  assert.match(syncKeys, /const normalized=normalizeEntryAnchor\(row\|\|\{\}\)/);
});

test("frontend upload serialization and ENTRY ANCHORS JSON use canonical sanitizer", async () => {
  const html = await readFile(employeePath, "utf8");
  const apply = functionBlock(html, "applyEntryAnchors");
  const currentSession = functionBlock(html, "currentSessionPayload");
  const exportBlock = functionBlock(html, "buildEntryAnchorExportBlock");
  const commit = html.slice(html.indexOf("async function commitSessionAndExport", html.indexOf("async function validateEmployeeUploadDryRun")));

  assert.match(apply, /sanitizeCanonicalEmployeeEntry\(entryEventType\(type\),e\)/);
  assert.match(currentSession, /state\.drafts\.map\(normalizeEntryAnchor\)/);
  assert.match(exportBlock, /\(entries\|\|\[\]\)\.map\(normalizeEntryAnchor\)/);
  assert.match(commit, /const canonicalEntries=uploadList\.map\(normalizeEntryAnchor\)/);
});

test("AP 611 contamination case is represented and fixed by firewall tests", async () => {
  const html = await readFile(employeePath, "utf8");
  const worker = await readFile(workerPath, "utf8");
  const sanitizer = functionBlock(html, "sanitizeCanonicalEmployeeEntry");
  const forbidden = constBlock(html, "EMPLOYEE_SOURCE_FIREWALL_FORBIDDEN_FIELDS");
  const validator = functionBlock(worker, "validateArrearsPaymentUploadFields");
  const apBuilder = functionBlock(html, "buildArrearsPaymentAnchor");

  assert.match(apBuilder, /linked_task_id:ref/);
  assert.match(apBuilder, /arrears_ref:ref/);
  assert.doesNotMatch(apBuilder, /\.\.\.task/);
  for (const field of ["tenant_card_id", "old_ttlock_ref"]) {
    assert.match(forbidden, new RegExp(field));
    assert.match(validator, new RegExp(field));
  }
  assert.match(validator, /missing\.push\("arrears_ref"\)/);
});

test("Bed Transfer firewall strips old access-card identity while preserving transfer fields", async () => {
  const html = await readFile(employeePath, "utf8");
  const worker = await readFile(workerPath, "utf8");
  const frontendAllowed = constBlock(html, "EMPLOYEE_SOURCE_FIREWALL_ALLOWED_FIELDS");
  const serverAllowed = constBlock(worker, "employeeSourceFirewallAllowedFields");

  for (const block of [frontendAllowed, serverAllowed]) {
    const tfLine = block.match(/TF:\[[^\]]+\]/s)?.[0] || "";
    assert.match(tfLine, /from_bed/);
    assert.match(tfLine, /to_bed/);
    assert.match(tfLine, /transfer_reason/);
    assert.match(tfLine, /fee_mode/);
    assert.match(tfLine, /bed_price_difference_mode/);
    assert.doesNotMatch(tfLine, /transfer_date|deposit_balance_carryover|arrears_carryover/);
    assert.doesNotMatch(tfLine, /old_ttlock_ref|tenant_card_id|card_id/);
  }
});

test("Deposit firewall passes canonical payload while documenting legacy identity replacement deferral", async () => {
  const worker = await readFile(workerPath, "utf8");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const depositIn = allowed.match(/D:\[[^\]]+\]/s)?.[0] || "";
  const depositOut = allowed.match(/DR:\[[^\]]+\]/s)?.[0] || "";
  const gateway = functionBlock(worker, "canonicalDepositGateway");
  const handler = functionBlock(worker, "handleEmployeeDeposit");
  const requestHandler = functionBlock(worker, "handleRequest");

  for (const block of [depositIn, depositOut]) {
    assert.doesNotMatch(block, /tenant_card_id|card_id|old_ttlock_ref/);
  }
  for (const field of [
    "previous_deposit_recorded_amount",
    "expected_deposit_after_payment",
    "deposit_remaining_after_payment"
  ]) {
    assert.match(depositIn, new RegExp(field));
  }
  assert.match(gateway, /deposit_source:"access_snapshot_remark_D"/);
  assert.match(gateway, /cloud_deposit_events_role:"audit_supporting_only"/);
  assert.match(
    handler,
    /const requestContext=ttlockRequestContext\(request,env,user,"employee_deposit",TTLOCK_READ_CACHE_MAX_AGE_MS\)/,
  );
  assert.match(
    handler,
    /canonicalDepositGateway\(env,user,\{bed,limit:1000,request_context:requestContext\}\)/,
  );
  assert.ok(
    requestHandler.indexOf("const auth = await requireAuth(request, env)") <
      requestHandler.indexOf("handleEmployeeApi(request, env, user)"),
  );
  assert.doesNotMatch(
    handler,
    /request_context\s*:\s*(?:body|url|request\.headers|localStorage|referer|origin|whatsApp|provider)/i,
  );
  assert.match(handler, /tenant_card_id_identity_allowed:false/);
  assert.doesNotMatch(handler, /url\.searchParams\.get\("cid"\)|empDepositBalance/);
});
