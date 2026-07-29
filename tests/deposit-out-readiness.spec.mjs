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

test("Deposit Out requires only bed, refund amount, method, and reason", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");
  const payloadValidator = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  for (const field of ["bed", "actual_refund_amount", "refund_method", "refund_reason"]) {
    assert.match(validator, new RegExp(`missing\\.push\\("${field}"\\)`), `${field} must be required`);
  }
  for (const optional of ["deposit_balance", "refund_date", "difference_reason"]) {
    assert.doesNotMatch(validator, new RegExp(`missing\\.push\\("${optional}"\\)`), `${optional} must be optional`);
  }
  assert.doesNotMatch(payloadValidator, /DEPOSIT_REFUND_DIFFERENCE_REASON_REQUIRED/);
});

test("Deposit Out missing or mismatched historical deposit becomes Owner Review", async () => {
  const worker = await readFile(workerPath, "utf8");
  const reference = functionBlock(worker, "employeeExitEventReference");

  assert.match(reference, /!historicalDepositAvailable\|\|historicalMismatch/);
  assert.match(reference, /pending_owner_review/);
  assert.match(reference, /HISTORICAL_DEPOSIT_REFERENCE_UNAVAILABLE/);
  assert.match(reference, /DEPOSIT_REFUND_HISTORICAL_AMOUNT_MISMATCH/);
});

test("Deposit Out open arrears is a warning, not a UI or backend block", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");
  const uiValidate = functionBlock(await readFile(employeePath, "utf8"), "validateDepositOutEntry");

  assert.doesNotMatch(validator, /openArrearsAmount|DEPOSIT_OUT_OPEN_ARREARS_REQUIRES_OFFSET_OR_APPROVAL/);
  assert.match(uiValidate, /Open arrears found\. The refund will be marked for Owner Review/);
  assert.doesNotMatch(uiValidate, /errors\.push\([^)]*Open Arrears/);
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

test("Employee Deposit Out UI reads cache-only deposit reference and does not require it", async () => {
  const html = await readFile(employeePath, "utf8");
  const loader = functionBlock(html, "loadDepositBalance");
  const validate = functionBlock(html, "validateDepositOutEntry");
  const builder = functionBlock(html, "buildDepositOutAnchor");

  assert.match(loader, /\/api\/employee\/deposit\?bed=/);
  assert.match(loader, /allow_live_fetch=0/);
  assert.match(loader, /deposit_recorded_amount/);
  assert.doesNotMatch(loader, /tenant_card_id|deposit\?cid=/);
  assert.doesNotMatch(validate, /Deposit Balance must be available from system context/);
  assert.match(validate, /Refund Reason \/ Remark is required/);
  assert.match(builder, /deposit_balance:balance/);
  assert.match(builder, /difference_reason:employeeTrimField\('depositOutDifferenceReason'\)/);
});
