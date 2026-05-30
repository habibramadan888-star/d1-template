// IMPL-006: Audit Trail Logging
// Standalone helper for future Worker handlers. It supports Cloudflare D1's
// prepare/bind/run API and a simple db.query test double.

const SECRET_KEY_PATTERN = /password|secret|token|pin|authorization|cookie/i;
const MAX_AUDIT_VALUE_LENGTH = 5000;
const VALID_STATUSES = new Set(["PENDING", "SUCCESS", "FAILED"]);

export async function recordAuditLog(db, context, options = {}) {
  const entry = normalizeAuditContext(context);

  try {
    await execute(
      db,
      `
        INSERT INTO audit_logs (
          operation_type, resource_type, resource_id,
          user_id, user_role, old_value, new_value,
          changed_fields, reason, status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        entry.operationType,
        entry.resourceType,
        entry.resourceId,
        entry.userId,
        entry.userRole,
        serializeAuditValue(entry.oldValue),
        serializeAuditValue(entry.newValue),
        serializeAuditValue(entry.changedFields),
        entry.reason,
        entry.status,
        entry.errorMessage,
        entry.createdAt
      ]
    );

    return { ok: true, entry };
  } catch (error) {
    if (options.throwOnFailure) {
      throw error;
    }

    console.error("Audit log failed:", error);
    return { ok: false, entry, error };
  }
}

export function normalizeAuditContext(context = {}) {
  return {
    operationType: context.operationType || context.operation_type || "UNKNOWN",
    resourceType: context.resourceType || context.resource_type || "unknown",
    resourceId: context.resourceId || context.resource_id || null,
    userId: context.userId || context.user_id || null,
    userRole: context.userRole || context.user_role || null,
    oldValue: redactSensitiveValues(context.oldValue ?? context.old_value ?? null),
    newValue: redactSensitiveValues(context.newValue ?? context.new_value ?? null),
    changedFields: context.changedFields || context.changed_fields || null,
    reason: context.reason || null,
    status: VALID_STATUSES.has(context.status) ? context.status : "PENDING",
    errorMessage: context.errorMessage || context.error_message || null,
    createdAt: context.createdAt || context.created_at || new Date().toISOString()
  };
}

export function redactSensitiveValues(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValues(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redactSensitiveValues(nested)
      ])
    );
  }

  return value;
}

function serializeAuditValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_AUDIT_VALUE_LENGTH) {
    return serialized;
  }

  return `${serialized.slice(0, MAX_AUDIT_VALUE_LENGTH)}...[truncated]`;
}

export async function queryAuditLogs(db, resourceId, limit = 100) {
  if (!resourceId) {
    throw new Error("resourceId is required");
  }

  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 10_000);
  const result = await all(
    db,
    `
      SELECT *
      FROM audit_logs
      WHERE resource_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [resourceId, safeLimit]
  );

  return result;
}

async function execute(db, sql, params = []) {
  if (!db) {
    throw new Error("Database binding is required");
  }

  if (typeof db.prepare === "function") {
    return db
      .prepare(sql)
      .bind(...params)
      .run();
  }

  if (typeof db.query === "function") {
    return db.query(sql, params);
  }

  throw new Error("Unsupported database adapter");
}

async function all(db, sql, params = []) {
  if (!db) {
    throw new Error("Database binding is required");
  }

  if (typeof db.prepare === "function") {
    const result = await db
      .prepare(sql)
      .bind(...params)
      .all();
    return result.results || [];
  }

  if (typeof db.query === "function") {
    const result = await db.query(sql, params);
    return Array.isArray(result) ? result : result?.results || [];
  }

  throw new Error("Unsupported database adapter");
}
