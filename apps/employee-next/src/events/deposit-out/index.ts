import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_DEPOSIT_OUT_EVENT_ID = "deposit-out" as const;

export const EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS = Object.freeze([
  "cash",
  "bank",
  "mixed",
] as const);

export type EmployeeDepositOutRefundMethod =
  (typeof EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS)[number];

export const EMPLOYEE_DEPOSIT_OUT_VALIDATION_CODES = Object.freeze([
  "DEPOSIT_OUT_DRAFT_NOT_OBJECT",
  "DEPOSIT_OUT_BED_REQUIRED",
  "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED",
  "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
  "DEPOSIT_OUT_REFUND_AMOUNT_REQUIRED",
  "DEPOSIT_OUT_REFUND_AMOUNT_INVALID",
  "DEPOSIT_OUT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
  "DEPOSIT_OUT_DIFFERENCE_REASON_REQUIRED",
  "DEPOSIT_OUT_REFUND_METHOD_INVALID",
  "DEPOSIT_OUT_REFUND_LEGS_INVALID",
  "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH",
  "DEPOSIT_OUT_REFUND_DATE_REQUIRED",
  "DEPOSIT_OUT_PROVIDER_IDENTITY_FORBIDDEN",
  "DEPOSIT_OUT_SCOPE_FIELD_FORBIDDEN",
] as const);

export type EmployeeDepositOutValidationCode =
  (typeof EMPLOYEE_DEPOSIT_OUT_VALIDATION_CODES)[number];

export interface EmployeeDepositOutRefundLeg {
  readonly method: "cash" | "bank";
  readonly amountAed: number;
}

export interface EmployeeDepositOutDraft {
  readonly bedLabel: string;
  readonly currentDepositSnapshotAed: number | null;
  readonly refundAmountAed: number | null;
  readonly refundMethod: EmployeeDepositOutRefundMethod;
  readonly cashRefundedAed: number | null;
  readonly bankRefundedAed: number | null;
  readonly refundDate: string;
  readonly differenceReason: string;
  readonly note: string;
}

export interface EmployeeDepositOutSubmission {
  readonly eventId: "deposit-out";
  readonly schemaVersion: 1;
  readonly displayName: "Deposit Out";
  readonly bedLabel: string;
  readonly currentDepositSnapshotAed: number;
  readonly refundAmountAed: number;
  readonly refund: Readonly<{
    method: EmployeeDepositOutRefundMethod;
    legs: readonly EmployeeDepositOutRefundLeg[];
  }>;
  readonly refundDate: string;
  readonly difference: Readonly<{
    amountAed: number;
    reasonRequired: boolean;
    reason: string | null;
  }>;
  readonly accountingPreview: Readonly<{
    depositRefundedAed: number;
    rentIncomeAed: 0;
    currentDepositMutationAed: 0;
  }>;
  readonly reconciliationPreview: Readonly<{
    currentDepositReconciliationRequired: true;
    reason: "deposit-out-does-not-control-current-balance";
  }>;
  readonly note?: string;
}

export interface EmployeeDepositOutEventContract extends EmployeeEventContract<
  EmployeeDepositOutDraft,
  EmployeeDepositOutSubmission
> {}

const DEPOSIT_OUT_DRAFT_KEYS = Object.freeze([
  "bedLabel",
  "currentDepositSnapshotAed",
  "refundAmountAed",
  "refundMethod",
  "cashRefundedAed",
  "bankRefundedAed",
  "refundDate",
  "differenceReason",
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
    keys.length === DEPOSIT_OUT_DRAFT_KEYS.length
    && DEPOSIT_OUT_DRAFT_KEYS.every((key) => keys.includes(key))
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
  code: EmployeeDepositOutValidationCode,
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

function createInitialDraft(): EmployeeDepositOutDraft {
  return Object.freeze({
    bedLabel: "",
    currentDepositSnapshotAed: null,
    refundAmountAed: null,
    refundMethod: "cash",
    cashRefundedAed: null,
    bankRefundedAed: null,
    refundDate: "",
    differenceReason: "",
    note: "",
  });
}

export function isEmployeeDepositOutRefundMethod(
  value: unknown,
): value is EmployeeDepositOutRefundMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS.some((method) => method === value)
  );
}

export function isEmployeeDepositOutDraft(
  value: unknown,
): value is EmployeeDepositOutDraft {
  if (!isPlainRecord(value) || !hasExactDraftKeys(value)) {
    return false;
  }
  try {
    return (
      typeof value.bedLabel === "string"
      && isNullableFiniteNumber(value.currentDepositSnapshotAed)
      && isNullableFiniteNumber(value.refundAmountAed)
      && isEmployeeDepositOutRefundMethod(value.refundMethod)
      && isNullableFiniteNumber(value.cashRefundedAed)
      && isNullableFiniteNumber(value.bankRefundedAed)
      && typeof value.refundDate === "string"
      && typeof value.differenceReason === "string"
      && typeof value.note === "string"
    );
  } catch {
    return false;
  }
}

function validateDraft(
  value: Readonly<EmployeeDepositOutDraft>,
): readonly EventValidationIssue[] {
  if (!isPlainRecord(value)) {
    return freezeIssues([
      issue(
        "DEPOSIT_OUT_DRAFT_NOT_OBJECT",
        "Deposit out draft must be a plain object.",
      ),
    ]);
  }
  if (!hasExactDraftKeys(value)) {
    return freezeIssues([
      issue(
        "DEPOSIT_OUT_PROVIDER_IDENTITY_FORBIDDEN",
        "Additional identity fields are forbidden.",
      ),
      issue(
        "DEPOSIT_OUT_SCOPE_FIELD_FORBIDDEN",
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
      issue(
        "DEPOSIT_OUT_DRAFT_NOT_OBJECT",
        "Deposit out draft could not be read safely.",
      ),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const bedLabel = draft.bedLabel;
  const currentDeposit = draft.currentDepositSnapshotAed;
  const refundAmount = draft.refundAmountAed;
  const refundMethod = draft.refundMethod;
  const cashRefunded = draft.cashRefundedAed;
  const bankRefunded = draft.bankRefundedAed;
  const refundDate = draft.refundDate;
  const differenceReason = draft.differenceReason;
  const note = draft.note;

  if (typeof bedLabel !== "string" || bedLabel.trim().length === 0) {
    issues.push(
      issue("DEPOSIT_OUT_BED_REQUIRED", "Bed label is required.", "bedLabel"),
    );
  }

  if (currentDeposit === null || currentDeposit === undefined) {
    issues.push(
      issue(
        "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED",
        "Current deposit snapshot is required.",
        "currentDepositSnapshotAed",
      ),
    );
  } else if (
    typeof currentDeposit !== "number"
    || !Number.isFinite(currentDeposit)
    || currentDeposit < 0
    || !hasAtMostTwoDecimalPlaces(currentDeposit)
  ) {
    issues.push(
      issue(
        "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
        "Current deposit snapshot must be non-negative with at most two decimals.",
        "currentDepositSnapshotAed",
      ),
    );
  }

  if (refundAmount === null || refundAmount === undefined) {
    issues.push(
      issue(
        "DEPOSIT_OUT_REFUND_AMOUNT_REQUIRED",
        "Refund amount is required.",
        "refundAmountAed",
      ),
    );
  } else if (
    typeof refundAmount !== "number"
    || !Number.isFinite(refundAmount)
    || refundAmount <= 0
    || !hasAtMostTwoDecimalPlaces(refundAmount)
  ) {
    issues.push(
      issue(
        "DEPOSIT_OUT_REFUND_AMOUNT_INVALID",
        "Refund amount must be positive with at most two decimals.",
        "refundAmountAed",
      ),
    );
  }

  const currentDepositIsValid = (
    typeof currentDeposit === "number"
    && Number.isFinite(currentDeposit)
    && currentDeposit >= 0
    && hasAtMostTwoDecimalPlaces(currentDeposit)
  );
  const refundAmountIsValid = (
    typeof refundAmount === "number"
    && Number.isFinite(refundAmount)
    && refundAmount > 0
    && hasAtMostTwoDecimalPlaces(refundAmount)
  );

  if (
    currentDepositIsValid
    && refundAmountIsValid
    && refundAmount > currentDeposit
  ) {
    issues.push(
      issue(
        "DEPOSIT_OUT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
        "Refund amount cannot exceed the current deposit snapshot.",
        "refundAmountAed",
      ),
    );
  }

  if (
    currentDepositIsValid
    && refundAmountIsValid
    && refundAmount < currentDeposit
    && (
      typeof differenceReason !== "string"
      || differenceReason.trim().length === 0
    )
  ) {
    issues.push(
      issue(
        "DEPOSIT_OUT_DIFFERENCE_REASON_REQUIRED",
        "A difference reason is required for a partial refund.",
        "differenceReason",
      ),
    );
  }

  if (!isEmployeeDepositOutRefundMethod(refundMethod)) {
    issues.push(
      issue(
        "DEPOSIT_OUT_REFUND_METHOD_INVALID",
        "Refund method is invalid.",
        "refundMethod",
      ),
    );
  }

  const cashIsValid = (
    typeof cashRefunded === "number"
    && Number.isFinite(cashRefunded)
    && cashRefunded >= 0
    && hasAtMostTwoDecimalPlaces(cashRefunded)
  );
  const bankIsValid = (
    typeof bankRefunded === "number"
    && Number.isFinite(bankRefunded)
    && bankRefunded >= 0
    && hasAtMostTwoDecimalPlaces(bankRefunded)
  );
  const cashIsZero = cashRefunded === null || (cashIsValid && cashRefunded === 0);
  const bankIsZero = bankRefunded === null || (bankIsValid && bankRefunded === 0);

  if (isEmployeeDepositOutRefundMethod(refundMethod) && refundAmountIsValid) {
    if (refundMethod === "cash") {
      if (!cashIsValid || !bankIsZero) {
        issues.push(
          issue(
            "DEPOSIT_OUT_REFUND_LEGS_INVALID",
            "Cash refund requires a cash leg and no bank leg.",
            "cashRefundedAed",
          ),
        );
      } else if (!moneyEqual(cashRefunded, refundAmount)) {
        issues.push(
          issue(
            "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH",
            "Refund legs must equal the refund amount.",
            "cashRefundedAed",
          ),
        );
      }
    } else if (refundMethod === "bank") {
      if (!bankIsValid || !cashIsZero) {
        issues.push(
          issue(
            "DEPOSIT_OUT_REFUND_LEGS_INVALID",
            "Bank refund requires a bank leg and no cash leg.",
            "bankRefundedAed",
          ),
        );
      } else if (!moneyEqual(bankRefunded, refundAmount)) {
        issues.push(
          issue(
            "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH",
            "Refund legs must equal the refund amount.",
            "bankRefundedAed",
          ),
        );
      }
    } else if (
      !cashIsValid
      || !bankIsValid
      || cashRefunded <= 0
      || bankRefunded <= 0
    ) {
      issues.push(
        issue(
          "DEPOSIT_OUT_REFUND_LEGS_INVALID",
          "Mixed refund requires positive cash and bank legs.",
          "refundMethod",
        ),
      );
    } else if (!moneyEqual(cashRefunded + bankRefunded, refundAmount)) {
      issues.push(
        issue(
          "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH",
          "Refund legs must equal the refund amount.",
          "refundMethod",
        ),
      );
    }
  }

  if (
    typeof refundDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(refundDate)
  ) {
    issues.push(
      issue(
        "DEPOSIT_OUT_REFUND_DATE_REQUIRED",
        "A YYYY-MM-DD refund date is required.",
        "refundDate",
      ),
    );
  }
  if (typeof differenceReason !== "string" || typeof note !== "string") {
    issues.push(
      issue(
        "DEPOSIT_OUT_DRAFT_NOT_OBJECT",
        "Text fields must be strings.",
      ),
    );
  }

  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeDepositOutDraft>,
): EmployeeDepositOutSubmission {
  const issues = validateDraft(draft);
  if (hasBlockingValidationIssue(issues) || !isEmployeeDepositOutDraft(draft)) {
    throw new Error("EMPLOYEE_DEPOSIT_OUT_INVALID_DRAFT");
  }

  const currentDepositSnapshotAed = normalizeMoney(
    draft.currentDepositSnapshotAed as number,
  );
  const refundAmountAed = normalizeMoney(draft.refundAmountAed as number);
  const differenceAmountAed = normalizeMoney(
    currentDepositSnapshotAed - refundAmountAed,
  );
  const legs: EmployeeDepositOutRefundLeg[] = draft.refundMethod === "mixed"
    ? [
        Object.freeze({
          method: "cash",
          amountAed: normalizeMoney(draft.cashRefundedAed as number),
        }),
        Object.freeze({
          method: "bank",
          amountAed: normalizeMoney(draft.bankRefundedAed as number),
        }),
      ]
    : [
        Object.freeze({
          method: draft.refundMethod,
          amountAed: refundAmountAed,
        }),
      ];
  const refund = Object.freeze({
    method: draft.refundMethod,
    legs: Object.freeze(legs),
  });
  const difference = Object.freeze({
    amountAed: differenceAmountAed,
    reasonRequired: differenceAmountAed > 0,
    reason: differenceAmountAed > 0 ? draft.differenceReason.trim() : null,
  });
  const accountingPreview = Object.freeze({
    depositRefundedAed: refundAmountAed,
    rentIncomeAed: 0 as const,
    currentDepositMutationAed: 0 as const,
  });
  const reconciliationPreview = Object.freeze({
    currentDepositReconciliationRequired: true as const,
    reason: "deposit-out-does-not-control-current-balance" as const,
  });
  const note = draft.note.trim();

  return Object.freeze({
    eventId: EMPLOYEE_DEPOSIT_OUT_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Deposit Out" as const,
    bedLabel: draft.bedLabel.trim(),
    currentDepositSnapshotAed,
    refundAmountAed,
    refund,
    refundDate: draft.refundDate,
    difference,
    accountingPreview,
    reconciliationPreview,
    ...(note.length === 0 ? {} : { note }),
  });
}

export function createEmployeeDepositOutEventContract():
EmployeeDepositOutEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_DEPOSIT_OUT_EVENT_ID,
    displayName: "Deposit Out",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
