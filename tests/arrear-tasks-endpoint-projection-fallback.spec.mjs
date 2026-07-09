import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";
const employeePath = "deploy-worker/public/employee-v3.html";

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} exists`);
  let end = source.indexOf(`__name(${name}`, start);
  if (end < 0) end = source.indexOf("\nfunction ", start + 1);
  assert.ok(end > start, `${name} block end exists`);
  return source.slice(start, end);
}

test("/api/arrear_tasks uses canonical arrears gateway without returning 503", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = functionBlock(worker, "handleArrearTasks");

  assert.match(worker, /function arrearTasksBedFromRequest\(request\)/);
  assert.match(worker, /url\.searchParams\.get\("bed"\)/);
  assert.match(worker, /async function canonicalArrearsGateway\(env,user,opts=\{\}\)/);
  assert.match(worker, /bed\?await rebuildCloudArrearsForBed\(env,user,bed,\{limit\}\):await rebuildAllCloudArrears/);
  assert.match(handler, /const gateway=await canonicalArrearsGateway\(env,user,\{bed,limit:1000\}\)/);
  assert.match(handler, /source:"canonical_arrears_gateway"/);
  assert.match(handler, /return json\(arrearTasksPayload\(gateway\.open_items,gateway\.closed_items,"canonical_arrears_gateway",trace/);
  assert.match(handler, /error_code:"ARREAR_TASKS_UNAVAILABLE"/);
  assert.match(handler, /root_cause:"CANONICAL_ARREARS_GATEWAY_FAILED"/);
  assert.match(worker, /diagnostic_trace:trace/);
  assert.doesNotMatch(handler, /empListMergedArrearTasksDetailed|arrearTasksProjectionFallback|SELECT \* FROM arrear_tasks/i);
  assert.doesNotMatch(handler, /,503\)/);
});

test("/api/arrear_tasks normal response exposes explicit ok, totals, and empty-list contract", async () => {
  const worker = await readFile(workerPath, "utf8");
  const payload = functionBlock(worker, "arrearTasksPayload");

  assert.match(payload, /success:true/);
  assert.match(payload, /ok:true/);
  assert.match(payload, /tasks,/);
  assert.match(payload, /items:tasks/);
  assert.match(payload, /closed_tasks:closedTasks/);
  assert.match(payload, /total_remaining:arrearTasksTotalRemaining\(tasks\)/);
  assert.match(payload, /total_count:\(tasks\|\|\[\]\)\.length/);
  assert.match(payload, /diagnostic_trace:trace/);
});

test("employee arrears read failure is shown as unavailable, not no-open-arrears", async () => {
  const html = await readFile(employeePath, "utf8");
  const strip = functionBlock(html, "employeeRenderBedInfoStrip");
  const load = html.slice(
    html.indexOf("async function loadTasks"),
    html.indexOf("const employeeUploadStateLegacyLoadTasks", html.indexOf("async function loadTasks"))
  );

  assert.match(html, /arrearTasksError:null/);
  assert.match(load, /if\(!r\.ok\|\|data\.ok===false\)/);
  assert.match(load, /state\.arrearTasksError=data\|\|\{error_code:'ARREAR_TASKS_UNAVAILABLE'\}/);
  assert.match(load, /Arrears temporarily unavailable \/ 欠款信息暂不可用/);
  assert.match(html, /state\.arrearsTasksLoaded=Array\.isArray\(state\.tasks\)&&!state\.arrearTasksError/);
  assert.match(strip, /const arrearsUnavailable=!!state\.arrearTasksError&&!loading/);
  assert.match(strip, /const open=arrearsUnavailable\?\[\]:employeeOpenTasksForBedValue\(bed\)/);
  assert.match(strip, /arrearsUnavailable\?'Arrears Unavailable'/);
  assert.match(strip, /arrearsUnavailable\?'Arrears temporarily unavailable'/);
});

test("arrears lookup failure cannot mark rent records stale", async () => {
  const html = await readFile(employeePath, "utf8");
  const recordState = functionBlock(html, "employeeSessionRecordState");
  const uploadSession = functionBlock(html, "commitSessionAndExport");

  assert.match(recordState, /if\(entry\?\.type==='AP'\)\{/);
  assert.match(recordState, /if\(ref&&state\.arrearsTasksLoaded&&!openRefs\.has\(ref\)\)/);
  assert.doesNotMatch(recordState, /entry\?\.type==='R'[\s\S]*ARREARS_REF_STALE_REFRESH_REQUIRED/);
  assert.doesNotMatch(uploadSession, /state\.arrearTasksError|state\.arrearsTasksLoaded/);
});
