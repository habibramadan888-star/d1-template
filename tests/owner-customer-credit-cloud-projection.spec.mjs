import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workerPath = new URL('../deploy-worker/src/index.js', import.meta.url);
const ownerJsPath = new URL('../deploy-worker/public/index-51-main.js', import.meta.url);
const ownerHtmlPath = new URL('../deploy-worker/public/index-51.html', import.meta.url);
const ownerControlPath = new URL('../deploy-worker/public/index-51-cp.js', import.meta.url);

test('customer credit is exposed as one authenticated read-only cloud projection', async () => {
  const source = await readFile(workerPath, 'utf8');
  assert.match(source, /async function buildOwnerCustomerCreditProjection/);
  assert.doesNotMatch(source.slice(source.indexOf('async function buildOwnerCustomerCreditProjection'), source.indexOf('__name(buildOwnerCustomerCreditProjection')), /ownerOverviewFetchSessionPeriodSummary/);
  assert.match(source, /canonicalFinanceProjectionFetchSessions\(env,user,historyRange/);
  assert.match(source, /empLoadLockCardsWithCacheFallback/);
  assert.match(source, /ownerHistoryProjectionReceivables\(env,user,500\)/);
  assert.match(source, /ownerCustomerCreditLockSnapshot\(env,user,options\.request\|\|null\)/);
  assert.match(source, /buildOwnerCustomerCreditProjection\(env,user,\{today:url\.searchParams\.get\("today"\)\|\|"",request\}\)/);
  assert.match(source, /browser_storage_used:false,analysis_sessions_used:false,display_text_used:false/);
  assert.match(source, /readonly:true,no_write:true/);
  assert.match(source, /path === "\/api\/owner\/customer-credit-projection"/);
});

test('credit uses live request context and a bounded last-good cloud snapshot', async () => {
  const worker = await readFile(workerPath, 'utf8');
  assert.match(worker, /TTLOCK_CREDIT_CACHE_MAX_AGE_MS=24\*60\*60\*1000/);
  assert.match(worker, /data_source:"credit_last_good_snapshot"/);
  assert.match(worker, /network_authority:false/);
  assert.match(worker, /networkRecommendation=lockResult\.network_authority===false\|\|score\.grade==="new"\?"MANUAL_REVIEW"/);
  assert.match(worker, /occupancy_snapshot_stale:lockResult\?\.credit_snapshot_stale===true/);
});

test('global rent configuration is restored in owner control panel', async () => {
  const html = await readFile(ownerHtmlPath, 'utf8');
  const control = await readFile(ownerControlPath, 'utf8');
  assert.match(html, /id="btnGlobalRent"/);
  assert.match(html, /id="cpGlobalRentSection"/);
  assert.match(html, /id="cpGlobalRentConfig"/);
  assert.match(html, /云端唯一配置/);
  assert.match(control, /async function cp_toggleRentConfig/);
  assert.match(control, /await rc_loadRoomCfgFromCloud\(\);rc_renderCfg\(panel\)/);
});
test('owner client page consumes only the cloud projection endpoint', async () => {
  const source = await readFile(ownerJsPath, 'utf8');
  const start = source.indexOf('async function ccEnsureClientData');
  const end = source.indexOf('function ccEntryText', start);
  const loader = source.slice(start, end);
  assert.match(loader, /\/api\/owner\/customer-credit-projection/);
  assert.doesNotMatch(loader, /ensureOwnerCoreReadData/);
  const renderStart = source.indexOf('function ccRender(forceRebuild=false)');
  const renderEnd = source.indexOf('function ccAutoCardHtml', renderStart);
  const render = source.slice(renderStart, renderEnd);
  assert.match(render, /_ownerCustomerCreditProjection/);
  assert.doesNotMatch(render, /state\.analysisSessions|state\.saved|roomsData|ccBuildCache/);
});

test('credit model stays small and exposes one network recommendation', async () => {
  const worker = await readFile(workerPath, 'utf8');
  assert.match(worker, /const grades=\{good:0,watch:0,risk:0,new:0\}/);
  assert.match(worker, /network_access_recommendation/);
  assert.doesNotMatch(worker, /customer_credit_(?:identity|lifecycle)_system/i);
  const html = await readFile(ownerHtmlPath, 'utf8');
  assert.match(html, /value="good">✅ 正常/);
  assert.match(html, /value="watch">⚠️ 留意/);
  assert.match(html, /value="risk">🚨 需复核/);
});

test('business period income is excluded from customer credit', async () => {
  const worker = await readFile(workerPath, 'utf8');
  const start = worker.indexOf('async function buildOwnerCustomerCreditProjection');
  const end = worker.indexOf('__name(buildOwnerCustomerCreditProjection', start);
  const projection = worker.slice(start, end);
  assert.doesNotMatch(projection, /cash_received|bank_received|total_received|ownerOverviewFetchSessionPeriodSummary/);
  assert.match(projection, /financial_period_totals_used_for_credit:false/);

  const source = await readFile(ownerJsPath, 'utf8');
  const renderStart = source.indexOf('function ccRender(forceRebuild=false)');
  const renderEnd = source.indexOf('function ccRenderError', renderStart);
  const render = source.slice(renderStart, renderEnd);
  assert.doesNotMatch(render, /本期实收|s\.total_received|s\.cash_received|s\.bank_received/);
  assert.match(render, /账期收入不参与信用/);
});
