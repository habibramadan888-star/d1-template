import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACCESS_MATRIX_FLAG,
  createTenantScopeAccessMatrixGate,
  resolveAccessMatrixMode
} from "../scripts/rehearse-tenant-scope-access-matrix.mjs";

function scenario(name) {
  const result = createTenantScopeAccessMatrixGate();
  return result.rows.find((row) => row.Scenario === name);
}

test("unauthenticated denied", () => {
  const row = scenario("unauthenticated employee entry denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_401");
});

test("invalid JWT denied", () => {
  const row = scenario("invalid JWT history denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_401");
});

test("employee own tenant allowed", () => {
  const row = scenario("employee own tenant entry allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("employee other tenant denied", () => {
  const row = scenario("employee other tenant entry denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_403");
});

test("employee own property allowed", () => {
  const row = scenario("employee own property rent config read allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("employee other property denied", () => {
  const row = scenario("employee other property rent config denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_403");
});

test("owner own tenant allowed", () => {
  const row = scenario("owner tenant dashboard allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("owner other tenant denied", () => {
  const row = scenario("owner other tenant dashboard denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_403");
});

test("manager and admin constrained by tenant and property", () => {
  const managerOwn = scenario("manager app settings own property allowed");
  const managerOther = scenario("manager app settings other property denied");
  const adminOwn = scenario("admin own tenant tenant records allowed");
  const adminOther = scenario("admin other tenant tenant records denied");

  assert.equal(managerOwn.Actual, "ALLOW");
  assert.equal(managerOther.Actual, "DENY_403");
  assert.equal(adminOwn.Actual, "ALLOW");
  assert.equal(adminOther.Actual, "DENY_403");
});

test("frontend tenant_id tamper ignored", () => {
  const row = scenario("frontend tenant id tamper ignored");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "company_a");
});

test("legacy CORPID fallback warning preserved", () => {
  const row = scenario("legacy CORPID fallback warning preserved");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "LEGACY_WARNING");
});

test("delete_session respects scope", () => {
  const own = scenario("owner delete session own tenant allowed");
  const other = scenario("owner delete session other tenant denied");
  const employee = scenario("employee delete session denied");

  assert.equal(own.Actual, "ALLOW");
  assert.equal(other.Actual, "DENY_403");
  assert.equal(employee.Actual, "DENY_403");
});

test("dashboard/history respects scope", () => {
  const own = scenario("owner tenant dashboard allowed");
  const other = scenario("owner other tenant dashboard denied");
  const employeeDenied = scenario("employee owner dashboard denied");

  assert.equal(own.Actual, "ALLOW");
  assert.equal(other.Actual, "DENY_403");
  assert.equal(employeeDenied.Actual, "DENY_403");
});

test("audit_logs scoped or marked manual_required", () => {
  const row = scenario("audit logs require manual production mapping");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "MANUAL_REQUIRED");
});

test("settings/app_settings scoped or marked blocked/manual_required", () => {
  const own = scenario("manager app settings own property allowed");
  const other = scenario("manager app settings other property denied");

  assert.equal(own.Result, "PASS");
  assert.equal(own.Actual, "ALLOW");
  assert.equal(other.Result, "PASS");
  assert.equal(other.Actual, "DENY_403");
});

test("production env remains disabled/no-go for tenant authority switch", () => {
  const mode = resolveAccessMatrixMode({
    APP_ENV: "production",
    [ACCESS_MATRIX_FLAG]: "true"
  });
  const row = scenario("production access matrix authority remains disabled");

  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
  assert.equal(row.Result, "PASS");
});

test("access matrix source does not call production or mutate D1", () => {
  const source = readFileSync(
    new URL("../scripts/rehearse-tenant-scope-access-matrix.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /wrangler/i);
  assert.doesNotMatch(source, /d1\s+execute/i);
  assert.doesNotMatch(source, /https:\/\/homelink-finance\.workers\.dev/i);
});
