import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildAccessSnapshotDTO } from "../modules/properties/access-snapshot.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  if (end > start) return source.slice(start, end);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : start + 3000);
}

function constBlock(source, name) {
  const start = source.indexOf(`const ${name}=`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("};", start);
  assert.ok(end > start, `${name} must end`);
  return source.slice(start, end + 2);
}

test("Access Snapshot D amount is the canonical current deposit source", () => {
  const full = buildAccessSnapshotDTO("144 D200 0701");
  const half = buildAccessSnapshotDTO("144 D100 0701");
  const partial = buildAccessSnapshotDTO("144 D50 0701");
  const missing = buildAccessSnapshotDTO("144 0701");

  assert.equal(full.parsed_deposit_amount, 200);
  assert.equal(200 - full.parsed_deposit_amount, 0);
  assert.equal(half.parsed_deposit_amount, 100);
  assert.equal(200 - half.parsed_deposit_amount, 100);
  assert.equal(partial.parsed_deposit_amount, 50);
  assert.equal(200 - partial.parsed_deposit_amount, 150);
  assert.equal(missing.parsed_deposit_amount, null);
  assert.ok(missing.warnings.includes("missing_deposit_or_checkin"));
});

test("canonical deposit gateway declares Access Snapshot remark D as balance source", async () => {
  const worker = await readFile(workerPath, "utf8");
  const gateway = functionBlock(worker, "canonicalDepositGateway");
  const handler = functionBlock(worker, "handleEmployeeDeposit");

  assert.match(gateway, /deposit_source:"access_snapshot_remark_D"/);
  assert.match(gateway, /current_balance_source:"access_snapshot_remark_D"/);
  assert.match(gateway, /cloud_deposit_events_role:"audit_supporting_only"/);
  assert.match(gateway, /recorded===null\?"MISSING_D":"RECORDED"/);
  assert.match(gateway, /status="NEEDS_RECONCILIATION"/);
  assert.match(gateway, /DEPOSIT_SOURCE_MISMATCH/);
  assert.match(gateway, /forbidden_identity_excluded:true/);

  assert.match(handler, /url\.searchParams\.get\("bed"\)/);
  assert.match(handler, /canonicalDepositGateway\(env,user,\{bed,limit:1000\}\)/);
  assert.match(handler, /tenant_card_id_identity_allowed:false/);
  assert.doesNotMatch(handler, /url\.searchParams\.get\("cid"\)|empDepositBalance/);
});

test("cloud Deposit In and Deposit Out events are audit-only support for deposit source", async () => {
  const worker = await readFile(workerPath, "utf8");
  const audit = functionBlock(worker, "canonicalDepositAuditEventsForBed");
  const gateway = functionBlock(worker, "canonicalDepositGateway");

  assert.match(audit, /source:"cloud_deposit_event_audit_only"/);
  assert.match(audit, /entryAnchorType\(anchor\)/);
  assert.match(audit, /type!=="D"&&type!=="DR"/);
  assert.match(gateway, /cloud_deposit_event_net:cloudNet/);
  assert.match(gateway, /cloud_deposit_events:auditEvents/);
  assert.match(gateway, /cloud_deposit_events_role:"audit_supporting_only"/);
});

test("Deposit Out refund limit still uses deposit baseline and requires owner override above it", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");

  assert.match(validator, /DEPOSIT_OUT_EXCEEDS_BALANCE/);
  assert.match(validator, /owner_override/);
  assert.match(validator, /refund>balance\+0\.01/);
});

test("employee Deposit UI reads deposit by bed and never by tenant card id", async () => {
  const html = await readFile(employeePath, "utf8");
  const depositHeld = functionBlock(html, "depositHeld");
  const loader = functionBlock(html, "loadDepositBalance");

  assert.match(depositHeld, /state\.depositContext&&state\.depositContext\.deposit_recorded_amount!=null/);
  assert.match(loader, /\/api\/employee\/deposit\?bed=/);
  assert.match(loader, /deposit_recorded_amount/);
  assert.doesNotMatch(loader, /deposit\?cid=|tenant_card_id/);
});

test("Deposit In and Deposit Out source firewall forbids provider identity fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const depositIn = allowed.match(/D:\[[^\]]+\]/s)?.[0] || "";
  const depositOut = allowed.match(/DR:\[[^\]]+\]/s)?.[0] || "";

  for (const block of [depositIn, depositOut]) {
    assert.doesNotMatch(block, /tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099/);
  }
});
