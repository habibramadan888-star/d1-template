import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_DEPOSIT_IN_EVENT_ID = "deposit-in" as const;

export const EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS = Object.freeze([
  "cash",
  "bank",
  "mixed",
] as const);

export type EmployeeDepositInPaymentMethod =
  (typeof EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS)[number];

export const EMPLOYEE_DEPOSIT_IN_VALIDATION_CODES = Object.freeze([
  "DEPOSIT_IN_DRAFT_NOT_OBJECT",
  "DEPOSIT_IN_BED_REQUIRED",
  "DEPOSIT_IN_AMOUNT_REQUIRED",
  "DEPOSIT_IN_AMOUNT_INVALID",
  "DEPOSIT_IN_PAYMENT_METHOD_INVALID",
  "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
  "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH",
  "DEPOSIT_IN_RECEIVED_DATE_REQUIRED",
  "DEPOSIT_IN_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
  "DEPOSIT_IN_EXISTING_DEPOSIT_NOTE_REQUIRED",
  "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN",
] as const);

export type EmployeeDepositInValidationCode =
  (typeof EMPLOYEE_DEPOSIT_IN_VALIDATION_CODES)[number];

export interface EmployeeDepositInPaymentLeg {
  readonly method: "cash" | "bank";
  readonly amountAed: number;
}

export interface EmployeeDepositInDraft {
  readonly bedLabel: string;
  readonly depositAmountAed: number | null;
  readonly paymentMethod: EmployeeDepositInPaymentMethod;
  readonly cashReceivedAed: number | null;
  readonly bankReceivedAed: number | null;
  readonly depositReceivedDate: string;
  readonly currentDepositSnapshotAed: number | null;
  readonly note: string;
}

export interface EmployeeDepositInSubmission {
  readonly eventId: "deposit-in";
  readonly schemaVersion: 1;
  readonly displayName: "Deposit In";
  readonly bedLabel: string;
  readonly depositAmountAed: number;
  readonly payment: Readonly<{
    method: EmployeeDepositInPaymentMethod;
    legs: readonly EmployeeDepositInPaymentLeg[];
  }>;
  readonly depositReceivedDate: string;
  readonly currentDepositSnapshotAed: number | null;
  readonly accountingPreview: Readonly<{
    depositReceivedAed: number;
    rentIncomeAed: 0;
    currentDepositMutationAed: 0;
  }>;
  readonly reconciliationPreview: Readonly<{
    currentDepositReconciliationRequired: true;
    reason: "deposit-in-does-not-control-current-balance";
  }>;
  readonly note?: string;
}

export interface EmployeeDepositInEventContract extends EmployeeEventContract<
  EmployeeDepositInDraft,
  EmployeeDepositInSubmission
> {}

const DEPOSIT_IN_DRAFT_KEYS = Object.freeze([
  "bedLabel",
  "depositAmountAed",
  "paymentMethod",
  "cashReceivedAed",
  "bankReceivedAed",
  "depositReceivedDate",
  "currentDepositSnapshotAed",
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
    keys.length === DEPOSIT_IN_DRAFT_KEYS.length
    && DEPOSIT_IN_DRAFT_KEYS.every((key) => keys.includes(key))
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
  code: EmployeeDepositInValidationCode,
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

function createInitialDraft(): EmployeeDepositInDraft {
  return Object.freeze({
    bedLabel: "",
    depositAmountAed: null,
    paymentMethod: "cash",
    cashReceivedAed: null,
    bankReceivedAed: null,
    depositReceivedDate: "",
    currentDepositSnapshotAed: null,
    note: "",
  });
}

export function isEmployeeDepositInPaymentMethod(
  value: unknown,
): value is EmployeeDepositInPaymentMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS.some((method) => method === value)
  );
}

export function isEmployeeDepositInDraft(
  value: unknown,
): value is EmployeeDepositInDraft {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return false;
  }
  try {
    return (
      typeof value.bedLabel === "string"
      && isNullableFiniteNumber(value.depositAmountAed)
      && isEmployeeDepositInPaymentMethod(value.paymentMethod)
      && isNullableFiniteNumber(value.cashReceivedAed)
      && isNullableFiniteNumber(value.bankReceivedAed)
      && typeof value.depositReceivedDate === "string"
      && isNullableFiniteNumber(value.currentDepositSnapshotAed)
      && typeof value.note === "string"
    );
  } catch {
    return false;
  }
}

function validateDraft(
  value: Readonly<EmployeeDepositInDraft>,
): readonly EventValidationIssue[] {
  if (!isPlainRecord(value)) {
    return freezeIssues([
      issue(
        "DEPOSIT_IN_DRAFT_NOT_OBJECT",
        "Deposit in draft must be a plain object.",
      ),
    ]);
  }
  if (!hasExactDraftKeys(value)) {
    return freezeIssues([
      issue(
        "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN",
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
        "DEPOSIT_IN_DRAFT_NOT_OBJECT",
        "Deposit in draft could not be read safely.",
      ),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const bedLabel = draft.bedLabel;
  const depositAmount = draft.depositAmountAed;
  const paymentMethod = draft.paymentMethod;
  const cashReceived = draft.cashReceivedAed;
  const bankReceived = draft.bankReceivedAed;
  const receivedDate = draft.depositReceivedDate;
  const currentDepositSnapshot = draft.currentDepositSnapshotAed;
  const note = draft.note;

  if (typeof bedLabel !== "string" || bedLabel.trim().length === 0) {
    issues.push(
      issue("DEPOSIT_IN_BED_REQUIRED", "Bed label is required.", "bedLabel"),
    );
  }

  if (depositAmount === null || depositAmount === undefined) {
    issues.push(
      issue(
        "DEPOSIT_IN_AMOUNT_REQUIRED",
        "Deposit amount is required.",
        "depositAmountAed",
      ),
    );
  } else if (
    typeof depositAmount !== "number"
    || !Number.isFinite(depositAmount)
    || depositAmount <= 0
    || !hasAtMostTwoDecimalPlaces(depositAmount)
  ) {
    issues.push(
      issue(
        "DEPOSIT_IN_AMOUNT_INVALID",
        "Deposit amount must be positive with at most two decimals.",
        "depositAmountAed",
      ),
    );
  }

  if (!isEmployeeDepositInPaymentMethod(paymentMethod)) {
    issues.push(
      issue(
        "DEPOSIT_IN_PAYMENT_METHOD_INVALID",
        "Payment method is invalid.",
        "paymentMethod",
      ),
    );
  }

  const amountIsValid = (
    typeof depositAmount === "number"
    && Number.isFinite(depositAmount)
    && depositAmount > 0
    && hasAtMostTwoDecimalPlaces(depositAmount)
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

  if (isEmployeeDepositInPaymentMethod(paymentMethod) && amountIsValid) {
    if (paymentMethod === "cash") {
      if (!cashIsValid) {
        issues.push(
          issue(
            "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
            "Cash amount is required for a cash payment.",
            "cashReceivedAed",
          ),
        );
      } else if (!bankIsZero) {
        issues.push(
          issue(
            "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
            "Bank amount must be zero for a cash payment.",
            "bankReceivedAed",
          ),
        );
      } else if (!moneyEqual(cashReceived, depositAmount)) {
        issues.push(
          issue(
            "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH",
            "Payment legs must equal the deposit amount.",
            "cashReceivedAed",
          ),
        );
      }
    } else if (paymentMethod === "bank") {
      if (!bankIsValid) {
        issues.push(
          issue(
            "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
            "Bank amount is required for a bank payment.",
            "bankReceivedAed",
          ),
        );
      } else if (!cashIsZero) {
        issues.push(
          issue(
            "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
            "Cash amount must be zero for a bank payment.",
            "cashReceivedAed",
          ),
        );
      } else if (!moneyEqual(bankReceived, depositAmount)) {
        issues.push(
          issue(
            "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH",
            "Payment legs must equal the deposit amount.",
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
          "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
          "Mixed payment requires positive cash and bank amounts.",
          "paymentMethod",
        ),
      );
    } else if (!moneyEqual(cashReceived + bankReceived, depositAmount)) {
      issues.push(
        issue(
          "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH",
          "Payment legs must equal the deposit amount.",
          "paymentMethod",
        ),
      );
    }
  }

  if (
    typeof receivedDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(receivedDate)
  ) {
    issues.push(
      issue(
        "DEPOSIT_IN_RECEIVED_DATE_REQUIRED",
        "A YYYY-MM-DD received date is required.",
        "depositReceivedDate",
      ),
    );
  }

  const snapshotIsValid = (
    currentDepositSnapshot === null
    || (
      typeof currentDepositSnapshot === "number"
      && Number.isFinite(currentDepositSnapshot)
      && currentDepositSnapshot >= 0
      && hasAtMostTwoDecimalPlaces(currentDepositSnapshot)
    )
  );
  if (!snapshotIsValid) {
    issues.push(
      issue(
        "DEPOSIT_IN_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
        "Current deposit snapshot must be non-negative with at most two decimals.",
        "currentDepositSnapshotAed",
      ),
    );
  } else if (
    typeof currentDepositSnapshot === "number"
    && currentDepositSnapshot > 0
    && (typeof note !== "string" || note.trim().length === 0)
  ) {
    issues.push(
      issue(
        "DEPOSIT_IN_EXISTING_DEPOSIT_NOTE_REQUIRED",
        "A note is required when an existing deposit snapshot is present.",
        "note",
      ),
    );
  }

  if (typeof note !== "string") {
    issues.push(
      issue(
        "DEPOSIT_IN_DRAFT_NOT_OBJECT",
        "Note must be a string.",
        "note",
      ),
    );
  }

  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeDepositInDraft>,
): EmployeeDepositInSubmission {
  const issues = validateDraft(draft);
  if (hasBlockingValidationIssue(issues) || !isEmployeeDepositInDraft(draft)) {
    throw new Error("EMPLOYEE_DEPOSIT_IN_INVALID_DRAFT");
  }

  const depositAmountAed = normalizeMoney(draft.depositAmountAed as number);
  const currentDepositSnapshotAed = draft.currentDepositSnapshotAed === null
    ? null
    : normalizeMoney(draft.currentDepositSnapshotAed);
  const legs: EmployeeDepositInPaymentLeg[] = draft.paymentMethod === "mixed"
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
          amountAed: depositAmountAed,
        }),
      ];
  const payment = Object.freeze({
    method: draft.paymentMethod,
    legs: Object.freeze(legs),
  });
  const accountingPreview = Object.freeze({
    depositReceivedAed: depositAmountAed,
    rentIncomeAed: 0 as const,
    currentDepositMutationAed: 0 as const,
  });
  const reconciliationPreview = Object.freeze({
    currentDepositReconciliationRequired: true as const,
    reason: "deposit-in-does-not-control-current-balance" as const,
  });
  const note = draft.note.trim();

  return Object.freeze({
    eventId: EMPLOYEE_DEPOSIT_IN_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Deposit In" as const,
    bedLabel: draft.bedLabel.trim(),
    depositAmountAed,
    payment,
    depositReceivedDate: draft.depositReceivedDate,
    currentDepositSnapshotAed,
    accountingPreview,
    reconciliationPreview,
    ...(note.length === 0 ? {} : { note }),
  });
}

export function createEmployeeDepositInEventContract():
EmployeeDepositInEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_DEPOSIT_IN_EVENT_ID,
    displayName: "Deposit In",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
