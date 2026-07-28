import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_EXPENSE_EVENT_ID = "expense" as const;
export const EMPLOYEE_EXPENSE_CATEGORY = "EXPENSE" as const;
export const EMPLOYEE_EXPENSE_PAYMENT_METHODS = Object.freeze([
  "cash",
  "bank",
] as const);

export type EmployeeExpensePaymentMethod =
  (typeof EMPLOYEE_EXPENSE_PAYMENT_METHODS)[number];
export type EmployeeExpenseAedInput = string | number | null;

export const EMPLOYEE_EXPENSE_VALIDATION_CODES = Object.freeze([
  "EXPENSE_DRAFT_NOT_OBJECT",
  "EXPENSE_ROOM_REQUIRED",
  "EXPENSE_AMOUNT_REQUIRED",
  "EXPENSE_AMOUNT_INVALID",
  "EXPENSE_PAYMENT_METHOD_INVALID",
  "EXPENSE_CASH_AMOUNT_INVALID",
  "EXPENSE_BANK_AMOUNT_INVALID",
  "EXPENSE_PAYMENT_SPLIT_MISMATCH",
  "EXPENSE_DESCRIPTION_REQUIRED",
  "EXPENSE_PROVIDER_IDENTITY_FORBIDDEN",
  "EXPENSE_BACKEND_FIELD_FORBIDDEN",
] as const);

export type EmployeeExpenseValidationCode =
  (typeof EMPLOYEE_EXPENSE_VALIDATION_CODES)[number];

export interface EmployeeExpensePaymentLeg {
  readonly method: EmployeeExpensePaymentMethod;
  readonly amountAed: string | number;
}

export interface EmployeeExpenseDraft {
  readonly targetRoom: string;
  readonly expenseAmountAed: EmployeeExpenseAedInput;
  readonly paymentMethod: EmployeeExpensePaymentMethod;
  readonly cashPaidAed: EmployeeExpenseAedInput;
  readonly bankPaidAed: EmployeeExpenseAedInput;
  readonly expenseDescription: string;
}

export interface EmployeeExpenseSubmission {
  readonly eventId: "expense";
  readonly schemaVersion: 1;
  readonly displayName: "Expense";
  readonly targetRoom: string;
  readonly expenseCategory: "EXPENSE";
  readonly expenseAmountAed: string | number;
  readonly payment: Readonly<{
    method: EmployeeExpensePaymentMethod;
    cashPaidAed: string | number;
    bankPaidAed: string | number;
    legs: readonly EmployeeExpensePaymentLeg[];
  }>;
  readonly expenseDescription: string;
}

export interface EmployeeExpenseEventContract extends EmployeeEventContract<
  EmployeeExpenseDraft,
  EmployeeExpenseSubmission
> {}

const EMPLOYEE_EXPENSE_AED_DECIMAL = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/u;
const EXPENSE_DRAFT_KEYS = Object.freeze([
  "targetRoom",
  "expenseAmountAed",
  "paymentMethod",
  "cashPaidAed",
  "bankPaidAed",
  "expenseDescription",
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
    keys.length === EXPENSE_DRAFT_KEYS.length
    && EXPENSE_DRAFT_KEYS.every((key) => keys.includes(key))
  );
}

function issue(
  code: EmployeeExpenseValidationCode,
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

export function employeeExpenseAedToFils(value: unknown): bigint | undefined {
  if (
    (typeof value !== "number" && typeof value !== "string")
    || (typeof value === "number" && !Number.isFinite(value))
  ) {
    return undefined;
  }
  const decimal = typeof value === "string" ? value : String(value);
  const match = EMPLOYEE_EXPENSE_AED_DECIMAL.exec(decimal);
  if (match === null) {
    return undefined;
  }
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return (BigInt(match[1]) * 100n) + BigInt(fraction);
}

function isNullableExpenseMoney(value: unknown): value is EmployeeExpenseAedInput {
  return value === null || employeeExpenseAedToFils(value) !== undefined;
}

function isValidNonNegativeMoney(value: unknown): boolean {
  const fils = employeeExpenseAedToFils(value);
  return fils !== undefined && fils >= 0n;
}

function canonicalAedFromFils(fils: bigint): string {
  const whole = fils / 100n;
  const fraction = fils % 100n;
  return fraction === 0n
    ? whole.toString()
    : `${whole}.${fraction.toString().padStart(2, "0").replace(/0$/u, "")}`;
}

function normalizeMoney(
  value: Exclude<EmployeeExpenseAedInput, null>,
): string | number {
  const fils = employeeExpenseAedToFils(value);
  if (fils === undefined) {
    throw new Error("EMPLOYEE_EXPENSE_INVALID_MONEY");
  }
  const normalized = Number(fils) / 100;
  if (
    Number.isFinite(normalized)
    && employeeExpenseAedToFils(normalized) === fils
  ) {
    return normalized;
  }
  return canonicalAedFromFils(fils);
}

export function isEmployeeExpensePaymentMethod(
  value: unknown,
): value is EmployeeExpensePaymentMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_EXPENSE_PAYMENT_METHODS.some((method) => method === value)
  );
}

export function isEmployeeExpenseDraft(
  value: unknown,
): value is EmployeeExpenseDraft {
  return (
    isPlainRecord(value)
    && hasExactDraftKeys(value)
    && typeof value.targetRoom === "string"
    && isNullableExpenseMoney(value.expenseAmountAed)
    && isEmployeeExpensePaymentMethod(value.paymentMethod)
    && isNullableExpenseMoney(value.cashPaidAed)
    && isNullableExpenseMoney(value.bankPaidAed)
    && typeof value.expenseDescription === "string"
  );
}

function createInitialDraft(): EmployeeExpenseDraft {
  return Object.freeze({
    targetRoom: "",
    expenseAmountAed: null,
    paymentMethod: "cash",
    cashPaidAed: null,
    bankPaidAed: null,
    expenseDescription: "",
  });
}

function validateDraft(
  value: Readonly<EmployeeExpenseDraft>,
): readonly EventValidationIssue[] {
  if (!isPlainRecord(value)) {
    return freezeIssues([
      issue("EXPENSE_DRAFT_NOT_OBJECT", "Expense draft must be a plain object."),
    ]);
  }
  if (!hasExactDraftKeys(value)) {
    return freezeIssues([
      issue(
        "EXPENSE_PROVIDER_IDENTITY_FORBIDDEN",
        "Additional identity fields are forbidden.",
      ),
      issue(
        "EXPENSE_BACKEND_FIELD_FORBIDDEN",
        "Backend and cross-event fields are forbidden.",
      ),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  if (typeof value.targetRoom !== "string" || value.targetRoom.trim().length === 0) {
    issues.push(issue("EXPENSE_ROOM_REQUIRED", "Room number is required.", "targetRoom"));
  }
  if (value.expenseAmountAed === null || value.expenseAmountAed === undefined) {
    issues.push(issue("EXPENSE_AMOUNT_REQUIRED", "Expense amount is required.", "expenseAmountAed"));
  } else if ((employeeExpenseAedToFils(value.expenseAmountAed) ?? 0n) <= 0n) {
    issues.push(issue("EXPENSE_AMOUNT_INVALID", "Expense amount is invalid.", "expenseAmountAed"));
  }
  if (!isEmployeeExpensePaymentMethod(value.paymentMethod)) {
    issues.push(issue("EXPENSE_PAYMENT_METHOD_INVALID", "Payment method is invalid.", "paymentMethod"));
  }
  if (!isValidNonNegativeMoney(value.cashPaidAed)) {
    issues.push(issue("EXPENSE_CASH_AMOUNT_INVALID", "Cash amount is invalid.", "cashPaidAed"));
  }
  if (!isValidNonNegativeMoney(value.bankPaidAed)) {
    issues.push(issue("EXPENSE_BANK_AMOUNT_INVALID", "Bank amount is invalid.", "bankPaidAed"));
  }

  const amountFils = employeeExpenseAedToFils(value.expenseAmountAed);
  const cashFils = employeeExpenseAedToFils(value.cashPaidAed);
  const bankFils = employeeExpenseAedToFils(value.bankPaidAed);
  if (
    amountFils !== undefined
    && amountFils > 0n
    && cashFils !== undefined
    && bankFils !== undefined
    && isEmployeeExpensePaymentMethod(value.paymentMethod)
  ) {
    const vectorMatches = value.paymentMethod === "cash"
      ? cashFils === amountFils && bankFils === 0n
      : bankFils === amountFils && cashFils === 0n;
    if (!vectorMatches) {
      issues.push(issue(
        "EXPENSE_PAYMENT_SPLIT_MISMATCH",
        "The selected payment amount must equal the Expense total.",
        "paymentMethod",
      ));
    }
  }
  if (
    typeof value.expenseDescription !== "string"
    || value.expenseDescription.trim().length === 0
  ) {
    issues.push(issue(
      "EXPENSE_DESCRIPTION_REQUIRED",
      "Expense description is required.",
      "expenseDescription",
    ));
  }
  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeExpenseDraft>,
): EmployeeExpenseSubmission {
  const issues = validateDraft(draft);
  if (hasBlockingValidationIssue(issues) || !isEmployeeExpenseDraft(draft)) {
    throw new Error("EMPLOYEE_EXPENSE_INVALID_DRAFT");
  }
  const expenseAmountAed = normalizeMoney(
    draft.expenseAmountAed as Exclude<EmployeeExpenseAedInput, null>,
  );
  const cashPaidAed = normalizeMoney(
    draft.cashPaidAed as Exclude<EmployeeExpenseAedInput, null>,
  );
  const bankPaidAed = normalizeMoney(
    draft.bankPaidAed as Exclude<EmployeeExpenseAedInput, null>,
  );
  const payment = Object.freeze({
    method: draft.paymentMethod,
    cashPaidAed,
    bankPaidAed,
    legs: Object.freeze([
      Object.freeze({
        method: draft.paymentMethod,
        amountAed: expenseAmountAed,
      }),
    ]),
  });
  return Object.freeze({
    eventId: EMPLOYEE_EXPENSE_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Expense" as const,
    targetRoom: draft.targetRoom.trim(),
    expenseCategory: EMPLOYEE_EXPENSE_CATEGORY,
    expenseAmountAed,
    payment,
    expenseDescription: draft.expenseDescription.trim(),
  });
}

export function createEmployeeExpenseEventContract():
EmployeeExpenseEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_EXPENSE_EVENT_ID,
    displayName: "Expense",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
