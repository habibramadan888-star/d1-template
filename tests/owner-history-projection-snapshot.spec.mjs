import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function block(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} must exist`);
  assert.notEqual(end, -1, `${endMarker} must exist`);
  return source.slice(start, end);
}

test("owner history projection snapshot reads cloud projection tables directly", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = block(worker, "async function phase0OwnerOverviewComparativeSummary", "__name(phase0OwnerOverviewComparativeSummary");
  const receivables = block(worker, "async function ownerHistoryProjectionReceivables", "__name(ownerHistoryProjectionReceivables");
  const reconcile = block(worker, "async function reconcileOwnerTtlockReceivablesProjection", "__name(reconcileOwnerTtlockReceivablesProjection");

  assert.match(worker, /\/api\/owner\/history-projection-snapshot/);
  assert.match(worker, /\(path === "\/api\/owner\/history-projection-snapshot" \|\| path === "\/api\/owner\/overview\/comparative-summary"\) && method === "GET"/);
  assert.match(receivables, /FROM arrear_tasks/);
  assert.match(receivables, /source_type==="ttlock_expired_unpaid"/);
  assert.match(receivables, /mode:"direct_cloud_projection"/);
  assert.match(receivables, /row\.source_type==="ttlock_expired_unpaid"\|\|row\.amount_fils>0/);
  assert.match(receivables, /config_missing_count:configMissingCount/);
  assert.match(handler, /ownerOverviewFetchSessionPeriodSummary/);
  assert.match(handler, /ownerHistoryProjectionReceivables/);
  assert.match(handler, /syncOwnerHistoryReceivablesProjection/);
  assert.match(handler, /receivables_projection_sync:receivablesSync/);
  assert.match(handler, /current_receivables_sot:historyReceivables/);
  assert.match(handler, /today_todos:ownerHistoryProjectionTodos\(historyReceivables\)/);
  assert.match(handler, /nested_gateway_calls:0/);
  assert.doesNotMatch(handler.slice(0, handler.indexOf("Legacy expanded comparison pipeline")), /resolveCurrentReceivablesSot|canonicalFinanceProjectionBuild|empLoadLockCards/);
  assert.match(reconcile, /empLoadLockCardsWithCacheFallback/);
  assert.match(reconcile, /strict_access_snapshot:true/);
  assert.match(reconcile, /consoleSotRowsFromLockCards/);
  assert.match(reconcile, /mapped\.byStatus\.overdue/);
  assert.match(reconcile, /lockResult\?\.error\|\|lockResult\?\.fallback/);
  assert.match(reconcile, /TTLOCK_NO_LONGER_EXPIRED/);
  assert.match(reconcile, /ttlock_projection_reconcile/);
  assert.match(reconcile, /existing\.source_fingerprint===fingerprint&&empCloseStatusIsOpen/);
  assert.doesNotMatch(reconcile, /DELETE\s+FROM/i);
});

test("owner overview consumes one direct snapshot and lazy-loads collapsed panels", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");
  const loaderStart = ui.lastIndexOf("async function loadOwnerOverviewComparativeSummary");
  const loader = ui.slice(loaderStart, ui.indexOf("function ensureOwnerOverviewComparativeAsync", loaderStart));
  const overviewStart = ui.lastIndexOf("function renderOwnerOverview(){");
  const overview = ui.slice(overviewStart, ui.indexOf("/* ── ANALYSIS IMPORT", overviewStart));

  assert.match(loader, /apiFetch\('\/api\/owner\/history-projection-snapshot'\)/);
  assert.match(loader, /state\.ownerTodayTodos=data\.today_todos/);
  assert.match(overview, /financeDetails\.open/);
  assert.match(overview, /arrearsDetails\.open/);
  assert.doesNotMatch(overview, /\n  ensureOwnerFinanceAsync\(\);/);
  assert.doesNotMatch(overview, /\n  ensureOwnerOverviewArrearsAsync\(\);/);
  assert.doesNotMatch(overview, /ensureOwnerTodayTodosAsync\(\);/);
  assert.match(ui, /outstandingConfigMissing/);
  assert.match(ui, /项租金待配置/);
  assert.match(html, /owner-history-projection-v23/);
});
