import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} must end at __name marker`);
  return source.slice(start, end);
}

test("canonical occupancy gateway exposes required bed status fields and source proof", async () => {
  const worker = await readFile(workerPath, "utf8");
  const gateway = functionBlock(worker, "canonicalOccupancyGateway");
  const proof = functionBlock(worker, "canonicalOccupancySourceProof");

  for (const field of [
    "bed",
    "occupancy_status",
    "current_rent_coverage_start",
    "current_rent_coverage_end",
    "latest_rent_event",
    "latest_checkout_event",
    "latest_transfer_event",
    "from_bed",
    "to_bed",
    "deposit_recorded_amount",
    "open_arrears",
    "access_snapshot_context",
    "source_proof",
    "warnings",
    "anomalies"
  ]) {
    assert.match(gateway, new RegExp(field), `${field} must be returned`);
  }

  assert.match(proof, /canonical_occupancy_bed_status_gateway/);
  assert.match(proof, /TTLock \/ Access Snapshot \/ card remark context/);
  assert.match(proof, /canonical_event_archive/);
  assert.match(proof, /employee_7_event_anchors/);
  assert.match(proof, /entries_json/);
  assert.match(proof, /correction_anchors/);
  assert.match(proof, /void_anchors/);
  assert.match(proof, /reversal_anchors/);
  assert.match(proof, /display_context_and_deposit_D_source_not_identity/);

  for (const forbidden of [
    "employee_local_cache",
    "owner_display_text",
    "whatsapp_export_text",
    "preview_text",
    "tenant_card_id",
    "card_id",
    "old_ttlock_ref",
    "provider_phone",
    "phone_99099",
    "ttlock_provider_metadata"
  ]) {
    assert.match(proof, new RegExp(forbidden), `${forbidden} must be forbidden as occupancy truth`);
  }
});

test("occupancy status rules cover rent checkout left-with-arrears and transfer states", async () => {
  const worker = await readFile(workerPath, "utf8");
  const project = functionBlock(worker, "canonicalOccupancyProjectStatus");

  assert.match(project, /latestRent\?"active":"unknown"/);
  assert.match(project, /left_with_arrears/);
  assert.match(project, /checkout_pending/);
  assert.match(project, /"vacant"/);
  assert.match(project, /"transferred_out"/);
  assert.match(project, /"transferred_in"/);
  assert.match(project, /openArrears\.length/);
});

test("occupancy event projection derives rent coverage and transfer carryover from anchors", async () => {
  const worker = await readFile(workerPath, "utf8");
  const view = functionBlock(worker, "canonicalOccupancyEventView");
  const archive = functionBlock(worker, "canonicalOccupancyArchiveEventsForBed");
  const gateway = functionBlock(worker, "canonicalOccupancyGateway");

  assert.match(view, /rent_period_start/);
  assert.match(view, /rent_period_end/);
  assert.match(view, /rent_coverage_carryover/);
  assert.match(view, /arrears_carryover/);
  assert.match(view, /deposit_balance_carryover/);
  assert.match(view, /from_bed/);
  assert.match(view, /to_bed/);
  assert.match(view, /transfer_date/);

  assert.match(archive, /cloudArrearsFetchActiveSessionRows/);
  assert.match(archive, /extractEmployeeEntryAnchorsFromSession/);
  assert.match(archive, /normalizeEntryAnchor/);
  assert.match(archive, /rent/);
  assert.match(archive, /checkout/);
  assert.match(archive, /left_with_arrears/);
  assert.match(archive, /bed_transfer/);

  assert.match(gateway, /current_rent_coverage_start/);
  assert.match(gateway, /current_rent_coverage_end/);
  assert.match(gateway, /rent_coverage_carryover/);
  assert.match(gateway, /canonicalArrearsGateway/);
});

test("deposit amount comes from Access Snapshot D and provider identity stays display-only", async () => {
  const worker = await readFile(workerPath, "utf8");
  const gateway = functionBlock(worker, "canonicalOccupancyGateway");
  const bedContext = functionBlock(worker, "canonicalBedContextGateway");

  assert.match(gateway, /canonicalDepositAccessSnapshotForBed/);
  assert.match(gateway, /parsed_deposit_amount/);
  assert.match(gateway, /deposit_recorded_amount/);
  assert.match(gateway, /provider_identity_allowed:false/);
  assert.match(gateway, /display_only:true/);
  assert.doesNotMatch(gateway, /tenant_card_id.*occupancy_status/);
  assert.doesNotMatch(gateway, /card_id.*occupancy_status/);
  assert.doesNotMatch(gateway, /old_ttlock_ref.*occupancy_status/);
  assert.doesNotMatch(gateway, /provider_phone.*occupancy_status/);

  assert.match(bedContext, /canonicalOccupancyGateway/);
  assert.match(bedContext, /occupancy_gateway/);
  assert.doesNotMatch(bedContext, /occupancy_gateway_partial/);
});

test("employee and owner read routes use canonical occupancy gateway without writes", async () => {
  const worker = await readFile(workerPath, "utf8");
  const employeeHandler = functionBlock(worker, "handleEmployeeBedContext");
  const ownerHandler = functionBlock(worker, "handleOwnerBedStatus");
  const requestHandler = functionBlock(worker, "handleRequest");

  assert.match(employeeHandler, /canonicalBedContextGateway/);
  assert.match(employeeHandler, /readonly:true/);
  assert.match(employeeHandler, /no_write:true/);

  assert.match(ownerHandler, /canonicalOccupancyGateway/);
  assert.match(ownerHandler, /readonly:true/);
  assert.match(ownerHandler, /no_write:true/);
  assert.match(requestHandler, /path === "\/api\/owner\/bed-status"/);

  for (const block of [employeeHandler, ownerHandler, functionBlock(worker, "canonicalOccupancyGateway")]) {
    assert.doesNotMatch(block, /\.run\(/);
    assert.doesNotMatch(block, /INSERT\s+INTO/i);
    assert.doesNotMatch(block, /UPDATE\s+/i);
    assert.doesNotMatch(block, /DELETE\s+FROM/i);
  }
});
