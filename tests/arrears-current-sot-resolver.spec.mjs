import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("current receivables compatibility resolver delegates to console SOT", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const resolver = extractFunction(worker, "resolveCurrentReceivablesSot");
  const consoleResolver = extractFunction(worker, "resolveConsoleReceivablesSot");

  assert.match(resolver, /resolveConsoleReceivablesSot\(env,user,opts\)/);
  assert.match(consoleResolver, /ttlock_expired_unpaid:ttlockRows/);
  assert.match(consoleResolver, /existing_arrears:existingRows/);
  assert.match(consoleResolver, /source:"owner_console_current_view"/);
  assert.match(consoleResolver, /source_function:"cp_getStatus_cp_computeMetrics"/);
  assert.match(consoleResolver, /production_cutover:"PRODUCTION_NO_GO"/);
  assert.doesNotMatch(resolver, /\.run\(/);
});

test("owner, employee, and overview read paths call the current resolver", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /handleBossArrears\(request,env,user\)[\s\S]*resolveCurrentReceivablesSot/);
  assert.match(worker, /handleBossArrearsFollowupTasks\(request,env,user\)[\s\S]*resolveCurrentReceivablesSot/);
  assert.match(worker, /handleEmployeeSystemReminders\(request,env,user\)[\s\S]*resolveCurrentReceivablesSot/);
  assert.match(worker, /phase0OwnerOverviewComparativeSummary\(env,user,url\)[\s\S]*resolveCurrentReceivablesSot/);
  assert.match(worker, /\/api\/owner\/current-receivables-sot/);
  assert.match(worker, /\/api\/owner\/console-receivables-sot/);
});
