import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const named = source.indexOf(`__name(${name}`, start);
  if (named > start) return source.slice(start, named);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next > start ? next : start + 3000);
}

function allFunctionBlocks(source, name) {
  const blocks = [];
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "g");
  let match;
  while ((match = re.exec(source))) {
    const start = match.index;
    const named = source.indexOf(`__name(${name}`, start);
    const next = source.indexOf("\nfunction ", start + 1);
    const end = named > start ? named : (next > start ? next : start + 3000);
    blocks.push(source.slice(start, end));
  }
  assert.ok(blocks.length, `${name} must exist`);
  return blocks;
}

test("Canonical Bed Context and Arrears Gateway functions are present and source-scoped", async () => {
  const worker = await readFile(workerPath, "utf8");
  const arrearsGateway = functionBlock(worker, "canonicalArrearsGateway");
  const bedGateway = functionBlock(worker, "canonicalBedContextGateway");
  const cleaner = functionBlock(worker, "canonicalArrearsGatewayCleanItem");
  const forbiddenListStart = worker.indexOf("const canonicalArrearsForbiddenIdentityFields=");
  const forbiddenListEnd = worker.indexOf("function canonicalArrearsGatewayCleanItem", forbiddenListStart);
  const forbiddenList = worker.slice(forbiddenListStart, forbiddenListEnd);

  assert.match(arrearsGateway, /rebuildCloudArrearsForBed/);
  assert.match(arrearsGateway, /rebuildAllCloudArrears/);
  assert.match(arrearsGateway, /identity:"arrears_ref"/);
  assert.match(arrearsGateway, /forbidden_sources_excluded/);
  assert.match(bedGateway, /access_snapshot_context/);
  assert.match(bedGateway, /display_only:true/);
  assert.match(bedGateway, /provider_identity_allowed:false/);
  assert.match(bedGateway, /canonicalArrearsGateway/);
  for (const field of ["tenant_card_id", "card_id", "old_ttlock_ref", "provider_phone", "phone_99099", "customer_code"]) {
    assert.match(forbiddenList, new RegExp(field));
  }
  assert.match(cleaner, /canonicalArrearsForbiddenIdentityFields\.forEach\(field=>delete cleaned\[field\]\)/);
});

test("/api/arrear_tasks is gateway-first and does not use materialized/task identity as source-of-truth", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = functionBlock(worker, "handleArrearTasks");

  assert.match(handler, /canonicalArrearsGateway\(env,user,\{bed,limit:1000\}\)/);
  assert.match(handler, /source:"canonical_arrears_gateway"/);
  assert.match(handler, /no_write:true/);
  assert.match(handler, /readonly:true/);
  assert.doesNotMatch(handler, /empListMergedArrearTasksDetailed/);
  assert.doesNotMatch(handler, /arrearTasksProjectionFallback/);
  assert.doesNotMatch(handler, /SELECT \* FROM arrear_tasks/i);
  assert.doesNotMatch(handler, /tenant_card_id|customer_code|old_ttlock_ref|provider_phone|phone_99099/);
});

test("Employee bed-context endpoint is read-only and routed through Canonical Bed Context Gateway", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = functionBlock(worker, "handleEmployeeBedContext");
  const router = functionBlock(worker, "handleEmployeeApi");

  assert.match(handler, /canonicalBedContextGateway\(env,user,\{bed,limit:1000\}\)/);
  assert.match(handler, /BED_CONTEXT_UNAVAILABLE/);
  assert.match(handler, /no_write:true/);
  assert.match(handler, /readonly:true/);
  assert.match(router, /path==="\/api\/employee\/bed-context"/);
  assert.match(router, /handleEmployeeBedContext/);
});

test("Arrears Payment lookup and open arrears checks use the canonical gateway", async () => {
  const worker = await readFile(workerPath, "utf8");
  const apLookup = functionBlock(worker, "empFindProjectionArrearsForPayment");
  const openLookup = functionBlock(worker, "getOpenCloudArrearsForBed");

  assert.match(apLookup, /canonicalArrearsGateway\(env,user,\{bed,arrears_ref:cleanTaskId,limit:2000\}\)/);
  assert.doesNotMatch(apLookup, /rebuildCloudArrearsForBed|rebuildAllCloudArrears/);
  assert.match(openLookup, /canonicalArrearsGateway\(env,user,\{bed,limit:opts\.limit\|\|1000\}\)/);
  assert.doesNotMatch(openLookup, /projection\.open_items/);
});

test("Employee UI loads canonical arrears gateway metadata and treats lookup failures as unavailable", async () => {
  const html = await readFile(employeePath, "utf8");
  const loadTasks = functionBlock(html, "loadTasks");
  const stateLine = html.match(/const state=\{[^\n]+/s)?.[0] || "";

  assert.match(loadTasks, /apiFetch\('\/api\/arrear_tasks'\)/);
  assert.match(loadTasks, /state\.arrearsGatewaySource=data\.gateway\|\|data\.source\|\|''/);
  assert.match(loadTasks, /state\.arrearsGatewayProof=data\.source_proof\|\|null/);
  assert.match(loadTasks, /ARREAR_TASKS_UNAVAILABLE/);
  assert.match(stateLine, /arrearsGatewaySource:''/);
  assert.match(stateLine, /arrearsGatewayProof:null/);
});

test("Employee arrears lists are bed-only context lookups and cannot match by provider/card identity", async () => {
  const html = await readFile(employeePath, "utf8");
  const openTasks = functionBlock(html, "openTasksForBed");
  const openArrears = functionBlock(html, "employeeOpenArrearsForBed");
  const closedArrears = functionBlock(html, "employeeClosedArrearsForBed");

  for (const block of [openTasks, openArrears, closedArrears]) {
    assert.match(block, /taskBed|t\.bed/);
    assert.match(block, /bed|clean/);
    assert.doesNotMatch(block, /tenantCardId|tenant_card_id|customer_code|taskCid|cid/);
  }
});

test("Selecting cloud arrears does not copy provider/card identity into Arrears Payment state", async () => {
  const html = await readFile(employeePath, "utf8");
  const applyBlocks = allFunctionBlocks(html, "applyLinkedTask");
  const selectedTaskBlocks = allFunctionBlocks(html, "selectedTask");

  for (const block of applyBlocks) {
    assert.match(block, /findEmployeeTaskByRef|selectedTask/);
    assert.match(block, /\$\('tenantCardId'\)\)\$\('tenantCardId'\)\.value=''/);
    assert.doesNotMatch(block, /tenant_card_id\|\|task\.customer_code|task\.tenant_card_id/);
  }
  for (const block of selectedTaskBlocks) {
    assert.match(block, /findEmployeeTaskByRef/);
    assert.doesNotMatch(block, /t\.task_id===/);
  }
});
