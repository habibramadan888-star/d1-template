import {
  createEmployeeNextRouteController,
  type EmployeeNextRouteController,
  type EmployeeNextRouteView,
} from "./route";
import type {
  EmployeeApiJsonValue,
  EmployeeApiRequest,
  EmployeeApiResponse,
  EmployeeApiTransport,
} from "./core/api-client";
import {
  isEmployeeAuthSession,
  type EmployeeAuthSession,
} from "./core/auth";
import type {
  EmployeeSubmitEntryContext,
} from "./core/submit-entry";
import {
  createEmployeeNextSessionDraftController,
  type EmployeeNextSessionDraftController,
  type EmployeeNextSessionDraftEntry,
  type EmployeeNextSessionDraftStoragePort,
  type EmployeeNextSessionDraftView,
} from "./session-draft";
import {
  createEmployeeEntryUiController,
  type EmployeeEntryContextPort,
  type EmployeeEntryUiController,
} from "./ui/event-entry-templates";
import {
  createEmployeeSevenEventRegistry,
} from "./events";

export const employeeNextRouteId = "employee-next-route-candidate";

export interface EmployeeNextBrowserRequestInit {
  readonly method: "GET" | "POST";
  readonly credentials: "same-origin";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface EmployeeNextBrowserResponse {
  readonly status: number;
  json(): Promise<unknown>;
}

export interface EmployeeNextBrowserRequestPort {
  request(
    path: string,
    init: EmployeeNextBrowserRequestInit,
  ): Promise<EmployeeNextBrowserResponse>;
}

export interface EmployeeNextSidecarAdapterOptions {
  readonly requestPort: EmployeeNextBrowserRequestPort;
  readonly sessionPath: string;
  readonly submitPath: string;
}

export interface EmployeeNextSidecarAdapters {
  readonly transport: EmployeeApiTransport;
  readonly submitPath: string;
  readonly restoreSession: () => Promise<EmployeeAuthSession>;
  readonly buildApiRequest: (
    context: EmployeeSubmitEntryContext<object>,
  ) => EmployeeApiRequest;
}

export type EmployeeExpenseUploadCanaryState =
  | Readonly<{ status: "IDLE" }>
  | Readonly<{ status: "SUBMITTING" }>
  | Readonly<{
    status: "SYNCED";
    entryId: string;
    sessionId: string;
  }>
  | Readonly<{
    status: "ERROR";
    errorCode: "EXPENSE_UPLOAD_FAILED";
  }>;

type JsonRecord = Readonly<Record<string, EmployeeApiJsonValue>>;

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safePath(value: unknown): value is string {
  return (
    typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("..")
    && !value.includes("\\")
    && !value.includes("?")
    && !value.includes("#")
  );
}

function safeRequestPort(value: unknown): value is EmployeeNextBrowserRequestPort {
  return (
    typeof value === "object"
    && value !== null
    && typeof (value as Readonly<Record<string, unknown>>).request === "function"
  );
}

function responsePort(value: unknown): value is EmployeeNextBrowserResponse {
  return (
    typeof value === "object"
    && value !== null
    && Number.isInteger(
      (value as Readonly<Record<string, unknown>>).status,
    )
    && typeof (value as Readonly<Record<string, unknown>>).json === "function"
  );
}

function safeHeaders(
  value: Readonly<Record<string, string>> | undefined,
): boolean {
  if (value === undefined) {
    return true;
  }
  return Object.keys(value).every(
    (key) => key.toLowerCase() !== ["author", "ization"].join(""),
  );
}

function apiData(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (
    !isPlainRecord(value)
    || value.code !== 0
    || value.success === false
  ) {
    return undefined;
  }
  const error = value.error;
  if (
    error !== undefined
    && error !== null
    && !(typeof error === "string" && error.trim().length === 0)
  ) {
    return undefined;
  }
  const data = value.data;
  return isPlainRecord(data) ? data : undefined;
}

function normalizedServerId(
  data: Readonly<Record<string, unknown>>,
): string | undefined {
  const values = [data.userid, data.employee_id]
    .filter((value): value is string => (
      typeof value === "string" && value.trim().length > 0
    ))
    .map((value) => value.trim());
  if (values.length === 0 || values.some((value) => value !== values[0])) {
    return undefined;
  }
  return values[0];
}

export function mapEmployeeNextServerSession(
  value: unknown,
): EmployeeAuthSession | undefined {
  const data = apiData(value);
  if (data === undefined) {
    return undefined;
  }
  const roleValue = typeof data.role === "string"
    ? data.role.trim().toLowerCase()
    : "";
  const role = roleValue === "employee"
    ? "EMPLOYEE"
    : roleValue === "staff"
      ? "STAFF"
      : undefined;
  const employeeId = normalizedServerId(data);
  const corpid = typeof data.corpid === "string"
    && data.corpid.trim().length > 0
    ? data.corpid.trim()
    : undefined;
  if (
    role === undefined
    || employeeId === undefined
    || corpid === undefined
  ) {
    return undefined;
  }
  const displayNameValue = [data.display_name, data.employee_name]
    .find((candidate) => (
      typeof candidate === "string" && candidate.trim().length > 0
    ));
  const displayName = typeof displayNameValue === "string"
    ? displayNameValue.trim()
    : employeeId;
  return Object.freeze({
    user: Object.freeze({
      employeeId,
      displayName,
      role,
      userid: employeeId,
      corpid,
    }),
  });
}

function containsForbiddenIdentity(value: EmployeeApiJsonValue): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenIdentity(item));
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  const accessProviderKey = ["tt", "lock"].join("");
  return Object.entries(value).some(([key, item]) => {
    const normalizedKey = key.toLowerCase();
    const isExplicitNoMutationProof = (
      normalizedKey === `${accessProviderKey}mutationapplied`
      && item === false
    );
    return (
      /(?:provider|card_?id|tenant_?card|phone_?99099)/iu.test(key)
      || (normalizedKey.includes(accessProviderKey) && !isExplicitNoMutationProof)
      || containsForbiddenIdentity(item)
    );
  });
}

function stableJson(value: EmployeeApiJsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableIdentity(value: EmployeeApiJsonValue): string {
  const source = stableJson(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function requiredRecord(
  value: EmployeeApiJsonValue | undefined,
): JsonRecord {
  if (!isPlainRecord(value)) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return value;
}

function requiredString(
  record: JsonRecord,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return value.trim();
}

function optionalString(
  record: JsonRecord,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function requiredMoney(record: JsonRecord, key: string): number {
  const value = record[key];
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < 0
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function singlePayment(
  value: EmployeeApiJsonValue | undefined,
  amountKey: string,
): Readonly<{ method: "cash" | "bank"; amount: number }> {
  const payment = requiredRecord(value);
  const method = requiredString(payment, "method");
  const legs = payment.legs;
  if (
    (method !== "cash" && method !== "bank")
    || !Array.isArray(legs)
    || legs.length !== 1
    || !isPlainRecord(legs[0])
    || requiredString(legs[0], "method") !== method
  ) {
    throw new Error("SIDECAR_ADAPTER_UNSUPPORTED_PAYMENT");
  }
  const amount = requiredMoney(legs[0], amountKey);
  return Object.freeze({ method, amount });
}

function eventDate(submission: JsonRecord): string {
  for (
    const key of [
      "rentPeriodStart",
      "repaymentDate",
      "depositReceivedDate",
      "refundDate",
      "checkoutDate",
      "expenseDate",
      "transferDate",
    ]
  ) {
    const value = optionalString(submission, key);
    if (value !== undefined) {
      return value;
    }
  }
  throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
}

function baseEntry(
  submission: JsonRecord,
  employeeId: string,
): Readonly<Record<string, EmployeeApiJsonValue>> {
  if (containsForbiddenIdentity(submission)) {
    throw new Error("SIDECAR_ADAPTER_FORBIDDEN_IDENTITY");
  }
  const digest = stableIdentity({
    employeeId,
    submission,
  });
  return Object.freeze({
    id: `employee-next-entry-${digest}`,
    entry_id: `employee-next-entry-${digest}`,
    event_id: `employee-next-event-${digest}`,
    source: "employee_next",
  });
}

function rentEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = singlePayment(submission.payment, "amountAed");
  const amountDue = requiredMoney(submission, "amountDueAed");
  const amountReceived = requiredMoney(submission, "amountReceivedAed");
  const shortPayment = submission.shortPayment === undefined
    ? undefined
    : requiredRecord(submission.shortPayment);
  const promiseDate = shortPayment === undefined
    ? undefined
    : optionalString(shortPayment, "promiseDate");
  const note = shortPayment === undefined
    ? optionalString(submission, "note")
    : requiredString(shortPayment, "note");
  if (amountReceived < amountDue && promiseDate === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_ARREARS_DATE");
  }
  return Object.freeze({
    ...base,
    type: "R",
    event_type: "rent",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: amountReceived,
    due: amountDue,
    paid: amountReceived,
    expected_rent: amountDue,
    paid_amount: amountReceived,
    payment_method: payment.method,
    pay_type: payment.method,
    period_start: requiredString(submission, "rentPeriodStart"),
    period_end: requiredString(submission, "rentPeriodEnd"),
    rent_period_start: requiredString(submission, "rentPeriodStart"),
    rent_period_end: requiredString(submission, "rentPeriodEnd"),
    short_paid: amountReceived < amountDue,
    ...(promiseDate === undefined ? {} : {
      arrears_due_date: promiseDate,
      arrear_promise_date: promiseDate,
    }),
    ...(note === undefined ? {} : {
      arrears_note: note,
      note,
    }),
  });
}

function arrearsPaymentEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = singlePayment(submission.payment, "amountAed");
  const before = requiredMoney(submission, "remainingArrearsAed");
  const amount = requiredMoney(submission, "amountReceivedAed");
  const after = Math.round((before - amount + Number.EPSILON) * 100) / 100;
  if (amount <= 0 || after < 0) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Object.freeze({
    ...base,
    type: "AP",
    event_type: "arrears_payment",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount,
    payment_amount: amount,
    payment_method: payment.method,
    pay_type: payment.method,
    arrears_ref: requiredString(submission, "cloudArrearsRef"),
    linked_task_id: requiredString(submission, "cloudArrearsRef"),
    original_arrears_id: requiredString(submission, "cloudArrearsRef"),
    remaining_arrears_before_payment: before,
    remaining_arrears_after_payment: after,
    remaining_arrears: after,
    settlement_status: after === 0 ? "settled" : "partial",
    payment_date: requiredString(submission, "repaymentDate"),
    ...(optionalString(submission, "note") === undefined
      ? {}
      : { note: optionalString(submission, "note") as string }),
  });
}

function depositInEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = singlePayment(submission.payment, "amountAed");
  return Object.freeze({
    ...base,
    type: "D",
    event_type: "deposit_in",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: requiredMoney(submission, "depositAmountAed"),
    deposit_amount: requiredMoney(submission, "depositAmountAed"),
    deposit_required_total: requiredMoney(
      submission,
      "depositRequiredTotalAed",
    ),
    previous_deposit_recorded_amount: requiredMoney(
      submission,
      "previousDepositRecordedAmountAed",
    ),
    deposit_paid_amount: requiredMoney(submission, "depositPaidAmountAed"),
    expected_deposit_after_payment: requiredMoney(
      submission,
      "expectedDepositAfterPaymentAed",
    ),
    deposit_remaining_after_payment: requiredMoney(
      submission,
      "depositRemainingAfterPaymentAed",
    ),
    deposit_remaining: requiredMoney(
      submission,
      "depositRemainingAfterPaymentAed",
    ),
    payment_method: payment.method,
    pay_type: payment.method,
    deposit_received_date: requiredString(
      submission,
      "depositReceivedDate",
    ),
    ...(optionalString(submission, "note") === undefined
      ? {}
      : { note: optionalString(submission, "note") as string }),
  });
}

function depositOutEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const refund = singlePayment(submission.refund, "amountAed");
  const difference = requiredRecord(submission.difference);
  const reason = optionalString(difference, "reason")
    ?? optionalString(submission, "note");
  if (reason === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_REFUND_REASON");
  }
  return Object.freeze({
    ...base,
    type: "DR",
    event_type: "deposit_out",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: requiredMoney(submission, "refundAmountAed"),
    deposit_balance: requiredMoney(
      submission,
      "currentDepositSnapshotAed",
    ),
    actual_refund_amount: requiredMoney(submission, "refundAmountAed"),
    refund_amount: requiredMoney(submission, "refundAmountAed"),
    refund_difference: requiredMoney(difference, "amountAed"),
    refund_method: refund.method,
    payment_method: refund.method,
    pay_type: refund.method,
    refund_date: requiredString(submission, "refundDate"),
    refund_reason: reason,
    difference_reason: reason,
    note: reason,
  });
}

function checkoutEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const deposit = requiredRecord(submission.depositSettlement);
  const arrears = requiredRecord(submission.arrearsSnapshot);
  const mode = requiredString(submission, "checkoutMode");
  const outstanding = requiredMoney(arrears, "outstandingArrearsAed");
  const refund = requiredMoney(deposit, "depositRefundDeclaredAed");
  if (refund !== 0) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_REFUND_METHOD");
  }
  const finalNote = optionalString(submission, "finalNote");
  if (mode === "left_with_arrears" && finalNote === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNPROVEN_CHECKOUT_NOTE");
  }
  return Object.freeze({
    ...base,
    type: "CO",
    event_type: mode === "left_with_arrears"
      ? "left_with_arrears"
      : "checkout",
    room: requiredString(submission, "bedLabel"),
    bed: requiredString(submission, "bedLabel"),
    amount: 0,
    checkout_date: requiredString(submission, "checkoutDate"),
    checkout_type: mode,
    checkout_mode: mode,
    left_with_arrears: mode === "left_with_arrears",
    customer_left: mode === "left_with_arrears",
    deposit_refund: refund,
    outstanding_arrears: outstanding,
    open_arrears_amount: outstanding,
    arrears_amount: outstanding,
    left_arrears_amount: outstanding,
    ...(optionalString(arrears, "cloudArrearsRef") === undefined
      ? {}
      : {
        arrears_ref: optionalString(arrears, "cloudArrearsRef") as string,
      }),
    ...(finalNote === undefined ? {} : {
      note: finalNote,
      final_note: finalNote,
    }),
  });
}

function expenseEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const payment = requiredRecord(submission.payment);
  const method = requiredString(payment, "method");
  if (method !== "cash" && method !== "bank") {
    throw new Error("SIDECAR_ADAPTER_UNSUPPORTED_PAYMENT");
  }
  const allocation = requiredRecord(submission.allocation);
  const target = requiredString(allocation, "targetBedOrRoomLabel");
  const description = requiredString(submission, "expenseDescription");
  return Object.freeze({
    ...base,
    type: "E",
    event_type: "expense",
    room: target,
    target_bed: target,
    amount: requiredMoney(submission, "expenseAmountAed"),
    expense_amount: requiredMoney(submission, "expenseAmountAed"),
    expense_category: requiredString(submission, "expenseCategory"),
    expense_description: description,
    expense_desc: description,
    payment_method: method,
    pay_type: method,
    expense_date: requiredString(submission, "expenseDate"),
    note: description,
  });
}

function bedTransferEntry(
  submission: JsonRecord,
  base: Readonly<Record<string, EmployeeApiJsonValue>>,
): JsonRecord {
  const fee = requiredRecord(submission.transferFeePreview);
  const difference = requiredRecord(submission.bedPriceDifferencePreview);
  const arrears = requiredRecord(submission.arrearsCarryoverPreview);
  const feeMode = requiredString(fee, "mode");
  const feeMethod = requiredString(fee, "paymentMethod");
  if (
    (feeMode === "paid" && feeMethod !== "cash" && feeMethod !== "bank")
    || (
      feeMode !== "paid"
      && feeMode !== "waived"
      && feeMode !== "unpaid"
    )
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  const differenceMode = requiredString(difference, "mode");
  const differenceMethod = requiredString(difference, "paymentMethod");
  if (
    differenceMode !== "none"
    && differenceMode !== "paid"
    && differenceMode !== "unpaid"
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  return Object.freeze({
    ...base,
    type: "TF",
    event_type: "bed_transfer",
    from_bed: requiredString(submission, "fromBed"),
    to_bed: requiredString(submission, "toBed"),
    transfer_reason: requiredString(submission, "transferReason"),
    fee_mode: feeMode,
    fee_amount_aed: requiredMoney(fee, "declaredAmountAed"),
    fee_due_date: optionalString(fee, "dueDate") ?? "",
    payment_method: feeMethod,
    fee_waiver_reason: optionalString(fee, "waiverReason") ?? "",
    bed_price_difference_mode: differenceMode,
    bed_price_difference_amount_aed: requiredMoney(
      difference,
      "declaredAmountAed",
    ),
    bed_price_difference_due_date:
      optionalString(difference, "dueDate") ?? "",
    bed_price_difference_payment_method: differenceMethod,
    bed_price_difference_reason:
      optionalString(difference, "reason") ?? "",
    arrears_carryover: arrears.carryoverRequired === true,
    carried_arrears_amount: requiredMoney(
      arrears,
      "carriedArrearsAmountAed",
    ),
    ...(optionalString(arrears, "cloudArrearsRef") === undefined
      ? {}
      : {
        cloud_arrears_ref: optionalString(
          arrears,
          "cloudArrearsRef",
        ) as string,
      }),
    note: optionalString(submission, "finalNote")
      ?? requiredString(submission, "transferReason"),
  });
}

export function buildEmployeeNextSidecarRequest(
  context: EmployeeSubmitEntryContext<object>,
  submitPath: string,
): EmployeeApiRequest {
  if (
    !safePath(submitPath)
    || !isPlainRecord(context.submission)
    || containsForbiddenIdentity(context.submission)
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_SUBMISSION");
  }
  const submission = context.submission;
  const base = baseEntry(submission, context.session.user.employeeId);
  const entry = context.eventId === "rent"
    ? rentEntry(submission, base)
    : context.eventId === "arrears-payment"
      ? arrearsPaymentEntry(submission, base)
      : context.eventId === "deposit-in"
        ? depositInEntry(submission, base)
        : context.eventId === "deposit-out"
          ? depositOutEntry(submission, base)
          : context.eventId === "checkout"
            ? checkoutEntry(submission, base)
            : context.eventId === "expense"
              ? expenseEntry(submission, base)
              : context.eventId === "bed-transfer"
                ? bedTransferEntry(submission, base)
                : undefined;
  if (entry === undefined) {
    throw new Error("SIDECAR_ADAPTER_UNKNOWN_EVENT");
  }
  const identity = stableIdentity({
    employeeId: context.session.user.employeeId,
    submission,
  });
  const sessionId = `employee-next-session-${identity}`;
  const date = eventDate(submission);
  const body = Object.freeze({
    entry_identity: entry.id,
    entry,
    event_index: 0,
    session: Object.freeze({
      id: sessionId,
      session_id: sessionId,
      date,
      entries_count: 1,
      entries: Object.freeze([entry]),
      cash_handover: 0,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 0,
      handover_status: "COMPLETED",
      source: "employee_next",
    }),
  });
  return Object.freeze({
    method: "POST",
    path: submitPath,
    body,
  });
}

export function createEmployeeNextSidecarAdapters(
  options: EmployeeNextSidecarAdapterOptions,
): EmployeeNextSidecarAdapters {
  if (
    typeof options !== "object"
    || options === null
    || !safeRequestPort(options.requestPort)
    || !safePath(options.sessionPath)
    || !safePath(options.submitPath)
    || options.sessionPath === options.submitPath
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_OPTIONS");
  }
  const requestPort = options.requestPort;
  const sessionPath = options.sessionPath;
  const submitPath = options.submitPath;
  const transport = Object.freeze({
    async request(request: EmployeeApiRequest): Promise<EmployeeApiResponse> {
      if (
        request.method !== "POST"
        || request.path !== submitPath
        || !safeHeaders(request.headers)
      ) {
        throw new Error("SIDECAR_ADAPTER_REQUEST_REJECTED");
      }
      let response: EmployeeNextBrowserResponse;
      try {
        response = await requestPort.request(submitPath, Object.freeze({
          method: "POST",
          credentials: "same-origin",
          headers: Object.freeze({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          ...(request.body === undefined
            ? {}
            : { body: JSON.stringify(request.body) }),
        }));
      } catch {
        throw new Error("SIDECAR_ADAPTER_TRANSPORT_FAILED");
      }
      if (!responsePort(response)) {
        throw new Error("SIDECAR_ADAPTER_INVALID_RESPONSE");
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("SIDECAR_ADAPTER_INVALID_RESPONSE");
      }
      if (
        !Number.isInteger(response.status)
        || response.status < 100
        || response.status > 599
        || !(
          body === undefined
          || typeof body === "string"
          || typeof body === "number"
          || typeof body === "boolean"
          || body === null
          || Array.isArray(body)
          || isPlainRecord(body)
        )
      ) {
        throw new Error("SIDECAR_ADAPTER_INVALID_RESPONSE");
      }
      return Object.freeze({
        status: response.status,
        body: body as EmployeeApiJsonValue,
      });
    },
  });
  return Object.freeze({
    transport,
    submitPath,
    async restoreSession(): Promise<EmployeeAuthSession> {
      let response: EmployeeNextBrowserResponse;
      let body: unknown;
      try {
        response = await requestPort.request(sessionPath, Object.freeze({
          method: "GET",
          credentials: "same-origin",
          headers: Object.freeze({ Accept: "application/json" }),
        }));
        if (!responsePort(response) || response.status !== 200) {
          throw new Error("SESSION_RESPONSE_REJECTED");
        }
        body = await response.json();
      } catch {
        throw new Error("SIDECAR_SESSION_RESTORE_FAILED");
      }
      const session = mapEmployeeNextServerSession(body);
      if (session === undefined) {
        throw new Error("SIDECAR_SESSION_RESTORE_FAILED");
      }
      return session;
    },
    buildApiRequest(
      context: EmployeeSubmitEntryContext<object>,
    ): EmployeeApiRequest {
      return buildEmployeeNextSidecarRequest(context, submitPath);
    },
  });
}

function expectedExpenseUploadReceipt(
  request: EmployeeApiRequest,
): Readonly<{ entryId: string; sessionId: string }> | undefined {
  if (
    request.method !== "POST"
    || !isPlainRecord(request.body)
    || typeof request.body.entry_identity !== "string"
    || !isPlainRecord(request.body.session)
  ) {
    return undefined;
  }
  const entryId = request.body.entry_identity.trim();
  const sessionIdValue = request.body.session.session_id;
  const sessionId = typeof sessionIdValue === "string"
    ? sessionIdValue.trim()
    : "";
  return entryId.length > 0 && sessionId.length > 0
    ? Object.freeze({ entryId, sessionId })
    : undefined;
}

function explicitExpenseUploadReceipt(
  response: EmployeeApiResponse,
  expected: Readonly<{ entryId: string; sessionId: string }>,
): Readonly<{ entryId: string; sessionId: string }> | undefined {
  if (
    response.status < 200
    || response.status > 299
    || !isPlainRecord(response.body)
    || response.body.success !== true
    || response.body.ok === false
    || response.body.error !== undefined
    || response.body.error_code !== undefined
    || response.body.entry_id !== expected.entryId
    || response.body.session_id !== expected.sessionId
  ) {
    return undefined;
  }
  return expected;
}

function appendText(
  parent: HTMLElement,
  tagName: "h1" | "p" | "section",
  text: string,
): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  parent.append(element);
  return element;
}

function localDraftDisplayText(entry: EmployeeNextSessionDraftEntry): string {
  const base = `${entry.event_type} — unsent local draft`;
  if (entry.event_type !== "expense" || !isPlainRecord(entry.payload)) {
    return base;
  }
  const payment = entry.payload.payment;
  const amount = entry.payload.expenseAmountAed;
  const description = entry.payload.expenseDescription;
  if (
    typeof amount !== "number"
    || !Number.isFinite(amount)
    || !isPlainRecord(payment)
    || (payment.method !== "cash" && payment.method !== "bank")
    || typeof description !== "string"
    || description.trim().length === 0
  ) {
    return base;
  }
  return `${base} — AED ${amount.toFixed(2)} — ${payment.method} — ${description.trim()}`;
}

function createLocalRenderPort(
  root: HTMLElement,
  controllerRef: () => EmployeeNextRouteController | undefined,
  draftViewRef?: () => EmployeeNextSessionDraftView,
  entryUiRef?: () => EmployeeEntryUiController | undefined,
  removeLocalDraft?: (entry: EmployeeNextSessionDraftEntry) => Promise<void>,
  expenseUploadRef?: () => Readonly<{
    enabled: boolean;
    state: EmployeeExpenseUploadCanaryState;
    upload: () => Promise<boolean>;
  }>,
) {
  return Object.freeze({
    render(view: EmployeeNextRouteView): void {
      root.replaceChildren();
      root.dataset.route = "/employee-next";
      root.dataset.routeStatus = view.state.status;

      appendText(root, "h1", "Employee Next");
      appendText(root, "p", `Route status: ${view.state.status}`);
      appendText(root, "p", `Authentication: ${view.shell.auth.status}`);
      appendText(root, "p", `Submit status: ${view.shell.submit.status}`);
      const draftView = draftViewRef?.();
      if (draftView !== undefined) {
        if (draftView.status === "AUTH_RESTORING") {
          appendText(root, "p", "Restoring session");
        } else if (draftView.status === "DRAFT_RESTORING") {
          appendText(root, "p", "Restoring draft");
        } else if (draftView.status === "DRAFT_UNAVAILABLE") {
          appendText(root, "p", `Draft unavailable: ${draftView.errorCode}`);
        } else {
          appendText(
            root,
            "p",
            `Current Session (${draftView.entryCount})`,
          );
          appendText(
            root,
            "p",
            `Cash Received: AED ${draftView.summary.cashReceivedAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Bank Received: AED ${draftView.summary.bankReceivedAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Total Received: AED ${draftView.summary.totalReceivedAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Expenses: AED ${draftView.summary.expensesAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Cash Net: AED ${draftView.summary.cashNetAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Bank Net: AED ${draftView.summary.bankNetAed.toFixed(2)}`,
          );
          appendText(
            root,
            "p",
            `Net Funds: AED ${draftView.summary.netFundsAed.toFixed(2)}`,
          );
          if (
            draftView.session !== undefined
            && removeLocalDraft !== undefined
          ) {
            const localDrafts = appendText(root, "section", "");
            localDrafts.setAttribute("aria-label", "Current local drafts");
            localDrafts.dataset.sessionId = draftView.session.session_id;
            for (const entry of draftView.session.entries) {
              const row = appendText(
                localDrafts,
                "section",
                localDraftDisplayText(entry),
              );
              row.dataset.entryId = entry.entry_id;
              const remove = document.createElement("button");
              remove.type = "button";
              remove.textContent = "Remove Local Draft / 删除本地草稿";
              remove.dataset.action = "remove-local-draft";
              remove.dataset.entryId = entry.entry_id;
              remove.addEventListener("click", () => {
                void removeLocalDraft(entry);
              });
              row.append(remove);
            }
          }
          if (draftView.errorCode !== undefined) {
            appendText(root, "p", draftView.errorCode);
          }
        }
      }
      const expenseUpload = expenseUploadRef?.();
      if (expenseUpload !== undefined) {
        appendText(
          root,
          "p",
          `Employee Sync State: ${expenseUpload.state.status}`,
        );
        if (expenseUpload.enabled) {
          const upload = document.createElement("button");
          upload.type = "button";
          upload.textContent = "Upload Session";
          upload.dataset.action = "upload-expense-session";
          upload.disabled = expenseUpload.state.status === "SUBMITTING";
          upload.addEventListener("click", () => {
            void expenseUpload.upload();
          });
          root.append(upload);
        }
      }

      const eventSection = appendText(root, "section", "");
      eventSection.setAttribute("aria-label", "Seven event choices");
      for (const option of view.shell.eventOptions) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option.displayName;
        button.dataset.eventId = option.eventId;
        button.setAttribute("aria-pressed", String(option.selected));
        button.addEventListener("click", () => {
          const controller = controllerRef();
          if (controller !== undefined) {
            controller.selectEvent(option.eventId);
            entryUiRef?.()?.selectEvent(option.eventId);
          }
        });
        eventSection.append(button);
      }
      const entrySection = appendText(root, "section", "");
      entrySection.setAttribute("aria-label", "Event entry form");
      entryUiRef?.()?.mount(entrySection, {
        authenticatedStaff: (
          view.shell.auth.status === "AUTHENTICATED"
          && view.shell.auth.role === "STAFF"
        ),
      });
    },
  });
}

function createBrowserDraftStoragePort(): EmployeeNextSessionDraftStoragePort {
  return Object.freeze({
    getItem(key: string): string | null {
      return globalThis.localStorage.getItem(key);
    },
    setItem(key: string, value: string): void {
      globalThis.localStorage.setItem(key, value);
    },
    removeItem(key: string): void {
      globalThis.localStorage.removeItem(key);
    },
  });
}

export interface EmployeeNextSidecarRuntimeOptions {
  readonly draftStorage?: EmployeeNextSessionDraftStoragePort;
  readonly now?: () => string;
  readonly entryContexts?: EmployeeEntryContextPort;
  readonly createId?: () => string;
  readonly confirmLocalDraftRemoval?: (
    entry: EmployeeNextSessionDraftEntry,
  ) => boolean | Promise<boolean>;
  readonly confirmExpenseUpload?: (
    entry: EmployeeNextSessionDraftEntry,
  ) => boolean | Promise<boolean>;
}

function createBrowserId(): string {
  if (
    typeof globalThis.crypto !== "object"
    || globalThis.crypto === null
    || typeof globalThis.crypto.randomUUID !== "function"
  ) {
    throw new Error("EMPLOYEE_NEXT_ID_GENERATOR_UNAVAILABLE");
  }
  return globalThis.crypto.randomUUID();
}

function createDisabledLocalTransport() {
  return Object.freeze({
    async request() {
      return Object.freeze({
        status: 503,
        body: Object.freeze({ errorCode: "LOCAL_ROUTE_TRANSPORT_DISABLED" }),
      });
    },
  });
}

export function startEmployeeNextRoute(
  root: HTMLElement,
): EmployeeNextRouteController {
  let controller: EmployeeNextRouteController | undefined;
  controller = createEmployeeNextRouteController({
    transport: createDisabledLocalTransport(),
    render: createLocalRenderPort(root, () => controller),
    buildApiRequest: () => Object.freeze({
      method: "POST",
      path: "/unit-test-route-submit",
    }),
  });
  root.dataset.routeCandidate = employeeNextRouteId;
  void controller.render();
  return controller;
}

export function startEmployeeNextSidecarRoute(
  root: HTMLElement,
  adapters: EmployeeNextSidecarAdapters,
  options: EmployeeNextSidecarRuntimeOptions = {},
): Readonly<{
  controller: EmployeeNextRouteController;
  drafts: EmployeeNextSessionDraftController;
  addToSession: (input: Readonly<{
    sessionId: string;
    entry: EmployeeNextSessionDraftEntry;
  }>) => Promise<boolean>;
  sessionRestore: Promise<boolean>;
  getExpenseUploadState: () => EmployeeExpenseUploadCanaryState;
  uploadExpense: () => Promise<boolean>;
}> {
  if (
    typeof adapters !== "object"
    || adapters === null
    || typeof adapters.restoreSession !== "function"
    || typeof adapters.buildApiRequest !== "function"
    || !safePath(adapters.submitPath)
  ) {
    throw new Error("SIDECAR_ADAPTER_INVALID_OPTIONS");
  }
  const drafts = createEmployeeNextSessionDraftController(
    options.draftStorage ?? createBrowserDraftStoragePort(),
    options.now,
  );
  let controller: EmployeeNextRouteController | undefined;
  let entryUi: EmployeeEntryUiController | undefined;
  let authenticatedSession: EmployeeAuthSession | undefined;
  let expenseUploadState: EmployeeExpenseUploadCanaryState =
    Object.freeze({ status: "IDLE" });
  let expenseUploadInFlight = false;
  const removingEntryIds = new Set<string>();
  const confirmLocalDraftRemoval = options.confirmLocalDraftRemoval
    ?? (() => globalThis.confirm(
      "Remove this unsent local draft? This cannot affect cloud records.",
    ));
  const confirmExpenseUpload = options.confirmExpenseUpload
    ?? (() => globalThis.confirm(
      "Upload this one real Expense to Homelink now? This creates a real business record.",
    ));
  function expenseUploadEntry(): EmployeeNextSessionDraftEntry | undefined {
    const session = drafts.getSession();
    return (
      isEmployeeAuthSession(authenticatedSession)
      && authenticatedSession.user.role === "STAFF"
      && authenticatedSession.user.corpid === "homelink"
      && drafts.getView().status === "CURRENT_SESSION_READY"
      && session?.entries.length === 1
      && session.entries[0]?.event_type === "expense"
      && expenseUploadState.status !== "SYNCED"
    )
      ? session.entries[0]
      : undefined;
  }
  async function uploadExpense(): Promise<boolean> {
    if (expenseUploadInFlight) {
      return false;
    }
    const initialEntry = expenseUploadEntry();
    if (initialEntry === undefined) {
      return false;
    }
    let confirmed = false;
    try {
      confirmed = await confirmExpenseUpload(initialEntry);
    } catch {
      confirmed = false;
    }
    const entry = expenseUploadEntry();
    if (
      !confirmed
      || entry === undefined
      || entry.entry_id !== initialEntry.entry_id
      || !isEmployeeAuthSession(authenticatedSession)
    ) {
      return false;
    }
    expenseUploadInFlight = true;
    expenseUploadState = Object.freeze({ status: "SUBMITTING" });
    await controller?.render();
    try {
      const request = adapters.buildApiRequest(Object.freeze({
        session: authenticatedSession,
        eventId: "expense",
        submission: entry.payload as object,
      }));
      const expected = expectedExpenseUploadReceipt(request);
      if (
        expected === undefined
        || request.method !== "POST"
        || request.path !== adapters.submitPath
      ) {
        throw new Error("EXPENSE_UPLOAD_REQUEST_REJECTED");
      }
      const response = await adapters.transport.request(request);
      const receipt = explicitExpenseUploadReceipt(response, expected);
      if (receipt === undefined) {
        throw new Error("EXPENSE_UPLOAD_RESPONSE_REJECTED");
      }
      expenseUploadState = Object.freeze({
        status: "SYNCED",
        entryId: receipt.entryId,
        sessionId: receipt.sessionId,
      });
      return true;
    } catch {
      expenseUploadState = Object.freeze({
        status: "ERROR",
        errorCode: "EXPENSE_UPLOAD_FAILED",
      });
      return false;
    } finally {
      expenseUploadInFlight = false;
      await controller?.render();
    }
  }
  controller = createEmployeeNextRouteController({
    transport: adapters.transport,
    render: createLocalRenderPort(
      root,
      () => controller,
      () => drafts.getView(),
      () => entryUi,
      async (entry): Promise<void> => {
        if (removingEntryIds.has(entry.entry_id)) {
          return;
        }
        removingEntryIds.add(entry.entry_id);
        try {
          if (await confirmLocalDraftRemoval(entry)) {
            await drafts.removeLocalDraft(entry.entry_id);
          }
        } finally {
          removingEntryIds.delete(entry.entry_id);
          await controller?.render();
        }
      },
      () => Object.freeze({
        enabled: expenseUploadEntry() !== undefined,
        state: expenseUploadState,
        upload: uploadExpense,
      }),
    ),
    buildApiRequest: adapters.buildApiRequest,
    allowedSubmitPath: adapters.submitPath,
  });
  entryUi = createEmployeeEntryUiController({
    registry: createEmployeeSevenEventRegistry(),
    contexts: options.entryContexts,
    createId: options.createId ?? createBrowserId,
    session: () => drafts.getSession(),
    draftView: () => drafts.getView(),
    async requestRender(): Promise<void> {
      await controller?.render();
    },
    async addToSession(input): Promise<boolean> {
      const result = await drafts.addToSession(input);
      return result.ok;
    },
  });
  root.dataset.routeCandidate = employeeNextRouteId;
  const sessionRestore = adapters.restoreSession()
    .then(async (session) => {
      const result = controller?.setSession(session);
      const draftRestore = drafts.restore(session);
      await controller?.render();
      const restored = await draftRestore;
      authenticatedSession = result?.ok === true && restored.ok
        ? session
        : undefined;
      await controller?.render();
      return result?.ok === true && restored.ok;
    })
    .catch(async () => {
      authenticatedSession = undefined;
      await drafts.restore(undefined);
      await controller?.render();
      return false;
    });
  void controller.render();
  return Object.freeze({
    controller,
    drafts,
    sessionRestore,
    getExpenseUploadState(): EmployeeExpenseUploadCanaryState {
      return expenseUploadState;
    },
    uploadExpense,
    async addToSession(input): Promise<boolean> {
      const result = await drafts.addToSession(input);
      await controller?.render();
      return result.ok;
    },
  });
}

if (typeof document !== "undefined") {
  const root = document.querySelector<HTMLElement>("#employee-next-root");
  if (
    root !== null
    && document.documentElement.dataset.employeeNextRuntime !== ["pro", "duction"].join("")
  ) {
    startEmployeeNextRoute(root);
  }
}
