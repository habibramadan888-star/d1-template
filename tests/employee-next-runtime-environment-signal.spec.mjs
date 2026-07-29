import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worker = await readFile(
  new URL("../deploy-worker/src/index.js", import.meta.url),
  "utf8",
);

function functionBlock(name) {
  const start = worker.indexOf(`function ${name}`);
  const end = worker.indexOf(`__name(${name},`, start);
  assert.ok(start >= 0 && end > start, `${name} must exist`);
  return worker.slice(start, end);
}

function loadTrustedRuntimeEnvironment() {
  const source = functionBlock("trustedRuntimeEnvironment");
  return Function(`${source}; return trustedRuntimeEnvironment;`)();
}

test("trusted runtime environment accepts only exact production and staging values", () => {
  const trustedRuntimeEnvironment = loadTrustedRuntimeEnvironment();
  assert.equal(trustedRuntimeEnvironment({ APP_ENV: "production" }), "production");
  assert.equal(trustedRuntimeEnvironment({ APP_ENV: "staging" }), "staging");
  for (const APP_ENV of [
    "",
    "internal_beta",
    "development",
    "homelink-staging",
    "production-staging",
    undefined,
  ]) {
    assert.equal(trustedRuntimeEnvironment({ APP_ENV }), "");
  }
});

test("runtime environment signal is minimal and fail-closed", () => {
  const response = functionBlock("runtimeEnvironmentSignalResponse");
  assert.match(response, /trustedRuntimeEnvironment\(env\)/);
  assert.match(response, /if\(!environment\)return errorResponse\("runtime_environment_unavailable",503\)/);
  assert.match(response, /success\(\{status:"healthy",environment\}\)/);
  for (const forbidden of [
    "SECRET",
    "USER_ACCOUNTS",
    "database_id",
    "namespace_id",
    "TTLOCK",
    "STAGING_ALLOWED_HOST",
    "STAGING_ALLOWED_ORIGIN",
  ]) {
    assert.doesNotMatch(response, new RegExp(forbidden, "i"));
  }
});

test("health environment signal remains available without exposing other Phase 0 routes", () => {
  const handleRequest = functionBlock("handleRequest");
  const phase0 = functionBlock("handlePhase0ReadOnlyApi");
  const signalIndex = handleRequest.indexOf('path==="/api/health"&&method==="GET"');
  const phase0Index = handleRequest.indexOf("handlePhase0ReadOnlyApi(request, env, user)");
  assert.ok(signalIndex >= 0 && signalIndex < phase0Index);
  assert.match(handleRequest, /return runtimeEnvironmentSignalResponse\(env\)/);
  assert.doesNotMatch(phase0, /path==="\/api\/health"&&method==="GET"/);
  assert.match(phase0, /^function handlePhase0ReadOnlyApi\(request,env,user\)\{\s*if\(!isPhase0RouteWiringEnabled\(env\)\)return null;/);
  assert.match(phase0, /path==="\/api\/health\/db"&&method==="GET"/);
  assert.match(phase0, /path==="\/api\/properties"/);
});
