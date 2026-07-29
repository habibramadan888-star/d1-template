import {
  isEmployeeApiJsonValue,
} from "./core/api-client";
import type {
  EmployeeApiClient,
  EmployeeApiJsonValue,
  EmployeeApiRequest,
  EmployeeApiResponse,
} from "./core/api-client";
import {
  isEmployeeAuthSession,
} from "./core/auth";
import type {
  EmployeeAuthSession,
} from "./core/auth";
import {
  EMPLOYEE_EVENT_IDS,
  isEmployeeEventId,
} from "./core/event-contract";
import type {
  EmployeeEventId,
} from "./core/event-contract";
import type {
  EmployeeEventRegistry,
  EmployeeEventRegistryContract,
} from "./core/event-registry";
import {
  createEmployeeSubmitEntryController,
} from "./core/submit-entry";
import type {
  EmployeeSubmitEntryContext,
  EmployeeSubmitEntryErrorCode,
} from "./core/submit-entry";
import {
  createEmployeeSevenEventRegistry,
} from "./events";

export const EMPLOYEE_SUBMIT_FLOW_ERROR_CODES = Object.freeze([
  "INVALID_API_CLIENT",
  "INVALID_REGISTRY",
  "INVALID_REQUEST",
  "UNKNOWN_EVENT",
  "INVALID_REQUEST_BUILDER",
  "SUBMIT_ENTRY_FAILED",
  "SUBMIT_IN_PROGRESS",
  "UNSAFE_ERROR_ECHO",
] as const);

export type EmployeeSubmitFlowErrorCode =
  (typeof EMPLOYEE_SUBMIT_FLOW_ERROR_CODES)[number];

export type EmployeeSubmitFlowRequestBuilder<
  TSubmission extends object = object,
> = (
  context: EmployeeSubmitEntryContext<TSubmission>,
) => EmployeeApiRequest;

export interface EmployeeSubmitFlowRequest<
  TDraft extends object = Readonly<Record<string, EmployeeApiJsonValue>>,
  TSubmission extends object = object,
> {
  readonly session: EmployeeAuthSession;
  readonly eventId: EmployeeEventId;
  readonly draft: Readonly<TDraft>;
  readonly buildApiRequest: EmployeeSubmitFlowRequestBuilder<TSubmission>;
}

export interface EmployeeSubmitFlowOptions {
  readonly apiClient: EmployeeApiClient;
  readonly registry?: EmployeeEventRegistry;
}

export type EmployeeSubmitFlowState =
  | Readonly<{ status: "IDLE" }>
  | Readonly<{ status: "SUBMITTING"; eventId: EmployeeEventId }>
  | Readonly<{ status: "SYNCED"; eventId: EmployeeEventId }>
  | Readonly<{
    status: "ERROR";
    errorCode: EmployeeSubmitFlowErrorCode;
    eventId?: EmployeeEventId;
  }>;

export type EmployeeSubmitFlowResult =
  | Readonly<{
    ok: true;
    eventId: EmployeeEventId;
    response: EmployeeApiResponse;
  }>
  | Readonly<{
    ok: false;
    errorCode: EmployeeSubmitFlowErrorCode;
    eventId?: EmployeeEventId;
  }>;

export interface EmployeeSubmitFlowController {
  getState(): EmployeeSubmitFlowState;
  getEventIds(): readonly EmployeeEventId[];
  submit<TDraft extends object, TSubmission extends object>(
    request: EmployeeSubmitFlowRequest<TDraft, TSubmission>,
  ): Promise<EmployeeSubmitFlowResult>;
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

function isApiClient(value: unknown): value is EmployeeApiClient {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  return typeof candidate.request === "function";
}

function isRegistryContract(
  value: unknown,
  eventId: EmployeeEventId,
): value is EmployeeEventRegistryContract {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    candidate.eventId === eventId
    && typeof candidate.displayName === "string"
    && candidate.displayName.trim().length > 0
    && typeof candidate.createInitialDraft === "function"
    && typeof candidate.validateDraft === "function"
    && typeof candidate.buildSubmission === "function"
  );
}

function isRegistry(value: unknown): value is EmployeeEventRegistry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  if (
    !Array.isArray(candidate.eventIds)
    || !Array.isArray(candidate.contracts)
    || typeof candidate.get !== "function"
    || candidate.eventIds.length !== EMPLOYEE_EVENT_IDS.length
    || candidate.contracts.length !== EMPLOYEE_EVENT_IDS.length
  ) {
    return false;
  }

  for (const [index, eventId] of EMPLOYEE_EVENT_IDS.entries()) {
    if (
      candidate.eventIds[index] !== eventId
      || !isRegistryContract(candidate.contracts[index], eventId)
      || candidate.get(eventId) !== candidate.contracts[index]
    ) {
      return false;
    }
  }
  return true;
}

function isDraft(
  value: unknown,
): value is Readonly<Record<string, EmployeeApiJsonValue>> {
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
): EmployeeSubmitFlowErrorCode | undefined {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return "INVALID_REQUEST";
  }
  const request = value as Readonly<Record<string, unknown>>;
  if (
    !hasOnlyKeys(
      request,
      ["session", "eventId", "draft", "buildApiRequest"],
    )
    || !isEmployeeAuthSession(request.session)
    || !isDraft(request.draft)
  ) {
    return "INVALID_REQUEST";
  }
  if (typeof request.buildApiRequest !== "function") {
    return "INVALID_REQUEST_BUILDER";
  }
  if (!isEmployeeEventId(request.eventId)) {
    return typeof request.eventId === "string"
      ? "UNKNOWN_EVENT"
      : "INVALID_REQUEST";
  }
  return undefined;
}

export function isEmployeeSubmitFlowRequest(
  value: unknown,
): value is EmployeeSubmitFlowRequest {
  return requestError(value) === undefined;
}

function idleState(): EmployeeSubmitFlowState {
  return Object.freeze({ status: "IDLE" });
}

function progressState(eventId: EmployeeEventId): EmployeeSubmitFlowState {
  return Object.freeze({ status: "SUBMITTING", eventId });
}

function syncedState(eventId: EmployeeEventId): EmployeeSubmitFlowState {
  return Object.freeze({ status: "SYNCED", eventId });
}

function errorState(
  errorCode: EmployeeSubmitFlowErrorCode,
  eventId?: EmployeeEventId,
): EmployeeSubmitFlowState {
  return Object.freeze({
    status: "ERROR",
    errorCode,
    ...(eventId === undefined ? {} : { eventId }),
  });
}

function failure(
  errorCode: EmployeeSubmitFlowErrorCode,
  eventId?: EmployeeEventId,
): EmployeeSubmitFlowResult {
  return Object.freeze({
    ok: false,
    errorCode,
    ...(eventId === undefined ? {} : { eventId }),
  });
}

function mapSubmitEntryError(
  errorCode: EmployeeSubmitEntryErrorCode,
): EmployeeSubmitFlowErrorCode {
  if (errorCode === "SUBMIT_IN_PROGRESS") {
    return "SUBMIT_IN_PROGRESS";
  }
  if (errorCode === "UNSAFE_ERROR_ECHO") {
    return "UNSAFE_ERROR_ECHO";
  }
  return "SUBMIT_ENTRY_FAILED";
}

export function createEmployeeSubmitFlowController(
  options: EmployeeSubmitFlowOptions,
): EmployeeSubmitFlowController {
  const optionsValue = (
    typeof options === "object"
    && options !== null
    && isPlainObject(options)
  )
    ? options as Readonly<Record<string, unknown>>
    : undefined;
  const apiClientValue = optionsValue?.apiClient;
  const apiClientValid = isApiClient(apiClientValue);
  const registryValue = optionsValue?.registry === undefined
    ? createEmployeeSevenEventRegistry()
    : optionsValue.registry;
  const registryValid = isRegistry(registryValue);
  const submitEntryController = createEmployeeSubmitEntryController(
    apiClientValue as EmployeeApiClient,
  );
  const eventIds = Object.freeze(
    registryValid ? [...registryValue.eventIds] : [],
  );
  let state: EmployeeSubmitFlowState = idleState();
  let inProgress = false;

  const controller: EmployeeSubmitFlowController = {
    getState(): EmployeeSubmitFlowState {
      return state;
    },

    getEventIds(): readonly EmployeeEventId[] {
      return eventIds;
    },

    async submit<TDraft extends object, TSubmission extends object>(
      request: EmployeeSubmitFlowRequest<TDraft, TSubmission>,
    ): Promise<EmployeeSubmitFlowResult> {
      if (inProgress) {
        return failure("SUBMIT_IN_PROGRESS");
      }
      if (!apiClientValid) {
        state = errorState("INVALID_API_CLIENT");
        return failure("INVALID_API_CLIENT");
      }
      if (!registryValid) {
        state = errorState("INVALID_REGISTRY");
        return failure("INVALID_REGISTRY");
      }

      const validationError = requestError(request);
      if (validationError !== undefined) {
        state = errorState(validationError);
        return failure(validationError);
      }
      const eventId = request.eventId;
      const contract = registryValue.get(eventId);
      if (contract === undefined) {
        state = errorState("UNKNOWN_EVENT");
        return failure("UNKNOWN_EVENT");
      }

      inProgress = true;
      state = progressState(eventId);
      try {
        const result = await submitEntryController.submit({
          session: request.session,
          contract,
          draft: request.draft,
          buildApiRequest: request.buildApiRequest,
        });
        if (!result.ok) {
          const errorCode = mapSubmitEntryError(result.errorCode);
          state = errorState(errorCode, eventId);
          return failure(errorCode, eventId);
        }

        state = syncedState(eventId);
        return Object.freeze({
          ok: true,
          eventId,
          response: result.response,
        });
      } catch {
        state = errorState("SUBMIT_ENTRY_FAILED", eventId);
        return failure("SUBMIT_ENTRY_FAILED", eventId);
      } finally {
        inProgress = false;
      }
    },
  };

  return Object.freeze(controller);
}
