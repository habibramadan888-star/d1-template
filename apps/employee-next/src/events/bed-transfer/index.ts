import {
  hasBlockingValidationIssue,
  type EmployeeEventContract,
  type EventValidationIssue,
} from "../../core/event-contract";

export const EMPLOYEE_BED_TRANSFER_EVENT_ID = "bed-transfer" as const;

export const EMPLOYEE_BED_TRANSFER_FEE_MODES = Object.freeze([
  "paid",
  "waived",
  "unpaid",
] as const);

export type EmployeeBedTransferFeeMode =
  (typeof EMPLOYEE_BED_TRANSFER_FEE_MODES)[number];

export const EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS = Object.freeze([
  "cash",
  "bank",
  "mixed",
  "none",
] as const);

export type EmployeeBedTransferPaymentMethod =
  (typeof EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS)[number];

export const EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES = Object.freeze([
  "none",
  "paid",
  "unpaid",
] as const);

export type EmployeeBedTransferPriceDifferenceMode =
  (typeof EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES)[number];

export const EMPLOYEE_BED_TRANSFER_VALIDATION_CODES = Object.freeze([
  "BED_TRANSFER_DRAFT_NOT_OBJECT",
  "BED_TRANSFER_FROM_BED_REQUIRED",
  "BED_TRANSFER_TO_BED_REQUIRED",
  "BED_TRANSFER_SAME_BED_NOT_ALLOWED",
  "BED_TRANSFER_334_FORBIDDEN",
  "BED_TRANSFER_DATE_REQUIRED",
  "BED_TRANSFER_DATE_INVALID",
  "BED_TRANSFER_REASON_REQUIRED",
  "BED_TRANSFER_COMPANY_SCOPE_REQUIRED",
  "BED_TRANSFER_CONTEXT_REQUIRED",
  "BED_TRANSFER_COMPANY_SCOPE_MISMATCH",
  "BED_TRANSFER_SOURCE_SNAPSHOT_UNAVAILABLE",
  "BED_TRANSFER_TARGET_SNAPSHOT_UNAVAILABLE",
  "BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT",
  "BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT",
  "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED",
  "BED_TRANSFER_SOURCE_MMDD_REQUIRED",
  "BED_TRANSFER_RENT_COVERAGE_REQUIRED",
  "BED_TRANSFER_OPEN_ARREARS_REF_REQUIRED",
  "BED_TRANSFER_OPEN_ARREARS_AMOUNT_MISMATCH",
  "BED_TRANSFER_MULTIPLE_OPEN_ARREARS_UNSUPPORTED",
  "BED_TRANSFER_FEE_MODE_INVALID",
  "BED_TRANSFER_FEE_AMOUNT_INVALID",
  "BED_TRANSFER_FEE_PAYMENT_METHOD_REQUIRED",
  "BED_TRANSFER_FEE_DUE_DATE_REQUIRED",
  "BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED",
  "BED_PRICE_DIFFERENCE_MODE_INVALID",
  "BED_PRICE_DIFFERENCE_AMOUNT_INVALID",
  "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED",
  "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED",
  "BED_PRICE_DIFFERENCE_REASON_REQUIRED",
  "BED_TRANSFER_PROVIDER_IDENTITY_FORBIDDEN",
  "BED_TRANSFER_BACKEND_FIELD_FORBIDDEN",
] as const);

export type EmployeeBedTransferValidationCode =
  (typeof EMPLOYEE_BED_TRANSFER_VALIDATION_CODES)[number];

export interface EmployeeBedTransferArrearsSnapshot {
  readonly cloudArrearsRef: string;
  readonly remainingArrearsAed: number;
  readonly arrearsSource: "cloud_arrears";
}

export interface EmployeeBedTransferAccessSnapshot {
  readonly bedLabel: string;
  readonly companyScope: string;
  readonly snapshotAvailable: boolean;
  readonly snapshotStale: boolean;
  readonly snapshotAmbiguous: boolean;
  readonly physicalBedStatus: "occupied" | "vacant" | "unknown";
  readonly physicalBedStatusSource:
    | "access_snapshot_no_E"
    | "access_snapshot_E_marker"
    | "unknown";
  readonly parsedVacancyMarker: boolean;
  readonly depositSnapshotAed: number | null;
  readonly depositSource: "access_snapshot_D" | "unknown";
  readonly depositAmbiguous: boolean;
  readonly firstStayMmdd: string;
  readonly firstStayMmddConfirmed: boolean;
  readonly rentCoverageStart: string;
  readonly rentCoverageEnd: string;
  readonly openArrears: readonly EmployeeBedTransferArrearsSnapshot[];
}

export interface EmployeeBedTransferDraft {
  readonly fromBed: string;
  readonly toBed: string;
  readonly transferDate: string;
  readonly transferReason: string;
  readonly companyScope: string;
  readonly sourceAccessSnapshot: EmployeeBedTransferAccessSnapshot | null;
  readonly targetAccessSnapshot: EmployeeBedTransferAccessSnapshot | null;
  readonly arrearsCarryoverAccepted: boolean;
  readonly cloudArrearsRef: string;
  readonly carriedArrearsAmountAed: number | null;
  readonly transferFeeMode: EmployeeBedTransferFeeMode;
  readonly transferFeeAmountAed: number | null;
  readonly transferFeePaymentMethod: EmployeeBedTransferPaymentMethod;
  readonly transferFeeDueDate: string;
  readonly transferFeeWaiverReason: string;
  readonly bedPriceDifferenceMode: EmployeeBedTransferPriceDifferenceMode;
  readonly bedPriceDifferenceAmountAed: number | null;
  readonly bedPriceDifferencePaymentMethod: EmployeeBedTransferPaymentMethod;
  readonly bedPriceDifferenceDueDate: string;
  readonly bedPriceDifferenceReason: string;
  readonly finalNote: string;
}

export interface EmployeeBedTransferSubmission {
  readonly eventId: "bed-transfer";
  readonly schemaVersion: 1;
  readonly displayName: "Bed Transfer";
  readonly fromBed: string;
  readonly toBed: string;
  readonly transferDate: string;
  readonly transferReason: string;
  readonly companyScope: string;
  readonly sourceBedContext: Readonly<{
    bedLabel: string;
    physicalBedStatus: "occupied";
    physicalBedStatusSource: "access_snapshot_no_E";
    firstStayMmdd: string;
    rentCoverageStart: string;
    rentCoverageEnd: string;
  }>;
  readonly targetBedContext: Readonly<{
    bedLabel: string;
    physicalBedStatus: "vacant";
    physicalBedStatusSource: "access_snapshot_E_marker";
    parsedVacancyMarker: true;
  }>;
  readonly rentCoverageCarryover: Readonly<{
    start: string;
    end: string;
    source: "source_access_snapshot_context";
    mutationApplied: false;
  }>;
  readonly depositCarryoverPreview: Readonly<{
    sourceDepositSnapshotAed: number;
    depositSource: "access_snapshot_D";
    depositAmountChanged: false;
    depositInGenerated: false;
    depositOutGenerated: false;
    currentDepositMutationAed: 0;
  }>;
  readonly arrearsCarryoverPreview: Readonly<{
    openArrearsCount: 0 | 1;
    carryoverRequired: boolean;
    cloudArrearsRef: string | null;
    carriedArrearsAmountAed: number;
    closesArrears: false;
    arrearsMutationApplied: false;
  }>;
  readonly transferFeePreview: Readonly<{
    mode: EmployeeBedTransferFeeMode;
    declaredAmountAed: number;
    paymentMethod: EmployeeBedTransferPaymentMethod;
    dueDate: string | null;
    waiverReason: string | null;
    financeMutationApplied: false;
  }>;
  readonly bedPriceDifferencePreview: Readonly<{
    mode: EmployeeBedTransferPriceDifferenceMode;
    declaredAmountAed: number;
    paymentMethod: EmployeeBedTransferPaymentMethod;
    dueDate: string | null;
    reason: string | null;
    financeMutationApplied: false;
  }>;
  readonly accountingPreview: Readonly<{
    rentIncomeAed: 0;
    depositReceivedAed: 0;
    depositRefundedAed: 0;
    arrearsRepaidAed: 0;
    expenseAed: 0;
    transferFeeDeclaredAed: number;
    bedPriceDifferenceDeclaredAed: number;
    financeMutationApplied: false;
    ledgerWriteApplied: false;
  }>;
  readonly occupancyPreview: Readonly<{
    transferDeclared: true;
    sourceBedVacancyMutationApplied: false;
    targetBedOccupancyMutationApplied: false;
    accessMutationApplied: false;
    ttlockMutationApplied: false;
    reason: "bed-transfer-module-does-not-write-production-occupancy";
  }>;
  readonly reconciliationPreview: Readonly<{
    sourceMustBeMarkedVacantAfterTransfer: true;
    targetMustBeMarkedOccupiedAfterTransfer: true;
    targetDepositDReconciliationRequired: true;
    arrearsCarryoverReconciliationRequired: boolean;
    financeReconciliationRequired: boolean;
    ownerTodoWriteApplied: false;
    syncStateWriteApplied: false;
    reason: "bed-transfer-does-not-write-production-sources";
  }>;
  readonly finalNote?: string;
}

export interface EmployeeBedTransferEventContract extends EmployeeEventContract<
  EmployeeBedTransferDraft,
  EmployeeBedTransferSubmission
> {}

const DRAFT_KEYS = Object.freeze([
  "fromBed",
  "toBed",
  "transferDate",
  "transferReason",
  "companyScope",
  "sourceAccessSnapshot",
  "targetAccessSnapshot",
  "arrearsCarryoverAccepted",
  "cloudArrearsRef",
  "carriedArrearsAmountAed",
  "transferFeeMode",
  "transferFeeAmountAed",
  "transferFeePaymentMethod",
  "transferFeeDueDate",
  "transferFeeWaiverReason",
  "bedPriceDifferenceMode",
  "bedPriceDifferenceAmountAed",
  "bedPriceDifferencePaymentMethod",
  "bedPriceDifferenceDueDate",
  "bedPriceDifferenceReason",
  "finalNote",
] as const);

const ACCESS_KEYS = Object.freeze([
  "bedLabel",
  "companyScope",
  "snapshotAvailable",
  "snapshotStale",
  "snapshotAmbiguous",
  "physicalBedStatus",
  "physicalBedStatusSource",
  "parsedVacancyMarker",
  "depositSnapshotAed",
  "depositSource",
  "depositAmbiguous",
  "firstStayMmdd",
  "firstStayMmddConfirmed",
  "rentCoverageStart",
  "rentCoverageEnd",
  "openArrears",
] as const);

const ARREARS_KEYS = Object.freeze([
  "cloudArrearsRef",
  "remainingArrearsAed",
  "arrearsSource",
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

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    return false;
  }
  const keys = Object.keys(value);
  return (
    keys.length === expected.length
    && expected.every((key) => keys.includes(key))
  );
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

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function normalizeMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function moneyEqual(left: number, right: number): boolean {
  return Math.abs(normalizeMoney(left) - normalizeMoney(right)) < 1e-9;
}

function issue(
  code: EmployeeBedTransferValidationCode,
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

function createInitialDraft(): EmployeeBedTransferDraft {
  return Object.freeze({
    fromBed: "",
    toBed: "",
    transferDate: "",
    transferReason: "",
    companyScope: "",
    sourceAccessSnapshot: null,
    targetAccessSnapshot: null,
    arrearsCarryoverAccepted: false,
    cloudArrearsRef: "",
    carriedArrearsAmountAed: null,
    transferFeeMode: "paid",
    transferFeeAmountAed: 50,
    transferFeePaymentMethod: "cash",
    transferFeeDueDate: "",
    transferFeeWaiverReason: "",
    bedPriceDifferenceMode: "none",
    bedPriceDifferenceAmountAed: 0,
    bedPriceDifferencePaymentMethod: "none",
    bedPriceDifferenceDueDate: "",
    bedPriceDifferenceReason: "",
    finalNote: "",
  });
}

export function isEmployeeBedTransferFeeMode(
  value: unknown,
): value is EmployeeBedTransferFeeMode {
  return (
    typeof value === "string"
    && EMPLOYEE_BED_TRANSFER_FEE_MODES.some((mode) => mode === value)
  );
}

export function isEmployeeBedTransferPaymentMethod(
  value: unknown,
): value is EmployeeBedTransferPaymentMethod {
  return (
    typeof value === "string"
    && EMPLOYEE_BED_TRANSFER_PAYMENT_METHODS.some((method) => method === value)
  );
}

export function isEmployeeBedTransferPriceDifferenceMode(
  value: unknown,
): value is EmployeeBedTransferPriceDifferenceMode {
  return (
    typeof value === "string"
    && EMPLOYEE_BED_TRANSFER_PRICE_DIFFERENCE_MODES.some(
      (mode) => mode === value,
    )
  );
}

function isArrearsSnapshot(
  value: unknown,
): value is EmployeeBedTransferArrearsSnapshot {
  if (!isPlainRecord(value) || !hasExactKeys(value, ARREARS_KEYS)) {
    return false;
  }
  try {
    return (
      typeof value.cloudArrearsRef === "string"
      && typeof value.remainingArrearsAed === "number"
      && Number.isFinite(value.remainingArrearsAed)
      && value.arrearsSource === "cloud_arrears"
    );
  } catch {
    return false;
  }
}

function isAccessSnapshot(
  value: unknown,
): value is EmployeeBedTransferAccessSnapshot {
  if (!isPlainRecord(value) || !hasExactKeys(value, ACCESS_KEYS)) {
    return false;
  }
  try {
    return (
      typeof value.bedLabel === "string"
      && typeof value.companyScope === "string"
      && typeof value.snapshotAvailable === "boolean"
      && typeof value.snapshotStale === "boolean"
      && typeof value.snapshotAmbiguous === "boolean"
      && (
        value.physicalBedStatus === "occupied"
        || value.physicalBedStatus === "vacant"
        || value.physicalBedStatus === "unknown"
      )
      && (
        value.physicalBedStatusSource === "access_snapshot_no_E"
        || value.physicalBedStatusSource === "access_snapshot_E_marker"
        || value.physicalBedStatusSource === "unknown"
      )
      && typeof value.parsedVacancyMarker === "boolean"
      && isNullableFiniteNumber(value.depositSnapshotAed)
      && (
        value.depositSource === "access_snapshot_D"
        || value.depositSource === "unknown"
      )
      && typeof value.depositAmbiguous === "boolean"
      && typeof value.firstStayMmdd === "string"
      && typeof value.firstStayMmddConfirmed === "boolean"
      && typeof value.rentCoverageStart === "string"
      && typeof value.rentCoverageEnd === "string"
      && Array.isArray(value.openArrears)
      && value.openArrears.every(isArrearsSnapshot)
    );
  } catch {
    return false;
  }
}

export function isEmployeeBedTransferDraft(
  value: unknown,
): value is EmployeeBedTransferDraft {
  if (!isPlainRecord(value) || !hasExactKeys(value, DRAFT_KEYS)) {
    return false;
  }
  try {
    return (
      typeof value.fromBed === "string"
      && typeof value.toBed === "string"
      && typeof value.transferDate === "string"
      && typeof value.transferReason === "string"
      && typeof value.companyScope === "string"
      && (
        value.sourceAccessSnapshot === null
        || isAccessSnapshot(value.sourceAccessSnapshot)
      )
      && (
        value.targetAccessSnapshot === null
        || isAccessSnapshot(value.targetAccessSnapshot)
      )
      && typeof value.arrearsCarryoverAccepted === "boolean"
      && typeof value.cloudArrearsRef === "string"
      && isNullableFiniteNumber(value.carriedArrearsAmountAed)
      && isEmployeeBedTransferFeeMode(value.transferFeeMode)
      && isNullableFiniteNumber(value.transferFeeAmountAed)
      && isEmployeeBedTransferPaymentMethod(value.transferFeePaymentMethod)
      && typeof value.transferFeeDueDate === "string"
      && typeof value.transferFeeWaiverReason === "string"
      && isEmployeeBedTransferPriceDifferenceMode(
        value.bedPriceDifferenceMode,
      )
      && isNullableFiniteNumber(value.bedPriceDifferenceAmountAed)
      && isEmployeeBedTransferPaymentMethod(
        value.bedPriceDifferencePaymentMethod,
      )
      && typeof value.bedPriceDifferenceDueDate === "string"
      && typeof value.bedPriceDifferenceReason === "string"
      && typeof value.finalNote === "string"
    );
  } catch {
    return false;
  }
}

function validateAccessSnapshotShape(
  value: unknown,
  field: "sourceAccessSnapshot" | "targetAccessSnapshot",
): readonly EventValidationIssue[] {
  if (value === null || value === undefined) {
    return [issue("BED_TRANSFER_CONTEXT_REQUIRED", "Bed context is required.", field)];
  }
  if (!isAccessSnapshot(value)) {
    return [
      issue(
        "BED_TRANSFER_PROVIDER_IDENTITY_FORBIDDEN",
        "Bed context contains forbidden or invalid fields.",
        field,
      ),
      issue(
        "BED_TRANSFER_BACKEND_FIELD_FORBIDDEN",
        "Bed context contains forbidden backend fields.",
        field,
      ),
    ];
  }
  return [];
}

function validateDraft(
  value: Readonly<EmployeeBedTransferDraft>,
): readonly EventValidationIssue[] {
  if (!isPlainRecord(value)) {
    return freezeIssues([
      issue(
        "BED_TRANSFER_DRAFT_NOT_OBJECT",
        "Bed transfer draft must be a plain object.",
      ),
    ]);
  }
  if (!hasExactKeys(value, DRAFT_KEYS)) {
    return freezeIssues([
      issue(
        "BED_TRANSFER_PROVIDER_IDENTITY_FORBIDDEN",
        "Additional identity fields are forbidden.",
      ),
      issue(
        "BED_TRANSFER_BACKEND_FIELD_FORBIDDEN",
        "Additional backend or cross-event fields are forbidden.",
      ),
    ]);
  }
  try {
    Object.values(value);
  } catch {
    return freezeIssues([
      issue(
        "BED_TRANSFER_DRAFT_NOT_OBJECT",
        "Bed transfer draft could not be read safely.",
      ),
    ]);
  }

  const issues: EventValidationIssue[] = [];
  const {
    fromBed,
    toBed,
    transferDate,
    transferReason,
    companyScope,
    sourceAccessSnapshot,
    targetAccessSnapshot,
    arrearsCarryoverAccepted,
    cloudArrearsRef,
    carriedArrearsAmountAed,
    transferFeeMode,
    transferFeeAmountAed,
    transferFeePaymentMethod,
    transferFeeDueDate,
    transferFeeWaiverReason,
    bedPriceDifferenceMode,
    bedPriceDifferenceAmountAed,
    bedPriceDifferencePaymentMethod,
    bedPriceDifferenceDueDate,
    bedPriceDifferenceReason,
  } = value;

  if (typeof fromBed !== "string" || fromBed.trim().length === 0) {
    issues.push(issue(
      "BED_TRANSFER_FROM_BED_REQUIRED",
      "Source bed is required.",
      "fromBed",
    ));
  }
  if (typeof toBed !== "string" || toBed.trim().length === 0) {
    issues.push(issue(
      "BED_TRANSFER_TO_BED_REQUIRED",
      "Target bed is required.",
      "toBed",
    ));
  }
  if (
    typeof fromBed === "string"
    && typeof toBed === "string"
    && fromBed.trim().length > 0
    && fromBed.trim() === toBed.trim()
  ) {
    issues.push(issue(
      "BED_TRANSFER_SAME_BED_NOT_ALLOWED",
      "Source and target beds must differ.",
    ));
  }
  if (
    (typeof fromBed === "string" && fromBed.trim() === "334")
    || (typeof toBed === "string" && toBed.trim() === "334")
  ) {
    issues.push(issue(
      "BED_TRANSFER_334_FORBIDDEN",
      "Bed 334 cannot participate in a transfer.",
    ));
  }
  if (typeof transferDate !== "string" || transferDate.length === 0) {
    issues.push(issue(
      "BED_TRANSFER_DATE_REQUIRED",
      "Transfer date is required.",
      "transferDate",
    ));
  } else if (!isDate(transferDate)) {
    issues.push(issue(
      "BED_TRANSFER_DATE_INVALID",
      "Transfer date must be YYYY-MM-DD.",
      "transferDate",
    ));
  }
  if (
    typeof transferReason !== "string"
    || transferReason.trim().length === 0
  ) {
    issues.push(issue(
      "BED_TRANSFER_REASON_REQUIRED",
      "Transfer reason is required.",
      "transferReason",
    ));
  }
  if (typeof companyScope !== "string" || companyScope.trim().length === 0) {
    issues.push(issue(
      "BED_TRANSFER_COMPANY_SCOPE_REQUIRED",
      "Company scope is required.",
      "companyScope",
    ));
  }

  issues.push(...validateAccessSnapshotShape(
    sourceAccessSnapshot,
    "sourceAccessSnapshot",
  ));
  issues.push(...validateAccessSnapshotShape(
    targetAccessSnapshot,
    "targetAccessSnapshot",
  ));

  const source = isAccessSnapshot(sourceAccessSnapshot)
    ? sourceAccessSnapshot
    : null;
  const target = isAccessSnapshot(targetAccessSnapshot)
    ? targetAccessSnapshot
    : null;

  if (
    source !== null
    && (
      source.companyScope !== companyScope
      || source.bedLabel.trim() !== fromBed.trim()
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_COMPANY_SCOPE_MISMATCH",
      "Source context does not match the transfer scope.",
      "sourceAccessSnapshot",
    ));
  }
  if (
    target !== null
    && (
      target.companyScope !== companyScope
      || target.bedLabel.trim() !== toBed.trim()
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_COMPANY_SCOPE_MISMATCH",
      "Target context does not match the transfer scope.",
      "targetAccessSnapshot",
    ));
  }

  if (
    source !== null
    && (
      !source.snapshotAvailable
      || source.snapshotStale
      || source.snapshotAmbiguous
      || source.physicalBedStatus === "unknown"
      || source.physicalBedStatusSource === "unknown"
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_SOURCE_SNAPSHOT_UNAVAILABLE",
      "Source context is unavailable or unsafe.",
      "sourceAccessSnapshot",
    ));
  }
  if (
    target !== null
    && (
      !target.snapshotAvailable
      || target.snapshotStale
      || target.snapshotAmbiguous
      || target.physicalBedStatus === "unknown"
      || target.physicalBedStatusSource === "unknown"
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_TARGET_SNAPSHOT_UNAVAILABLE",
      "Target context is unavailable or unsafe.",
      "targetAccessSnapshot",
    ));
  }
  if (
    source !== null
    && (
      source.parsedVacancyMarker
      || source.physicalBedStatus === "vacant"
      || source.physicalBedStatusSource !== "access_snapshot_no_E"
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT",
      "Source bed must be confirmed occupied.",
      "sourceAccessSnapshot",
    ));
  }
  if (
    target !== null
    && (
      !target.parsedVacancyMarker
      || target.physicalBedStatus !== "vacant"
      || target.physicalBedStatusSource !== "access_snapshot_E_marker"
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT",
      "Target bed must be confirmed vacant.",
      "targetAccessSnapshot",
    ));
  }
  if (
    source !== null
    && (
      !isValidMoney(source.depositSnapshotAed)
      || source.depositSource !== "access_snapshot_D"
      || source.depositAmbiguous
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_SOURCE_DEPOSIT_D_REQUIRED",
      "Source deposit snapshot is required and must be unambiguous.",
      "sourceAccessSnapshot",
    ));
  }
  if (
    source !== null
    && (
      source.firstStayMmdd.trim().length === 0
      || !source.firstStayMmddConfirmed
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_SOURCE_MMDD_REQUIRED",
      "Confirmed source stay MMDD is required.",
      "sourceAccessSnapshot",
    ));
  }
  if (
    source !== null
    && (
      !isDate(source.rentCoverageStart)
      || !isDate(source.rentCoverageEnd)
    )
  ) {
    issues.push(issue(
      "BED_TRANSFER_RENT_COVERAGE_REQUIRED",
      "Source rent coverage dates are required.",
      "sourceAccessSnapshot",
    ));
  }

  const openArrears = source?.openArrears ?? [];
  if (openArrears.length > 1) {
    issues.push(issue(
      "BED_TRANSFER_MULTIPLE_OPEN_ARREARS_UNSUPPORTED",
      "Multiple open arrears cannot be carried by this contract.",
      "sourceAccessSnapshot",
    ));
  } else if (openArrears.length === 1) {
    const arrears = openArrears[0];
    if (
      !arrearsCarryoverAccepted
      || typeof cloudArrearsRef !== "string"
      || cloudArrearsRef.trim().length === 0
      || cloudArrearsRef !== arrears.cloudArrearsRef
    ) {
      issues.push(issue(
        "BED_TRANSFER_OPEN_ARREARS_REF_REQUIRED",
        "The unique open arrears reference must be accepted and preserved.",
        "cloudArrearsRef",
      ));
    }
    if (
      !isValidMoney(arrears.remainingArrearsAed)
      || !isValidMoney(carriedArrearsAmountAed)
      || !moneyEqual(carriedArrearsAmountAed, arrears.remainingArrearsAed)
    ) {
      issues.push(issue(
        "BED_TRANSFER_OPEN_ARREARS_AMOUNT_MISMATCH",
        "Carried arrears must match the source snapshot.",
        "carriedArrearsAmountAed",
      ));
    }
  }

  if (!isEmployeeBedTransferFeeMode(transferFeeMode)) {
    issues.push(issue(
      "BED_TRANSFER_FEE_MODE_INVALID",
      "Transfer fee mode is invalid.",
      "transferFeeMode",
    ));
  } else if (transferFeeMode === "paid") {
    if (
      !isValidMoney(transferFeeAmountAed)
      || !moneyEqual(transferFeeAmountAed, 50)
    ) {
      issues.push(issue(
        "BED_TRANSFER_FEE_AMOUNT_INVALID",
        "Paid transfer fee must be AED 50.",
        "transferFeeAmountAed",
      ));
    }
    if (
      transferFeePaymentMethod !== "cash"
      && transferFeePaymentMethod !== "bank"
      && transferFeePaymentMethod !== "mixed"
    ) {
      issues.push(issue(
        "BED_TRANSFER_FEE_PAYMENT_METHOD_REQUIRED",
        "Paid transfer fee requires a payment method.",
        "transferFeePaymentMethod",
      ));
    }
  } else if (transferFeeMode === "waived") {
    if (
      !isValidMoney(transferFeeAmountAed)
      || !moneyEqual(transferFeeAmountAed, 0)
    ) {
      issues.push(issue(
        "BED_TRANSFER_FEE_AMOUNT_INVALID",
        "Waived transfer fee must be zero.",
        "transferFeeAmountAed",
      ));
    }
    if (
      typeof transferFeeWaiverReason !== "string"
      || transferFeeWaiverReason.trim().length === 0
    ) {
      issues.push(issue(
        "BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED",
        "Waiver reason is required.",
        "transferFeeWaiverReason",
      ));
    }
  } else if (transferFeeMode === "unpaid") {
    if (
      !isValidMoney(transferFeeAmountAed)
      || !moneyEqual(transferFeeAmountAed, 50)
    ) {
      issues.push(issue(
        "BED_TRANSFER_FEE_AMOUNT_INVALID",
        "Unpaid transfer fee must be AED 50.",
        "transferFeeAmountAed",
      ));
    }
    if (transferFeePaymentMethod !== "none") {
      issues.push(issue(
        "BED_TRANSFER_FEE_PAYMENT_METHOD_REQUIRED",
        "Unpaid transfer fee must not declare a payment method.",
        "transferFeePaymentMethod",
      ));
    }
    if (!isDate(transferFeeDueDate)) {
      issues.push(issue(
        "BED_TRANSFER_FEE_DUE_DATE_REQUIRED",
        "Unpaid transfer fee requires a YYYY-MM-DD due date.",
        "transferFeeDueDate",
      ));
    }
  }

  if (!isEmployeeBedTransferPriceDifferenceMode(bedPriceDifferenceMode)) {
    issues.push(issue(
      "BED_PRICE_DIFFERENCE_MODE_INVALID",
      "Bed price difference mode is invalid.",
      "bedPriceDifferenceMode",
    ));
  } else if (bedPriceDifferenceMode === "none") {
    const amountIsZero = bedPriceDifferenceAmountAed === null
      || (
        isValidMoney(bedPriceDifferenceAmountAed)
        && moneyEqual(bedPriceDifferenceAmountAed, 0)
      );
    if (!amountIsZero) {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_AMOUNT_INVALID",
        "No price difference may be declared in none mode.",
        "bedPriceDifferenceAmountAed",
      ));
    }
    if (bedPriceDifferencePaymentMethod !== "none") {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED",
        "None mode must not declare a payment method.",
        "bedPriceDifferencePaymentMethod",
      ));
    }
    if (bedPriceDifferenceDueDate !== "") {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED",
        "None mode must not declare a due date.",
        "bedPriceDifferenceDueDate",
      ));
    }
  } else if (bedPriceDifferenceMode === "paid") {
    if (
      !isValidMoney(bedPriceDifferenceAmountAed)
      || bedPriceDifferenceAmountAed <= 0
    ) {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_AMOUNT_INVALID",
        "Paid price difference must be positive.",
        "bedPriceDifferenceAmountAed",
      ));
    }
    if (
      bedPriceDifferencePaymentMethod !== "cash"
      && bedPriceDifferencePaymentMethod !== "bank"
      && bedPriceDifferencePaymentMethod !== "mixed"
    ) {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED",
        "Paid price difference requires a payment method.",
        "bedPriceDifferencePaymentMethod",
      ));
    }
    if (bedPriceDifferenceDueDate !== "") {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED",
        "Paid price difference must not declare a due date.",
        "bedPriceDifferenceDueDate",
      ));
    }
  } else if (bedPriceDifferenceMode === "unpaid") {
    if (
      !isValidMoney(bedPriceDifferenceAmountAed)
      || bedPriceDifferenceAmountAed <= 0
    ) {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_AMOUNT_INVALID",
        "Unpaid price difference must be positive.",
        "bedPriceDifferenceAmountAed",
      ));
    }
    if (bedPriceDifferencePaymentMethod !== "none") {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED",
        "Unpaid price difference must not declare a payment method.",
        "bedPriceDifferencePaymentMethod",
      ));
    }
    if (!isDate(bedPriceDifferenceDueDate)) {
      issues.push(issue(
        "BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED",
        "Unpaid price difference requires a YYYY-MM-DD due date.",
        "bedPriceDifferenceDueDate",
      ));
    }
  }
  if (
    isEmployeeBedTransferPriceDifferenceMode(bedPriceDifferenceMode)
    && bedPriceDifferenceMode !== "none"
    && (
      typeof bedPriceDifferenceReason !== "string"
      || bedPriceDifferenceReason.trim().length === 0
    )
  ) {
    issues.push(issue(
      "BED_PRICE_DIFFERENCE_REASON_REQUIRED",
      "Bed price difference reason is required.",
      "bedPriceDifferenceReason",
    ));
  }

  return freezeIssues(issues);
}

function buildSubmission(
  draft: Readonly<EmployeeBedTransferDraft>,
): EmployeeBedTransferSubmission {
  const issues = validateDraft(draft);
  if (
    hasBlockingValidationIssue(issues)
    || !isEmployeeBedTransferDraft(draft)
  ) {
    throw new Error("EMPLOYEE_BED_TRANSFER_INVALID_DRAFT");
  }

  const source = draft.sourceAccessSnapshot as EmployeeBedTransferAccessSnapshot;
  const target = draft.targetAccessSnapshot as EmployeeBedTransferAccessSnapshot;
  const openArrears = source.openArrears;
  const sourceDepositSnapshotAed = normalizeMoney(
    source.depositSnapshotAed as number,
  );
  const transferFeeDeclaredAed = normalizeMoney(
    draft.transferFeeAmountAed as number,
  );
  const bedPriceDifferenceDeclaredAed = draft.bedPriceDifferenceAmountAed === null
    ? 0
    : normalizeMoney(draft.bedPriceDifferenceAmountAed);
  const carryoverRequired = openArrears.length === 1;
  const carriedArrearsAmountAed = carryoverRequired
    ? normalizeMoney(openArrears[0].remainingArrearsAed)
    : 0;

  const sourceBedContext = Object.freeze({
    bedLabel: source.bedLabel.trim(),
    physicalBedStatus: "occupied" as const,
    physicalBedStatusSource: "access_snapshot_no_E" as const,
    firstStayMmdd: source.firstStayMmdd,
    rentCoverageStart: source.rentCoverageStart,
    rentCoverageEnd: source.rentCoverageEnd,
  });
  const targetBedContext = Object.freeze({
    bedLabel: target.bedLabel.trim(),
    physicalBedStatus: "vacant" as const,
    physicalBedStatusSource: "access_snapshot_E_marker" as const,
    parsedVacancyMarker: true as const,
  });
  const rentCoverageCarryover = Object.freeze({
    start: source.rentCoverageStart,
    end: source.rentCoverageEnd,
    source: "source_access_snapshot_context" as const,
    mutationApplied: false as const,
  });
  const depositCarryoverPreview = Object.freeze({
    sourceDepositSnapshotAed,
    depositSource: "access_snapshot_D" as const,
    depositAmountChanged: false as const,
    depositInGenerated: false as const,
    depositOutGenerated: false as const,
    currentDepositMutationAed: 0 as const,
  });
  const arrearsCarryoverPreview = Object.freeze({
    openArrearsCount: openArrears.length as 0 | 1,
    carryoverRequired,
    cloudArrearsRef: carryoverRequired
      ? openArrears[0].cloudArrearsRef
      : null,
    carriedArrearsAmountAed,
    closesArrears: false as const,
    arrearsMutationApplied: false as const,
  });
  const transferFeePreview = Object.freeze({
    mode: draft.transferFeeMode,
    declaredAmountAed: transferFeeDeclaredAed,
    paymentMethod: draft.transferFeePaymentMethod,
    dueDate: draft.transferFeeMode === "unpaid"
      ? draft.transferFeeDueDate
      : null,
    waiverReason: draft.transferFeeMode === "waived"
      ? draft.transferFeeWaiverReason.trim()
      : null,
    financeMutationApplied: false as const,
  });
  const bedPriceDifferencePreview = Object.freeze({
    mode: draft.bedPriceDifferenceMode,
    declaredAmountAed: bedPriceDifferenceDeclaredAed,
    paymentMethod: draft.bedPriceDifferencePaymentMethod,
    dueDate: draft.bedPriceDifferenceMode === "unpaid"
      ? draft.bedPriceDifferenceDueDate
      : null,
    reason: draft.bedPriceDifferenceMode === "none"
      ? null
      : draft.bedPriceDifferenceReason.trim(),
    financeMutationApplied: false as const,
  });
  const accountingPreview = Object.freeze({
    rentIncomeAed: 0 as const,
    depositReceivedAed: 0 as const,
    depositRefundedAed: 0 as const,
    arrearsRepaidAed: 0 as const,
    expenseAed: 0 as const,
    transferFeeDeclaredAed,
    bedPriceDifferenceDeclaredAed,
    financeMutationApplied: false as const,
    ledgerWriteApplied: false as const,
  });
  const occupancyPreview = Object.freeze({
    transferDeclared: true as const,
    sourceBedVacancyMutationApplied: false as const,
    targetBedOccupancyMutationApplied: false as const,
    accessMutationApplied: false as const,
    ttlockMutationApplied: false as const,
    reason: "bed-transfer-module-does-not-write-production-occupancy" as const,
  });
  const reconciliationPreview = Object.freeze({
    sourceMustBeMarkedVacantAfterTransfer: true as const,
    targetMustBeMarkedOccupiedAfterTransfer: true as const,
    targetDepositDReconciliationRequired: true as const,
    arrearsCarryoverReconciliationRequired: carryoverRequired,
    financeReconciliationRequired: (
      transferFeeDeclaredAed > 0
      || bedPriceDifferenceDeclaredAed > 0
    ),
    ownerTodoWriteApplied: false as const,
    syncStateWriteApplied: false as const,
    reason: "bed-transfer-does-not-write-production-sources" as const,
  });
  const finalNote = draft.finalNote.trim();

  return Object.freeze({
    eventId: EMPLOYEE_BED_TRANSFER_EVENT_ID,
    schemaVersion: 1 as const,
    displayName: "Bed Transfer" as const,
    fromBed: draft.fromBed.trim(),
    toBed: draft.toBed.trim(),
    transferDate: draft.transferDate,
    transferReason: draft.transferReason.trim(),
    companyScope: draft.companyScope.trim(),
    sourceBedContext,
    targetBedContext,
    rentCoverageCarryover,
    depositCarryoverPreview,
    arrearsCarryoverPreview,
    transferFeePreview,
    bedPriceDifferencePreview,
    accountingPreview,
    occupancyPreview,
    reconciliationPreview,
    ...(finalNote.length === 0 ? {} : { finalNote }),
  });
}

export function createEmployeeBedTransferEventContract():
EmployeeBedTransferEventContract {
  return Object.freeze({
    eventId: EMPLOYEE_BED_TRANSFER_EVENT_ID,
    displayName: "Bed Transfer",
    createInitialDraft,
    validateDraft,
    buildSubmission,
  });
}
