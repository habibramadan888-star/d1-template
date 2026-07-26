import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_RENT_EVENT_ID = "rent" as const;

export const EMPLOYEE_RENT_PAYMENT_METHODS = Object.freeze([
  "cash",
  "bank",
  "mixed",
] as const);

export type EmployeeRentPaymentMethod =
  (typeof EMPLOYEE_RENT_PAYMENT_METHODS)[number];

export const EMPLOYEE_RENT_SHORT_PAYMENT_MODES = Object.freeze([
  "none",
  "fifteen-days",
  "custom-date",
] as const);

export type EmployeeRentShortPaymentMode =
  (typeof EMPLOYEE_RENT_SHORT_PAYMENT_MODES)[number];

export const EMPLOYEE_RENT_PAYMENT_STATUSES = Object.freeze([
  "full-paid",
  "short-paid",
] as const);

export type EmployeeRentPaymentStatus =
  (typeof EMPLOYEE_RENT_PAYMENT_STATUSES)[number];

export const EMPLOYEE_RENT_VALIDATION_CODES = Object.freeze([
  "RENT_DRAFT_NOT_OBJECT",
  "RENT_BED_REQUIRED",
  "RENT_PERIOD_START_REQUIRED",
  "RENT_PERIOD_START_INVALID",
  "RENT_PERIOD_END_REQUIRED",
  "RENT_PERIOD_END_INVALID",
  "RENT_PERIOD_RANGE_INVALID",
  "RENT_AMOUNT_DUE_REQUIRED",
  "RENT_AMOUNT_RECEIVED_REQUIRED",
  "RENT_AMOUNT_INVALID",
  "RENT_PAYMENT_METHOD_INVALID",
  "RENT_PAYMENT_LEGS_INVALID",
  "RENT_PAYMENT_TOTAL_MISMATCH",
  "RENT_SHORT_PAYMENT_MODE_REQUIRED",
  "RENT_SHORT_PAYMENT_NOTE_REQUIRED",
  "RENT_PROMISE_DATE_REQUIRED",
  "RENT_OVERPAYMENT_UNSUPPORTED",
] as const);

export type EmployeeRentValidationCode =
  (typeof EMPLOYEE_RENT_VALIDATION_CODES)[number];

export interface EmployeeRentPaymentLeg {
  readonly method: "cash" | "bank";
  readonly amountAed: number;
}

export interface EmployeeRentDraft {
  readonly bedLabel: string;
  readonly rentPeriodStart: string;
  readonly rentPeriodEnd: string;
  readonly amountDueAed: number | null;
  readonly amountReceivedAed: number | null;
  readonly paymentMethod: EmployeeRentPaymentMethod;
  readonly cashReceivedAed: number | null;
  readonly bankReceivedAed: number | null;
  readonly shortPaymentMode: EmployeeRentShortPaymentMode;
  readonly promiseDate: string;
  readonly note: string;
}

export interface EmployeeRentSubmission {
  readonly eventId: "rent";
  readonly schemaVersion: 1;
  readonly displayName: "Rent";
  readonly bedLabel: string;
  readonly rentPeriodStart: string;
  readonly rentPeriodEnd: string;
  readonly amountDueAed: number;
  readonly amountReceivedAed: number;
  readonly balanceAed: number;
  readonly paymentStatus: EmployeeRentPaymentStatus;
  readonly payment: Readonly<{
    method: EmployeeRentPaymentMethod;
    legs: readonly EmployeeRentPaymentLeg[];
  }>;
  readonly shortPayment?: Readonly<{
    amountAed: number;
    mode: Exclude<EmployeeRentShortPaymentMode, "none">;
    promiseDate?: string;
    note: string;
  }>;
  readonly note?: string;
}

export interface EmployeeRentEventContract extends EmployeeEventContract<
  EmployeeRentDraft,
  EmployeeRentSubmission
> {}

const RENT_DRAFT_KEYS = Object.freeze([
  "bedLabel",
  "rentPeriodStart",
  "rentPeriodEnd",
  "amountDueAed",
  "amountReceivedAed",
  "paymentMethod",
  "cashReceivedAed",
  "bankReceivedAed",
  "shortPaymentMode",
  "promiseDate",
  "note",
] as const);

const paymentMethodSet: ReadonlySet<string> = new Set(
  EMPLOYEE_RENT_PAYMENT_METHODS,
);
const shortPaymentModeSet: ReadonlySet<string> = new Set(
  EMPLOYEE_RENT_SHORT_PAYMENT_MODES,
);

function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactDraftKeys(value: Readonly<Record<string, unknown>>): boolean {
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    return false;
  }
  const keys = Object.keys(value);
  return (
    keys.length === RENT_DRAFT_KEYS.length
    && RENT_DRAFT_KEYS.every((key) => keys.includes(key))
  );
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(value - Math.round(value * 100) / 100) < 1e-9;
}

function normalizeMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function moneyEqual(left: number, right: number): boolean {
  return Math.abs(normalizeMoney(left) - normalizeMoney(right)) < 1e-9;
}

function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function issue(
  code: EmployeeRentValidationCode,
  message: string,
  field?: string,
): EventValidationIssue {
  return Object.freeze({
    code,
    message,
    severity: "ERROR" as const,
    ...(field === undefined ? {} : { field }),
  });
}

function freezeIssues(
  issues: readonly EventValidationIssue[],
): readonly EventValidationIssue[] {
  return Object.freeze([...issues]);
}

function createInitialDraft(): EmployeeRentDraft {
  return Object.freeze({
    bedLabel: "",
    rentPeriodStart: "",
    rentPeriodEnd: "",
    amountDueAed: null,
    amountReceivedAed: null,
    paymentMethod: "cash",
    cashReceivedAed: null,
    bankReceivedAed: null,
    shortPaymentMode: "none",
    promiseDate: "",
    note: "",
  });
}

export function isEmployeeRentPaymentMethod(
  value: unknown,
): value is EmployeeRentPaymentMethod {
  return typeof value === "string" && paymentMethodSet.has(value);
}

export function isEmployeeRentShortPaymentMode(
  value: unknown,
): value is EmployeeRentShortPaymentMode {
  return typeof value === "string" && shortPaymentModeSet.has(value);
}

export function isEmployeeRentDraft(
  value: unknown,
): value is EmployeeRentDraft {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return false;
  }
  try {
    return (
      typeof value.bedLabel === "string"
      && typeof value.rentPeriodStart === "string"
      && typeof value.rentPeriodEnd === "string"
      && isNullableFiniteNumber(value.amountDueAed)
      && isNullableFiniteNumber(value.amountReceivedAed)
      && isEmployeeRentPaymentMethod(value.paymentMethod)
      && isNullableFiniteNumber(value.cashReceivedAed)
      && isNullableFiniteNumber(value.bankReceivedAed)
      && isEmployeeRentShortPaymentMode(value.shortPaymentMode)
      && typeof value.promiseDate === "string"
      && typeof value.note === "string"
    );
  } catch {
    return false;
  }
}

function validateDraft(value: Readonly<EmployeeRentDraft>): readonly EventValidationIssue[] {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return freezeIssues([
      issue(
        "RENT_DRAFT_NOT_OBJECT",
        "Rent draft must use the exact local draft shape.",
      ),
    ]);
  }

  let draft: Readonly<Record<string, unknown>>;
  try {
    draft = value;
    Object.values(draft);
  } catch {
    return freezeIssues([
      issue("RENT_DRAFT_NOT_OBJECT", "Rent draft could not be read safely."),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const bedLabel = draft.bedLabel;
  const rentPeriodStart = draft.rentPeriodStart;
  const rentPeriodEnd = draft.rentPeriodEnd;
  const amountDue = draft.amountDueAed;
  const amountReceived = draft.amountReceivedAed;
  const paymentMethod = draft.paymentMethod;
  const cashReceived = draft.cashReceivedAed;
  const bankReceived = draft.bankReceivedAed;
  const shortPaymentMode = draft.shortPaymentMode;
  const promiseDate = draft.promiseDate;
  const note = draft.note;

  if (typeof bedLabel !== "string" || bedLabel.trim().length === 0) {
    issues.push(issue("RENT_BED_REQUIRED", "Bed label is required.", "bedLabel"));
  }

  const normalizedRentPeriodStart = typeof rentPeriodStart === "string"
    ? rentPeriodStart.trim()
    : "";
  const normalizedRentPeriodEnd = typeof rentPeriodEnd === "string"
    ? rentPeriodEnd.trim()
    : "";
  const rentPeriodStartValid = (
    normalizedRentPeriodStart.length > 0
    && isValidIsoCalendarDate(normalizedRentPeriodStart)
  );
  const rentPeriodEndValid = (
    normalizedRentPeriodEnd.length > 0
    && isValidIsoCalendarDate(normalizedRentPeriodEnd)
  );
  if (normalizedRentPeriodStart.length === 0) {
    issues.push(issue(
      "RENT_PERIOD_START_REQUIRED",
      "Rent period start is required.",
      "rentPeriodStart",
    ));
  } else if (!rentPeriodStartValid) {
    issues.push(issue(
      "RENT_PERIOD_START_INVALID",
      "Rent period start must be a valid YYYY-MM-DD date.",
      "rentPeriodStart",
    ));
  }
  if (normalizedRentPeriodEnd.length === 0) {
    issues.push(issue(
      "RENT_PERIOD_END_REQUIRED",
      "Rent period end is required.",
      "rentPeriodEnd",
    ));
  } else if (!rentPeriodEndValid) {
    issues.push(issue(
      "RENT_PERIOD_END_INVALID",
      "Rent period end must be a valid YYYY-MM-DD date.",
      "rentPeriodEnd",
    ));
  }
  if (
    rentPeriodStartValid
    && rentPeriodEndValid
    && normalizedRentPeriodEnd <= normalizedRentPeriodStart
  ) {
    issues.push(issue(
      "RENT_PERIOD_RANGE_INVALID",
      "Rent period end must be later than rent period start.",
      "rentPeriodEnd",
    ));
  }

  if (amountDue === null || amountDue === undefined) {
    issues.push(
      issue(
        "RENT_AMOUNT_DUE_REQUIRED",
        "Amount due is required.",
        "amountDueAed",
      ),
    );
  } else if (
    typeof amountDue !== "number"
    || !Number.isFinite(amountDue)
    || amountDue <= 0
    || !hasAtMostTwoDecimalPlaces(amountDue)
  ) {
    issues.push(
      issue(
        "RENT_AMOUNT_INVALID",
        "Amount due must be a positive amount with at most two decimals.",
        "amountDueAed",
      ),
    );
  }

  if (amountReceived === null || amountReceived === undefined) {
    issues.push(
      issue(
        "RENT_AMOUNT_RECEIVED_REQUIRED",
        "Amount received is required.",
        "amountReceivedAed",
      ),
    );
  } else if (
    typeof amountReceived !== "number"
    || !Number.isFinite(amountReceived)
    || amountReceived < 0
    || !hasAtMostTwoDecimalPlaces(amountReceived)
  ) {
    issues.push(
      issue(
        "RENT_AMOUNT_INVALID",
        "Amount received must be non-negative with at most two decimals.",
        "amountReceivedAed",
      ),
    );
  }

  if (!isEmployeeRentPaymentMethod(paymentMethod)) {
    issues.push(
      issue(
        "RENT_PAYMENT_METHOD_INVALID",
        "Payment method is invalid.",
        "paymentMethod",
      ),
    );
  }

  const receivedIsValid = (
    typeof amountReceived === "number"
    && Number.isFinite(amountReceived)
    && amountReceived >= 0
    && hasAtMostTwoDecimalPlaces(amountReceived)
  );
  const cashIsValid = (
    typeof cashReceived === "number"
    && Number.isFinite(cashReceived)
    && cashReceived >= 0
    && hasAtMostTwoDecimalPlaces(cashReceived)
  );
  const bankIsValid = (
    typeof bankReceived === "number"
    && Number.isFinite(bankReceived)
    && bankReceived >= 0
    && hasAtMostTwoDecimalPlaces(bankReceived)
  );
  const cashIsZero = cashReceived === null || (cashIsValid && cashReceived === 0);
  const bankIsZero = bankReceived === null || (bankIsValid && bankReceived === 0);

  if (isEmployeeRentPaymentMethod(paymentMethod) && receivedIsValid) {
    if (paymentMethod === "cash") {
      if (!cashIsValid) {
        issues.push(
          issue(
            "RENT_PAYMENT_LEGS_INVALID",
            "Cash amount is required for a cash payment.",
            "cashReceivedAed",
          ),
        );
      } else if (!bankIsZero) {
        issues.push(
          issue(
            "RENT_PAYMENT_LEGS_INVALID",
            "Bank amount must be zero for a cash payment.",
            "bankReceivedAed",
          ),
        );
      } else if (!moneyEqual(cashReceived, amountReceived)) {
        issues.push(
          issue(
            "RENT_PAYMENT_TOTAL_MISMATCH",
            "Payment legs must equal the amount received.",
            "cashReceivedAed",
          ),
        );
      }
    } else if (paymentMethod === "bank") {
      if (!bankIsValid) {
        issues.push(
          issue(
            "RENT_PAYMENT_LEGS_INVALID",
            "Bank amount is required for a bank payment.",
            "bankReceivedAed",
          ),
        );
      } else if (!cashIsZero) {
        issues.push(
          issue(
            "RENT_PAYMENT_LEGS_INVALID",
            "Cash amount must be zero for a bank payment.",
            "cashReceivedAed",
          ),
        );
      } else if (!moneyEqual(bankReceived, amountReceived)) {
        issues.push(
          issue(
            "RENT_PAYMENT_TOTAL_MISMATCH",
            "Payment legs must equal the amount received.",
            "bankReceivedAed",
          ),
        );
      }
    } else if (
      !cashIsValid
      || !bankIsValid
      || cashReceived <= 0
      || bankReceived <= 0
    ) {
      issues.push(
        issue(
          "RENT_PAYMENT_LEGS_INVALID",
          "Mixed payment requires positive cash and bank amounts.",
          "paymentMethod",
        ),
      );
    } else if (!moneyEqual(cashReceived + bankReceived, amountReceived)) {
      issues.push(
        issue(
          "RENT_PAYMENT_TOTAL_MISMATCH",
          "Payment legs must equal the amount received.",
          "paymentMethod",
        ),
      );
    }
  }

  const dueIsValid = (
    typeof amountDue === "number"
    && Number.isFinite(amountDue)
    && amountDue > 0
    && hasAtMostTwoDecimalPlaces(amountDue)
  );
  if (dueIsValid && receivedIsValid) {
    if (amountReceived > amountDue) {
      issues.push(
        issue(
          "RENT_OVERPAYMENT_UNSUPPORTED",
          "Overpayment is not supported.",
          "amountReceivedAed",
        ),
      );
    } else if (amountReceived < amountDue) {
      if (
        !isEmployeeRentShortPaymentMode(shortPaymentMode)
        || shortPaymentMode === "none"
      ) {
        issues.push(
          issue(
            "RENT_SHORT_PAYMENT_MODE_REQUIRED",
            "A short-payment mode is required.",
            "shortPaymentMode",
          ),
        );
      }
      if (typeof note !== "string" || note.trim().length === 0) {
        issues.push(
          issue(
            "RENT_SHORT_PAYMENT_NOTE_REQUIRED",
            "A note is required for a short payment.",
            "note",
          ),
        );
      }
      if (
        shortPaymentMode === "custom-date"
        && (
          typeof promiseDate !== "string"
          || !/^\d{4}-\d{2}-\d{2}$/u.test(promiseDate)
        )
      ) {
        issues.push(
          issue(
            "RENT_PROMISE_DATE_REQUIRED",
            "A YYYY-MM-DD promise date is required.",
            "promiseDate",
          ),
        );
      }
    } else if (
      !isEmployeeRentShortPaymentMode(shortPaymentMode)
      || shortPaymentMode !== "none"
    ) {
      issues.push(
        issue(
          "RENT_SHORT_PAYMENT_MODE_REQUIRED",
          "Full payment must not include a short-payment mode.",
          "shortPaymentMode",
        ),
      );
    }
  } else if (!isEmployeeRentShortPaymentMode(shortPaymentMode)) {
    issues.push(
      issue(
        "RENT_SHORT_PAYMENT_MODE_REQUIRED",
        "Short-payment mode is invalid.",
        "shortPaymentMode",
      ),
    );
  }

  if (typeof promiseDate !== "string") {
    issues.push(
      issue(
        "RENT_PROMISE_DATE_REQUIRED",
        "Promise date must be a string.",
        "promiseDate",
      ),
    );
  }
  if (typeof note !== "string") {
    issues.push(
      issue(
        "RENT_SHORT_PAYMENT_NOTE_REQUIRED",
        "Note must be a string.",
        "note",
      ),
    );
  }

  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeRentDraft>,
): EmployeeRentSubmission {
  const issues = validateDraft(draft);
  if (hasBlockingValidationIssue(issues) || !isEmployeeRentDraft(draft)) {
    throw new Error("EMPLOYEE_RENT_INVALID_DRAFT");
  }

  const amountDueAed = normalizeMoney(draft.amountDueAed as number);
  const amountReceivedAed = normalizeMoney(draft.amountReceivedAed as number);
  const balanceAed = normalizeMoney(amountDueAed - amountReceivedAed);
  const paymentStatus: EmployeeRentPaymentStatus = balanceAed === 0
    ? "full-paid"
    : "short-paid";
  const legs: EmployeeRentPaymentLeg[] = draft.paymentMethod === "mixed"
    ? [
        Object.freeze({
          method: "cash",
          amountAed: normalizeMoney(draft.cashReceivedAed as number),
        }),
        Object.freeze({
          method: "bank",
          amountAed: normalizeMoney(draft.bankReceivedAed as number),
        }),
      ]
    : [
        Object.freeze({
          method: draft.paymentMethod,
          amountAed: amountReceivedAed,
        }),
      ];
  const payment = Object.freeze({
    method: draft.paymentMethod,
    legs: Object.freeze(legs),
  });
  const note = draft.note.trim();
  const shortPayment = paymentStatus === "short-paid"
    ? Object.freeze({
        amountAed: balanceAed,
        mode: draft.shortPaymentMode as Exclude<
          EmployeeRentShortPaymentMode,
          "none"
        >,
        ...(draft.shortPaymentMode === "custom-date"
          ? { promiseDate: draft.promiseDate }
          : {}),
        note,
      })
    : undefined;

  return Object.freeze({
    eventId: EMPLOYEE_RENT_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Rent" as const,
    bedLabel: draft.bedLabel.trim(),
    rentPeriodStart: draft.rentPeriodStart.trim(),
    rentPeriodEnd: draft.rentPeriodEnd.trim(),
    amountDueAed,
    amountReceivedAed,
    balanceAed,
    paymentStatus,
    payment,
    ...(shortPayment === undefined ? {} : { shortPayment }),
    ...(shortPayment === undefined && note.length > 0 ? { note } : {}),
  });
}

export function createEmployeeRentEventContract(): EmployeeRentEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_RENT_EVENT_ID,
    displayName: "Rent",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
