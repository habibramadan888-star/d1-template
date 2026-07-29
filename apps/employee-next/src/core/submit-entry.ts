import {
  isEmployeeAuthSession,
  type EmployeeAuthSession,
} from "./auth";
import {
  EMPLOYEE_API_CLIENT_ERROR_CODES,
  isEmployeeApiJsonValue,
  isEmployeeApiRequest,
  isEmployeeApiResponse,
  type EmployeeApiClient,
  type EmployeeApiJsonValue,
  type EmployeeApiRequest,
  type EmployeeApiResponse,
} from "./api-client";
import {
  hasBlockingValidationIssue,
  isEmployeeEventId,
  type EmployeeEventContract,
  type EmployeeEventId,
  type EventValidationIssue,
} from "./event-contract";

export const EMPLOYEE_SUBMIT_ENTRY_STATUSES = Object.freeze([
  "IDLE",
  "VALIDATING",
  "BUILDING_REQUEST",
  "SUBMITTING",
  "SYNCED",
  "ERROR",
] as const);

export type EmployeeSubmitEntryStatus =
  (typeof EMPLOYEE_SUBMIT_ENTRY_STATUSES)[number];

export const EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES = Object.freeze([
  "INVALID_API_CLIENT",
  "INVALID_AUTH_SESSION",
  "INVALID_EVENT_CONTRACT",
  "INVALID_DRAFT",
  "INVALID_REQUEST_BUILDER",
  "VALIDATION_BLOCKED",
  "BUILD_SUBMISSION_FAILED",
  "INVALID_SUBMISSION",
  "REQUEST_BUILD_FAILED",
  "INVALID_API_REQUEST",
  "API_REQUEST_FAILED",
  "INVALID_API_RESULT",
  "SUBMIT_IN_PROGRESS",
  "UNSAFE_ERROR_ECHO",
] as const);

export type EmployeeSubmitEntryErrorCode =
  (typeof EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES)[number];

export interface EmployeeSubmitEntryContext<
  TSubmission extends object = Readonly<Record<string, EmployeeApiJsonValue>>,
> {
  readonly session: EmployeeAuthSession;
  readonly eventId: EmployeeEventId;
  readonly submission: Readonly<TSubmission>;
}

export type EmployeeSubmitEntryRequestBuilder<
  TSubmission extends object = Readonly<Record<string, EmployeeApiJsonValue>>,
> = (
  context: EmployeeSubmitEntryContext<TSubmission>,
) => EmployeeApiRequest;

export interface EmployeeSubmitEntryRequest<
  TDraft extends object = Readonly<Record<string, EmployeeApiJsonValue>>,
  TSubmission extends object = Readonly<Record<string, EmployeeApiJsonValue>>,
> {
  readonly session: EmployeeAuthSession;
  readonly contract: EmployeeEventContract<TDraft, TSubmission>;
  readonly draft: Readonly<TDraft>;
  readonly buildApiRequest: EmployeeSubmitEntryRequestBuilder<TSubmission>;
}

export type EmployeeSubmitEntryState =
  | Readonly<{ status: "IDLE" }>
  | Readonly<{ status: "VALIDATING"; eventId: EmployeeEventId }>
  | Readonly<{ status: "BUILDING_REQUEST"; eventId: EmployeeEventId }>
  | Readonly<{ status: "SUBMITTING"; eventId: EmployeeEventId }>
  | Readonly<{ status: "SYNCED"; eventId: EmployeeEventId }>
  | Readonly<{
    status: "ERROR";
    errorCode: EmployeeSubmitEntryErrorCode;
    eventId?: EmployeeEventId;
  }>;

export type EmployeeSubmitEntryResult =
  | Readonly<{
    ok: true;
    eventId: EmployeeEventId;
    response: EmployeeApiResponse;
  }>
  | Readonly<{
    ok: false;
    errorCode: EmployeeSubmitEntryErrorCode;
    eventId?: EmployeeEventId;
  }>;

export interface EmployeeSubmitEntryController {
  getState(): EmployeeSubmitEntryState;
  submit<TDraft extends object, TSubmission extends object>(
    request: EmployeeSubmitEntryRequest<TDraft, TSubmission>,
  ): Promise<EmployeeSubmitEntryResult>;
}

export function isEmployeeSubmitEntryStatus(
  value: unknown,
): value is EmployeeSubmitEntryStatus {
  return (
    typeof value === "string"
    && EMPLOYEE_SUBMIT_ENTRY_STATUSES.some((status) => status === value)
  );
}

function isPlainObject(
  value: object,
): value is Readonly<Record<string, unknown>> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): boolean {
  return (
    Object.getOwnPropertySymbols(value).length === 0
    && Object.keys(value).every(
      (key) => allowed.some((candidate) => candidate === key),
    )
  );
}

function isEmployeeEventContract(
  value: unknown,
): value is EmployeeEventContract<object, object> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const contract = value as Readonly<Record<string, unknown>>;
  return (
    isEmployeeEventId(contract.eventId)
    && typeof contract.displayName === "string"
    && contract.displayName.trim().length > 0
    && typeof contract.createInitialDraft === "function"
    && typeof contract.validateDraft === "function"
    && typeof contract.buildSubmission === "function"
  );
}

function isDraftObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && isPlainObject(value)
    && isEmployeeApiJsonValue(value)
  );
}

function requestError(
  value: unknown,
): EmployeeSubmitEntryErrorCode | undefined {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return "INVALID_AUTH_SESSION";
  }
  const request = value as Readonly<Record<string, unknown>>;
  if (
    !hasOnlyKeys(
      request,
      ["session", "contract", "draft", "buildApiRequest"],
    )
  ) {
    return "INVALID_EVENT_CONTRACT";
  }
  if (!isEmployeeAuthSession(request.session)) {
    return "INVALID_AUTH_SESSION";
  }
  if (!isEmployeeEventContract(request.contract)) {
    return "INVALID_EVENT_CONTRACT";
  }
  if (!isDraftObject(request.draft)) {
    return "INVALID_DRAFT";
  }
  if (typeof request.buildApiRequest !== "function") {
    return "INVALID_REQUEST_BUILDER";
  }
  return undefined;
}

export function isEmployeeSubmitEntryRequest(
  value: unknown,
): value is EmployeeSubmitEntryRequest {
  return requestError(value) === undefined;
}

function cloneJson(value: EmployeeApiJsonValue): EmployeeApiJsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJson(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneJson(item)]),
    );
  }
  return value;
}

function freezeJson(value: EmployeeApiJsonValue): EmployeeApiJsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeJson(item)));
  }
  if (value !== null && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, freezeJson(item)]),
      ),
    );
  }
  return value;
}

function snapshotJson(value: EmployeeApiJsonValue): EmployeeApiJsonValue {
  return freezeJson(cloneJson(value));
}

function snapshotSession(session: EmployeeAuthSession): EmployeeAuthSession {
  return Object.freeze({
    user: Object.freeze({
      employeeId: session.user.employeeId,
      displayName: session.user.displayName,
      role: session.user.role,
    }),
  });
}

function snapshotRequest(request: EmployeeApiRequest): EmployeeApiRequest {
  const headers = request.headers === undefined
    ? undefined
    : Object.freeze({ ...request.headers });
  if (request.method === "GET") {
    return Object.freeze({
      method: request.method,
      path: request.path,
      ...(headers === undefined ? {} : { headers }),
    });
  }
  const body = request.body === undefined
    ? undefined
    : snapshotJson(request.body);
  return Object.freeze({
    method: request.method,
    path: request.path,
    ...(headers === undefined ? {} : { headers }),
    ...(body === undefined ? {} : { body }),
  });
}

function snapshotResponse(response: EmployeeApiResponse): EmployeeApiResponse {
  const headers = response.headers === undefined
    ? undefined
    : Object.freeze({ ...response.headers });
  const body = response.body === undefined
    ? undefined
    : snapshotJson(response.body);
  return Object.freeze({
    status: response.status,
    ...(headers === undefined ? {} : { headers }),
    ...(body === undefined ? {} : { body }),
  });
}

function isValidationIssue(value: unknown): value is EventValidationIssue {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const issue = value as Readonly<Record<string, unknown>>;
  return (
    typeof issue.code === "string"
    && issue.code.length > 0
    && typeof issue.message === "string"
    && issue.message.length > 0
    && (issue.severity === "ERROR" || issue.severity === "WARNING")
    && (
      issue.field === undefined
      || typeof issue.field === "string"
    )
  );
}

function isValidationIssues(
  value: unknown,
): value is readonly EventValidationIssue[] {
  return Array.isArray(value) && value.every((issue) => isValidationIssue(issue));
}

function isEmployeeApiClient(value: unknown): value is EmployeeApiClient {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const client = value as Readonly<Record<string, unknown>>;
  return typeof client.request === "function";
}

function idleState(): EmployeeSubmitEntryState {
  return Object.freeze({ status: "IDLE" });
}

function progressState(
  status: "VALIDATING" | "BUILDING_REQUEST" | "SUBMITTING",
  eventId: EmployeeEventId,
): EmployeeSubmitEntryState {
  return Object.freeze({ status, eventId });
}

function syncedState(
  eventId: EmployeeEventId,
): EmployeeSubmitEntryState {
  return Object.freeze({ status: "SYNCED", eventId });
}

function errorState(
  errorCode: EmployeeSubmitEntryErrorCode,
  eventId?: EmployeeEventId,
): EmployeeSubmitEntryState {
  return Object.freeze({
    status: "ERROR",
    errorCode,
    ...(eventId === undefined ? {} : { eventId }),
  });
}

function failure(
  errorCode: EmployeeSubmitEntryErrorCode,
  eventId?: EmployeeEventId,
): EmployeeSubmitEntryResult {
  return Object.freeze({
    ok: false,
    errorCode,
    ...(eventId === undefined ? {} : { eventId }),
  });
}

function hasExactApiFailureShape(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const result = value as Readonly<Record<string, unknown>>;
  return (
    hasOnlyKeys(result, ["ok", "errorCode"])
    && result.ok === false
    && typeof result.errorCode === "string"
    && EMPLOYEE_API_CLIENT_ERROR_CODES.some(
      (errorCode) => errorCode === result.errorCode,
    )
  );
}

function hasExactApiSuccessShape(
  value: unknown,
): value is Readonly<{ ok: true; response: EmployeeApiResponse }> {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const result = value as Readonly<Record<string, unknown>>;
  return (
    hasOnlyKeys(result, ["ok", "response"])
    && result.ok === true
    && isEmployeeApiResponse(result.response)
  );
}

function hasUnsafeApiEcho(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const keys = [
    ...Object.keys(value),
    ...Object.getOwnPropertySymbols(value).map((symbol) => String(symbol)),
  ];
  return keys.some((key) =>
    /body|headers|detail|message|exception|token|secret|cookie|authorization/iu
      .test(key)
  );
}

export function createEmployeeSubmitEntryController(
  apiClient: EmployeeApiClient,
): EmployeeSubmitEntryController {
  const clientValid = isEmployeeApiClient(apiClient);
  let state: EmployeeSubmitEntryState = idleState();
  let inProgress = false;

  const controller: EmployeeSubmitEntryController = {
    getState(): EmployeeSubmitEntryState {
      return state;
    },

    async submit<TDraft extends object, TSubmission extends object>(
      request: EmployeeSubmitEntryRequest<TDraft, TSubmission>,
    ): Promise<EmployeeSubmitEntryResult> {
      if (inProgress) {
        return failure("SUBMIT_IN_PROGRESS");
      }
      if (!clientValid) {
        state = errorState("INVALID_API_CLIENT");
        return failure("INVALID_API_CLIENT");
      }

      const validationError = requestError(request);
      if (validationError !== undefined) {
        state = errorState(validationError);
        return failure(validationError);
      }

      const eventId = request.contract.eventId;
      const sessionSnapshot = snapshotSession(request.session);
      const draftSnapshot = snapshotJson(
        request.draft as EmployeeApiJsonValue,
      ) as Readonly<TDraft>;
      const validateDraft = request.contract.validateDraft;
      const buildSubmission = request.contract.buildSubmission;
      const buildApiRequest = request.buildApiRequest;

      inProgress = true;
      try {
        state = progressState("VALIDATING", eventId);
        let issuesValue: unknown;
        try {
          issuesValue = validateDraft(draftSnapshot);
        } catch {
          state = errorState("VALIDATION_BLOCKED", eventId);
          return failure("VALIDATION_BLOCKED", eventId);
        }
        if (!isValidationIssues(issuesValue)) {
          state = errorState("INVALID_EVENT_CONTRACT", eventId);
          return failure("INVALID_EVENT_CONTRACT", eventId);
        }
        if (hasBlockingValidationIssue(issuesValue)) {
          state = errorState("VALIDATION_BLOCKED", eventId);
          return failure("VALIDATION_BLOCKED", eventId);
        }

        state = progressState("BUILDING_REQUEST", eventId);
        let submissionValue: unknown;
        try {
          submissionValue = buildSubmission(draftSnapshot);
        } catch {
          state = errorState("BUILD_SUBMISSION_FAILED", eventId);
          return failure("BUILD_SUBMISSION_FAILED", eventId);
        }
        if (
          typeof submissionValue !== "object"
          || submissionValue === null
          || Array.isArray(submissionValue)
          || !isEmployeeApiJsonValue(submissionValue)
        ) {
          state = errorState("INVALID_SUBMISSION", eventId);
          return failure("INVALID_SUBMISSION", eventId);
        }
        const submissionSnapshot = snapshotJson(
          submissionValue,
        ) as Readonly<TSubmission>;
        const context: EmployeeSubmitEntryContext<TSubmission> = Object.freeze({
          session: sessionSnapshot,
          eventId,
          submission: submissionSnapshot,
        });

        let apiRequestValue: unknown;
        try {
          apiRequestValue = buildApiRequest(context);
        } catch {
          state = errorState("REQUEST_BUILD_FAILED", eventId);
          return failure("REQUEST_BUILD_FAILED", eventId);
        }
        if (
          !isEmployeeApiRequest(apiRequestValue)
          || apiRequestValue.method !== "POST"
        ) {
          state = errorState("INVALID_API_REQUEST", eventId);
          return failure("INVALID_API_REQUEST", eventId);
        }
        const apiRequestSnapshot = snapshotRequest(apiRequestValue);

        state = progressState("SUBMITTING", eventId);
        let apiResult: unknown;
        try {
          apiResult = await apiClient.request(apiRequestSnapshot);
        } catch {
          state = errorState("API_REQUEST_FAILED", eventId);
          return failure("API_REQUEST_FAILED", eventId);
        }
        if (hasExactApiFailureShape(apiResult)) {
          state = errorState("API_REQUEST_FAILED", eventId);
          return failure("API_REQUEST_FAILED", eventId);
        }
        if (!hasExactApiSuccessShape(apiResult)) {
          const errorCode = hasUnsafeApiEcho(apiResult)
            ? "UNSAFE_ERROR_ECHO"
            : "INVALID_API_RESULT";
          state = errorState(errorCode, eventId);
          return failure(errorCode, eventId);
        }

        const response = snapshotResponse(apiResult.response);
        state = syncedState(eventId);
        return Object.freeze({
          ok: true,
          eventId,
          response,
        });
      } finally {
        inProgress = false;
      }
    },
  };

  return Object.freeze(controller);
}
