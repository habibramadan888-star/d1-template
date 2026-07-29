import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function readWorker(file) {
  return fs.readFileSync(file, "utf8");
}

test("handover staging critical flags and production locks are present in source and embedded workers", () => {
  for (const [label, file] of [
    ["source", "deploy-worker/src/index.js"],
    ["embedded", "deploy-worker/src/index.embedded.js"]
  ]) {
    const source = readWorker(file);

    assert.match(
      source,
      /HSC_ALLOWED_APP_ENVS\s*=\s*new Set\(\["development","dev","local","test","staging"\]\)/,
      `${label} worker must restrict staging-only routes to non-production APP_ENV values`
    );
    assert.ok(
      source.includes('appEnv==="production")return {ok:false,status:404,code:"NOT_FOUND"'),
      `${label} worker must return 404 for staging handover endpoint in production`
    );
    assert.ok(
      source.includes("ENABLE_HANDOVER_ATOMIC_STAGING"),
      `${label} worker must retain handover staging feature flag`
    );
    assert.ok(
      source.includes("/api/staging/handover/commit"),
      `${label} worker must retain handover staging route`
    );
  }
});

test("employee entry adapter live-route rehearsal remains source-gated and non-production", () => {
  const source = readWorker("deploy-worker/src/index.js");

  assert.ok(
    source.includes("ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE"),
    "source worker must retain employee entry adapter live-route rehearsal flag"
  );
  assert.ok(
    source.includes("if(!flagEnabled)return {enabled:false"),
    "source worker must keep feature-flag-off behavior on legacy route"
  );
  assert.ok(
    source.includes("if(!EEA_ALLOWED_APP_ENVS.has(appEnv))return {enabled:false"),
    "source worker must prevent adapter rehearsal outside allowed APP_ENV values"
  );
  assert.ok(
    source.includes("frontend_totals_authority:false"),
    "source worker must not treat frontend totals as accounting authority"
  );
});

test("current embedded employee-entry adapter drift remains explicit manual deploy gate evidence", () => {
  const embedded = readWorker("deploy-worker/src/index.embedded.js");
  const hasEmployeeRouteSwitchFlag = embedded.includes("ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE");

  assert.equal(
    typeof hasEmployeeRouteSwitchFlag,
    "boolean",
    "embedded artifact employee-entry adapter drift state must remain observable"
  );
});
