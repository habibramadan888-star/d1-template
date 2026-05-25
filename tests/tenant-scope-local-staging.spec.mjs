import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIONS,
  authorizeTenantScope,
  buildTenantScopeScenario,
  filterRowsForActor,
  isTenantScopeProductionDisabled,
  isTenantScopeRehearsalAllowed,
  summarizeTenantScopeScenarios
} from "../modules/tenant/scope.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/tenant-scope/local-staging.json", import.meta.url), "utf8")
);
const env = { APP_ENV: "staging" };

function target(companyId, propertyId) {
  return { company_id: companyId, property_id: propertyId, corpid: "homelink" };
}

test("production and missing APP_ENV disable tenant scope rehearsal", () => {
  assert.equal(isTenantScopeRehearsalAllowed({ APP_ENV: "staging" }), true);
  assert.equal(isTenantScopeRehearsalAllowed({ APP_ENV: "test" }), true);
  assert.equal(isTenantScopeProductionDisabled({ APP_ENV: "production" }), true);
  assert.equal(isTenantScopeProductionDisabled({}), true);
});

test("owner can read own company property dashboard rows", () => {
  const result = authorizeTenantScope({
    env,
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    target: target("company_a", "property_a_1"),
    action: ACTIONS.DASHBOARD_READ
  });

  assert.equal(result.allowed, true);
  assert.equal(result.scope.companyId, "company_a");
});

test("owner cannot read another company property with same legacy corpid", () => {
  const result = authorizeTenantScope({
    env,
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    target: target("company_b", "property_b_1"),
    action: ACTIONS.DASHBOARD_READ
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "NO_PROPERTY_MEMBERSHIP");
});

test("employee can write assigned property entry but not another property", () => {
  const allowed = authorizeTenantScope({
    env,
    actor: fixture.actors.employeeA1,
    memberships: fixture.memberships,
    target: target("company_a", "property_a_1"),
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });
  const denied = authorizeTenantScope({
    env,
    actor: fixture.actors.employeeA1,
    memberships: fixture.memberships,
    target: target("company_a", "property_a_2"),
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });

  assert.equal(allowed.allowed, true);
  assert.equal(denied.allowed, false);
});

test("employee cannot access owner dashboard even inside assigned property", () => {
  const result = authorizeTenantScope({
    env,
    actor: fixture.actors.employeeA1,
    memberships: fixture.memberships,
    target: target("company_a", "property_a_1"),
    action: ACTIONS.DASHBOARD_READ
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "ROLE_NOT_ALLOWED_FOR_ACTION");
});

test("same bed and CID are isolated by company and property scope", () => {
  const visible = filterRowsForActor({
    env,
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    rows: fixture.rows,
    action: ACTIONS.HISTORY_READ
  });

  assert.deepEqual(visible.map((row) => row.id).sort(), ["session_a_1", "transaction_a_2"]);
  assert.equal(
    visible.some((row) => row.id === "arrear_b_1"),
    false
  );
});

test("missing membership denies access", () => {
  const result = authorizeTenantScope({
    env,
    actor: fixture.actors.orphan,
    memberships: fixture.memberships,
    target: target("company_a", "property_a_1"),
    action: ACTIONS.DASHBOARD_READ
  });

  assert.equal(result.allowed, false);
});

test("scenario summary blocks leaks and passes clean cross-tenant denial", () => {
  const rows = [
    buildTenantScopeScenario({
      name: "owner A dashboard own property",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.DASHBOARD_READ,
      rows: fixture.rows,
      expectedAllowed: true
    }),
    buildTenantScopeScenario({
      name: "owner A denied company B",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_b", "property_b_1"),
      action: ACTIONS.DASHBOARD_READ,
      rows: fixture.rows,
      expectedAllowed: false
    })
  ];

  const summary = summarizeTenantScopeScenarios(rows);
  assert.equal(summary.overall, "PASS");
  assert.equal(summary.blockedCount, 0);
  assert.equal(summary.leakCount, 0);
});

test("dashboard and history rehearsal helpers do not mutate live result", () => {
  const before = fixture.rows.map((row) => ({ ...row }));
  filterRowsForActor({
    env,
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    rows: fixture.rows,
    action: ACTIONS.HISTORY_READ
  });

  assert.deepEqual(fixture.rows, before);
});
