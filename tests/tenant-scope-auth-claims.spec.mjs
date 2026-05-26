import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ALL_PROPERTY,
  assertTenantScopedAccess,
  buildTenantScopeClaim,
  claimToTenantScopeActor,
  claimToTenantScopeMemberships,
  classifyClaimScopeRisk,
  deriveTenantScopeFromLegacyUser,
  formatTenantScopeAudit,
  getAllowedPropertyIds,
  validateTenantScopeClaim
} from "../modules/auth/tenant-claims.mjs";
import { ACTIONS, authorizeTenantScope } from "../modules/tenant/scope.mjs";

const issuedAt = "2026-05-26T00:00:00.000Z";
const expiresAt = "2026-05-26T01:00:00.000Z";

function employeeClaim(overrides = {}) {
  return buildTenantScopeClaim(
    {
      userid: "employee_a_1",
      role: "staff",
      employee_id: "employee_a_1",
      tenant_id: "company_a",
      corpid: "homelink",
      allowed_property_ids: ["property_a_1"],
      ...overrides
    },
    { issued_at: issuedAt, expires_at: expiresAt }
  );
}

function ownerClaim(overrides = {}) {
  return buildTenantScopeClaim(
    {
      userid: "owner_a",
      role: "owner",
      owner_id: "owner_a",
      tenant_id: "company_a",
      corpid: "homelink",
      allowed_property_ids: [ALL_PROPERTY],
      ...overrides
    },
    { issued_at: issuedAt, expires_at: expiresAt }
  );
}

test("employee claim includes role and employee_id", () => {
  const claim = employeeClaim();

  assert.equal(claim.role, "employee");
  assert.equal(claim.employee_id, "employee_a_1");
  assert.equal(claim.sub, "employee_a_1");
  assert.deepEqual(claim.allowed_property_ids, ["property_a_1"]);
});

test("employee claim with tenant_id passes", () => {
  const validation = validateTenantScopeClaim(employeeClaim(), { appEnv: "staging" });

  assert.equal(validation.status, "WARNING");
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
  assert.ok(validation.warnings.includes("LEGACY_CORPID_PRESENT_COMPATIBILITY_ONLY"));
});

test("employee claim missing tenant_id produces staging legacy warning", () => {
  const claim = deriveTenantScopeFromLegacyUser(
    { userid: "employee_a_1", role: "staff", employee_id: "employee_a_1", corpid: "homelink" },
    { allowed_property_ids: ["property_a_1"] }
  );
  const validation = validateTenantScopeClaim(claim, { appEnv: "staging" });

  assert.equal(validation.valid, true);
  assert.ok(validation.warnings.includes("LEGACY_CORPID_FALLBACK"));
  assert.equal(classifyClaimScopeRisk(claim, { appEnv: "staging" }), "LEGACY_FALLBACK_WARNING");
});

test("owner claim includes owner_id and tenant_id", () => {
  const claim = ownerClaim();
  const validation = validateTenantScopeClaim(claim, { appEnv: "staging" });

  assert.equal(claim.role, "owner");
  assert.equal(claim.owner_id, "owner_a");
  assert.equal(claim.tenant_id, "company_a");
  assert.equal(validation.valid, true);
});

test("manager/admin claim is constrained by tenant and property", () => {
  const manager = buildTenantScopeClaim(
    {
      userid: "manager_a",
      role: "manager",
      manager_id: "manager_a",
      tenant_id: "company_a",
      allowed_property_ids: ["property_a_1"]
    },
    { issued_at: issuedAt, expires_at: expiresAt }
  );
  const denied = assertTenantScopedAccess(manager, {
    tenant_id: "company_a",
    property_id: "property_a_2",
    action: ACTIONS.RENT_CONFIG_WRITE
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, "CROSS_PROPERTY_DENIED");
});

test("front-end supplied tenant_id is ignored by claim builder", () => {
  const claim = buildTenantScopeClaim(
    {
      userid: "employee_a_1",
      role: "staff",
      employee_id: "employee_a_1",
      tenant_id: "company_a",
      allowed_property_ids: ["property_a_1"]
    },
    {
      frontEndTenantId: "company_b",
      front_end_tenant_id: "company_b"
    }
  );

  assert.equal(claim.tenant_id, "company_a");
});

test("corp_id fallback is warning-only and not production authority", () => {
  const claim = deriveTenantScopeFromLegacyUser(
    { userid: "owner_a", role: "owner", owner_id: "owner_a", corpid: "homelink" },
    { allowed_property_ids: [ALL_PROPERTY] }
  );

  assert.equal(classifyClaimScopeRisk(claim, { appEnv: "staging" }), "LEGACY_FALLBACK_WARNING");
  assert.equal(classifyClaimScopeRisk(claim, { appEnv: "production" }), "PRODUCTION_UNSAFE");
});

test("allowed_property_ids limits access", () => {
  const allowed = assertTenantScopedAccess(employeeClaim(), {
    tenant_id: "company_a",
    property_id: "property_a_1",
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });
  const denied = assertTenantScopedAccess(employeeClaim(), {
    tenant_id: "company_a",
    property_id: "property_a_2",
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });

  assert.equal(allowed.allowed, true);
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, "CROSS_PROPERTY_DENIED");
});

test("cross-tenant access is denied", () => {
  const result = assertTenantScopedAccess(ownerClaim(), {
    tenant_id: "company_b",
    property_id: "property_b_1",
    action: ACTIONS.HISTORY_READ
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "CROSS_TENANT_DENIED");
});

test("production missing tenant_id is unsafe", () => {
  const claim = deriveTenantScopeFromLegacyUser(
    { userid: "employee_a_1", role: "staff", employee_id: "employee_a_1", corpid: "homelink" },
    { allowed_property_ids: ["property_a_1"] }
  );
  const validation = validateTenantScopeClaim(claim, { appEnv: "production" });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("MISSING_TENANT_ID_PRODUCTION_UNSAFE"));
});

test("staging rehearsal missing tenant_id is warning, not production-ready", () => {
  const claim = deriveTenantScopeFromLegacyUser(
    { userid: "employee_a_1", role: "staff", employee_id: "employee_a_1", corpid: "homelink" },
    { allowed_property_ids: ["property_a_1"] }
  );
  const stagingValidation = validateTenantScopeClaim(claim, { appEnv: "staging" });
  const productionValidation = validateTenantScopeClaim(claim, { appEnv: "production" });

  assert.equal(stagingValidation.status, "WARNING");
  assert.equal(productionValidation.status, "BLOCKED");
});

test("claim can feed tenant route/query authorization without hardcoded CORPID", () => {
  const claim = employeeClaim({ corpid: "homelink" });
  const actor = claimToTenantScopeActor(claim);
  const memberships = claimToTenantScopeMemberships(claim);
  const auth = authorizeTenantScope({
    env: { APP_ENV: "staging" },
    actor,
    memberships,
    target: { company_id: "company_a", property_id: "property_a_1" },
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });

  assert.equal(auth.allowed, true);
  assert.equal(memberships[0].company_id, "company_a");
});

test("rollback and legacy behavior are preserved by non-invasive helper", () => {
  const audit = formatTenantScopeAudit(employeeClaim(), { appEnv: "staging" });
  const source = readFileSync(
    new URL("../modules/auth/tenant-claims.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(getAllowedPropertyIds(employeeClaim()).join(","), "property_a_1");
  assert.equal(audit.sub, "employee_a_1");
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /wrangler/i);
  assert.doesNotMatch(source, /UPDATE\s+/i);
  assert.doesNotMatch(source, /INSERT\s+/i);
  assert.doesNotMatch(source, /DELETE\s+/i);
});
