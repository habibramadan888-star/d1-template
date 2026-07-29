import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_ARREARS_PAYMENT_EVENT_ID = "arrears-payment" as const;

export const EMPLOYEE_ARREARS_PAYMENT_METHODS = Object.freeze([
  "cash",
  "bank",
  "mixed",
] as const);

export type EmployeeArrearsPaymentMethod =
  (typeof EMPLOYEE_ARREARS_PAYMENT_METHODS)[number];

export const EMPLOYEE_ARREARS_PAYMENT_VALIDATION_CODES = Object.freeze([
  "ARREARS_PAYMENT_DRAFT_NOT_OBJECT",
  "ARREARS_PAYMENT_BED_REQUIRED",
  "ARREARS_PAYMENT_CLOUD_ARREARS_REF_REQUIRED",
  "ARREARS_PAYMENT_REMAINING_AMOUNT_REQUIRED",
  "ARREARS_PAYMENT_AMOUNT_RECEIVED_REQUIRED",
  "ARREARS_PAYMENT_AMOUNT_INVALID",
  "ARREARS_PAYMENT_METHOD_INVALID",
  "ARREARS_PAYMENT_LEGS_INVALID",
  "ARREARS_PAYMENT_TOTAL_MISMATCH",
  "ARREARS_PAYMENT_PARTIAL_UNSUPPORTED",
  "ARREARS_PAYMENT_OVERPAYMENT_UNSUPPORTED",
  "ARREARS_PAYMENT_REPAYMENT_DATE_REQUIRED",
  "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN",
] as const);

export type EmployeeArrearsPaymentValidationCode =
  (typeof EMPLOYEE_ARREARS_PAYMENT_VALIDATION_CODES)[number];

export interface EmployeeArrearsPaymentLeg {
  readonly method: "cash" | "bank";
  readonly amountAed: number;
}

export interface EmployeeArrearsPaymentDraft {
  readonly bedLabel: string;
  readonly cloudArrearsRef: string;
  readonly remainingArrearsAed: number | null;
  readonly amountReceivedAed: number | null;
  readonly paymentMethod: EmployeeArrearsPaymentMethod;
  readonly cashReceivedAed: number | null;
  readonly bankReceivedAed: number | null;
  readonly repaymentDate: string;
  readonly note: string;
}

export interface EmployeeArrearsPaymentSubmission {
  readonly eventId: "arrears-payment";
  readonly schemaVersion: 1;
  readonly displayName: "Arrears Payment";
  readonly bedLabel: string;
  readonly cloudArrearsRef: string;
  readonly remainingArrearsAed: number;
  readonly amountReceivedAed: number;
  readonly payment: Readonly<{
    method: EmployeeArrearsPaymentMethod;
    legs: readonly EmployeeArrearsPaymentLeg[];
  }>;
  readonly repaymentDate: string;
  readonly closeArrearsIntent: true;
  readonly accountingPreview: Readonly<{
    arrearsRepaidAed: number;
    rentIncomeAed: 0;
  }>;
  readonly note?: string;
}

export interface EmployeeArrearsPaymentEventContract extends EmployeeEventContract<
  EmployeeArrearsPaymentDraft,
  EmployeeArrearsPaymentSubmission
> {}

const ARREARS_PAYMENT_DRAFT_KEYS = Object.freeze([
  "bedLabel",
  "cloudArrearsRef",
  "remainingArrearsAed",
  "amountReceivedAed",
  "paymentMethod",
  "cashReceivedAed",
  "bankReceivedAed",
  "repaymentDate",
  "note",
] as const);

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
    keys.length === ARREARS_PAYMENT_DRAFT_KEYS.length
    && ARREARS_PAYMENT_DRAFT_KEYS.every((key) => keys.includes(key))
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

function issue(
  code: EmployeeArrearsPaymentValidationCode,
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

function createInitialDraft(): EmployeeArrearsPaymentDraft {
  return Object.freeze({
    bedLabel: "",
    cloudArrearsRef: "",
    remainingArrearsAed: null,
    amountReceivedAed: null,
    paymentMethod: "cash",
    cashReceivedAed: null,
    bankReceivedAed: null,
    repaymentDate: "",
    note: "",
  });
}

export function isEmployeeArrearsPaymentMethod(
  value: unknown,
): value is EmployeeArrearsPaymentMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_ARREARS_PAYMENT_METHODS.some((method) => method === value)
  );
}

export function isEmployeeArrearsPaymentDraft(
  value: unknown,
): value is EmployeeArrearsPaymentDraft {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return false;
  }
  try {
    return (
      typeof value.bedLabel === "string"
      && typeof value.cloudArrearsRef === "string"
      && isNullableFiniteNumber(value.remainingArrearsAed)
      && isNullableFiniteNumber(value.amountReceivedAed)
      && isEmployeeArrearsPaymentMethod(value.paymentMethod)
      && isNullableFiniteNumber(value.cashReceivedAed)
      && isNullableFiniteNumber(value.bankReceivedAed)
      && typeof value.repaymentDate === "string"
      && typeof value.note === "string"
    );
  } catch {
    return false;
  }
}

function validateDraft(
  value: Readonly<EmployeeArrearsPaymentDraft>,
): readonly EventValidationIssue[] {
  if (!isPlainRecord(value)) {
    return freezeIssues([
      issue(
        "ARREARS_PAYMENT_DRAFT_NOT_OBJECT",
        "Arrears payment draft must be a plain object.",
      ),
    ]);
  }
  if (!hasExactDraftKeys(value)) {
    return freezeIssues([
      issue(
        "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN",
        "Additional identity or wire fields are forbidden.",
      ),
    ]);
  }

  let draft: Readonly<Record<string, unknown>>;
  try {
    draft = value;
    Object.values(draft);
  } catch {
    return freezeIssues([
      issue(
        "ARREARS_PAYMENT_DRAFT_NOT_OBJECT",
        "Arrears payment draft could not be read safely.",
      ),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const bedLabel = draft.bedLabel;
  const cloudArrearsRef = draft.cloudArrearsRef;
  const remainingArrears = draft.remainingArrearsAed;
  const amountReceived = draft.amountReceivedAed;
  const paymentMethod = draft.paymentMethod;
  const cashReceived = draft.cashReceivedAed;
  const bankReceived = draft.bankReceivedAed;
  const repaymentDate = draft.repaymentDate;
  const note = draft.note;

  if (typeof bedLabel !== "string" || bedLabel.trim().length === 0) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_BED_REQUIRED",
        "Bed label is required.",
        "bedLabel",
      ),
    );
  }
  if (
    typeof cloudArrearsRef !== "string"
    || cloudArrearsRef.trim().length === 0
  ) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_CLOUD_ARREARS_REF_REQUIRED",
        "Cloud arrears reference is required.",
        "cloudArrearsRef",
      ),
    );
  }

  if (remainingArrears === null || remainingArrears === undefined) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_REMAINING_AMOUNT_REQUIRED",
        "Remaining arrears amount is required.",
        "remainingArrearsAed",
      ),
    );
  } else if (
    typeof remainingArrears !== "number"
    || !Number.isFinite(remainingArrears)
    || remainingArrears <= 0
    || !hasAtMostTwoDecimalPlaces(remainingArrears)
  ) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_AMOUNT_INVALID",
        "Remaining arrears must be positive with at most two decimals.",
        "remainingArrearsAed",
      ),
    );
  }

  if (amountReceived === null || amountReceived === undefined) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_AMOUNT_RECEIVED_REQUIRED",
        "Amount received is required.",
        "amountReceivedAed",
      ),
    );
  } else if (
    typeof amountReceived !== "number"
    || !Number.isFinite(amountReceived)
    || amountReceived <= 0
    || !hasAtMostTwoDecimalPlaces(amountReceived)
  ) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_AMOUNT_INVALID",
        "Amount received must be positive with at most two decimals.",
        "amountReceivedAed",
      ),
    );
  }

  if (!isEmployeeArrearsPaymentMethod(paymentMethod)) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_METHOD_INVALID",
        "Payment method is invalid.",
        "paymentMethod",
      ),
    );
  }

  const receivedIsValid = (
    typeof amountReceived === "number"
    && Number.isFinite(amountReceived)
    && amountReceived > 0
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

  if (isEmployeeArrearsPaymentMethod(paymentMethod) && receivedIsValid) {
    if (paymentMethod === "cash") {
      if (!cashIsValid) {
        issues.push(
          issue(
            "ARREARS_PAYMENT_LEGS_INVALID",
            "Cash amount is required for a cash payment.",
            "cashReceivedAed",
          ),
        );
      } else if (!bankIsZero) {
        issues.push(
          issue(
            "ARREARS_PAYMENT_LEGS_INVALID",
            "Bank amount must be zero for a cash payment.",
            "bankReceivedAed",
          ),
        );
      } else if (!moneyEqual(cashReceived, amountReceived)) {
        issues.push(
          issue(
            "ARREARS_PAYMENT_TOTAL_MISMATCH",
            "Payment legs must equal the amount received.",
            "cashReceivedAed",
          ),
        );
      }
    } else if (paymentMethod === "bank") {
      if (!bankIsValid) {
        issues.push(
          issue(
            "ARREARS_PAYMENT_LEGS_INVALID",
            "Bank amount is required for a bank payment.",
            "bankReceivedAed",
          ),
        );
      } else if (!cashIsZero) {
        issues.push(
          issue(
            "ARREARS_PAYMENT_LEGS_INVALID",
            "Cash amount must be zero for a bank payment.",
            "cashReceivedAed",
          ),
        );
      } else if (!moneyEqual(bankReceived, amountReceived)) {
        issues.push(
          issue(
            "ARREARS_PAYMENT_TOTAL_MISMATCH",
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
          "ARREARS_PAYMENT_LEGS_INVALID",
          "Mixed payment requires positive cash and bank amounts.",
          "paymentMethod",
        ),
      );
    } else if (!moneyEqual(cashReceived + bankReceived, amountReceived)) {
      issues.push(
        issue(
          "ARREARS_PAYMENT_TOTAL_MISMATCH",
          "Payment legs must equal the amount received.",
          "paymentMethod",
        ),
      );
    }
  }

  const remainingIsValid = (
    typeof remainingArrears === "number"
    && Number.isFinite(remainingArrears)
    && remainingArrears > 0
    && hasAtMostTwoDecimalPlaces(remainingArrears)
  );
  if (remainingIsValid && receivedIsValid) {
    if (amountReceived < remainingArrears) {
      issues.push(
        issue(
          "ARREARS_PAYMENT_PARTIAL_UNSUPPORTED",
          "Partial repayment is not supported.",
          "amountReceivedAed",
        ),
      );
    } else if (amountReceived > remainingArrears) {
      issues.push(
        issue(
          "ARREARS_PAYMENT_OVERPAYMENT_UNSUPPORTED",
          "Overpayment is not supported.",
          "amountReceivedAed",
        ),
      );
    }
  }

  if (
    typeof repaymentDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(repaymentDate)
  ) {
    issues.push(
      issue(
        "ARREARS_PAYMENT_REPAYMENT_DATE_REQUIRED",
        "A YYYY-MM-DD repayment date is required.",
        "repaymentDate",
      ),
    );
  }
  if (typeof note !== "string") {
    issues.push(
      issue(
        "ARREARS_PAYMENT_DRAFT_NOT_OBJECT",
        "Note must be a string.",
        "note",
      ),
    );
  }

  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeArrearsPaymentDraft>,
): EmployeeArrearsPaymentSubmission {
  const issues = validateDraft(draft);
  if (
    hasBlockingValidationIssue(issues)
    || !isEmployeeArrearsPaymentDraft(draft)
  ) {
    throw new Error("EMPLOYEE_ARREARS_PAYMENT_INVALID_DRAFT");
  }

  const remainingArrearsAed = normalizeMoney(
    draft.remainingArrearsAed as number,
  );
  const amountReceivedAed = normalizeMoney(draft.amountReceivedAed as number);
  const legs: EmployeeArrearsPaymentLeg[] = draft.paymentMethod === "mixed"
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
  const accountingPreview = Object.freeze({
    arrearsRepaidAed: amountReceivedAed,
    rentIncomeAed: 0 as const,
  });
  const note = draft.note.trim();

  return Object.freeze({
    eventId: EMPLOYEE_ARREARS_PAYMENT_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Arrears Payment" as const,
    bedLabel: draft.bedLabel.trim(),
    cloudArrearsRef: draft.cloudArrearsRef.trim(),
    remainingArrearsAed,
    amountReceivedAed,
    payment,
    repaymentDate: draft.repaymentDate,
    closeArrearsIntent: true as const,
    accountingPreview,
    ...(note.length === 0 ? {} : { note }),
  });
}

export function createEmployeeArrearsPaymentEventContract():
EmployeeArrearsPaymentEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_ARREARS_PAYMENT_EVENT_ID,
    displayName: "Arrears Payment",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
