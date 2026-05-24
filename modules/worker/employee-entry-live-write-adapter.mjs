import { filsToAedString, parseAedToFils, toSafeSqlInteger } from "../finance/money.mjs";
import { calculateRentPeriod } from "../finance/periods.mjs";

const MODE = "local_staging_live_write_adapter_rehearsal";
const ROUTE = "/api/employee/entry";
const SUPPORTED_TYPES = new Set(["R", "D", "DR", "CO", "AP", "TF", "E"]);

function issue(code, message, extra = {}) {
  return { code, message, ...extra };
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function text(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function normalizeEventType(value) {
  const raw = text(value).toUpperCase();
  if (raw === "RENT") return "R";
  if (raw === "DEPOSIT_IN") return "D";
  if (raw === "DEPOSIT_REFUND") return "DR";
  if (raw === "CHECKOUT") return "CO";
  if (raw === "ARREARS_PAYMENT") return "AP";
  if (raw === "TRANSFER_FEE") return "TF";
  if (raw === "EXPENSE") return "E";
  return raw;
}

function normalizePaymentMethod(value) {
  const raw = text(value).toUpperCase();
  if (["C", "CASH", "现金"].includes(raw)) return "CASH";
  if (["B", "BANK", "TRANSFER", "银行"].includes(raw)) return "BANK";
  return raw || "CASH";
}

function money(value, field, options = {}) {
  if (value === undefined || value === null || value === "") {
    if (options.required === false)
      return { ok: true, skipped: true, fils: 0n, warnings: [], errors: [] };
    return {
      ok: false,
      warnings: [],
      errors: [issue("MISSING_MONEY", `${field} is required.`, { field, value })]
    };
  }
  if (typeof value !== "string") {
    return {
      ok: false,
      warnings: [],
      errors: [
        issue("MONEY_MUST_BE_STRING", `${field} must be a string for minor-unit authority.`, {
          field,
          value
        })
      ]
    };
  }
  try {
    const fils = parseAedToFils(value, { allowNegative: Boolean(options.allowNegative) });
    if (fils < 0n && !options.allowNegative) {
      return {
        ok: false,
        warnings: [],
        errors: [issue("NEGATIVE_MONEY", `${field} cannot be negative.`, { field, value })]
      };
    }
    return { ok: true, skipped: false, fils, aed: filsToAedString(fils), warnings: [], errors: [] };
  } catch (error) {
    return {
      ok: false,
      warnings: [],
      errors: [
        issue("INVALID_MONEY", error?.message || String(error), {
          field,
          value
        })
      ]
    };
  }
}

function addParsed(target, parsed) {
  target.warnings.push(...parsed.warnings);
  target.errors.push(...parsed.errors);
  return parsed.ok;
}

function positive(parsed, field, target) {
  if (!parsed.ok) return false;
  if (parsed.fils <= 0n) {
    target.errors.push(
      issue("MONEY_MUST_BE_POSITIVE", `${field} must be greater than zero.`, { field })
    );
    return false;
  }
  return true;
}

function safeInt(fils, field) {
  return toSafeSqlInteger(fils, field);
}

function aed(fils) {
  return filsToAedString(fils);
}

function patchFils(plan, field) {
  return BigInt(plan?.filsPatch?.[field] ?? 0);
}

function isInboundReceipt(eventType) {
  return ["R", "D", "AP", "TF"].includes(eventType);
}

function sessionCashDeltaFils(result) {
  if (result.paymentMethod !== "CASH") return 0n;
  const amountFils = patchFils(result.transactionPlan, "amount_fils");
  if (["DR", "E"].includes(result.eventType)) return -amountFils;
  if (result.eventType === "CO") return 0n;
  return amountFils;
}

function sessionBankInboundFils(result) {
  if (result.paymentMethod !== "BANK") return 0n;
  return isInboundReceipt(result.eventType) ? patchFils(result.transactionPlan, "amount_fils") : 0n;
}

function sessionGrossReceivedFils(result) {
  return isInboundReceipt(result.eventType) ? patchFils(result.transactionPlan, "amount_fils") : 0n;
}

function resolveListPriceFils(resolved, target) {
  if (typeof resolved.listPriceFils === "bigint") return resolved.listPriceFils;
  const parsed = money(resolved.listPriceAed, "resolved.listPriceAed");
  addParsed(target, parsed);
  return parsed.ok ? parsed.fils : 0n;
}

function integerValue(value, field, target, options = {}) {
  const raw = value === undefined || value === null || value === "" ? options.defaultValue : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < (options.min ?? 0)) {
    target.errors.push(issue("INVALID_INTEGER", `${field} must be an integer.`, { field, value }));
    return null;
  }
  return parsed;
}

function baseResult(input) {
  const body = isObject(input?.body) ? input.body : {};
  const entry = isObject(body.entry) ? body.entry : {};
  const session = isObject(body.session) ? body.session : {};
  const auth = isObject(input?.auth) ? input.auth : {};
  const resolved = isObject(input?.resolved) ? input.resolved : {};
  const ids = isObject(input?.ids) ? input.ids : {};
  const eventType = normalizeEventType(entry.type ?? entry.eventType ?? entry.reason_code);
  return {
    route: ROUTE,
    mode: MODE,
    writesDatabase: false,
    eventType,
    sessionId: text(input?.sessionId, session.id, entry.session_id),
    clientEntryId: text(input?.clientEntryId, entry.client_entry_id, entry.id),
    companyId: text(auth.companyId, auth.corpid, auth.tenantId),
    propertyId: text(auth.propertyId, auth.property_id, resolved.propertyId),
    operatorId: text(auth.operatorId, auth.userid, auth.userId),
    bed: text(entry.room, entry.bed).replace(/^#+/, ""),
    paymentMethod: normalizePaymentMethod(
      entry.pay_type ?? entry.payType ?? entry.payment_method ?? entry.cat
    ),
    body,
    entry,
    session,
    auth,
    resolved,
    ids,
    transactionPlan: null,
    sessionPlan: null,
    depositLedgerPlan: null,
    arrearTaskPlan: null,
    auditPlan: [],
    warnings: [],
    errors: [],
    skipped: false,
    status: "PENDING"
  };
}

function pushAudit(result, eventType, payload = {}) {
  result.auditPlan.push({
    event_type: eventType,
    ref_type: "employee_entry_live_write_adapter",
    ref_id: result.clientEntryId || result.ids.transactionId || "",
    operator_id: result.operatorId,
    payload
  });
}

function makeTransactionPlan(result, fields) {
  result.transactionPlan = {
    table: "transactions",
    legacyFields: Object.fromEntries(
      Object.entries(fields.legacy || {}).map(([key, value]) => [
        key,
        typeof value === "bigint" ? aed(value) : value
      ])
    ),
    filsPatch: Object.fromEntries(
      Object.entries(fields.fils || {}).map(([key, value]) => [key, safeInt(value, key)])
    )
  };
}

function makeSessionPlan(result, fields) {
  result.sessionPlan = {
    table: "sessions",
    legacyFields: Object.fromEntries(
      Object.entries(fields.legacy || {}).map(([key, value]) => [
        key,
        typeof value === "bigint" ? aed(value) : value
      ])
    ),
    filsPatch: Object.fromEntries(
      Object.entries(fields.fils || {}).map(([key, value]) => [key, safeInt(value, key)])
    )
  };
}

function buildRent(result) {
  const amount = money(result.entry.amount, "entry.amount");
  if (!addParsed(result, amount) || !positive(amount, "entry.amount", result)) return;

  const listPriceFils = resolveListPriceFils(result.resolved, result);
  if (result.errors.length) return;

  const periodDays =
    result.entry.period_day_count === undefined
      ? result.entry.customDays
      : result.entry.period_day_count;
  let period;
  try {
    period = calculateRentPeriod({
      startDate: text(result.entry.period_start, result.entry.periodStartDate),
      cycle: text(result.entry.cycle),
      customDays:
        periodDays === undefined
          ? undefined
          : integerValue(periodDays, "period_day_count", result, { min: 1 }),
      listPriceFils
    });
  } catch (error) {
    result.errors.push(issue("INVALID_PERIOD", error?.message || String(error)));
    return;
  }
  if (result.errors.length) return;

  const paidFils = amount.fils > period.dueFils ? period.dueFils : amount.fils;
  const deficitFils = period.dueFils > paidFils ? period.dueFils - paidFils : 0n;
  const excessFils = amount.fils > period.dueFils ? amount.fils - period.dueFils : 0n;

  makeTransactionPlan(result, {
    legacy: {
      amount: amount.fils,
      due: period.dueFils,
      paid: paidFils,
      deficit: deficitFils,
      period_due: period.dueFils,
      list_price: listPriceFils,
      excess: excessFils,
      period_start: period.periodStartDate,
      period_end: period.nextDueDate,
      cycle: period.cycle
    },
    fils: {
      amount_fils: amount.fils,
      due_fils: period.dueFils,
      paid_fils: paidFils,
      deficit_fils: deficitFils,
      period_due_fils: period.dueFils,
      list_price_fils: listPriceFils,
      excess_fils: excessFils
    }
  });

  if (deficitFils > 0n) {
    const handling = text(
      result.entry.arrear_handling,
      result.entry.shortfallTreatment
    ).toUpperCase();
    const promiseDate = text(result.entry.arrear_promise_date, result.entry.promise_date);
    const reason = text(
      result.entry.reason_code,
      result.entry.arrear_reason_detail,
      result.entry.note
    );
    if (handling !== "ARREAR") {
      result.errors.push(
        issue("ARREAR_HANDLING_REQUIRED", "Short-paid rent requires arrear handling.")
      );
      return;
    }
    if (!promiseDate)
      result.errors.push(issue("PROMISE_DATE_REQUIRED", "Short-paid rent requires promise date."));
    if (!reason)
      result.errors.push(issue("ARREAR_REASON_REQUIRED", "Short-paid rent requires reason."));
    result.arrearTaskPlan = {
      table: "arrear_tasks",
      legacyFields: {
        arrear_amount: aed(deficitFils),
        promise_amount: aed(deficitFils),
        actual_received: "0.00",
        promise_date: promiseDate,
        arrear_reason: reason
      },
      filsPatch: {
        arrear_amount_fils: safeInt(deficitFils, "arrear_amount_fils"),
        promise_amount_fils: safeInt(deficitFils, "promise_amount_fils"),
        actual_received_fils: 0
      }
    };
  }
}

function buildDepositIn(result) {
  const amount = money(result.entry.amount, "entry.amount");
  if (!addParsed(result, amount) || !positive(amount, "entry.amount", result)) return;
  makeTransactionPlan(result, {
    legacy: { amount: amount.fils, due: amount.fils, paid: amount.fils, deficit: 0n },
    fils: {
      amount_fils: amount.fils,
      due_fils: amount.fils,
      paid_fils: amount.fils,
      deficit_fils: 0n
    }
  });
  const currentBalance = money(result.resolved.depositBalanceAed, "resolved.depositBalanceAed", {
    required: false
  });
  addParsed(result, currentBalance);
  const before = currentBalance.skipped ? null : currentBalance.fils;
  const after = before === null ? null : before + amount.fils;
  result.depositLedgerPlan = {
    table: "deposit_ledger",
    legacyFields: {
      amount: aed(amount.fils),
      delta: aed(amount.fils),
      balance_after: after === null ? null : aed(after)
    },
    filsPatch: {
      amount_fils: safeInt(amount.fils, "amount_fils"),
      delta_fils: safeInt(amount.fils, "delta_fils"),
      balance_after_fils: after === null ? null : safeInt(after, "balance_after_fils")
    }
  };
}

function buildDepositRefund(result) {
  const amount = money(result.entry.amount, "entry.amount");
  if (!addParsed(result, amount) || !positive(amount, "entry.amount", result)) return;
  const balance = money(result.resolved.depositBalanceAed, "resolved.depositBalanceAed", {
    required: false
  });
  addParsed(result, balance);
  if (!balance.skipped && amount.fils > balance.fils) {
    result.errors.push(issue("DEPOSIT_BALANCE_EXCEEDED", "Deposit refund exceeds known balance."));
    return;
  }
  const after = balance.skipped ? null : balance.fils - amount.fils;
  makeTransactionPlan(result, {
    legacy: { amount: amount.fils, due: amount.fils, paid: amount.fils, deficit: 0n },
    fils: {
      amount_fils: amount.fils,
      due_fils: amount.fils,
      paid_fils: amount.fils,
      deficit_fils: 0n
    }
  });
  result.depositLedgerPlan = {
    table: "deposit_ledger",
    legacyFields: {
      amount: aed(amount.fils),
      delta: aed(-amount.fils),
      balance_after: after === null ? null : aed(after)
    },
    filsPatch: {
      amount_fils: safeInt(amount.fils, "amount_fils"),
      delta_fils: safeInt(-amount.fils, "delta_fils"),
      balance_after_fils: after === null ? null : safeInt(after, "balance_after_fils")
    }
  };
}

function buildCheckout(result) {
  const deduction = money(result.entry.deposit_deduction, "entry.deposit_deduction");
  if (!addParsed(result, deduction) || !positive(deduction, "entry.deposit_deduction", result))
    return;
  const balance = money(result.resolved.depositBalanceAed, "resolved.depositBalanceAed", {
    required: false
  });
  addParsed(result, balance);
  if (!balance.skipped && deduction.fils > balance.fils) {
    result.errors.push(
      issue("DEPOSIT_DEDUCTION_EXCEEDED", "Checkout deduction exceeds known balance.")
    );
    return;
  }
  const after = balance.skipped ? null : balance.fils - deduction.fils;
  const amount = money(result.entry.amount, "entry.amount", { required: false });
  addParsed(result, amount);
  makeTransactionPlan(result, {
    legacy: {
      amount: amount.fils,
      due: 0n,
      paid: 0n,
      deficit: 0n,
      deposit_deduction: deduction.fils
    },
    fils: {
      amount_fils: amount.fils,
      due_fils: 0n,
      paid_fils: 0n,
      deficit_fils: 0n,
      deposit_deduction_fils: deduction.fils
    }
  });
  result.depositLedgerPlan = {
    table: "deposit_ledger",
    legacyFields: {
      amount: aed(deduction.fils),
      delta: aed(-deduction.fils),
      balance_after: after === null ? null : aed(after)
    },
    filsPatch: {
      amount_fils: safeInt(deduction.fils, "amount_fils"),
      delta_fils: safeInt(-deduction.fils, "delta_fils"),
      balance_after_fils: after === null ? null : safeInt(after, "balance_after_fils")
    }
  };
}

function buildArrearsPayment(result) {
  const amount = money(result.entry.amount, "entry.amount");
  if (!addParsed(result, amount) || !positive(amount, "entry.amount", result)) return;
  const taskId = text(result.entry.linked_task_id, result.entry.task_id);
  if (!taskId)
    result.errors.push(issue("LINKED_TASK_REQUIRED", "Arrears payment requires linked task id."));
  makeTransactionPlan(result, {
    legacy: { amount: amount.fils, due: amount.fils, paid: amount.fils, deficit: 0n },
    fils: {
      amount_fils: amount.fils,
      due_fils: amount.fils,
      paid_fils: amount.fils,
      deficit_fils: 0n
    }
  });
  result.arrearTaskPlan = {
    table: "arrear_tasks",
    task_id: taskId,
    legacyFields: {
      actual_received_increment: aed(amount.fils)
    },
    filsPatch: {
      actual_received_increment_fils: safeInt(amount.fils, "actual_received_increment_fils")
    }
  };
}

function buildTransferFee(result) {
  const feePaid = text(result.entry.fee_paid).toUpperCase();
  const amountFils = feePaid === "N" ? 0n : 5000n;
  makeTransactionPlan(result, {
    legacy: { amount: amountFils, due: amountFils, paid: amountFils, deficit: 0n },
    fils: { amount_fils: amountFils, due_fils: amountFils, paid_fils: amountFils, deficit_fils: 0n }
  });
}

function buildExpense(result) {
  const amount = money(result.entry.amount, "entry.amount");
  if (!addParsed(result, amount) || !positive(amount, "entry.amount", result)) return;
  makeTransactionPlan(result, {
    legacy: { amount: amount.fils, due: 0n, paid: 0n, deficit: 0n },
    fils: { amount_fils: amount.fils, due_fils: 0n, paid_fils: 0n, deficit_fils: 0n }
  });
}

export function createEmployeeEntryLiveWriteAdapterDraft(input) {
  const result = baseResult(input);
  if (!SUPPORTED_TYPES.has(result.eventType)) {
    result.errors.push(
      issue("UNSUPPORTED_EVENT_TYPE", `Unsupported event type: ${result.eventType}`)
    );
  }
  if (!result.companyId) result.errors.push(issue("MISSING_SCOPE", "companyId is required."));
  if (!result.propertyId) result.errors.push(issue("MISSING_SCOPE", "propertyId is required."));
  if (!result.operatorId) result.errors.push(issue("MISSING_OPERATOR", "operatorId is required."));
  if (!result.sessionId) result.errors.push(issue("MISSING_SESSION", "sessionId is required."));
  if (!result.clientEntryId)
    result.errors.push(issue("MISSING_ENTRY_ID", "client entry id is required."));

  const status = text(result.entry.status).toUpperCase();
  if (text(result.entry.voided_at) || status === "VOID" || status === "VOIDED") {
    result.status = "SKIPPED_VOIDED";
    result.skipped = true;
    result.warnings.push(
      issue("VOIDED_ROW_EXCLUDED", "Voided rows are excluded from active write adapter rehearsal.")
    );
    pushAudit(result, "employee_entry_adapter_skipped_voided");
    return { ...result, ok: true };
  }

  if (!result.errors.length) {
    if (result.eventType === "R") buildRent(result);
    if (result.eventType === "D") buildDepositIn(result);
    if (result.eventType === "DR") buildDepositRefund(result);
    if (result.eventType === "CO") buildCheckout(result);
    if (result.eventType === "AP") buildArrearsPayment(result);
    if (result.eventType === "TF") buildTransferFee(result);
    if (result.eventType === "E") buildExpense(result);
  }

  if (result.transactionPlan) {
    const cashHandoverFils = sessionCashDeltaFils(result);
    const bankTransferTotalFils = sessionBankInboundFils(result);
    const grossReceivedFils = sessionGrossReceivedFils(result);
    makeSessionPlan(result, {
      legacy: {
        cash_handover: cashHandoverFils,
        bank_transfer_total: bankTransferTotalFils,
        gross_received: grossReceivedFils
      },
      fils: {
        cash_handover_fils: cashHandoverFils,
        bank_transfer_total_fils: bankTransferTotalFils,
        gross_received_fils: grossReceivedFils
      }
    });
  }

  result.status = result.errors.length ? "REJECTED" : "DRAFT_READY";
  pushAudit(
    result,
    result.errors.length ? "employee_entry_adapter_rejected" : "employee_entry_adapter_draft_ready",
    {
      event_type: result.eventType,
      warnings: result.warnings.map((item) => item.code),
      errors: result.errors.map((item) => item.code)
    }
  );

  return {
    ...result,
    ok: result.errors.length === 0,
    metadata: {
      liveRouteChanged: false,
      writesDatabase: false,
      productionMigration: false,
      frontendTotalsAuthority: false
    }
  };
}
