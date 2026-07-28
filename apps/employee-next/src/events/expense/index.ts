import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_EXPENSE_EVENT_ID = "expense" as const;

export const EMPLOYEE_EXPENSE_CATEGORIES = Object.freeze([
  "maintenance",
  "cleaning",
  "utilities",
  "supplies",
  "internet",
  "laundry",
  "transport",
  "government_fee",
  "other",
] as const);

export type EmployeeExpenseCategory =
  (typeof EMPLOYEE_EXPENSE_CATEGORIES)[number];

export const EMPLOYEE_EXPENSE_PAYMENT_METHODS = Object.freeze([
  "cash",
  "bank",
] as const);

export type EmployeeExpensePaymentMethod =
  (typeof EMPLOYEE_EXPENSE_PAYMENT_METHODS)[number];

export const EMPLOYEE_EXPENSE_SCOPES = Object.freeze([
  "apartment",
  "bed",
] as const);

export type EmployeeExpenseScope = (typeof EMPLOYEE_EXPENSE_SCOPES)[number];

export const EMPLOYEE_EXPENSE_VALIDATION_CODES = Object.freeze([
  "EXPENSE_DRAFT_NOT_OBJECT",
  "EXPENSE_DATE_REQUIRED",
  "EXPENSE_DATE_INVALID",
  "EXPENSE_CATEGORY_INVALID",
  "EXPENSE_AMOUNT_REQUIRED",
  "EXPENSE_AMOUNT_INVALID",
  "EXPENSE_PAYMENT_METHOD_INVALID",
  "EXPENSE_MIXED_PAYMENT_UNSUPPORTED_BY_WORKER",
  "EXPENSE_CASH_AMOUNT_INVALID",
  "EXPENSE_BANK_AMOUNT_INVALID",
  "EXPENSE_PAYMENT_SPLIT_MISMATCH",
  "EXPENSE_SCOPE_INVALID",
  "EXPENSE_SCOPE_TARGET_REQUIRED",
  "EXPENSE_VENDOR_REQUIRED",
  "EXPENSE_DESCRIPTION_REQUIRED",
  "EXPENSE_RECEIPT_NOTE_REQUIRED",
  "EXPENSE_PROVIDER_IDENTITY_FORBIDDEN",
  "EXPENSE_SCOPE_FIELD_FORBIDDEN",
  "EXPENSE_BACKEND_FIELD_FORBIDDEN",
] as const);

export type EmployeeExpenseValidationCode =
  (typeof EMPLOYEE_EXPENSE_VALIDATION_CODES)[number];

export interface EmployeeExpensePaymentLeg {
  readonly method: "cash" | "bank";
  readonly amountAed: number;
}

export type EmployeeExpenseAedInput = string | number | null;

export interface EmployeeExpenseDraft {
  readonly expenseDate: string;
  readonly expenseCategory: EmployeeExpenseCategory;
  readonly expenseAmountAed: EmployeeExpenseAedInput;
  readonly paymentMethod: EmployeeExpensePaymentMethod;
  readonly cashPaidAed: EmployeeExpenseAedInput;
  readonly bankPaidAed: EmployeeExpenseAedInput;
  readonly expenseScope: EmployeeExpenseScope;
  readonly apartmentLabel: string;
  readonly bedLabel: string;
  readonly vendorName: string;
  readonly paidBy: string;
  readonly expenseDescription: string;
  readonly receiptAvailable: boolean;
  readonly receiptNote: string;
  readonly finalNote: string;
}

export interface EmployeeExpenseSubmission {
  readonly eventId: "expense";
  readonly schemaVersion: 1;
  readonly displayName: "Expense";
  readonly expenseDate: string;
  readonly expenseCategory: EmployeeExpenseCategory;
  readonly expenseAmountAed: number;
  readonly payment: Readonly<{
    method: EmployeeExpensePaymentMethod;
    cashPaidAed: number;
    bankPaidAed: number;
    legs: readonly EmployeeExpensePaymentLeg[];
  }>;
  readonly allocation: Readonly<{
    expenseScope: EmployeeExpenseScope;
    targetBedOrRoomLabel: string;
    apartmentLabel: string | null;
    bedLabel: string | null;
  }>;
  readonly expenseDescription: string;
  readonly vendor: Readonly<{
    vendorName: string;
    paidBy: string | null;
  }>;
  readonly receiptPreview: Readonly<{
    receiptAvailable: boolean;
    receiptNote: string | null;
    receiptUploadIncluded: false;
    receiptUploadRequiredLater: boolean;
  }>;
  readonly accountingPreview: Readonly<{
    expenseDeclaredAed: number;
    rentIncomeAed: 0;
    depositReceivedAed: 0;
    depositRefundedAed: 0;
    arrearsRepaidAed: 0;
    currentDepositMutationAed: 0;
    financeMutationApplied: false;
  }>;
  readonly reconciliationPreview: Readonly<{
    financeReconciliationRequired: true;
    receiptReconciliationRequired: boolean;
    reason: "expense-module-does-not-write-production-finance";
  }>;
  readonly finalNote?: string;
}

export interface EmployeeExpenseEventContract extends EmployeeEventContract<
  EmployeeExpenseDraft,
  EmployeeExpenseSubmission
> {}

const EMPLOYEE_EXPENSE_AED_DECIMAL = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/u;

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

const EXPENSE_DRAFT_KEYS = Object.freeze([
  "expenseDate",
  "expenseCategory",
  "expenseAmountAed",
  "paymentMethod",
  "cashPaidAed",
  "bankPaidAed",
  "expenseScope",
  "apartmentLabel",
  "bedLabel",
  "vendorName",
  "paidBy",
  "expenseDescription",
  "receiptAvailable",
  "receiptNote",
  "finalNote",
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

function isNullableExpenseMoney(value: unknown): value is EmployeeExpenseAedInput {
  return value === null
    || typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}

function isValidNonNegativeMoney(
  value: unknown,
): value is Exclude<EmployeeExpenseAedInput, null> {
  return employeeExpenseAedToFils(value) !== undefined;
}

function normalizeMoney(value: Exclude<EmployeeExpenseAedInput, null>): number {
  const fils = employeeExpenseAedToFils(value);
  if (fils === undefined) {
    throw new Error("EMPLOYEE_EXPENSE_INVALID_MONEY");
  }
  const normalized = Number(value);
  if (
    !Number.isFinite(normalized)
    || employeeExpenseAedToFils(normalized) !== fils
  ) {
    throw new Error("EMPLOYEE_EXPENSE_MONEY_NOT_REPRESENTABLE");
  }
  return normalized;
}

function moneyEqual(left: unknown, right: unknown): boolean {
  const leftFils = employeeExpenseAedToFils(left);
  const rightFils = employeeExpenseAedToFils(right);
  return leftFils !== undefined && leftFils === rightFils;
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

function createInitialDraft(): EmployeeExpenseDraft {
  return Object.freeze({
    expenseDate: "",
    expenseCategory: "maintenance",
    expenseAmountAed: null,
    paymentMethod: "cash",
    cashPaidAed: null,
    bankPaidAed: null,
    expenseScope: "apartment",
    apartmentLabel: "",
    bedLabel: "",
    vendorName: "",
    paidBy: "",
    expenseDescription: "",
    receiptAvailable: false,
    receiptNote: "",
    finalNote: "",
  });
}

export function isEmployeeExpenseCategory(
  value: unknown,
): value is EmployeeExpenseCategory {
  return (
    typeof value === "string"
    && EMPLOYEE_EXPENSE_CATEGORIES.some((category) => category === value)
  );
}

export function isEmployeeExpensePaymentMethod(
  value: unknown,
): value is EmployeeExpensePaymentMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_EXPENSE_PAYMENT_METHODS.some((method) => method === value)
  );
}

export function isEmployeeExpenseScope(
  value: unknown,
): value is EmployeeExpenseScope {
  return (
    typeof value === "string"
    && EMPLOYEE_EXPENSE_SCOPES.some((scope) => scope === value)
  );
}

export function isEmployeeExpenseDraft(
  value: unknown,
): value is EmployeeExpenseDraft {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return false;
  }
  try {
    return (
      typeof value.expenseDate === "string"
      && isEmployeeExpenseCategory(value.expenseCategory)
      && isNullableExpenseMoney(value.expenseAmountAed)
      && isEmployeeExpensePaymentMethod(value.paymentMethod)
      && isNullableExpenseMoney(value.cashPaidAed)
      && isNullableExpenseMoney(value.bankPaidAed)
      && isEmployeeExpenseScope(value.expenseScope)
      && typeof value.apartmentLabel === "string"
      && typeof value.bedLabel === "string"
      && typeof value.vendorName === "string"
      && typeof value.paidBy === "string"
      && typeof value.expenseDescription === "string"
      && typeof value.receiptAvailable === "boolean"
      && typeof value.receiptNote === "string"
      && typeof value.finalNote === "string"
    );
  } catch {
    return false;
  }
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
        "EXPENSE_SCOPE_FIELD_FORBIDDEN",
        "Cross-event fields are forbidden.",
      ),
      issue(
        "EXPENSE_BACKEND_FIELD_FORBIDDEN",
        "Backend fields are forbidden.",
      ),
    ]);
  }

  let draft: Readonly<Record<string, unknown>>;
  try {
    draft = value;
    Object.values(draft);
  } catch {
    return freezeIssues([
      issue("EXPENSE_DRAFT_NOT_OBJECT", "Expense draft could not be read safely."),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const {
    expenseDate,
    expenseCategory,
    expenseAmountAed,
    paymentMethod,
    cashPaidAed,
    bankPaidAed,
    expenseScope,
    apartmentLabel,
    bedLabel,
    vendorName,
    paidBy,
    expenseDescription,
    receiptAvailable,
    receiptNote,
    finalNote,
  } = draft;

  if (typeof expenseDate !== "string" || expenseDate.length === 0) {
    issues.push(issue("EXPENSE_DATE_REQUIRED", "Expense date is required.", "expenseDate"));
  } else if (!/^\d{4}-\d{2}-\d{2}$/u.test(expenseDate)) {
    issues.push(issue("EXPENSE_DATE_INVALID", "Expense date must be YYYY-MM-DD.", "expenseDate"));
  }
  if (!isEmployeeExpenseCategory(expenseCategory)) {
    issues.push(issue("EXPENSE_CATEGORY_INVALID", "Expense category is invalid.", "expenseCategory"));
  }
  if (expenseAmountAed === null || expenseAmountAed === undefined) {
    issues.push(issue("EXPENSE_AMOUNT_REQUIRED", "Expense amount is required.", "expenseAmountAed"));
  } else if ((employeeExpenseAedToFils(expenseAmountAed) ?? 0n) <= 0n) {
    issues.push(issue("EXPENSE_AMOUNT_INVALID", "Expense amount is invalid.", "expenseAmountAed"));
  }
  if (paymentMethod === "mixed") {
    issues.push(issue(
      "EXPENSE_MIXED_PAYMENT_UNSUPPORTED_BY_WORKER",
      "Mixed expense payment is not supported by the Worker contract.",
      "paymentMethod",
    ));
  } else if (!isEmployeeExpensePaymentMethod(paymentMethod)) {
    issues.push(issue("EXPENSE_PAYMENT_METHOD_INVALID", "Payment method is invalid.", "paymentMethod"));
  }
  if (!isValidNonNegativeMoney(cashPaidAed)) {
    issues.push(issue("EXPENSE_CASH_AMOUNT_INVALID", "Cash amount is invalid.", "cashPaidAed"));
  }
  if (!isValidNonNegativeMoney(bankPaidAed)) {
    issues.push(issue("EXPENSE_BANK_AMOUNT_INVALID", "Bank amount is invalid.", "bankPaidAed"));
  }

  const amountIsValid = (employeeExpenseAedToFils(expenseAmountAed) ?? 0n) > 0n;
  const cashIsValid = isValidNonNegativeMoney(cashPaidAed);
  const bankIsValid = isValidNonNegativeMoney(bankPaidAed);
  if (
    amountIsValid
    && isEmployeeExpensePaymentMethod(paymentMethod)
    && cashIsValid
    && bankIsValid
  ) {
    const splitValid = paymentMethod === "cash"
      ? moneyEqual(cashPaidAed, expenseAmountAed)
        && employeeExpenseAedToFils(bankPaidAed) === 0n
      : moneyEqual(bankPaidAed, expenseAmountAed)
        && employeeExpenseAedToFils(cashPaidAed) === 0n;
    if (!splitValid) {
      issues.push(issue(
        "EXPENSE_PAYMENT_SPLIT_MISMATCH",
        "Payment split must equal the expense amount.",
        "paymentMethod",
      ));
    }
  }

  if (!isEmployeeExpenseScope(expenseScope)) {
    issues.push(issue("EXPENSE_SCOPE_INVALID", "Expense scope is invalid.", "expenseScope"));
  } else if (
    (expenseScope === "apartment"
      && (typeof apartmentLabel !== "string" || apartmentLabel.trim().length === 0))
    || (expenseScope === "bed"
      && (typeof bedLabel !== "string" || bedLabel.trim().length === 0))
  ) {
    issues.push(issue(
      "EXPENSE_SCOPE_TARGET_REQUIRED",
      "The selected expense scope requires a target.",
      expenseScope === "apartment" ? "apartmentLabel" : "bedLabel",
    ));
  }
  if (typeof vendorName !== "string" || vendorName.trim().length === 0) {
    issues.push(issue("EXPENSE_VENDOR_REQUIRED", "Vendor is required.", "vendorName"));
  }
  if (
    typeof expenseDescription !== "string"
    || expenseDescription.trim().length === 0
  ) {
    issues.push(issue(
      "EXPENSE_DESCRIPTION_REQUIRED",
      "Expense description is required.",
      "expenseDescription",
    ));
  }
  if (
    receiptAvailable === true
    && (typeof receiptNote !== "string" || receiptNote.trim().length === 0)
  ) {
    issues.push(issue(
      "EXPENSE_RECEIPT_NOTE_REQUIRED",
      "Receipt note is required when a receipt is available.",
      "receiptNote",
    ));
  }
  if (
    typeof apartmentLabel !== "string"
    || typeof bedLabel !== "string"
    || typeof paidBy !== "string"
    || typeof receiptAvailable !== "boolean"
    || typeof receiptNote !== "string"
    || typeof finalNote !== "string"
  ) {
    issues.push(issue("EXPENSE_DRAFT_NOT_OBJECT", "Expense draft field types are invalid."));
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

  const expenseAmountAed = normalizeMoney(draft.expenseAmountAed as Exclude<EmployeeExpenseAedInput, null>);
  const cashPaidAed = normalizeMoney(draft.cashPaidAed as Exclude<EmployeeExpenseAedInput, null>);
  const bankPaidAed = normalizeMoney(draft.bankPaidAed as Exclude<EmployeeExpenseAedInput, null>);
  const legs = Object.freeze([
    ...(cashPaidAed > 0
      ? [Object.freeze({ method: "cash" as const, amountAed: cashPaidAed })]
      : []),
    ...(bankPaidAed > 0
      ? [Object.freeze({ method: "bank" as const, amountAed: bankPaidAed })]
      : []),
  ]);
  const payment = Object.freeze({
    method: draft.paymentMethod,
    cashPaidAed,
    bankPaidAed,
    legs,
  });
  const allocation = Object.freeze({
    expenseScope: draft.expenseScope,
    targetBedOrRoomLabel: draft.expenseScope === "apartment"
      ? draft.apartmentLabel.trim()
      : draft.bedLabel.trim(),
    apartmentLabel: draft.expenseScope === "apartment"
      ? draft.apartmentLabel.trim()
      : null,
    bedLabel: draft.expenseScope === "bed" ? draft.bedLabel.trim() : null,
  });
  const vendor = Object.freeze({
    vendorName: draft.vendorName.trim(),
    paidBy: draft.paidBy.trim().length === 0 ? null : draft.paidBy.trim(),
  });
  const receiptPreview = Object.freeze({
    receiptAvailable: draft.receiptAvailable,
    receiptNote: draft.receiptAvailable ? draft.receiptNote.trim() : null,
    receiptUploadIncluded: false as const,
    receiptUploadRequiredLater: draft.receiptAvailable,
  });
  const accountingPreview = Object.freeze({
    expenseDeclaredAed: expenseAmountAed,
    rentIncomeAed: 0 as const,
    depositReceivedAed: 0 as const,
    depositRefundedAed: 0 as const,
    arrearsRepaidAed: 0 as const,
    currentDepositMutationAed: 0 as const,
    financeMutationApplied: false as const,
  });
  const reconciliationPreview = Object.freeze({
    financeReconciliationRequired: true as const,
    receiptReconciliationRequired: draft.receiptAvailable,
    reason: "expense-module-does-not-write-production-finance" as const,
  });
  const finalNote = draft.finalNote.trim();

  return Object.freeze({
    eventId: EMPLOYEE_EXPENSE_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Expense" as const,
    expenseDate: draft.expenseDate,
    expenseCategory: draft.expenseCategory,
    expenseAmountAed,
    expenseDescription: draft.expenseDescription.trim(),
    payment,
    allocation,
    vendor,
    receiptPreview,
    accountingPreview,
    reconciliationPreview,
    ...(finalNote.length === 0 ? {} : { finalNote }),
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
