const SAFE_REHEARSAL_ENVS = new Set(["development", "dev", "local", "test", "staging"]);
const ALL_PROPERTY = "*";

const ROLE_ALIASES = new Map([
  ["staff", "employee"],
  ["employee", "employee"],
  ["owner", "owner"],
  ["manager", "manager"],
  ["admin", "admin"]
]);

const DEFAULT_PERMISSIONS = {
  employee: ["EMPLOYEE_ENTRY_WRITE", "ARREAR_TASK_READ", "RENT_CONFIG_READ"],
  owner: ["DASHBOARD_READ", "HISTORY_READ", "EXPORT_READ", "RENT_CONFIG_READ", "VOID_SESSION"],
  manager: [
    "DASHBOARD_READ",
    "HISTORY_READ",
    "EXPORT_READ",
    "RENT_CONFIG_READ",
    "RENT_CONFIG_WRITE",
    "VOID_SESSION"
  ],
  admin: [
    "DASHBOARD_READ",
    "HISTORY_READ",
    "EXPORT_READ",
    "RENT_CONFIG_READ",
    "RENT_CONFIG_WRITE",
    "VOID_SESSION",
    "TENANT_ADMIN"
  ]
};

function stringOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeRole(value) {
  const role = stringOrNull(value)?.toLowerCase();
  return role ? ROLE_ALIASES.get(role) || role : null;
}

function normalizePropertyIds(value) {
  if (value === undefined || value === null || value === "") return [];
  const raw = Array.isArray(value) ? value : String(value).split(",");
  return [...new Set(raw.map((item) => stringOrNull(item)).filter(Boolean))];
}

function isSafeRehearsalEnv(appEnv) {
  return SAFE_REHEARSAL_ENVS.has(
    String(appEnv || "")
      .trim()
      .toLowerCase()
  );
}

function roleIdField(role) {
  if (role === "employee") return "employee_id";
  if (role === "owner") return "owner_id";
  if (role === "manager") return "manager_id";
  if (role === "admin") return "admin_id";
  return null;
}

export function buildTenantScopeClaim(user = {}, context = {}) {
  const role = normalizeRole(context.role ?? user.role);
  const tenantId = stringOrNull(
    user.tenant_id ??
      user.tenantId ??
      user.company_id ??
      user.companyId ??
      context.tenant_id ??
      context.company_id
  );
  const corpId = stringOrNull(
    user.corp_id ?? user.corpId ?? user.corpid ?? context.corp_id ?? context.corpid
  );
  const sub = stringOrNull(user.sub ?? user.user_id ?? user.userId ?? user.userid ?? user.id);
  const roleSpecificId = stringOrNull(
    role === "employee"
      ? (user.employee_id ?? user.employeeId ?? user.userid ?? user.user_id)
      : role === "owner"
        ? (user.owner_id ?? user.ownerId ?? user.userid ?? user.user_id)
        : role === "manager"
          ? (user.manager_id ?? user.managerId ?? user.userid ?? user.user_id)
          : role === "admin"
            ? (user.admin_id ?? user.adminId ?? user.userid ?? user.user_id)
            : null
  );
  const explicitPropertyIds = normalizePropertyIds(
    user.allowed_property_ids ??
      user.allowedPropertyIds ??
      context.allowed_property_ids ??
      context.allowedPropertyIds
  );
  const singlePropertyId = stringOrNull(user.property_id ?? user.propertyId ?? context.property_id);
  const allowedPropertyIds =
    explicitPropertyIds.length > 0
      ? explicitPropertyIds
      : singlePropertyId
        ? [singlePropertyId]
        : context.allTenantProperties && ["owner", "manager", "admin"].includes(role)
          ? [ALL_PROPERTY]
          : [];

  const claim = {
    sub,
    role,
    tenant_id: tenantId,
    corp_id: corpId,
    allowed_property_ids: allowedPropertyIds,
    permissions: Array.isArray(context.permissions)
      ? [...context.permissions]
      : [...(DEFAULT_PERMISSIONS[role] || [])],
    issued_at: context.issued_at || context.issuedAt || null,
    expires_at: context.expires_at || context.expiresAt || null,
    auth_source: context.auth_source || context.authSource || "tenant_claim_helper"
  };

  const idField = roleIdField(role);
  if (idField) claim[idField] = roleSpecificId;

  return claim;
}

export function deriveTenantScopeFromLegacyUser(user = {}, context = {}) {
  return {
    ...buildTenantScopeClaim(user, {
      ...context,
      tenant_id: null,
      company_id: null,
      auth_source: context.auth_source || "legacy_corpid_fallback"
    }),
    tenant_id: null,
    warnings: ["LEGACY_CORPID_FALLBACK"]
  };
}

export function getAllowedPropertyIds(claim = {}) {
  return normalizePropertyIds(claim.allowed_property_ids ?? claim.allowedPropertyIds);
}

export function validateTenantScopeClaim(claim = {}, options = {}) {
  const appEnv = String(options.appEnv ?? options.APP_ENV ?? "")
    .trim()
    .toLowerCase();
  const safeEnv = isSafeRehearsalEnv(appEnv);
  const warnings = [];
  const errors = [];
  const role = normalizeRole(claim.role);
  const allowedPropertyIds = getAllowedPropertyIds(claim);

  if (!stringOrNull(claim.sub)) errors.push("MISSING_SUB");
  if (!role) errors.push("MISSING_ROLE");
  if (role && !DEFAULT_PERMISSIONS[role]) errors.push("UNKNOWN_ROLE");

  const idField = roleIdField(role);
  if (idField && !stringOrNull(claim[idField])) {
    errors.push(`MISSING_${idField.toUpperCase()}`);
  }

  if (stringOrNull(claim.tenant_id)) {
    if (stringOrNull(claim.corp_id)) warnings.push("LEGACY_CORPID_PRESENT_COMPATIBILITY_ONLY");
  } else if (stringOrNull(claim.corp_id) && safeEnv) {
    warnings.push("LEGACY_CORPID_FALLBACK");
  } else if (stringOrNull(claim.corp_id)) {
    errors.push("MISSING_TENANT_ID_PRODUCTION_UNSAFE");
  } else {
    errors.push("MISSING_TENANT_ID");
  }

  if (allowedPropertyIds.length === 0) {
    warnings.push("MISSING_ALLOWED_PROPERTY_IDS");
  }

  const blocked = errors.length > 0 || (!safeEnv && !stringOrNull(claim.tenant_id));
  const status = blocked ? "BLOCKED" : warnings.length ? "WARNING" : "PASS";

  return {
    valid: !blocked,
    blocked,
    status,
    appEnv: appEnv || "missing",
    safeRehearsalEnv: safeEnv,
    errors,
    warnings,
    normalized: {
      ...claim,
      role,
      allowed_property_ids: allowedPropertyIds
    }
  };
}

export function classifyClaimScopeRisk(claim = {}, options = {}) {
  const validation = validateTenantScopeClaim(claim, options);
  if (validation.errors.includes("MISSING_TENANT_ID_PRODUCTION_UNSAFE")) {
    return "PRODUCTION_UNSAFE";
  }
  if (validation.errors.length > 0) return "BLOCKED";
  if (validation.warnings.includes("LEGACY_CORPID_FALLBACK")) {
    return "LEGACY_FALLBACK_WARNING";
  }
  if (validation.warnings.length > 0) return "MANUAL_REVIEW";
  return "READY_FOR_STAGING_REHEARSAL";
}

export function assertTenantScopedAccess(claim = {}, resource = {}, options = {}) {
  const validation = validateTenantScopeClaim(claim, options);
  if (!validation.valid) {
    return {
      allowed: false,
      reason: validation.errors[0] || "CLAIM_INVALID",
      warnings: validation.warnings,
      risk: classifyClaimScopeRisk(claim, options)
    };
  }

  const normalized = validation.normalized;
  const resourceTenantId = stringOrNull(
    resource.tenant_id ?? resource.company_id ?? resource.companyId
  );
  const resourcePropertyId = stringOrNull(resource.property_id ?? resource.propertyId);
  const action = stringOrNull(options.action ?? resource.action);

  if (!stringOrNull(normalized.tenant_id)) {
    return {
      allowed: false,
      reason: "TENANT_ID_REQUIRED_FOR_TENANT_SCOPED_ACCESS",
      warnings: validation.warnings,
      risk: classifyClaimScopeRisk(claim, options)
    };
  }

  if (resourceTenantId && normalized.tenant_id !== resourceTenantId) {
    return {
      allowed: false,
      reason: "CROSS_TENANT_DENIED",
      warnings: validation.warnings,
      risk: "READY_FOR_STAGING_REHEARSAL"
    };
  }

  const allowedPropertyIds = getAllowedPropertyIds(normalized);
  if (
    resourcePropertyId &&
    !allowedPropertyIds.includes(ALL_PROPERTY) &&
    !allowedPropertyIds.includes(resourcePropertyId)
  ) {
    return {
      allowed: false,
      reason: "CROSS_PROPERTY_DENIED",
      warnings: validation.warnings,
      risk: "READY_FOR_STAGING_REHEARSAL"
    };
  }

  if (action && !normalized.permissions.includes(action)) {
    return {
      allowed: false,
      reason: "PERMISSION_DENIED",
      warnings: validation.warnings,
      risk: "READY_FOR_STAGING_REHEARSAL"
    };
  }

  return {
    allowed: true,
    reason: "ALLOWED_BY_TENANT_SCOPE_CLAIM",
    warnings: validation.warnings,
    risk: classifyClaimScopeRisk(claim, options),
    scope: {
      tenant_id: normalized.tenant_id,
      property_id: resourcePropertyId || allowedPropertyIds[0] || null
    }
  };
}

export function claimToTenantScopeActor(claim = {}) {
  const role = normalizeRole(claim.role);
  return {
    user_id: claim.sub,
    role: role === "employee" ? "EMPLOYEE" : String(role || "").toUpperCase(),
    company_id: claim.tenant_id,
    property_id: getAllowedPropertyIds(claim).find((id) => id !== ALL_PROPERTY) || null,
    corpid: claim.corp_id || null
  };
}

export function claimToTenantScopeMemberships(claim = {}) {
  const role = normalizeRole(claim.role);
  const propertyIds = getAllowedPropertyIds(claim);
  if (!claim.sub || !claim.tenant_id || propertyIds.length === 0) return [];
  return propertyIds.map((propertyId) => ({
    user_id: claim.sub,
    company_id: claim.tenant_id,
    property_id: propertyId,
    role: role === "employee" ? "EMPLOYEE" : String(role || "").toUpperCase()
  }));
}

export function formatTenantScopeAudit(claim = {}, options = {}) {
  const validation = validateTenantScopeClaim(claim, options);
  return {
    sub: claim.sub || null,
    role: validation.normalized.role || null,
    employee_id: claim.employee_id || null,
    owner_id: claim.owner_id || null,
    manager_id: claim.manager_id || null,
    admin_id: claim.admin_id || null,
    tenant_id_present: Boolean(claim.tenant_id),
    corp_id_present: Boolean(claim.corp_id),
    allowed_property_ids: getAllowedPropertyIds(claim).join(",") || "none",
    status: validation.status,
    risk: classifyClaimScopeRisk(claim, options),
    warnings: validation.warnings.join(",") || "none",
    errors: validation.errors.join(",") || "none"
  };
}

export { ALL_PROPERTY, DEFAULT_PERMISSIONS, SAFE_REHEARSAL_ENVS };
