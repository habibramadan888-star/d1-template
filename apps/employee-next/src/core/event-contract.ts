export const EMPLOYEE_EVENT_IDS = Object.freeze([
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
] as const);

export type EmployeeEventId = (typeof EMPLOYEE_EVENT_IDS)[number];

export const EMPLOYEE_ENTRY_STATUSES = Object.freeze([
  "DRAFT",
  "SUBMITTING",
  "SYNCED",
  "ERROR",
] as const);

export type EmployeeEntryStatus = (typeof EMPLOYEE_ENTRY_STATUSES)[number];

export const EVENT_VALIDATION_SEVERITIES = Object.freeze([
  "ERROR",
  "WARNING",
] as const);

export type EventValidationSeverity =
  (typeof EVENT_VALIDATION_SEVERITIES)[number];

export interface EventValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: EventValidationSeverity;
  readonly field?: string;
}

export interface EmployeeEventContract<
  TDraft extends object,
  TSubmission extends object,
> {
  readonly eventId: EmployeeEventId;
  readonly displayName: string;
  createInitialDraft(): TDraft;
  validateDraft(draft: Readonly<TDraft>): readonly EventValidationIssue[];
  buildSubmission(draft: Readonly<TDraft>): TSubmission;
}

const employeeEventIdSet: ReadonlySet<string> = new Set(EMPLOYEE_EVENT_IDS);
const employeeEntryStatusSet: ReadonlySet<string> = new Set(
  EMPLOYEE_ENTRY_STATUSES,
);

export function isEmployeeEventId(value: unknown): value is EmployeeEventId {
  return typeof value === "string" && employeeEventIdSet.has(value);
}

export function isEmployeeEntryStatus(
  value: unknown,
): value is EmployeeEntryStatus {
  return typeof value === "string" && employeeEntryStatusSet.has(value);
}

export function hasBlockingValidationIssue(
  issues: readonly EventValidationIssue[],
): boolean {
  return issues.some((issue) => issue.severity === "ERROR");
}
