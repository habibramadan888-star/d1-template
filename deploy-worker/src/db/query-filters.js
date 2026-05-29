// IMPL-003: Tenant and Property Scope Isolation
// Build parameterized WHERE fragments. Do not interpolate tenant/property IDs
// directly into SQL strings.

const ADMIN_ROLES = new Set(["admin", "readonly_admin"]);
const OWNER_ROLES = new Set(["owner", "manager"]);

export function buildScopeFilter(user, options = {}) {
  const tenantColumn = options.tenantColumn || "tenant_id";
  const propertyColumn = options.propertyColumn || "property_id";
  const includeProperty = options.includeProperty !== false;

  if (!user || !user.role) {
    return { clause: "1 = 0", params: [], reason: "missing_user" };
  }

  if (ADMIN_ROLES.has(user.role)) {
    return { clause: "1 = 1", params: [], reason: "admin_full_read" };
  }

  const tenantId = user.tenant_id || user.tenantId || user.company_id || user.corpid;
  if (!tenantId) {
    return { clause: "1 = 0", params: [], reason: "missing_tenant" };
  }

  const clauses = [`${tenantColumn} = ?`];
  const params = [tenantId];

  if (includeProperty && !OWNER_ROLES.has(user.role)) {
    const properties = normalizeAllowedProperties(user);
    if (properties.length === 0) {
      return { clause: "1 = 0", params: [], reason: "no_allowed_properties" };
    }

    clauses.push(`${propertyColumn} IN (${properties.map(() => "?").join(", ")})`);
    params.push(...properties);
  }

  return {
    clause: clauses.join(" AND "),
    params,
    reason: "scoped"
  };
}

export function appendScopeFilter(query, user, options = {}) {
  const filter = buildScopeFilter(user, options);
  return appendWhereClause(query, filter.clause, filter.params);
}

export function appendWhereClause(query, clause, params = []) {
  const normalized = String(query || "").trim();
  if (!normalized) {
    throw new Error("Query is required");
  }

  const boundary = normalized.search(/\s+(GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET)\b/i);
  const head = boundary === -1 ? normalized : normalized.slice(0, boundary);
  const tail = boundary === -1 ? "" : normalized.slice(boundary);
  const joiner = /\bWHERE\b/i.test(head) ? "AND" : "WHERE";

  return {
    sql: `${head} ${joiner} (${clause})${tail}`,
    params
  };
}

export function normalizeAllowedProperties(user) {
  const raw =
    user.allowed_properties ||
    user.allowedProperties ||
    user.allowed_property_ids ||
    user.property_ids ||
    [];

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.map((value) => String(value).trim()).filter(Boolean);
  }

  return [];
}
