import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { buildAccessSnapshotDTO, isAccessSnapshotProviderPhoneNonAuthoritative } from "../modules/properties/access-snapshot.mjs";

async function loadWorkerHarness() {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("const entryAnchorContract");
  const end = worker.indexOf("function cloudArrearsSessionIsActive", start);
  assert.ok(start > 0 && end > start, "entry anchor block not found");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function cleanDate(value){ return cleanText(value,32).slice(0,10); }
    ${worker.slice(start, end)}
    globalThis.buildAccessSnapshotDTO = buildAccessSnapshotDTO;
    globalThis.parseAccessCardRemark = parseAccessCardRemark;
    `,
    sandbox
  );
  return sandbox;
}

test("Access Snapshot parses bed deposit and check-in mmdd", () => {
  const dto = buildAccessSnapshotDTO("334 D200 0515", { property_id: "homelink", synced_at: "2026-07-08T10:00:00Z" });
  assert.equal(dto.source, "access_card_remark");
  assert.equal(dto.bed, "334");
  assert.equal(dto.parsed_deposit_amount, 200);
  assert.equal(dto.parsed_checkin_mmdd, "0515");
  assert.equal(dto.parse_status, "parsed");
  assert.match(dto.access_snapshot_id, /^runtime_access_snapshot_/);
});

test("Access Snapshot parses inline business note after check-in mmdd", () => {
  const dto = buildAccessSnapshotDTO("634 D200 0505娈嬬柧浜?");
  assert.equal(dto.bed, "634");
  assert.equal(dto.parsed_deposit_amount, 200);
  assert.equal(dto.parsed_checkin_mmdd, "0505");
  assert.equal(dto.parsed_business_note, "娈嬬柧浜?");
  assert.match(dto.parse_status, /parsed|partial/);
});

test("Access Snapshot parses exp until and valid expiry aliases", () => {
  assert.equal(buildAccessSnapshotDTO("334 D200 0515 exp 0815").parsed_valid_until_mmdd, "0815");
  assert.equal(buildAccessSnapshotDTO("334 D200 0515 until 0815").parsed_valid_until_mmdd, "0815");
  assert.equal(buildAccessSnapshotDTO("334 D200 0515 valid 0815").parsed_valid_until_mmdd, "0815");
});

test("Access Snapshot parses bed-only remark as partial with warning", () => {
  const dto = buildAccessSnapshotDTO("334");
  assert.equal(dto.bed, "334");
  assert.equal(dto.parse_status, "partial");
  assert.ok(dto.warnings.includes("missing_deposit_or_checkin"));
});

test("Access Snapshot marks empty and bad remarks as invalid or unparsed", () => {
  const empty = buildAccessSnapshotDTO("");
  const bad = buildAccessSnapshotDTO("not-a-bed no-deposit");
  assert.equal(empty.parse_status, "invalid");
  assert.ok(empty.warnings.includes("empty_remark"));
  assert.equal(bad.parse_status, "unparsed");
  assert.ok(bad.warnings.includes("missing_bed"));
});

test("provider identifiers are isolated under non-authoritative provider metadata only", () => {
  const dto = buildAccessSnapshotDTO("334 D200 0515", {
    card_id: "139870338",
    tenant_card_id: "tenant-card-334",
    hardware_card_id: "hw-334",
    provider_phone: "+971525199099",
    provider_account_phone: "+971525199099"
  });
  assert.deepEqual(dto.non_authoritative_provider_metadata, {
    card_id: "139870338",
    tenant_card_id: "tenant-card-334",
    hardware_card_id: "hw-334",
    provider_phone: "+971525199099",
    provider_account_phone: "+971525199099",
    is_provider_phone_non_authoritative: true
  });
  assert.equal("customer_phone" in dto, false);
  assert.equal("tenant_phone" in dto, false);
  assert.equal("contact_phone" in dto, false);
});

test("provider and 99099 phones are non-authoritative and never become customer/contact fields", () => {
  const dto = buildAccessSnapshotDTO("334 D200 0515", { provider_phone: "+9715011199099" });
  assert.equal(isAccessSnapshotProviderPhoneNonAuthoritative("+9715011199099", "staff_entered"), true);
  assert.equal(dto.non_authoritative_provider_metadata.provider_phone, "+9715011199099");
  assert.equal("customer_phone" in dto, false);
  assert.equal("tenant_phone" in dto, false);
  assert.equal("contact_phone" in dto, false);
});

test("access_snapshot_id is deterministic and runtime-only", () => {
  const opts = { property_id: "homelink", synced_at: "2026-07-08T10:00:00Z", card_id: "card-1" };
  const first = buildAccessSnapshotDTO("334 D200 0515", opts);
  const second = buildAccessSnapshotDTO("334 D200 0515", opts);
  assert.equal(first.access_snapshot_id, second.access_snapshot_id);
  assert.match(first.access_snapshot_id, /^runtime_access_snapshot_/);
});

test("Worker runtime exposes Access Snapshot DTO helper without changing API shape", async () => {
  const h = await loadWorkerHarness();
  const dto = h.buildAccessSnapshotDTO("334 D200 0515 until 0815", {
    property_id: "homelink",
    provider_metadata: { tenant_card_id: "tenant-card-334", provider_phone: "+971525199099" }
  });
  assert.equal(dto.source, "access_card_remark");
  assert.equal(dto.bed, "334");
  assert.equal(dto.parsed_deposit_amount, 200);
  assert.equal(dto.parsed_checkin_mmdd, "0515");
  assert.equal(dto.parsed_valid_until_mmdd, "0815");
  assert.equal(dto.non_authoritative_provider_metadata.tenant_card_id, "tenant-card-334");
  assert.equal("customer_phone" in dto, false);
});

