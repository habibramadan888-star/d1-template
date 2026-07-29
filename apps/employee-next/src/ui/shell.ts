import {
  isEmployeeAuthSession,
  isEmployeeAuthStatus,
  type EmployeeAuthRole,
  type EmployeeAuthState,
  type EmployeeAuthStatus,
} from "../core/auth";
import {
  EMPLOYEE_EVENT_IDS,
  isEmployeeEventId,
  type EmployeeEventId,
} from "../core/event-contract";
import type {
  EmployeeEventRegistry,
  EmployeeEventRegistryContract,
} from "../core/event-registry";
import {
  EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES,
  isEmployeeSubmitEntryStatus,
  type EmployeeSubmitEntryErrorCode,
  type EmployeeSubmitEntryState,
  type EmployeeSubmitEntryStatus,
} from "../core/submit-entry";

export const EMPLOYEE_UI_SHELL_STATUSES = Object.freeze([
  "READY",
  "RENDERING",
  "ERROR",
] as const);

export type EmployeeUiShellStatus =
  (typeof EMPLOYEE_UI_SHELL_STATUSES)[number];

export const EMPLOYEE_UI_SHELL_ERROR_CODES = Object.freeze([
  "INVALID_REGISTRY",
  "INVALID_RENDER_PORT",
  "INVALID_AUTH_STATE",
  "INVALID_SUBMIT_STATE",
  "INVALID_EVENT_SELECTION",
  "RENDER_FAILED",
  "UNSAFE_ERROR_ECHO",
] as const);

export type EmployeeUiShellErrorCode =
  (typeof EMPLOYEE_UI_SHELL_ERROR_CODES)[number];

export interface EmployeeUiShellEventOption {
  readonly eventId: EmployeeEventId;
  readonly displayName: string;
  readonly selected: boolean;
}

export interface EmployeeUiShellAuthSummary {
  readonly status: EmployeeAuthStatus;
  readonly employeeId?: string;
  readonly displayName?: string;
  readonly role?: EmployeeAuthRole;
}

export interface EmployeeUiShellSubmitSummary {
  readonly status: EmployeeSubmitEntryStatus;
  readonly errorCode?: EmployeeSubmitEntryErrorCode;
  readonly eventId?: EmployeeEventId;
}

export interface EmployeeUiShellViewModel {
  readonly status: EmployeeUiShellStatus;
  readonly eventOptions: readonly EmployeeUiShellEventOption[];
  readonly selectedEventId?: EmployeeEventId;
  readonly auth: EmployeeUiShellAuthSummary;
  readonly submit: EmployeeUiShellSubmitSummary;
  readonly canSubmit: boolean;
  readonly errorCode?: EmployeeUiShellErrorCode;
}

export interface EmployeeUiShellRenderPort {
  render(view: EmployeeUiShellViewModel): void | Promise<void>;
}

export interface EmployeeUiShellControllerOptions {
  readonly registry: EmployeeEventRegistry;
  readonly render: EmployeeUiShellRenderPort;
  readonly initialSelectedEventId?: EmployeeEventId;
  readonly initialAuthState?: EmployeeAuthState;
  readonly initialSubmitState?: EmployeeSubmitEntryState;
}

export type EmployeeUiShellResult =
  | Readonly<{ ok: true; view: EmployeeUiShellViewModel }>
  | Readonly<{
    ok: false;
    errorCode: EmployeeUiShellErrorCode;
    view: EmployeeUiShellViewModel;
  }>;

export interface EmployeeUiShellController {
  getView(): EmployeeUiShellViewModel;
  selectEvent(value: unknown): EmployeeUiShellResult;
  setAuthState(value: unknown): EmployeeUiShellResult;
  setSubmitState(value: unknown): EmployeeUiShellResult;
  render(): Promise<EmployeeUiShellResult>;
}

export function isEmployeeUiShellStatus(
  value: unknown,
): value is EmployeeUiShellStatus {
  return (
    typeof value === "string"
    && EMPLOYEE_UI_SHELL_STATUSES.some((status) => status === value)
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

function isEmployeeUiShellErrorCode(
  value: unknown,
): value is EmployeeUiShellErrorCode {
  return (
    typeof value === "string"
    && EMPLOYEE_UI_SHELL_ERROR_CODES.some((errorCode) => errorCode === value)
  );
}

function isSubmitErrorCode(
  value: unknown,
): value is EmployeeSubmitEntryErrorCode {
  return (
    typeof value === "string"
    && EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES.some(
      (errorCode) => errorCode === value,
    )
  );
}

function isAuthState(value: unknown): value is EmployeeAuthState {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const state = value as Readonly<Record<string, unknown>>;
  if (!isEmployeeAuthStatus(state.status)) {
    return false;
  }
  if (state.status === "AUTHENTICATED") {
    return (
      hasOnlyKeys(state, ["status", "session"])
      && isEmployeeAuthSession(state.session)
    );
  }
  if (state.status === "ERROR") {
    return (
      hasOnlyKeys(state, ["status", "errorCode"])
      && typeof state.errorCode === "string"
      && state.errorCode.length > 0
    );
  }
  return hasOnlyKeys(state, ["status"]);
}

function isSubmitState(value: unknown): value is EmployeeSubmitEntryState {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const state = value as Readonly<Record<string, unknown>>;
  if (!isEmployeeSubmitEntryStatus(state.status)) {
    return false;
  }
  if (state.status === "IDLE") {
    return hasOnlyKeys(state, ["status"]);
  }
  if (state.status === "ERROR") {
    return (
      hasOnlyKeys(state, ["status", "errorCode", "eventId"])
      && isSubmitErrorCode(state.errorCode)
      && (
        state.eventId === undefined
        || isEmployeeEventId(state.eventId)
      )
    );
  }
  return (
    hasOnlyKeys(state, ["status", "eventId"])
    && isEmployeeEventId(state.eventId)
  );
}

function isEventOption(value: unknown): value is EmployeeUiShellEventOption {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const option = value as Readonly<Record<string, unknown>>;
  return (
    hasOnlyKeys(option, ["eventId", "displayName", "selected"])
    && isEmployeeEventId(option.eventId)
    && typeof option.displayName === "string"
    && option.displayName.length > 0
    && typeof option.selected === "boolean"
  );
}

function isAuthSummary(
  value: unknown,
): value is EmployeeUiShellAuthSummary {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const summary = value as Readonly<Record<string, unknown>>;
  if (
    !hasOnlyKeys(
      summary,
      ["status", "employeeId", "displayName", "role"],
    )
    || !isEmployeeAuthStatus(summary.status)
  ) {
    return false;
  }
  if (summary.status === "AUTHENTICATED") {
    return isEmployeeAuthSession({
      user: {
        employeeId: summary.employeeId,
        displayName: summary.displayName,
        role: summary.role,
      },
    });
  }
  return (
    summary.employeeId === undefined
    && summary.displayName === undefined
    && summary.role === undefined
  );
}

function isSubmitSummary(
  value: unknown,
): value is EmployeeUiShellSubmitSummary {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const summary = value as Readonly<Record<string, unknown>>;
  if (
    !hasOnlyKeys(summary, ["status", "errorCode", "eventId"])
    || !isEmployeeSubmitEntryStatus(summary.status)
  ) {
    return false;
  }
  if (summary.status === "IDLE") {
    return summary.errorCode === undefined && summary.eventId === undefined;
  }
  if (summary.status === "ERROR") {
    return (
      isSubmitErrorCode(summary.errorCode)
      && (
        summary.eventId === undefined
        || isEmployeeEventId(summary.eventId)
      )
    );
  }
  return (
    summary.errorCode === undefined
    && isEmployeeEventId(summary.eventId)
  );
}

export function isEmployeeUiShellViewModel(
  value: unknown,
): value is EmployeeUiShellViewModel {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const view = value as Readonly<Record<string, unknown>>;
  if (
    !hasOnlyKeys(
      view,
      [
        "status",
        "eventOptions",
        "selectedEventId",
        "auth",
        "submit",
        "canSubmit",
        "errorCode",
      ],
    )
    || !isEmployeeUiShellStatus(view.status)
    || !Array.isArray(view.eventOptions)
    || view.eventOptions.length !== EMPLOYEE_EVENT_IDS.length
    || !view.eventOptions.every((option) => isEventOption(option))
    || typeof view.canSubmit !== "boolean"
    || !isAuthSummary(view.auth)
    || !isSubmitSummary(view.submit)
  ) {
    return false;
  }
  if (
    view.selectedEventId !== undefined
    && !isEmployeeEventId(view.selectedEventId)
  ) {
    return false;
  }
  if (view.status === "ERROR") {
    return isEmployeeUiShellErrorCode(view.errorCode);
  }
  return view.errorCode === undefined;
}

function isRegistry(
  value: unknown,
): value is EmployeeEventRegistry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const registry = value as Readonly<Record<string, unknown>>;
  if (
    !Array.isArray(registry.eventIds)
    || !Array.isArray(registry.contracts)
    || typeof registry.get !== "function"
    || registry.eventIds.length !== EMPLOYEE_EVENT_IDS.length
    || registry.contracts.length !== EMPLOYEE_EVENT_IDS.length
  ) {
    return false;
  }

  const seen = new Set<string>();
  for (let index = 0; index < EMPLOYEE_EVENT_IDS.length; index += 1) {
    const expectedEventId = EMPLOYEE_EVENT_IDS[index];
    const eventId = registry.eventIds[index];
    const contract = registry.contracts[index] as
      | EmployeeEventRegistryContract
      | undefined;
    if (
      eventId !== expectedEventId
      || !isEmployeeEventId(eventId)
      || seen.has(eventId)
      || typeof contract !== "object"
      || contract === null
      || contract.eventId !== eventId
      || typeof contract.displayName !== "string"
      || contract.displayName.trim().length === 0
    ) {
      return false;
    }
    seen.add(eventId);
    try {
      const resolved = (registry.get as EmployeeEventRegistry["get"])(eventId);
      if (
        resolved === undefined
        || resolved.eventId !== eventId
        || resolved.displayName !== contract.displayName
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}

function isRenderPort(value: unknown): value is EmployeeUiShellRenderPort {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const port = value as Readonly<Record<string, unknown>>;
  return typeof port.render === "function";
}

function authSummary(
  state: EmployeeAuthState,
): EmployeeUiShellAuthSummary {
  if (state.status !== "AUTHENTICATED") {
    return Object.freeze({ status: state.status });
  }
  return Object.freeze({
    status: state.status,
    employeeId: state.session.user.employeeId,
    displayName: state.session.user.displayName,
    role: state.session.user.role,
  });
}

function submitSummary(
  state: EmployeeSubmitEntryState,
): EmployeeUiShellSubmitSummary {
  if (state.status === "IDLE") {
    return Object.freeze({ status: state.status });
  }
  if (state.status === "ERROR") {
    return Object.freeze({
      status: state.status,
      errorCode: state.errorCode,
      ...(state.eventId === undefined ? {} : { eventId: state.eventId }),
    });
  }
  if (state.status === "VALIDATING") {
    return Object.freeze({
      status: state.status,
      eventId: state.eventId,
    });
  }
  if (state.status === "BUILDING_REQUEST") {
    return Object.freeze({
      status: state.status,
      eventId: state.eventId,
    });
  }
  if (state.status === "SUBMITTING") {
    return Object.freeze({
      status: state.status,
      eventId: state.eventId,
    });
  }
  return Object.freeze({
    status: "SYNCED",
    eventId: state.eventId,
  });
}

function snapshotAuthState(state: EmployeeAuthState): EmployeeAuthState {
  if (state.status === "AUTHENTICATED") {
    return Object.freeze({
      status: state.status,
      session: Object.freeze({
        user: Object.freeze({
          employeeId: state.session.user.employeeId,
          displayName: state.session.user.displayName,
          role: state.session.user.role,
        }),
      }),
    });
  }
  if (state.status === "ERROR") {
    return Object.freeze({
      status: state.status,
      errorCode: state.errorCode,
    });
  }
  return Object.freeze({ status: state.status });
}

function snapshotSubmitState(
  state: EmployeeSubmitEntryState,
): EmployeeSubmitEntryState {
  if (state.status === "IDLE") {
    return Object.freeze({ status: state.status });
  }
  if (state.status === "ERROR") {
    return Object.freeze({
      status: state.status,
      errorCode: state.errorCode,
      ...(state.eventId === undefined ? {} : { eventId: state.eventId }),
    });
  }
  if (state.status === "VALIDATING") {
    return Object.freeze({
      status: "VALIDATING",
      eventId: state.eventId,
    });
  }
  if (state.status === "BUILDING_REQUEST") {
    return Object.freeze({
      status: "BUILDING_REQUEST",
      eventId: state.eventId,
    });
  }
  if (state.status === "SUBMITTING") {
    return Object.freeze({
      status: "SUBMITTING",
      eventId: state.eventId,
    });
  }
  return Object.freeze({
    status: "SYNCED",
    eventId: state.eventId,
  });
}

function canSubmit(
  selectedEventId: EmployeeEventId | undefined,
  authState: EmployeeAuthState,
  submitState: EmployeeSubmitEntryState,
): boolean {
  return (
    selectedEventId !== undefined
    && authState.status === "AUTHENTICATED"
    && !(
      submitState.status === "VALIDATING"
      || submitState.status === "BUILDING_REQUEST"
      || submitState.status === "SUBMITTING"
    )
  );
}

function eventOptions(
  contracts: readonly EmployeeEventRegistryContract[],
  selectedEventId: EmployeeEventId | undefined,
): readonly EmployeeUiShellEventOption[] {
  return Object.freeze(
    contracts.map((contract) =>
      Object.freeze({
        eventId: contract.eventId,
        displayName: contract.displayName,
        selected: contract.eventId === selectedEventId,
      })
    ),
  );
}

function viewSnapshot(
  status: EmployeeUiShellStatus,
  contracts: readonly EmployeeEventRegistryContract[],
  selectedEventId: EmployeeEventId | undefined,
  authState: EmployeeAuthState,
  submitState: EmployeeSubmitEntryState,
  errorCode?: EmployeeUiShellErrorCode,
): EmployeeUiShellViewModel {
  return Object.freeze({
    status,
    eventOptions: eventOptions(contracts, selectedEventId),
    ...(selectedEventId === undefined ? {} : { selectedEventId }),
    auth: authSummary(authState),
    submit: submitSummary(submitState),
    canSubmit: canSubmit(selectedEventId, authState, submitState),
    ...(errorCode === undefined ? {} : { errorCode }),
  });
}

function success(view: EmployeeUiShellViewModel): EmployeeUiShellResult {
  return Object.freeze({ ok: true, view });
}

function failure(
  errorCode: EmployeeUiShellErrorCode,
  view: EmployeeUiShellViewModel,
): EmployeeUiShellResult {
  return Object.freeze({ ok: false, errorCode, view });
}

function factoryError(errorCode: EmployeeUiShellErrorCode): never {
  throw new Error(errorCode);
}

export function createEmployeeUiShellController(
  options: EmployeeUiShellControllerOptions,
): EmployeeUiShellController {
  if (
    typeof options !== "object"
    || options === null
    || !isRegistry(options.registry)
  ) {
    return factoryError("INVALID_REGISTRY");
  }
  if (!isRenderPort(options.render)) {
    return factoryError("INVALID_RENDER_PORT");
  }
  if (
    options.initialSelectedEventId !== undefined
    && (
      !isEmployeeEventId(options.initialSelectedEventId)
      || options.registry.get(options.initialSelectedEventId) === undefined
    )
  ) {
    return factoryError("INVALID_EVENT_SELECTION");
  }

  const initialAuthState = options.initialAuthState
    ?? Object.freeze({ status: "SIGNED_OUT" as const });
  if (!isAuthState(initialAuthState)) {
    return factoryError("INVALID_AUTH_STATE");
  }
  const initialSubmitState = options.initialSubmitState
    ?? Object.freeze({ status: "IDLE" as const });
  if (!isSubmitState(initialSubmitState)) {
    return factoryError("INVALID_SUBMIT_STATE");
  }

  const contracts = Object.freeze(
    options.registry.contracts.map((contract) =>
      Object.freeze({
        eventId: contract.eventId,
        displayName: contract.displayName,
      }) as EmployeeEventRegistryContract
    ),
  );
  const renderPort = options.render;
  let selectedEventId = options.initialSelectedEventId;
  let authState = snapshotAuthState(initialAuthState);
  let submitState = snapshotSubmitState(initialSubmitState);
  let shellStatus: EmployeeUiShellStatus = "READY";
  let shellError: EmployeeUiShellErrorCode | undefined;

  function currentView(): EmployeeUiShellViewModel {
    return viewSnapshot(
      shellStatus,
      contracts,
      selectedEventId,
      authState,
      submitState,
      shellError,
    );
  }

  function setReady(): void {
    shellStatus = "READY";
    shellError = undefined;
  }

  function setError(
    errorCode: EmployeeUiShellErrorCode,
  ): EmployeeUiShellResult {
    shellStatus = "ERROR";
    shellError = errorCode;
    return failure(errorCode, currentView());
  }

  const controller: EmployeeUiShellController = {
    getView(): EmployeeUiShellViewModel {
      return currentView();
    },

    selectEvent(value: unknown): EmployeeUiShellResult {
      if (
        !isEmployeeEventId(value)
        || options.registry.get(value) === undefined
      ) {
        return setError("INVALID_EVENT_SELECTION");
      }
      selectedEventId = value;
      setReady();
      return success(currentView());
    },

    setAuthState(value: unknown): EmployeeUiShellResult {
      if (!isAuthState(value)) {
        return setError("INVALID_AUTH_STATE");
      }
      authState = snapshotAuthState(value);
      setReady();
      return success(currentView());
    },

    setSubmitState(value: unknown): EmployeeUiShellResult {
      if (!isSubmitState(value)) {
        return setError("INVALID_SUBMIT_STATE");
      }
      submitState = snapshotSubmitState(value);
      setReady();
      return success(currentView());
    },

    async render(): Promise<EmployeeUiShellResult> {
      shellStatus = "RENDERING";
      shellError = undefined;
      const renderingView = currentView();
      let renderResult: unknown;
      try {
        renderResult = await renderPort.render(renderingView);
      } catch {
        return setError("RENDER_FAILED");
      }
      if (renderResult !== undefined) {
        return setError("UNSAFE_ERROR_ECHO");
      }
      setReady();
      return success(currentView());
    },
  };

  return Object.freeze(controller);
}
