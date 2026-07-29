const INSERT_TABLES = new Set([
  "transactions",
  "receivables",
  "payments",
  "arrear_tasks",
  "audit_events"
]);

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]*$/;

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function assertIdentifier(value, label) {
  const identifier = requireString(value, label);
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Unsafe SQL identifier for ${label}: ${value}`);
  }
  return identifier;
}

function assertBindingValue(value, key) {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  throw new Error(`Unsupported D1 binding for ${key}.`);
}

function insertStatement(operation) {
  const table = assertIdentifier(operation.table, "operation.table");
  if (!INSERT_TABLES.has(table)) {
    throw new Error(`Unsupported insert table: ${table}`);
  }

  const row = requireObject(operation.row, `${table}.row`);
  const entries = Object.entries(row);
  if (!entries.length) throw new Error(`Insert row for ${table} cannot be empty.`);

  const columns = entries.map(([key]) => assertIdentifier(key, `${table}.column`));
  const placeholders = columns.map(() => "?").join(", ");
  const bindings = entries.map(([key, value]) => assertBindingValue(value, key));

  return {
    kind: "insert",
    table,
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
    bindings
  };
}

function recomputeHandoverStatement(operation) {
  const where = requireObject(operation.where, "handover recompute where");
  const companyId = requireString(where.company_id, "where.company_id");
  const propertyId = requireString(where.property_id, "where.property_id");
  const sessionId = requireString(where.session_id, "where.session_id");

  return {
    kind: "recompute_totals",
    table: "handover_sessions",
    sql: `
UPDATE handover_sessions
SET
  cash_handover_fils =
    COALESCE((SELECT SUM(amount_fils) FROM transactions
      WHERE company_id = ? AND property_id = ? AND session_id = ?
        AND voided_at IS NULL AND payment_method = 'CASH'
        AND event_type IN ('RENT', 'ARREAR_PAY', 'DEPOSIT_IN', 'TRANSFER_FEE')), 0)
    - COALESCE((SELECT SUM(amount_fils) FROM transactions
      WHERE company_id = ? AND property_id = ? AND session_id = ?
        AND voided_at IS NULL AND payment_method = 'CASH'
        AND event_type IN ('DEPOSIT_REFUND', 'EXPENSE')), 0),
  bank_transfer_total_fils =
    COALESCE((SELECT SUM(amount_fils) FROM transactions
      WHERE company_id = ? AND property_id = ? AND session_id = ?
        AND voided_at IS NULL AND payment_method = 'BANK'
        AND event_type IN ('RENT', 'ARREAR_PAY', 'DEPOSIT_IN', 'TRANSFER_FEE')), 0),
  bank_transfer_count =
    COALESCE((SELECT COUNT(*) FROM transactions
      WHERE company_id = ? AND property_id = ? AND session_id = ?
        AND voided_at IS NULL AND payment_method = 'BANK'
        AND event_type IN ('RENT', 'ARREAR_PAY', 'DEPOSIT_IN', 'TRANSFER_FEE')
        AND amount_fils > 0), 0),
  gross_received_fils =
    COALESCE((SELECT SUM(amount_fils) FROM transactions
      WHERE company_id = ? AND property_id = ? AND session_id = ?
        AND voided_at IS NULL
        AND event_type IN ('RENT', 'ARREAR_PAY', 'DEPOSIT_IN', 'TRANSFER_FEE')), 0)
WHERE company_id = ? AND property_id = ? AND session_id = ?
`.trim(),
    bindings: [
      companyId,
      propertyId,
      sessionId,
      companyId,
      propertyId,
      sessionId,
      companyId,
      propertyId,
      sessionId,
      companyId,
      propertyId,
      sessionId,
      companyId,
      propertyId,
      sessionId,
      companyId,
      propertyId,
      sessionId
    ]
  };
}

export function createD1WritePlanStatements(plan) {
  const writePlan = requireObject(plan, "write plan");
  if (writePlan.atomic !== true) {
    throw new Error("D1 write plan must be marked atomic.");
  }
  if (!Array.isArray(writePlan.operations) || !writePlan.operations.length) {
    throw new Error("D1 write plan operations are required.");
  }

  return writePlan.operations.map((operation) => {
    const op = requireObject(operation, "operation");
    if (op.action === "RECOMPUTE_TOTALS") return recomputeHandoverStatement(op);
    if (op.row) return insertStatement(op);
    throw new Error(`Unsupported write plan operation: ${JSON.stringify(op)}`);
  });
}

export function isD1UniqueConstraintError(error) {
  const message = `${error?.message ?? ""}\n${error?.cause?.message ?? ""}`;
  return /UNIQUE constraint failed/i.test(message);
}

export async function executeD1WritePlan(db, plan) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("D1 executor requires a database with prepare() and batch().");
  }

  const statements = createD1WritePlanStatements(plan);
  const prepared = statements.map((statement) =>
    db.prepare(statement.sql).bind(...statement.bindings)
  );

  try {
    const results = await db.batch(prepared);
    return { success: true, statements, results };
  } catch (error) {
    if (isD1UniqueConstraintError(error)) {
      return { success: false, reason: "IDEMPOTENCY_CONFLICT", statements };
    }
    throw error;
  }
}
