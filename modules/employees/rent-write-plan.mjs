import { toSafeSqlInteger } from "../finance/money.mjs";

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function requireDraft(input) {
  if (!input || typeof input !== "object" || !input.transactionDraft) {
    throw new TypeError("Rent write plan requires an entry draft.");
  }
  return input;
}

function scopedBase(transactionDraft) {
  return {
    company_id: requireString(transactionDraft.tenantId, "tenantId"),
    property_id: requireString(transactionDraft.propertyId, "propertyId")
  };
}

function auditEvent({ ids, scope, actorId, actorRole, entityType, entityId, eventType, after }) {
  return {
    table: "audit_events",
    row: {
      event_id: requireString(ids.nextAuditEventId(), "auditEventId"),
      company_id: scope.company_id,
      property_id: scope.property_id,
      actor_id: actorId,
      actor_role: actorRole,
      entity_type: entityType,
      entity_id: entityId,
      event_type: eventType,
      before_json: null,
      after_json: JSON.stringify(after),
      reason: null,
      created_at: ids.createdAt
    }
  };
}

export function createRentWritePlan(entryDraft, options) {
  const draft = requireDraft(entryDraft);
  if (!options || typeof options !== "object") {
    throw new TypeError("Rent write plan options are required.");
  }

  const tx = draft.transactionDraft;
  const scope = scopedBase(tx);
  const ids = {
    transactionId: requireString(options.transactionId, "transactionId"),
    receivableId: requireString(options.receivableId, "receivableId"),
    paymentId: requireString(options.paymentId, "paymentId"),
    arrearTaskId: options.arrearTaskId ? requireString(options.arrearTaskId, "arrearTaskId") : null,
    handoverAuditEventId: requireString(options.handoverAuditEventId, "handoverAuditEventId"),
    auditEventIds: Array.isArray(options.auditEventIds) ? [...options.auditEventIds] : [],
    createdAt: requireString(options.createdAt, "createdAt"),
    nextAuditEventId() {
      const id = this.auditEventIds.shift();
      if (!id) throw new Error("Not enough audit event ids supplied.");
      return id;
    }
  };

  const actorRole = requireString(options.actorRole, "actorRole");
  const bedId = requireString(options.bedId, "bedId");
  const paymentMethod = tx.paymentMethod.toUpperCase();
  const paidFils = toSafeSqlInteger(tx.paidFils);
  if (paidFils <= 0) throw new Error("Rent write plan requires a positive payment amount.");

  const transactionRow = {
    ...scope,
    transaction_id: ids.transactionId,
    idempotency_key: requireString(options.idempotencyKey, "idempotencyKey"),
    session_id: requireString(tx.sessionId, "sessionId"),
    bed_id: bedId,
    bed_code_snapshot: tx.bed,
    tenant_card_id: null,
    tenant_name_snapshot: tx.tenantSnapshot,
    event_type: "RENT",
    payment_method: paymentMethod,
    amount_fils: paidFils,
    due_fils: toSafeSqlInteger(tx.dueFils),
    paid_fils: paidFils,
    deficit_fils: toSafeSqlInteger(tx.shortfallFils),
    currency: "AED",
    period_start: tx.periodStartDate,
    period_end: tx.nextDueDate,
    cycle: tx.cycle,
    period_days: tx.billingDays,
    reason_code: options.reasonCode || null,
    source: "EMP",
    operator_id: requireString(tx.operatorId, "operatorId"),
    created_at: ids.createdAt,
    voided_at: null,
    voided_by: null,
    void_reason: null
  };

  const receivableStatus = tx.shortfallFils > 0n ? "PARTIAL" : "PAID";
  const receivableRow = {
    ...scope,
    receivable_id: ids.receivableId,
    bed_id: bedId,
    tenant_card_id: null,
    source_transaction_id: ids.transactionId,
    amount_due_fils: toSafeSqlInteger(tx.dueFils),
    amount_paid_fils: paidFils,
    amount_remaining_fils: toSafeSqlInteger(tx.shortfallFils),
    period_start: tx.periodStartDate,
    period_end: tx.nextDueDate,
    due_date: tx.nextDueDate,
    status: receivableStatus,
    created_at: ids.createdAt,
    updated_at: ids.createdAt,
    closed_at: receivableStatus === "PAID" ? ids.createdAt : null
  };

  const paymentRow = {
    ...scope,
    payment_id: ids.paymentId,
    session_id: tx.sessionId,
    transaction_id: ids.transactionId,
    receivable_id: ids.receivableId,
    amount_fils: paidFils,
    payment_method: paymentMethod,
    operator_id: tx.operatorId,
    created_at: ids.createdAt,
    voided_at: null,
    voided_by: null,
    void_reason: null
  };

  const operations = [
    { table: "transactions", row: transactionRow },
    { table: "receivables", row: receivableRow },
    { table: "payments", row: paymentRow }
  ];

  if (tx.shortfallFils > 0n) {
    if (!ids.arrearTaskId) throw new Error("arrearTaskId is required for partial rent payment.");
    const arrears = draft.arrearsTaskDraft;
    operations.push({
      table: "arrear_tasks",
      row: {
        ...scope,
        task_id: ids.arrearTaskId,
        receivable_id: ids.receivableId,
        bed_id: bedId,
        tenant_card_id: null,
        remaining_fils: toSafeSqlInteger(tx.shortfallFils),
        followup_status: "PENDING",
        promise_date: arrears?.promiseDate || null,
        promise_amount_fils: toSafeSqlInteger(tx.shortfallFils),
        staff_note: arrears?.arrearReason || null,
        owner_note: null,
        assigned_to: tx.operatorId,
        created_at: ids.createdAt,
        updated_at: ids.createdAt,
        closed_at: null
      }
    });
  }

  const businessOperations = [...operations];
  for (const operation of businessOperations) {
    operations.push(
      auditEvent({
        ids,
        scope,
        actorId: tx.operatorId,
        actorRole,
        entityType: operation.table,
        entityId: operation.row[`${operation.table.slice(0, -1)}_id`] || operation.row.task_id,
        eventType: "CREATE",
        after: operation.row
      })
    );
  }

  operations.push({
    table: "handover_sessions",
    action: "RECOMPUTE_TOTALS",
    where: {
      company_id: scope.company_id,
      property_id: scope.property_id,
      session_id: tx.sessionId
    }
  });
  operations.push({
    table: "audit_events",
    row: {
      event_id: ids.handoverAuditEventId,
      company_id: scope.company_id,
      property_id: scope.property_id,
      actor_id: tx.operatorId,
      actor_role: actorRole,
      entity_type: "handover_sessions",
      entity_id: tx.sessionId,
      event_type: "RECOMPUTE",
      before_json: null,
      after_json: JSON.stringify({ session_id: tx.sessionId, source: "RENT_ENTRY_WRITE_PLAN" }),
      reason: null,
      created_at: ids.createdAt
    }
  });

  if (ids.auditEventIds.length > 0) {
    throw new Error("Too many audit event ids supplied.");
  }

  return {
    atomic: true,
    operations
  };
}
