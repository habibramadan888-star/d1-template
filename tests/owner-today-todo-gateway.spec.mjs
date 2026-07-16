import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const ownerUiPath = new URL("../deploy-worker/public/index-51-main.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  if (end > start) return source.slice(start, end);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : start + 4000);
}

test("owner today todo gateway exists and is read-only", async () => {
  const worker = await readFile(workerPath, "utf8");
  const gateway = functionBlock(worker, "buildOwnerTodayTodoGateway");
  const handler = functionBlock(worker, "handleOwnerTodayTodos");

  assert.match(gateway, /gateway:"owner_today_todo_gateway"/);
  assert.match(gateway, /source:"derived_from_canonical_gateways"/);
  assert.match(gateway, /readonly:true/);
  assert.match(gateway, /no_write:true/);
  assert.match(gateway, /production_cutover:"PRODUCTION_NO_GO"/);
  assert.match(handler, /buildOwnerTodayTodoGateway/);
  assert.match(handler, /TODAY_TODO_GATEWAY_FAILED/);
  assert.match(handler, /degraded:true/);
  assert.match(handler, /items:\[\]/);
  assert.match(worker, /path==="?\/api\/owner\/today-todos"?|path === "\/api\/owner\/today-todos"/);

  for (const block of [gateway, handler]) {
    assert.doesNotMatch(block, /\.run\(/);
    assert.doesNotMatch(block, /INSERT\s+INTO/i);
    assert.doesNotMatch(block, /UPDATE\s+/i);
    assert.doesNotMatch(block, /DELETE\s+FROM/i);
  }
});

test("owner today todo gateway derives from canonical gateways and not forbidden truth sources", async () => {
  const worker = await readFile(workerPath, "utf8");
  const gateway = functionBlock(worker, "buildOwnerTodayTodoGateway");
  const depositView = functionBlock(worker, "ownerTodayTodoDepositGatewayView");
  const occupancyView = functionBlock(worker, "ownerTodayTodoOccupancyGatewayView");
  const sourceProof = functionBlock(worker, "ownerTodayTodoSourceProof");
  const candidates = functionBlock(worker, "ownerTodayTodoCandidateBeds");

  assert.match(gateway, /ownerTodayTodoDepositGatewayView/);
  assert.match(gateway, /ownerTodayTodoOccupancyGatewayView/);
  assert.match(gateway, /resolveConsoleReceivablesSot/);
  assert.match(gateway, /cloudArrearsFetchActiveSessionRows/);
  assert.match(gateway, /empLoadLockCardsWithCacheFallback/);
  assert.match(gateway, /buildCloudArrearsProjectionFromSessions/);
  assert.match(depositView, /gateway:"canonical_deposit_gateway"/);
  assert.match(occupancyView, /gateway:"canonical_occupancy_bed_status_gateway"/);
  assert.match(occupancyView, /canonicalOccupancyProjectStatus/);
  assert.match(occupancyView, /canonicalOccupancyConflictWarnings/);
  assert.match(candidates, /cloudArrearsFetchActiveSessionRows/);
  assert.match(candidates, /empLoadLockCardsWithCacheFallback/);

  for (const allowed of [
    "canonical_deposit_gateway",
    "canonical_occupancy_bed_status_gateway",
    "canonical_arrears_gateway",
    "canonical_event_archive",
    "access_snapshot_context"
  ]) {
    assert.match(sourceProof, new RegExp(allowed));
  }

  for (const forbidden of [
    "owner_display_text",
    "employee_local_cache",
    "preview_text",
    "whatsapp_export_text",
    "tenant_card_id",
    "card_id",
    "old_ttlock_ref",
    "provider_phone",
    "phone_99099",
    "manual_todo_state"
  ]) {
    assert.match(sourceProof, new RegExp(forbidden));
  }
});

test("deposit and occupancy reconciliation todos are generated with deterministic ids and source proof", async () => {
  const worker = await readFile(workerPath, "utf8");
  const build = functionBlock(worker, "ownerTodayTodoBuildDepositAndOccupancy");
  const item = functionBlock(worker, "ownerTodayTodoItem");
  const taskId = functionBlock(worker, "ownerTodayTodoTaskId");

  assert.match(build, /DEPOSIT_D_RECONCILIATION_REQUIRED/);
  assert.match(build, /recorded===null\|\|recorded\+0\.01<expectedDeposit/);
  assert.match(build, /Deposit In \${expectedDeposit} exists/);
  assert.match(build, /DEPOSIT_IN_ON_TTLOCK_VACANT_BED/);
  assert.match(build, /physical_bed_status==="vacant"/);
  assert.match(build, /physical_bed_status_source==="access_snapshot_E_marker"/);
  assert.match(build, /canonical_deposit_gateway \+ canonical_occupancy_bed_status_gateway/);
  assert.match(build, /Deposit In \$\{expectedDeposit\} exists, but TTLock still marks bed \$\{bed\} as vacant/);
  assert.match(build, /remove E\/e and update TTLock remark to D\$\{expectedDeposit\}/);
  assert.match(build, /The todo resolves when TTLock no longer shows E\/e and D is updated correctly/);
  assert.match(build, /TTLOCK_VACANT_WITHOUT_CHECKOUT_EVENT/);
  assert.match(build, /CHECKOUT_EVENT_WITHOUT_TTLOCK_E/);
  assert.match(build, /RENT_COVERAGE_CONFLICTS_WITH_TTLOCK_E/);
  assert.match(build, /source_proof:ownerTodayTodoSourceProof/);
  assert.match(build, /auto_resolve_condition/);
  assert.match(item, /task_type:type/);
  assert.match(taskId, /type,bed\|\|"bed",sourceSessionId/);
  assert.match(taskId, /map\(value=>ownerTodayTodoSlug\(value\)\)/);
  assert.doesNotMatch(taskId, /map\(ownerTodayTodoSlug\)/);
  const readableId = [
    "DEPOSIT_IN_ON_TTLOCK_VACANT_BED",
    "111",
    "S20260709-q3ub6",
    "ent20260709-q3ub6-01",
    "canonical_deposit_gateway + canonical_occupancy_bed_status_gateway"
  ].map(value => String(value).replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "")).join("__");
  assert.match(readableId, /DEPOSIT_IN_ON_TTLOCK_VACANT_BED__111__S20260709-q3ub6__ent20260709-q3ub6-01/);
  assert.doesNotMatch(readableId, /unknown__1__S2__ent__cano/);
});

test("todo deduplication and auto-resolve behavior are encoded", async () => {
  const worker = await readFile(workerPath, "utf8");
  const push = functionBlock(worker, "ownerTodayTodoPush");
  const gateway = functionBlock(worker, "buildOwnerTodayTodoGateway");

  assert.match(push, /todos\.some\(existing=>existing\.task_id===item\.task_id\)/);
  assert.match(push, /status==="resolved_by_source"/);
  assert.match(gateway, /include_resolved/);
  assert.match(gateway, /items\.filter\(todo=>todo\.status==="open"\)/);
});

test("owner dashboard calls today todo endpoint and renders returned todos with explicit empty state", async () => {
  const ui = await readFile(ownerUiPath, "utf8");
  const load = functionBlock(ui, "loadOwnerTodayTodos");
  const guard = functionBlock(ui, "ownerGatewayJson");
  const preview = functionBlock(ui, "ownerOverviewShowTodayActionsPreview");
  const row = functionBlock(ui, "ownerBedTransferTodoRowHtml");

  assert.match(load, /ownerGatewayJson\(ownerRunScopedApi\('\/api\/owner\/today-todos\?limit=50'\)/);
  assert.match(guard, /content-type/);
  assert.match(guard, /NON_JSON/);
  assert.match(load, /state\.ownerTodayTodos=null/);
  assert.match(preview, /ownerOverviewTodayTodoRows\(\)/);
  assert.match(preview, /ownerBedTransferTodoRowHtml/);
  assert.match(row, /recommended_action/);
  assert.match(row, /source_gateway/);
  assert.match(preview, /No todo items from canonical gateways/);
  assert.match(ui, /ownerOverviewTodayTodoCount\(\)/);
  assert.match(ui, /ownerOverviewTodayTodoNote\(\)/);
  assert.match(ui, /ensureOwnerTodayTodosAsync\(\)/);
});

test("current receivables behavior remains preserved as a todo category", async () => {
  const worker = await readFile(workerPath, "utf8");
  const receivables = functionBlock(worker, "ownerTodayTodoBuildReceivables");
  const gateway = functionBlock(worker, "buildOwnerTodayTodoGateway");
  const ui = await readFile(ownerUiPath, "utf8");

  assert.match(receivables, /CURRENT_RECEIVABLE_REQUIRED/);
  assert.match(receivables, /category:"receivables"/);
  assert.match(receivables, /source_gateway:"current_receivables_sot"/);
  assert.match(gateway, /resolveConsoleReceivablesSot/);
  assert.match(ui, /ownerOverviewConsoleSotRows\(\)\.length/);
});
