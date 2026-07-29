import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_CHECKOUT_EVENT_ID = "checkout" as const;

export const EMPLOYEE_CHECKOUT_MODES = Object.freeze([
  "normal",
  "left_with_arrears",
] as const);

export type EmployeeCheckoutMode = (typeof EMPLOYEE_CHECKOUT_MODES)[number];

export const EMPLOYEE_CHECKOUT_VALIDATION_CODES = Object.freeze([
  "CHECKOUT_DRAFT_NOT_OBJECT",
  "CHECKOUT_BED_REQUIRED",
  "CHECKOUT_DATE_REQUIRED",
  "CHECKOUT_DATE_INVALID",
  "CHECKOUT_MODE_INVALID",
  "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED",
  "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
  "CHECKOUT_DEPOSIT_REFUND_AMOUNT_REQUIRED",
  "CHECKOUT_DEPOSIT_REFUND_AMOUNT_INVALID",
  "CHECKOUT_DEPOSIT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
  "CHECKOUT_DEPOSIT_DIFFERENCE_REASON_REQUIRED",
  "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_REQUIRED",
  "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_INVALID",
  "CHECKOUT_NORMAL_WITH_OPEN_ARREARS_FORBIDDEN",
  "CHECKOUT_LEFT_WITH_ARREARS_REF_REQUIRED",
  "CHECKOUT_LEFT_WITH_ARREARS_CONTACT_REQUIRED",
  "CHECKOUT_LEFT_WITH_ARREARS_BELONGINGS_NOTE_REQUIRED",
  "CHECKOUT_PROMISE_DATE_INVALID",
  "CHECKOUT_PROVIDER_IDENTITY_FORBIDDEN",
  "CHECKOUT_SCOPE_FIELD_FORBIDDEN",
] as const);

export type EmployeeCheckoutValidationCode =
  (typeof EMPLOYEE_CHECKOUT_VALIDATION_CODES)[number];

export interface EmployeeCheckoutDraft {
  readonly bedLabel: string;
  readonly checkoutDate: string;
  readonly checkoutMode: EmployeeCheckoutMode;
  readonly currentDepositSnapshotAed: number | null;
  readonly depositRefundAed: number | null;
  readonly depositDifferenceReason: string;
  readonly outstandingArrearsSnapshotAed: number | null;
  readonly cloudArrearsRef: string;
  readonly formerCustomerName: string;
  readonly formerCustomerPhone: string;
  readonly contactMethod: string;
  readonly contactNote: string;
  readonly belongingsHeld: boolean;
  readonly belongingsNote: string;
  readonly promisedPaymentDate: string;
  readonly promisedReturnDate: string;
  readonly finalNote: string;
}

export interface EmployeeCheckoutLeftWithArrearsDetails {
  readonly customerLeft: true;
  readonly formerCustomerName: string | null;
  readonly formerCustomerPhone: string | null;
  readonly contactMethod: string | null;
  readonly contactNote: string | null;
  readonly belongingsHeld: boolean;
  readonly belongingsNote: string | null;
  readonly promisedPaymentDate: string | null;
  readonly promisedReturnDate: string | null;
}

export interface EmployeeCheckoutSubmission {
  readonly eventId: "checkout";
  readonly schemaVersion: 1;
  readonly displayName: "Checkout";
  readonly bedLabel: string;
  readonly checkoutDate: string;
  readonly checkoutMode: EmployeeCheckoutMode;
  readonly depositSettlement: Readonly<{
    currentDepositSnapshotAed: number;
    depositRefundDeclaredAed: number;
    differenceAed: number;
    differenceReason: string | null;
  }>;
  readonly arrearsSnapshot: Readonly<{
    outstandingArrearsAed: number;
    cloudArrearsRef: string | null;
    closesArrears: false;
  }>;
  readonly leftWithArrears:
    | Readonly<EmployeeCheckoutLeftWithArrearsDetails>
    | null;
  readonly ownerApprovalPreview: Readonly<{
    ownerApprovalRequired: boolean;
    ownerApprovalStatus: "not_required" | "required_not_requested";
    reason: string | null;
  }>;
  readonly accountingPreview: Readonly<{
    depositRefundDeclaredAed: number;
    rentIncomeAed: 0;
    currentDepositMutationAed: 0;
    arrearsClosedAed: 0;
  }>;
  readonly occupancyPreview: Readonly<{
    checkoutDeclared: true;
    occupancyMutationApplied: false;
    bedVacancyMutationApplied: false;
    accessMutationApplied: false;
    reason: "checkout-module-does-not-control-occupancy";
  }>;
  readonly reconciliationPreview: Readonly<{
    depositReconciliationRequired: true;
    arrearsReconciliationRequired: boolean;
    occupancyReconciliationRequired: true;
    reason: "checkout-does-not-write-production-sources";
  }>;
  readonly finalNote?: string;
}

export interface EmployeeCheckoutEventContract extends EmployeeEventContract<
  EmployeeCheckoutDraft,
  EmployeeCheckoutSubmission
> {}

const CHECKOUT_DRAFT_KEYS = Object.freeze([
  "bedLabel",
  "checkoutDate",
  "checkoutMode",
  "currentDepositSnapshotAed",
  "depositRefundAed",
  "depositDifferenceReason",
  "outstandingArrearsSnapshotAed",
  "cloudArrearsRef",
  "formerCustomerName",
  "formerCustomerPhone",
  "contactMethod",
  "contactNote",
  "belongingsHeld",
  "belongingsNote",
  "promisedPaymentDate",
  "promisedReturnDate",
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
    keys.length === CHECKOUT_DRAFT_KEYS.length
    && CHECKOUT_DRAFT_KEYS.every((key) => keys.includes(key))
  );
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(value - Math.round(value * 100) / 100) < 1e-9;
}

function isValidMoney(value: unknown): value is number {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= 0
    && hasAtMostTwoDecimalPlaces(value)
  );
}

function normalizeMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function nullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function issue(
  code: EmployeeCheckoutValidationCode,
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

function createInitialDraft(): EmployeeCheckoutDraft {
  return Object.freeze({
    bedLabel: "",
    checkoutDate: "",
    checkoutMode: "normal",
    currentDepositSnapshotAed: null,
    depositRefundAed: null,
    depositDifferenceReason: "",
    outstandingArrearsSnapshotAed: null,
    cloudArrearsRef: "",
    formerCustomerName: "",
    formerCustomerPhone: "",
    contactMethod: "",
    contactNote: "",
    belongingsHeld: false,
    belongingsNote: "",
    promisedPaymentDate: "",
    promisedReturnDate: "",
    finalNote: "",
  });
}

export function isEmployeeCheckoutMode(
  value: unknown,
): value is EmployeeCheckoutMode {
  return (
    typeof value === "string"
    && EMPLOYEE_CHECKOUT_MODES.some((mode) => mode === value)
  );
}

export function isEmployeeCheckoutDraft(
  value: unknown,
): value is EmployeeCheckoutDraft {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return false;
  }
  try {
    return (
      typeof value.bedLabel === "string"
      && typeof value.checkoutDate === "string"
      && isEmployeeCheckoutMode(value.checkoutMode)
      && isNullableFiniteNumber(value.currentDepositSnapshotAed)
      && isNullableFiniteNumber(value.depositRefundAed)
      && typeof value.depositDifferenceReason === "string"
      && isNullableFiniteNumber(value.outstandingArrearsSnapshotAed)
      && typeof value.cloudArrearsRef === "string"
      && typeof value.formerCustomerName === "string"
      && typeof value.formerCustomerPhone === "string"
      && typeof value.contactMethod === "string"
      && typeof value.contactNote === "string"
      && typeof value.belongingsHeld === "boolean"
      && typeof value.belongingsNote === "string"
      && typeof value.promisedPaymentDate === "string"
      && typeof value.promisedReturnDate === "string"
      && typeof value.finalNote === "string"
    );
  } catch {
    return false;
  }
}

function validateDraft(
  value: Readonly<EmployeeCheckoutDraft>,
): readonly EventValidationIssue[] {
  if (!isPlainRecord(value)) {
    return freezeIssues([
      issue("CHECKOUT_DRAFT_NOT_OBJECT", "Checkout draft must be a plain object."),
    ]);
  }
  if (!hasExactDraftKeys(value)) {
    return freezeIssues([
      issue(
        "CHECKOUT_PROVIDER_IDENTITY_FORBIDDEN",
        "Additional identity fields are forbidden.",
      ),
      issue(
        "CHECKOUT_SCOPE_FIELD_FORBIDDEN",
        "Additional scope or wire fields are forbidden.",
      ),
    ]);
  }

  let draft: Readonly<Record<string, unknown>>;
  try {
    draft = value;
    Object.values(draft);
  } catch {
    return freezeIssues([
      issue("CHECKOUT_DRAFT_NOT_OBJECT", "Checkout draft could not be read safely."),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const bedLabel = draft.bedLabel;
  const checkoutDate = draft.checkoutDate;
  const checkoutMode = draft.checkoutMode;
  const currentDeposit = draft.currentDepositSnapshotAed;
  const depositRefund = draft.depositRefundAed;
  const depositDifferenceReason = draft.depositDifferenceReason;
  const outstandingArrears = draft.outstandingArrearsSnapshotAed;
  const cloudArrearsRef = draft.cloudArrearsRef;
  const formerCustomerName = draft.formerCustomerName;
  const formerCustomerPhone = draft.formerCustomerPhone;
  const belongingsHeld = draft.belongingsHeld;
  const belongingsNote = draft.belongingsNote;
  const promisedPaymentDate = draft.promisedPaymentDate;
  const promisedReturnDate = draft.promisedReturnDate;

  if (typeof bedLabel !== "string" || bedLabel.trim().length === 0) {
    issues.push(issue("CHECKOUT_BED_REQUIRED", "Bed label is required.", "bedLabel"));
  }
  if (checkoutDate === "") {
    issues.push(issue("CHECKOUT_DATE_REQUIRED", "Checkout date is required.", "checkoutDate"));
  } else if (!isDate(checkoutDate)) {
    issues.push(issue("CHECKOUT_DATE_INVALID", "Checkout date must be YYYY-MM-DD.", "checkoutDate"));
  }
  if (!isEmployeeCheckoutMode(checkoutMode)) {
    issues.push(issue("CHECKOUT_MODE_INVALID", "Checkout mode is invalid.", "checkoutMode"));
  }

  if (currentDeposit === null || currentDeposit === undefined) {
    issues.push(issue(
      "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED",
      "Current deposit snapshot is required.",
      "currentDepositSnapshotAed",
    ));
  } else if (!isValidMoney(currentDeposit)) {
    issues.push(issue(
      "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
      "Current deposit snapshot must be non-negative with at most two decimals.",
      "currentDepositSnapshotAed",
    ));
  }

  if (depositRefund === null || depositRefund === undefined) {
    issues.push(issue(
      "CHECKOUT_DEPOSIT_REFUND_AMOUNT_REQUIRED",
      "Deposit refund declaration is required.",
      "depositRefundAed",
    ));
  } else if (!isValidMoney(depositRefund)) {
    issues.push(issue(
      "CHECKOUT_DEPOSIT_REFUND_AMOUNT_INVALID",
      "Deposit refund declaration must be non-negative with at most two decimals.",
      "depositRefundAed",
    ));
  }

  if (
    isValidMoney(currentDeposit)
    && isValidMoney(depositRefund)
    && depositRefund > currentDeposit
  ) {
    issues.push(issue(
      "CHECKOUT_DEPOSIT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
      "Deposit refund cannot exceed the current deposit snapshot.",
      "depositRefundAed",
    ));
  }
  if (
    isValidMoney(currentDeposit)
    && isValidMoney(depositRefund)
    && depositRefund < currentDeposit
    && (
      typeof depositDifferenceReason !== "string"
      || depositDifferenceReason.trim().length === 0
    )
  ) {
    issues.push(issue(
      "CHECKOUT_DEPOSIT_DIFFERENCE_REASON_REQUIRED",
      "A difference reason is required when the declared refund is lower.",
      "depositDifferenceReason",
    ));
  }

  if (outstandingArrears === null || outstandingArrears === undefined) {
    issues.push(issue(
      "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_REQUIRED",
      "Outstanding arrears snapshot is required.",
      "outstandingArrearsSnapshotAed",
    ));
  } else if (!isValidMoney(outstandingArrears)) {
    issues.push(issue(
      "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_INVALID",
      "Outstanding arrears snapshot must be non-negative with at most two decimals.",
      "outstandingArrearsSnapshotAed",
    ));
  }

  if (checkoutMode === "normal" && isValidMoney(outstandingArrears) && outstandingArrears > 0) {
    issues.push(issue(
      "CHECKOUT_NORMAL_WITH_OPEN_ARREARS_FORBIDDEN",
      "Normal checkout cannot declare open arrears.",
      "outstandingArrearsSnapshotAed",
    ));
  }
  if (checkoutMode === "left_with_arrears") {
    if (isValidMoney(outstandingArrears) && outstandingArrears <= 0) {
      issues.push(issue(
        "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_INVALID",
        "Left-with-arrears requires a positive arrears snapshot.",
        "outstandingArrearsSnapshotAed",
      ));
    }
    if (typeof cloudArrearsRef !== "string" || cloudArrearsRef.trim().length === 0) {
      issues.push(issue(
        "CHECKOUT_LEFT_WITH_ARREARS_REF_REQUIRED",
        "A cloud arrears reference is required.",
        "cloudArrearsRef",
      ));
    }
    const hasName = typeof formerCustomerName === "string"
      && formerCustomerName.trim().length > 0;
    const hasPhone = typeof formerCustomerPhone === "string"
      && formerCustomerPhone.trim().length > 0;
    if (!hasName && !hasPhone) {
      issues.push(issue(
        "CHECKOUT_LEFT_WITH_ARREARS_CONTACT_REQUIRED",
        "At least one former customer contact field is required.",
      ));
    }
  }
  if (
    belongingsHeld === true
    && (typeof belongingsNote !== "string" || belongingsNote.trim().length === 0)
  ) {
    issues.push(issue(
      "CHECKOUT_LEFT_WITH_ARREARS_BELONGINGS_NOTE_REQUIRED",
      "A belongings note is required when belongings are held.",
      "belongingsNote",
    ));
  }
  for (const [field, dateValue] of [
    ["promisedPaymentDate", promisedPaymentDate],
    ["promisedReturnDate", promisedReturnDate],
  ] as const) {
    if (dateValue !== "" && !isDate(dateValue)) {
      issues.push(issue(
        "CHECKOUT_PROMISE_DATE_INVALID",
        "Promise dates must be YYYY-MM-DD when provided.",
        field,
      ));
    }
  }

  const textFields = [
    draft.depositDifferenceReason,
    draft.cloudArrearsRef,
    draft.formerCustomerName,
    draft.formerCustomerPhone,
    draft.contactMethod,
    draft.contactNote,
    draft.belongingsNote,
    draft.promisedPaymentDate,
    draft.promisedReturnDate,
    draft.finalNote,
  ];
  if (textFields.some((field) => typeof field !== "string") || typeof belongingsHeld !== "boolean") {
    issues.push(issue("CHECKOUT_DRAFT_NOT_OBJECT", "Checkout draft field types are invalid."));
  }

  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeCheckoutDraft>,
): EmployeeCheckoutSubmission {
  const issues = validateDraft(draft);
  if (hasBlockingValidationIssue(issues) || !isEmployeeCheckoutDraft(draft)) {
    throw new Error("EMPLOYEE_CHECKOUT_INVALID_DRAFT");
  }

  const currentDepositSnapshotAed = normalizeMoney(
    draft.currentDepositSnapshotAed as number,
  );
  const depositRefundDeclaredAed = normalizeMoney(draft.depositRefundAed as number);
  const differenceAed = normalizeMoney(
    currentDepositSnapshotAed - depositRefundDeclaredAed,
  );
  const outstandingArrearsAed = normalizeMoney(
    draft.outstandingArrearsSnapshotAed as number,
  );
  const leftMode = draft.checkoutMode === "left_with_arrears";
  const depositSettlement = Object.freeze({
    currentDepositSnapshotAed,
    depositRefundDeclaredAed,
    differenceAed,
    differenceReason: differenceAed > 0
      ? draft.depositDifferenceReason.trim()
      : null,
  });
  const arrearsSnapshot = Object.freeze({
    outstandingArrearsAed,
    cloudArrearsRef: leftMode ? draft.cloudArrearsRef.trim() : null,
    closesArrears: false as const,
  });
  const leftWithArrears = leftMode
    ? Object.freeze({
        customerLeft: true as const,
        formerCustomerName: nullableTrimmed(draft.formerCustomerName),
        formerCustomerPhone: nullableTrimmed(draft.formerCustomerPhone),
        contactMethod: nullableTrimmed(draft.contactMethod),
        contactNote: nullableTrimmed(draft.contactNote),
        belongingsHeld: draft.belongingsHeld,
        belongingsNote: nullableTrimmed(draft.belongingsNote),
        promisedPaymentDate: nullableTrimmed(draft.promisedPaymentDate),
        promisedReturnDate: nullableTrimmed(draft.promisedReturnDate),
      })
    : null;
  const ownerApprovalPreview = Object.freeze(leftMode
    ? {
        ownerApprovalRequired: true,
        ownerApprovalStatus: "required_not_requested" as const,
        reason: "left-with-arrears-requires-owner-review",
      }
    : {
        ownerApprovalRequired: false,
        ownerApprovalStatus: "not_required" as const,
        reason: null,
      });
  const accountingPreview = Object.freeze({
    depositRefundDeclaredAed,
    rentIncomeAed: 0 as const,
    currentDepositMutationAed: 0 as const,
    arrearsClosedAed: 0 as const,
  });
  const occupancyPreview = Object.freeze({
    checkoutDeclared: true as const,
    occupancyMutationApplied: false as const,
    bedVacancyMutationApplied: false as const,
    accessMutationApplied: false as const,
    reason: "checkout-module-does-not-control-occupancy" as const,
  });
  const reconciliationPreview = Object.freeze({
    depositReconciliationRequired: true as const,
    arrearsReconciliationRequired: leftMode,
    occupancyReconciliationRequired: true as const,
    reason: "checkout-does-not-write-production-sources" as const,
  });
  const finalNote = draft.finalNote.trim();

  return Object.freeze({
    eventId: EMPLOYEE_CHECKOUT_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Checkout" as const,
    bedLabel: draft.bedLabel.trim(),
    checkoutDate: draft.checkoutDate,
    checkoutMode: draft.checkoutMode,
    depositSettlement,
    arrearsSnapshot,
    leftWithArrears,
    ownerApprovalPreview,
    accountingPreview,
    occupancyPreview,
    reconciliationPreview,
    ...(finalNote.length === 0 ? {} : { finalNote }),
  });
}

export function createEmployeeCheckoutEventContract():
EmployeeCheckoutEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_CHECKOUT_EVENT_ID,
    displayName: "Checkout",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
