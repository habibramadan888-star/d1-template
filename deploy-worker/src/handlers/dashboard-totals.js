// IMPL-001: Backend Totals Authority
// Candidate handler for GET /api/dashboard/totals. It is intentionally
// standalone until wired into deploy-worker/src/index.js behind a feature flag.

import { recordAuditLog } from "../audit/logger.js";

const COUNTABLE_TABLES = new Set(["payments", "receivables"]);
const MAX_DURATION_MS = 5000;
const MAX_ROWS_CHECKED = 10_000_000;

export async function handleDashboardTotals(request, env, deps = {}) {
  const startedAt = Date.now();
  const db = env?.DB;
  const authenticate = deps.authenticate || env?.getAuthUser;
  const idFactory = deps.generateId || (() => crypto.randomUUID());

  let user;

  try {
    if (request.method && request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!db) {
      throw new Error("D1 database binding is required");
    }
    if (typeof authenticate !== "function") {
      throw new Error("Authentication dependency is required");
    }

    user = await authenticate(request, env);
    const tenantId = getTenantId(user);
    if (!tenantId && !isAdminRole(user?.role)) {
      throw new Error("Authenticated user is missing tenant scope");
    }

    const scopeParams = isAdminRole(user?.role) ? [] : [tenantId];
    const scopeWhere = isAdminRole(user?.role) ? "1 = 1" : "tenant_id = ?";
    const computationId = idFactory();
    const now = new Date().toISOString();

    const paymentRows = await all(
      db,
      `
        SELECT COALESCE(SUM(amount), 0) AS total, method
        FROM payments
        WHERE ${scopeWhere}
          AND amount > 0
        GROUP BY method
      `,
      scopeParams
    );

    const receivablesRow = await first(
      db,
      `
        SELECT
          COALESCE(SUM(outstanding_amount), 0) AS totalOutstanding,
          COALESCE(SUM(
            CASE
              WHEN due_date < date('now') AND outstanding_amount > 0
              THEN outstanding_amount
              ELSE 0
            END
          ), 0) AS totalOverdue
        FROM receivables
        WHERE ${scopeWhere}
          AND outstanding_amount > 0
      `,
      scopeParams
    );

    const rowsChecked = {
      payments: await countRows(db, "payments", tenantId, user?.role),
      receivables: await countRows(db, "receivables", tenantId, user?.role)
    };

    const payload = createDashboardTotalsPayload({
      paymentRows,
      receivablesRow,
      rowsChecked,
      user,
      computationId,
      startedAt,
      now
    });

    if (payload.computation.durationMs > MAX_DURATION_MS) {
      throw new Error(
        `Dashboard totals computation exceeded ${MAX_DURATION_MS}ms: ${payload.computation.durationMs}ms`
      );
    }

    await recordAuditLog(db, {
      operationType: "COMPUTATION",
      resourceType: "dashboard_total",
      resourceId: computationId,
      userId: user.id || user.userid || null,
      userRole: user.role || null,
      newValue: payload.data,
      status: "SUCCESS"
    });

    return json(payload, 200);
  } catch (error) {
    await recordAuditLog(db, {
      operationType: "COMPUTATION",
      resourceType: "dashboard_total",
      userId: user?.id || user?.userid || null,
      userRole: user?.role || null,
      status: "FAILED",
      errorMessage: error.message
    });

    return json({ error: error.message }, 500);
  }
}

export function createDashboardTotalsPayload({
  paymentRows = [],
  receivablesRow = {},
  rowsChecked = { payments: 0, receivables: 0 },
  user = {},
  computationId,
  startedAt,
  now = new Date().toISOString()
}) {
  const totals = computePaymentTotals(paymentRows);

  return {
    data: {
      totalCash: totals.totalCash,
      totalBank: totals.totalBank,
      totalCollected: totals.totalCollected,
      totalOutstanding: toInteger(
        receivablesRow.totalOutstanding ?? receivablesRow.total_outstanding
      ),
      totalOverdue: toInteger(receivablesRow.totalOverdue ?? receivablesRow.overdue),
      currency: "AED",
      precision: "fils"
    },
    computation: {
      version: "1.0",
      timestamp: now,
      durationMs: Math.max(0, Date.now() - startedAt),
      rowsChecked
    },
    audit: {
      computationId,
      userId: user.id || user.userid || null,
      sourceTables: ["payments", "receivables"]
    }
  };
}

export function computePaymentTotals(paymentRows = []) {
  let totalCash = 0;
  let totalBank = 0;

  for (const row of paymentRows) {
    const method = String(row.method || "").toUpperCase();
    const total = toInteger(row.total);

    if (method === "CASH") {
      totalCash += total;
    } else if (method === "BANK" || method === "BANK_TRANSFER") {
      totalBank += total;
    }
  }

  return {
    totalCash,
    totalBank,
    totalCollected: totalCash + totalBank
  };
}

export async function countRows(db, table, tenantId, role) {
  if (!COUNTABLE_TABLES.has(table)) {
    throw new Error(`Unsupported count table: ${table}`);
  }

  const params = isAdminRole(role) ? [] : [tenantId];
  const where = isAdminRole(role) ? "1 = 1" : "tenant_id = ?";
  const row = await first(db, `SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`, params);

  return Math.min(toInteger(row?.count ?? row?.cnt), MAX_ROWS_CHECKED);
}

function getTenantId(user = {}) {
  return user.tenant_id || user.tenantId || user.company_id || user.corpid || null;
}

function isAdminRole(role) {
  return role === "admin" || role === "readonly_admin";
}

function toInteger(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.trunc(number);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function all(db, sql, params = []) {
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

async function first(db, sql, params = []) {
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
