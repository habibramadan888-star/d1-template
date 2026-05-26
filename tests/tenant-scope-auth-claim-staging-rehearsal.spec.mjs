import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUTH_CLAIM_STAGING_FLAG,
  createTenantScopeAuthClaimStagingRehearsal,
  resolveAuthClaimStagingMode
} from "../scripts/rehearse-tenant-scope-auth-claim-staging.mjs";

test("employee own tenant is allowed", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const row = result.rows.find((item) => item.Scenario === "employee own tenant allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "allowed");
});

test("employee other tenant is denied", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const row = result.rows.find((item) => item.Scenario === "employee other tenant denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "denied");
});

test("employee allowed property is allowed", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const row = result.rows.find((item) => item.Scenario === "employee own property route wiring");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "allowed");
});

test("employee other property is denied", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const row = result.rows.find((item) => item.Scenario === "employee other property denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "denied");
});

test("owner tenant access is allowed and other tenant is denied", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const own = result.rows.find((item) => item.Scenario === "owner tenant-level history allowed");
  const other = result.rows.find((item) => item.Scenario === "owner other tenant denied");

  assert.equal(own.Actual, "allowed");
  assert.equal(other.Actual, "denied");
});

test("manager is constrained by tenant and property", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const own = result.rows.find((item) => item.Scenario === "manager own property write allowed");
  const other = result.rows.find((item) => item.Scenario === "manager other property denied");

  assert.equal(own.Actual, "allowed");
  assert.equal(other.Actual, "denied");
});

test("missing tenant claim is warning in staging and unsafe in production", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const staging = result.rows.find(
    (item) => item.Scenario === "missing tenant staging fallback warning"
  );
  const production = result.rows.find(
    (item) => item.Scenario === "missing tenant production blocked"
  );

  assert.equal(staging.Actual, "LEGACY_FALLBACK_WARNING");
  assert.equal(production.Actual, "PRODUCTION_UNSAFE");
});

test("frontend tenant_id is ignored", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const row = result.rows.find((item) => item.Scenario === "frontend tenant tamper ignored");

  assert.equal(row.Actual, "company_a");
  assert.equal(row.Result, "PASS");
});

test("legacy CORPID fallback warning is preserved", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();

  assert.equal(result.summary.legacyFallbackWarning, true);
});

test("route and query wiring consume auth claim", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const route = result.rows.find((item) => item.Scenario === "employee own property route wiring");
  const query = result.rows.find((item) => item.Scenario === "owner query consumes auth claim");

  assert.equal(route.Result, "PASS");
  assert.equal(query.Result, "PASS");
  assert.notEqual(query.Actual, "none");
});

test("production env is disabled and no-go", () => {
  const mode = resolveAuthClaimStagingMode({
    APP_ENV: "production",
    [AUTH_CLAIM_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
});

test("rollback restores legacy behavior", () => {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  const rollback = result.rows.find(
    (item) => item.Scenario === "rollback flag false restores legacy"
  );

  assert.equal(result.summary.finalFlagFalse, true);
  assert.equal(rollback.Actual, "false / LEGACY");
});

test("staging rehearsal source does not call production or mutate D1", () => {
  const source = readFileSync(
    new URL("../scripts/rehearse-tenant-scope-auth-claim-staging.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /wrangler/i);
  assert.doesNotMatch(source, /d1\s+execute/i);
  assert.doesNotMatch(source, /UPDATE\s+/i);
  assert.doesNotMatch(source, /INSERT\s+/i);
  assert.doesNotMatch(source, /DELETE\s+/i);
  assert.doesNotMatch(source, /DROP\s+/i);
});
