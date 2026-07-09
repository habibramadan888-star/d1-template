import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  if (end > start) return source.slice(start, end);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : start + 5000);
}

function constBlock(source, name) {
  const start = source.indexOf(`const ${name}=`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("};", start);
  assert.ok(end > start, `${name} must end`);
  return source.slice(start, end + 2);
}

test("Deposit Out dry-run validates required refund fields and difference reason", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");
  const payloadValidator = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  for (const field of [
    "bed",
    "deposit_balance",
    "actual_refund_amount",
    "refund_method",
    "refund_date",
    "refund_reason"
  ]) {
    assert.match(validator, new RegExp(`missing\\.push\\("${field}"\\)`), `${field} must be required`);
  }

  assert.match(validator, /Math\.abs\(refund-balance\)>0\.01/);
  assert.match(validator, /missing\.push\("difference_reason"\)/);
  assert.doesNotMatch(
    validator,
    /difference_reason\|\|entry\.difference_reason\|\|normalized\.refund_reason|difference_reason\|\|entry\.difference_reason\|\|entry\.refund_reason/,
    "refund_reason must not satisfy the separate difference_reason requirement"
  );
  assert.match(payloadValidator, /DEPOSIT_REFUND_DIFFERENCE_REASON_REQUIRED/);
  assert.match(payloadValidator, /const differenceReason=cleanText\(entry\.difference_reason/);
});

test("Deposit Out refund above balance rejects unless owner override is present", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");

  assert.match(validator, /refund>balance\+0\.01/);
  assert.match(validator, /ownerOverrideRef/);
  assert.match(validator, /overrideReason/);
  assert.match(validator, /DEPOSIT_OUT_EXCEEDS_BALANCE/);
  assert.match(validator, /missing_fields:\["owner_override_ref","override_reason"\]/);
});

test("Deposit Out open arrears requires offset or owner approval", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");
  const uiValidate = functionBlock(await readFile(employeePath, "utf8"), "validateDepositOutEntry");

  assert.match(validator, /openArrearsAmount>0/);
  assert.match(validator, /arrearsOffsetRef/);
  assert.match(validator, /arrearsOffsetAmount/);
  assert.match(validator, /ownerOverrideRef/);
  assert.match(validator, /DEPOSIT_OUT_OPEN_ARREARS_REQUIRES_OFFSET_OR_APPROVAL/);
  assert.match(uiValidate, /Open Arrears Found\. Deposit refund requires arrears collection or owner approval/);
});

test("Deposit Out anchor preserves refund, balance, offset, override, and reason fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const normalizer = functionBlock(worker, "normalizeEntryAnchor");
  const line = functionBlock(worker, "renderEntryAnchorForOwner");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const depositOut = allowed.match(/DR:\[[^\]]+\]/s)?.[0] || "";

  for (const field of [
    "deposit_balance",
    "actual_refund_amount",
    "refund_amount",
    "refund_difference",
    "deposit_remaining_after_refund",
    "refund_method",
    "payment_method",
    "refund_date",
    "refund_reason",
    "difference_reason",
    "owner_override_ref",
    "override_reason",
    "arrears_offset_ref",
    "arrears_offset_amount",
    "open_arrears_amount",
    "owner_approval_required",
    "owner_approval_status"
  ]) {
    assert.match(normalizer, new RegExp(field), `${field} must be normalized`);
  }

  assert.match(line, /deposit_out/);
  assert.match(line, /balance/);
  assert.match(line, /diff/);

  for (const required of ["deposit_balance", "refund_amount", "refund_method", "refund_date", "refund_reason", "owner_override_ref", "arrears_offset_ref", "arrears_offset_amount"]) {
    assert.match(depositOut, new RegExp(required), `${required} must be allowed for Deposit Out`);
  }
});

test("Deposit Out is deposit refund movement, not rent income", async () => {
  const worker = await readFile(workerPath, "utf8");
  const apply = functionBlock(worker, "canonicalFinanceProjectionApplyAnchor");
  const depositOutSlice = apply.slice(apply.indexOf('type==="deposit_out"'), apply.indexOf('type==="expense"'));

  assert.match(depositOutSlice, /canonicalFinanceProjectionAddOutflow/);
  assert.match(depositOutSlice, /totals\.deposit_refund\+=amount/);
  assert.doesNotMatch(depositOutSlice, /rent_income/);
});

test("Deposit Gateway keeps Access Snapshot D as current balance and Deposit Out as audit-only", async () => {
  const worker = await readFile(workerPath, "utf8");
  const gateway = functionBlock(worker, "canonicalDepositGateway");
  const audit = functionBlock(worker, "canonicalDepositAuditEventsForBed");

  assert.match(gateway, /deposit_source:"access_snapshot_remark_D"/);
  assert.match(gateway, /current_balance_source:"access_snapshot_remark_D"/);
  assert.match(gateway, /cloud_deposit_events_role:"audit_supporting_only"/);
  assert.match(audit, /type!=="D"&&type!=="DR"/);
  assert.match(audit, /event_type:type==="D"\?"deposit_in":"deposit_out"/);
});

test("Deposit Out source firewall excludes provider identity fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const depositOut = allowed.match(/DR:\[[^\]]+\]/s)?.[0] || "";

  for (const forbidden of ["tenant_card_id", "card_id", "old_ttlock_ref", "provider_phone", "phone_99099"]) {
    assert.doesNotMatch(depositOut, new RegExp(forbidden), `${forbidden} must not be allowed in Deposit Out`);
  }
});

test("Employee Deposit Out UI reads deposit by bed and requires system balance", async () => {
  const html = await readFile(employeePath, "utf8");
  const loader = functionBlock(html, "loadDepositBalance");
  const validate = functionBlock(html, "validateDepositOutEntry");
  const builder = functionBlock(html, "buildDepositOutAnchor");

  assert.match(loader, /\/api\/employee\/deposit\?bed=/);
  assert.match(loader, /deposit_recorded_amount/);
  assert.doesNotMatch(loader, /tenant_card_id|deposit\?cid=/);
  assert.match(validate, /Deposit Balance must be available from system context/);
  assert.match(validate, /depositOutDifferenceReason/);
  assert.match(builder, /deposit_balance:balance/);
  assert.match(builder, /difference_reason:employeeTrimField\('depositOutDifferenceReason'\)/);
});
