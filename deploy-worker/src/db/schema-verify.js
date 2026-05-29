// IMPL-005: Schema Verification
// Runtime code should verify migrated schema rather than create/alter tables.

export const REQUIRED_TABLES = Object.freeze([
  "entries",
  "payments",
  "customers",
  "receivables",
  "receivables_ledger",
  "handovers",
  "audit_logs",
  "idempotency_keys"
]);

export async function verifySchema(db, requiredTables = REQUIRED_TABLES) {
  const missing = [];

  for (const table of requiredTables) {
    const exists = await tableExists(db, table);
    if (!exists) {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    throw new Error(`FATAL: Missing required tables: ${missing.join(", ")}. Run migrations first.`);
  }

  return {
    ok: true,
    verifiedTables: [...requiredTables]
  };
}

export async function tableExists(db, table) {
  validateIdentifier(table);

  const row = await first(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
    [table]
  );

  return Boolean(row);
}

function validateIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
}

async function first(db, sql, params = []) {
  if (!db) {
    throw new Error("Database binding is required");
  }

  if (typeof db.prepare === "function") {
    return db
      .prepare(sql)
      .bind(...params)
      .first();
  }

  if (typeof db.query === "function") {
    const result = await db.query(sql, params);
    return Array.isArray(result) ? result[0] : result?.results?.[0];
  }

  throw new Error("Unsupported database adapter");
}
