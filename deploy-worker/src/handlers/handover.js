// IMPL-004: Handover Atomic Transaction
// Candidate handler for future route wiring. Current production routing remains
// unchanged until this module is explicitly imported behind a feature flag.

import { recordAuditLog } from "../audit/logger.js";

export async function handleHandover(request, env, deps = {}) {
  const db = env?.DB;
  const authenticate = deps.authenticate || env?.getAuthUser;
  const idFactory = deps.generateId || (() => crypto.randomUUID());
  const idempotencyKey = request.headers.get("Idempotency-Key");

  if (!idempotencyKey) {
    return json({ error: "Idempotency-Key required" }, 400);
  }

  let user;

  try {
    if (!db) {
      throw new Error("D1 database binding is required");
    }
    if (typeof authenticate !== "function") {
      throw new Error("Authentication dependency is required");
    }

    user = await authenticate(request, env);

    const cached = await readIdempotency(db, idempotencyKey);
    if (cached) {
      return new Response(cached.response, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "X-Idempotency-Replayed": "true"
        }
      });
    }

    const body = await request.json();
    const entries = validateHandoverBody(body);
    const totals = calculateHandoverTotals(entries);

    if (totals.totalCash !== body.totalCash || totals.totalBank !== body.totalBank) {
      throw new Error("Totals mismatch");
    }

    const handoverId = idFactory();
    const response = JSON.stringify({
      handover_id: handoverId,
      status: "SUCCESS"
    });

    await execute(db, "BEGIN IMMEDIATE TRANSACTION");
    try {
      await execute(
        db,
        `
          INSERT INTO handovers (
            id, employee_id, total_cash, total_bank, entry_count, status, created_at
          ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
        `,
        [
          handoverId,
          user.id || user.userid,
          totals.totalCash,
          totals.totalBank,
          entries.length,
          new Date().toISOString()
        ]
      );

      await markEntriesHandedOver(db, handoverId, entries);

      await recordAuditLog(db, {
        operationType: "HANDOVER",
        resourceType: "handover",
        resourceId: handoverId,
        userId: user.id || user.userid || null,
        userRole: user.role || null,
        newValue: { ...totals, entryCount: entries.length },
        status: "SUCCESS"
      });

      await execute(
        db,
        `
          INSERT INTO idempotency_keys (key, response, expires_at, created_at)
          VALUES (?, ?, datetime('now', '+24 hours'), ?)
        `,
        [idempotencyKey, response, new Date().toISOString()]
      );

      await execute(db, "COMMIT");
      return new Response(response, {
        status: 201,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    } catch (error) {
      await execute(db, "ROLLBACK");
      throw error;
    }
  } catch (error) {
    await recordAuditLog(db, {
      operationType: "HANDOVER",
      resourceType: "handover",
      userId: user?.id || user?.userid || null,
      userRole: user?.role || null,
      status: "FAILED",
      errorMessage: error.message
    });

    return json({ error: error.message }, 400);
  }
}

export function calculateHandoverTotals(entries = []) {
  return entries.reduce(
    (totals, entry) => {
      assertIntegerAmount(entry.amount, "entry.amount");
      const method = String(entry.method || "").toUpperCase();

      if (method === "CASH") {
        totals.totalCash += entry.amount;
      } else if (method === "BANK" || method === "BANK_TRANSFER") {
        totals.totalBank += entry.amount;
      }

      return totals;
    },
    { totalCash: 0, totalBank: 0 }
  );
}

export function validateHandoverBody(body) {
  if (!body || !Array.isArray(body.entries) || body.entries.length === 0) {
    throw new Error("entries array is required");
  }

  for (const entry of body.entries) {
    if (!entry.id) {
      throw new Error("entry.id is required");
    }
    assertIntegerAmount(entry.amount, "entry.amount");
  }

  assertIntegerAmount(body.totalCash, "totalCash");
  assertIntegerAmount(body.totalBank, "totalBank");

  return body.entries;
}

async function readIdempotency(db, key) {
  return first(
    db,
    `
      SELECT response
      FROM idempotency_keys
      WHERE key = ?
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      LIMIT 1
    `,
    [key]
  );
}

async function markEntriesHandedOver(db, handoverId, entries) {
  const placeholders = entries.map(() => "?").join(", ");
  await execute(
    db,
    `
      UPDATE entries
      SET handover_id = ?, handover_status = 'HANDED_OVER'
      WHERE id IN (${placeholders})
    `,
    [handoverId, ...entries.map((entry) => entry.id)]
  );
}

function assertIntegerAmount(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer minor-unit amount`);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
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

async function execute(db, sql, params = []) {
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
