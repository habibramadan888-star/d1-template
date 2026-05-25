const SAFE_REHEARSAL_ENVS = new Set(["local", "test", "development", "staging"]);
const OWNER_ROLES = new Set(["OWNER", "MANAGER", "ADMIN"]);
const EMPLOYEE_ROLES = new Set(["EMPLOYEE", "STAFF"]);
const ALL_PROPERTY = "*";
const TENANT_SCOPE_SHADOW_STAGING_FLAG = "ENABLE_TENANT_SCOPE_SHADOW_STAGING";

const ACTIONS = {
  DASHBOARD_READ: "DASHBOARD_READ",
  HISTORY_READ: "HISTORY_READ",
  EXPORT_READ: "EXPORT_READ",
  EMPLOYEE_ENTRY_WRITE: "EMPLOYEE_ENTRY_WRITE",
  ARREAR_TASK_READ: "ARREAR_TASK_READ",
  RENT_CONFIG_READ: "RENT_CONFIG_READ",
  RENT_CONFIG_WRITE: "RENT_CONFIG_WRITE",
  VOID_SESSION: "VOID_SESSION"
};

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
}

function normalizeRole(value) {
  return requiredString(value, "role").toUpperCase();
}

export function isTenantScopeRehearsalAllowed(env = {}) {
  const appEnv = String(env.APP_ENV || "")
    .trim()
    .toLowerCase();
  return SAFE_REHEARSAL_ENVS.has(appEnv);
}

export function isTenantScopeProductionDisabled(env = {}) {
  return !isTenantScopeRehearsalAllowed(env);
}

export function resolveTenantScopeShadowMode(env = {}) {
  const appEnv = String(env.APP_ENV || "")
    .trim()
    .toLowerCase();
  const flag = String(env[TENANT_SCOPE_SHADOW_STAGING_FLAG] ?? "")
    .trim()
    .toLowerCase();
  if (!SAFE_REHEARSAL_ENVS.has(appEnv)) {
    return {
      enabled: false,
      mode: "LEGACY",
      productionDisabled: true,
      dashboardMutationAllowed: false,
      reason: appEnv === "production" ? "production_always_disabled" : "env_not_allowed"
    };
  }
  if (flag !== "true") {
    return {
      enabled: false,
      mode: "LEGACY",
      productionDisabled: false,
      dashboardMutationAllowed: false,
      reason: "flag_off"
    };
  }
  return {
    enabled: true,
    mode: "TENANT_SCOPE_SHADOW",
    productionDisabled: false,
    dashboardMutationAllowed: false,
    reason: "staging_shadow_read_only"
  };
}

export function normalizeTenantScope(input = {}) {
  return {
    companyId: requiredString(input.company_id ?? input.companyId, "company_id"),
    propertyId: optionalString(input.property_id ?? input.propertyId),
    legacyCorpid: optionalString(input.corpid ?? input.legacyCorpid)
  };
}

export function normalizeMembership(input = {}) {
  return {
    userId: requiredString(input.user_id ?? input.userId, "membership.user_id"),
    companyId: requiredString(input.company_id ?? input.companyId, "membership.company_id"),
    propertyId: optionalString(input.property_id ?? input.propertyId) || ALL_PROPERTY,
    role: normalizeRole(input.role),
    active: input.active !== false
  };
}

export function normalizeActor(input = {}) {
  return {
    userId: requiredString(input.user_id ?? input.userId, "actor.user_id"),
    role: normalizeRole(input.role),
    sessionCompanyId: optionalString(input.company_id ?? input.companyId),
    sessionPropertyId: optionalString(input.property_id ?? input.propertyId),
    legacyCorpid: optionalString(input.corpid ?? input.legacyCorpid)
  };
}

function membershipMatchesTarget(membership, target) {
  if (!membership.active) return false;
  if (membership.companyId !== target.companyId) return false;
  if (!target.propertyId) return true;
  return membership.propertyId === ALL_PROPERTY || membership.propertyId === target.propertyId;
}

export function findMembership({ actor, memberships, target }) {
  const normalizedActor = normalizeActor(actor);
  const normalizedTarget = normalizeTenantScope(target);
  return memberships
    .map(normalizeMembership)
    .find(
      (membership) =>
        membership.userId === normalizedActor.userId &&
        membershipMatchesTarget(membership, normalizedTarget)
    );
}

function roleCanPerform(role, action) {
  const normalizedRole = normalizeRole(role);
  if (OWNER_ROLES.has(normalizedRole)) {
    return [
      ACTIONS.DASHBOARD_READ,
      ACTIONS.HISTORY_READ,
      ACTIONS.EXPORT_READ,
      ACTIONS.RENT_CONFIG_READ,
      ACTIONS.RENT_CONFIG_WRITE,
      ACTIONS.VOID_SESSION
    ].includes(action);
  }
  if (EMPLOYEE_ROLES.has(normalizedRole)) {
    return [
      ACTIONS.EMPLOYEE_ENTRY_WRITE,
      ACTIONS.ARREAR_TASK_READ,
      ACTIONS.RENT_CONFIG_READ
    ].includes(action);
  }
  return false;
}

export function authorizeTenantScope({
  env = { APP_ENV: "test" },
  actor,
  memberships,
  target,
  action
}) {
  if (isTenantScopeProductionDisabled(env)) {
    return {
      allowed: false,
      reason: "TENANT_SCOPE_REHEARSAL_DISABLED",
      productionSafe: true
    };
  }

  const normalizedAction = requiredString(action, "action").toUpperCase();
  const normalizedActor = normalizeActor(actor);
  const normalizedTarget = normalizeTenantScope(target);
  const membership = findMembership({
    actor: normalizedActor,
    memberships,
    target: normalizedTarget
  });
  if (!membership) {
    return {
      allowed: false,
      reason: "NO_PROPERTY_MEMBERSHIP",
      productionSafe: true
    };
  }
  if (!roleCanPerform(membership.role, normalizedAction)) {
    return {
      allowed: false,
      reason: "ROLE_NOT_ALLOWED_FOR_ACTION",
      productionSafe: true
    };
  }
  return {
    allowed: true,
    reason: "ALLOWED_BY_PROPERTY_MEMBERSHIP",
    productionSafe: true,
    scope: {
      companyId: normalizedTarget.companyId,
      propertyId: normalizedTarget.propertyId || membership.propertyId,
      membershipRole: membership.role
    }
  };
}

export function filterRowsForTenantScope(rows, target) {
  const normalizedTarget = normalizeTenantScope(target);
  return rows.filter((row) => {
    if (row.company_id !== normalizedTarget.companyId) return false;
    if (!normalizedTarget.propertyId) return true;
    return row.property_id === normalizedTarget.propertyId;
  });
}

export function filterRowsForActor({
  env = { APP_ENV: "test" },
  actor,
  memberships,
  rows,
  action
}) {
  if (isTenantScopeProductionDisabled(env)) return [];
  const normalizedActor = normalizeActor(actor);
  const normalizedMemberships = memberships
    .map(normalizeMembership)
    .filter((membership) => membership.userId === normalizedActor.userId && membership.active);
  const normalizedAction = requiredString(action, "action").toUpperCase();

  return rows.filter((row) => {
    const target = normalizeTenantScope(row);
    const membership = normalizedMemberships.find((candidate) =>
      membershipMatchesTarget(candidate, target)
    );
    return membership && roleCanPerform(membership.role, normalizedAction);
  });
}

export function buildTenantScopeScenario({
  name,
  env = { APP_ENV: "test" },
  actor,
  memberships,
  target,
  action,
  rows = [],
  expectedAllowed
}) {
  const auth = authorizeTenantScope({ env, actor, memberships, target, action });
  const visibleRows = auth.allowed
    ? filterRowsForTenantScope(rows, target).map((row) => row.id || row.row_id)
    : [];
  const leakedRows = visibleRows.filter((id) => {
    const row = rows.find((candidate) => (candidate.id || candidate.row_id) === id);
    return row && (row.company_id !== target.company_id || row.property_id !== target.property_id);
  });
  const pass = auth.allowed === expectedAllowed && leakedRows.length === 0;
  return {
    Scenario: name,
    Action: action,
    "Expected Allowed": expectedAllowed ? "yes" : "no",
    "Actual Allowed": auth.allowed ? "yes" : "no",
    "Visible Rows": visibleRows.join(", ") || "none",
    "Leaked Rows": leakedRows.join(", ") || "none",
    Result: pass ? "PASS" : "BLOCKED",
    Notes: auth.reason
  };
}

export function summarizeTenantScopeScenarios(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const leaks = rows.filter((row) => row["Leaked Rows"] !== "none");
  return {
    overall: blocked.length || leaks.length ? "BLOCKED" : "PASS",
    blockedCount: blocked.length,
    leakCount: leaks.length,
    scenarioCount: rows.length
  };
}

export { ACTIONS, ALL_PROPERTY, TENANT_SCOPE_SHADOW_STAGING_FLAG };
