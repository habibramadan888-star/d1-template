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

test("/api/arrear_tasks supports bed-filtered projection fallback before returning 503", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = functionBlock(worker, "handleArrearTasks");

  assert.match(worker, /function arrearTasksBedFromRequest\(request\)/);
  assert.match(worker, /url\.searchParams\.get\("bed"\)/);
  assert.match(worker, /function arrearTasksProjectionFallback\(env,user,bed,trace,opts=\{\}\)/);
  assert.match(worker, /bed\?await rebuildCloudArrearsForBed\(env,user,bed,\{limit:opts\.limit\|\|1000\}\):await rebuildAllCloudArrears/);
  assert.match(handler, /try\{\s*const detailed=await empListMergedArrearTasksDetailed\(env,user,\{limit:200\}\)/);
  assert.match(handler, /catch\(e\)\{\s*const code=empReadErrorCode\(e\)/);
  assert.match(handler, /const fallback=await arrearTasksProjectionFallback\(env,user,bed,trace,\{limit:1000\}\)/);
  assert.match(handler, /if\(fallback\.ok\)\{\s*return success\(arrearTasksPayload\(fallback\.tasks,\[\],"cloud_arrears_projection_fallback"/);
  assert.match(handler, /error_code:"ARREAR_TASKS_UNAVAILABLE"/);
  assert.match(handler, /diagnostic_trace:trace/);
});

test("/api/arrear_tasks normal response exposes explicit ok, totals, and empty-list contract", async () => {
  const worker = await readFile(workerPath, "utf8");
  const payload = functionBlock(worker, "arrearTasksPayload");

  assert.match(payload, /success:true/);
  assert.match(payload, /ok:true/);
  assert.match(payload, /tasks,/);
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
  assert.match(load, /if\(!r\.ok\)/);
  assert.match(load, /state\.arrearTasksError=data\|\|\{error_code:'ARREAR_TASKS_UNAVAILABLE'\}/);
  assert.match(load, /Arrears temporarily unavailable \/ 欠款信息暂不可用/);
  assert.match(strip, /const arrearsUnavailable=!!state\.arrearTasksError&&!loading/);
  assert.match(strip, /const open=arrearsUnavailable\?\[\]:employeeOpenTasksForBedValue\(bed\)/);
  assert.match(strip, /arrearsUnavailable\?'Arrears Unavailable'/);
  assert.match(strip, /arrearsUnavailable\?'Arrears temporarily unavailable'/);
});
