// IMPL-002: Receivables State Machine

import { recordAuditLog } from "../audit/logger.js";

export const STATES = Object.freeze({
  CREATED: "CREATED",
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  VOIDED: "VOIDED",
  ADJUSTED: "ADJUSTED",
  WRITTEN_OFF: "WRITTEN_OFF"
});

export const VALID_TRANSITIONS = Object.freeze({
  [STATES.CREATED]: [STATES.PENDING],
  [STATES.PENDING]: [
    STATES.PARTIAL,
    STATES.PAID,
    STATES.VOIDED,
    STATES.ADJUSTED,
    STATES.WRITTEN_OFF
  ],
  [STATES.PARTIAL]: [
    STATES.PARTIAL,
    STATES.PAID,
    STATES.VOIDED,
    STATES.ADJUSTED,
    STATES.WRITTEN_OFF
  ],
  [STATES.PAID]: [],
  [STATES.VOIDED]: [STATES.PENDING],
  [STATES.ADJUSTED]: [],
  [STATES.WRITTEN_OFF]: []
});

export function isValidTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

export function assertValidTransition(from, to, context = {}) {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }

  if ((to === STATES.ADJUSTED || to === STATES.WRITTEN_OFF) && !context.approvedBy) {
    throw new Error(`${to} transition requires approvedBy`);
  }
}

export async function transitionReceivable(db, receivableId, newState, context = {}, options = {}) {
  if (!db) {
    throw new Error("Database connection required");
  }
  if (!receivableId || typeof receivableId !== "string") {
    throw new Error("Invalid receivableId");
  }
  if (!Object.values(STATES).includes(newState)) {
    throw new Error(`Invalid receivable state: ${newState}`);
  }

  const current =
    options.current ||
    (await first(db, "SELECT * FROM receivables WHERE id = ? LIMIT 1", [receivableId]));

  if (!current) {
    throw new Error(`Receivable not found: ${receivableId}`);
  }

  const oldState = current.status || STATES.PENDING;
  assertValidTransition(oldState, newState, context);

  const useTransaction = options.transaction !== false;
  if (useTransaction) {
    await execute(db, "BEGIN IMMEDIATE TRANSACTION");
  }

  try {
    await applyReceivableState(db, current, newState);
    await insertLedgerEntry(db, current.id || receivableId, oldState, newState, context);
    await recordAuditLog(db, {
      operationType: "STATE_TRANSITION",
      resourceType: "receivable",
      resourceId: current.id || receivableId,
      userId: context.userId || null,
      userRole: context.userRole || null,
      oldValue: { status: oldState },
      newValue: { status: newState },
      changedFields: ["status"],
      reason: context.reason || null,
      status: "SUCCESS"
    });

    if (useTransaction) {
      await execute(db, "COMMIT");
    }

    return { success: true, receivableId, oldState, newState };
  } catch (error) {
    if (useTransaction) {
      await execute(db, "ROLLBACK");
    }
    throw error;
  }
}

export async function allocatePayment(db, customerId, tenantId, paymentAmount, context = {}) {
  if (!db) {
    throw new Error("Database connection required");
  }
  if (!customerId || typeof customerId !== "string") {
    throw new Error("customerId is required");
  }
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("tenantId is required");
  }
  assertIntegerAmount(paymentAmount, "paymentAmount");
  if (paymentAmount <= 0) {
    throw new Error("paymentAmount must be greater than zero");
  }

  const receivables = await all(
    db,
    `
      SELECT *
      FROM receivables
      WHERE customer_id = ?
        AND tenant_id = ?
        AND status IN ('PENDING', 'PARTIAL')
        AND outstanding_amount > 0
      ORDER BY due_date ASC, id ASC
    `,
    [customerId, tenantId]
  );

  let remaining = paymentAmount;
  const allocations = [];

  await execute(db, "BEGIN IMMEDIATE TRANSACTION");
  try {
    for (const receivable of receivables) {
      if (remaining <= 0) {
        break;
      }

      const outstanding = Number(receivable.outstanding_amount || 0);
      assertIntegerAmount(outstanding, "receivable.outstanding_amount");
      const allocated = Math.min(remaining, outstanding);
      const newOutstanding = outstanding - allocated;
      const newState = newOutstanding > 0 ? STATES.PARTIAL : STATES.PAID;

      await execute(db, "UPDATE receivables SET outstanding_amount = ? WHERE id = ?", [
        newOutstanding,
        receivable.id
      ]);

      await transitionReceivable(
        db,
        receivable.id,
        newState,
        {
          ...context,
          allocatedAmount: allocated,
          reason: context.reason || "Payment allocation"
        },
        {
          current: receivable,
          transaction: false
        }
      );

      allocations.push({
        receivableId: receivable.id,
        allocatedAmount: allocated,
        newOutstanding,
        newState
      });
      remaining -= allocated;
    }

    await execute(db, "COMMIT");

    return {
      allocated: paymentAmount - remaining,
      remaining,
      allocations
    };
  } catch (error) {
    await execute(db, "ROLLBACK");
    throw error;
  }
}

async function applyReceivableState(db, current, newState) {
  const fields = ["status = ?", "updated_at = ?"];
  const params = [newState, new Date().toISOString()];

  if (newState === STATES.VOIDED) {
    fields.push("outstanding_amount = ?");
    params.push(Number(current.amount || 0));
  }

  params.push(current.id);

  await execute(db, `UPDATE receivables SET ${fields.join(", ")} WHERE id = ?`, params);
}

async function insertLedgerEntry(db, receivableId, oldState, newState, context) {
  await execute(
    db,
    `
      INSERT INTO receivables_ledger (
        receivable_id, old_status, new_status, payment_id,
        allocated_amount, reason, approved_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      receivableId,
      oldState,
      newState,
      context.paymentId || null,
      context.allocatedAmount ?? null,
      context.reason || null,
      context.approvedBy || null,
      new Date().toISOString()
    ]
  );
}

function assertIntegerAmount(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer minor-unit amount`);
  }
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
