import {
  createEmployeeApiClient,
  isEmployeeApiJsonValue,
  isEmployeeApiRequest,
  type EmployeeApiJsonValue,
  type EmployeeApiRequest,
  type EmployeeApiResponse,
  type EmployeeApiTransport,
} from "./core/api-client";
import {
  isEmployeeAuthSession,
  type EmployeeAuthSession,
} from "./core/auth";
import {
  isEmployeeEventId,
  type EmployeeEventId,
} from "./core/event-contract";
import {
  createEmployeeSevenEventRegistry,
} from "./events";
import {
  createEmployeeSubmitFlowController,
  type EmployeeSubmitFlowRequestBuilder,
} from "./submit-flow";
import {
  createEmployeeUiShellController,
  type EmployeeUiShellController,
  type EmployeeUiShellViewModel,
} from "./ui/shell";

export const EMPLOYEE_NEXT_ROUTE_ERROR_CODES = Object.freeze([
  "INVALID_OPTIONS",
  "INVALID_RENDER_PORT",
  "INVALID_API_TRANSPORT",
  "INVALID_AUTH_SESSION",
  "INVALID_EVENT_SELECTION",
  "INVALID_DRAFT_INPUT",
  "ROUTE_NOT_READY",
  "SUBMIT_FLOW_FAILED",
  "RENDER_FAILED",
  "UNSAFE_ERROR_ECHO",
] as const);

export type EmployeeNextRouteErrorCode =
  (typeof EMPLOYEE_NEXT_ROUTE_ERROR_CODES)[number];

export interface EmployeeNextRouteRenderPort {
  render(view: EmployeeNextRouteView): void | Promise<void>;
}

export interface EmployeeNextRouteTransport extends EmployeeApiTransport {}

export interface EmployeeNextRouteOptions {
  readonly transport: EmployeeNextRouteTransport;
  readonly render: EmployeeNextRouteRenderPort;
  readonly buildApiRequest: EmployeeSubmitFlowRequestBuilder;
  readonly allowedSubmitPath?: string;
}

export type EmployeeNextRouteState =
  | Readonly<{
    status: "READY";
    selectedEventId?: EmployeeEventId;
    sessionReady: boolean;
    draftReady: boolean;
  }>
  | Readonly<{ status: "SUBMITTING"; eventId: EmployeeEventId }>
  | Readonly<{ status: "SYNCED"; eventId: EmployeeEventId }>
  | Readonly<{
    status: "ERROR";
    errorCode: EmployeeNextRouteErrorCode;
    eventId?: EmployeeEventId;
  }>;

export interface EmployeeNextRouteView {
  readonly state: EmployeeNextRouteState;
  readonly eventIds: readonly EmployeeEventId[];
  readonly shell: EmployeeUiShellViewModel;
}

export type EmployeeNextRouteResult =
  | Readonly<{
    ok: true;
    view: EmployeeNextRouteView;
    response?: EmployeeApiResponse;
  }>
  | Readonly<{
    ok: false;
    errorCode: EmployeeNextRouteErrorCode;
    view: EmployeeNextRouteView;
  }>;

export interface EmployeeNextRouteController {
  getState(): EmployeeNextRouteState;
  getEventIds(): readonly EmployeeEventId[];
  getView(): EmployeeNextRouteView;
  selectEvent(value: unknown): EmployeeNextRouteResult;
  setSession(value: unknown): EmployeeNextRouteResult;
  setDraft(value: unknown): EmployeeNextRouteResult;
  render(): Promise<EmployeeNextRouteResult>;
  submit(): Promise<EmployeeNextRouteResult>;
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

function isRenderPort(value: unknown): value is EmployeeNextRouteRenderPort {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return typeof (value as Readonly<Record<string, unknown>>).render === "function";
}

function isTransport(value: unknown): value is EmployeeNextRouteTransport {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return typeof (value as Readonly<Record<string, unknown>>).request === "function";
}

export function isEmployeeNextRouteOptions(
  value: unknown,
): value is EmployeeNextRouteOptions {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return false;
  }
  const options = value as Readonly<Record<string, unknown>>;
  return (
    hasOnlyKeys(
      options,
      ["transport", "render", "buildApiRequest", "allowedSubmitPath"],
    )
    && isTransport(options.transport)
    && isRenderPort(options.render)
    && typeof options.buildApiRequest === "function"
    && (
      options.allowedSubmitPath === undefined
      || (
        typeof options.allowedSubmitPath === "string"
        && options.allowedSubmitPath.startsWith("/")
        && !options.allowedSubmitPath.startsWith("//")
        && !options.allowedSubmitPath.includes("..")
      )
    )
  );
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

function snapshotDraft(
  draft: Readonly<Record<string, EmployeeApiJsonValue>>,
): Readonly<Record<string, EmployeeApiJsonValue>> {
  return freezeJson(cloneJson(draft)) as Readonly<
    Record<string, EmployeeApiJsonValue>
  >;
}

function snapshotSession(session: EmployeeAuthSession): EmployeeAuthSession {
  return Object.freeze({
    user: Object.freeze({
      employeeId: session.user.employeeId,
      displayName: session.user.displayName,
      role: session.user.role,
      ...(session.user.userid === undefined
        ? {}
        : { userid: session.user.userid }),
      ...(session.user.corpid === undefined
        ? {}
        : { corpid: session.user.corpid }),
    }),
  });
}

function readyState(
  selectedEventId: EmployeeEventId | undefined,
  sessionReady: boolean,
  draftReady: boolean,
): EmployeeNextRouteState {
  return Object.freeze({
    status: "READY",
    ...(selectedEventId === undefined ? {} : { selectedEventId }),
    sessionReady,
    draftReady,
  });
}

function progressState(eventId: EmployeeEventId): EmployeeNextRouteState {
  return Object.freeze({ status: "SUBMITTING", eventId });
}

function syncedState(eventId: EmployeeEventId): EmployeeNextRouteState {
  return Object.freeze({ status: "SYNCED", eventId });
}

function errorState(
  errorCode: EmployeeNextRouteErrorCode,
  eventId?: EmployeeEventId,
): EmployeeNextRouteState {
  return Object.freeze({
    status: "ERROR",
    errorCode,
    ...(eventId === undefined ? {} : { eventId }),
  });
}

function shellViewSnapshot(
  view: EmployeeUiShellViewModel,
): EmployeeUiShellViewModel {
  return Object.freeze({
    ...view,
    eventOptions: Object.freeze(
      view.eventOptions.map((option) => Object.freeze({ ...option })),
    ),
    auth: Object.freeze({ ...view.auth }),
    submit: Object.freeze({ ...view.submit }),
  });
}

function viewSnapshot(
  state: EmployeeNextRouteState,
  eventIds: readonly EmployeeEventId[],
  shell: EmployeeUiShellViewModel,
): EmployeeNextRouteView {
  return Object.freeze({
    state,
    eventIds,
    shell: shellViewSnapshot(shell),
  });
}

function success(
  view: EmployeeNextRouteView,
  response?: EmployeeApiResponse,
): EmployeeNextRouteResult {
  return Object.freeze({
    ok: true,
    view,
    ...(response === undefined ? {} : { response }),
  });
}

function failure(
  errorCode: EmployeeNextRouteErrorCode,
  view: EmployeeNextRouteView,
): EmployeeNextRouteResult {
  return Object.freeze({ ok: false, errorCode, view });
}

function blockedShellView(): EmployeeUiShellViewModel {
  return Object.freeze({
    status: "ERROR",
    eventOptions: Object.freeze([]),
    auth: Object.freeze({ status: "SIGNED_OUT" }),
    submit: Object.freeze({ status: "IDLE" }),
    canSubmit: false,
    errorCode: "INVALID_RENDER_PORT",
  });
}

function blockedController(
  errorCode: EmployeeNextRouteErrorCode,
): EmployeeNextRouteController {
  const state = errorState(errorCode);
  const eventIds = Object.freeze([]) as readonly EmployeeEventId[];
  const view = viewSnapshot(state, eventIds, blockedShellView());
  const result = failure(errorCode, view);
  return Object.freeze({
    getState: () => state,
    getEventIds: () => eventIds,
    getView: () => view,
    selectEvent: () => result,
    setSession: () => result,
    setDraft: () => result,
    render: async () => result,
    submit: async () => result,
  });
}

function optionsError(value: unknown): EmployeeNextRouteErrorCode | undefined {
  if (typeof value !== "object" || value === null || !isPlainObject(value)) {
    return "INVALID_OPTIONS";
  }
  const options = value as Readonly<Record<string, unknown>>;
  if (
    !hasOnlyKeys(
      options,
      ["transport", "render", "buildApiRequest", "allowedSubmitPath"],
    )
  ) {
    return "INVALID_OPTIONS";
  }
  if (!isRenderPort(options.render)) {
    return "INVALID_RENDER_PORT";
  }
  if (!isTransport(options.transport)) {
    return "INVALID_API_TRANSPORT";
  }
  if (typeof options.buildApiRequest !== "function") {
    return "INVALID_OPTIONS";
  }
  if (
    options.allowedSubmitPath !== undefined
    && (
      typeof options.allowedSubmitPath !== "string"
      || !options.allowedSubmitPath.startsWith("/")
      || options.allowedSubmitPath.startsWith("//")
      || options.allowedSubmitPath.includes("..")
    )
  ) {
    return "INVALID_OPTIONS";
  }
  return undefined;
}

function isSafeLocalPostRequest(
  value: unknown,
  allowedSubmitPath: string | undefined,
): value is EmployeeApiRequest {
  return (
    isEmployeeApiRequest(value)
    && value.method === "POST"
    && (
      allowedSubmitPath === undefined
        ? value.path.startsWith("/unit-test-")
        : value.path === allowedSubmitPath
    )
  );
}

function submitStateError(
  eventId?: EmployeeEventId,
): Readonly<{
  status: "ERROR";
  errorCode: "API_REQUEST_FAILED";
  eventId?: EmployeeEventId;
}> {
  return Object.freeze({
    status: "ERROR",
    errorCode: "API_REQUEST_FAILED",
    ...(eventId === undefined ? {} : { eventId }),
  });
}

export function createEmployeeNextRouteController(
  options: EmployeeNextRouteOptions,
): EmployeeNextRouteController {
  const initializationError = optionsError(options);
  if (initializationError !== undefined) {
    return blockedController(initializationError);
  }

  const registry = createEmployeeSevenEventRegistry();
  const apiClient = createEmployeeApiClient(options.transport);
  const submitFlow = createEmployeeSubmitFlowController({
    apiClient,
    registry,
  });
  const eventIds = Object.freeze([...registry.eventIds]);
  const renderPort = options.render;
  const allowedSubmitPath = options.allowedSubmitPath;
  let selectedEventId: EmployeeEventId | undefined;
  let session: EmployeeAuthSession | undefined;
  let draft: Readonly<Record<string, EmployeeApiJsonValue>> | undefined;
  let state: EmployeeNextRouteState = readyState(
    selectedEventId,
    false,
    false,
  );
  let shell: EmployeeUiShellController;
  let unsafeRenderEcho = false;

  function currentView(
    shellView: EmployeeUiShellViewModel = shell.getView(),
  ): EmployeeNextRouteView {
    return viewSnapshot(state, eventIds, shellView);
  }

  shell = createEmployeeUiShellController({
    registry,
    render: Object.freeze({
      async render(shellView: EmployeeUiShellViewModel): Promise<void> {
        const renderResult = await renderPort.render(currentView(shellView));
        if (renderResult !== undefined) {
          unsafeRenderEcho = true;
          throw new Error("UNSAFE_ERROR_ECHO");
        }
      },
    }),
  });

  function setReady(): void {
    state = readyState(
      selectedEventId,
      session !== undefined,
      draft !== undefined,
    );
  }

  function setError(
    errorCode: EmployeeNextRouteErrorCode,
    eventId?: EmployeeEventId,
  ): EmployeeNextRouteResult {
    state = errorState(errorCode, eventId);
    return failure(errorCode, currentView());
  }

  const controller: EmployeeNextRouteController = {
    getState(): EmployeeNextRouteState {
      return state;
    },

    getEventIds(): readonly EmployeeEventId[] {
      return eventIds;
    },

    getView(): EmployeeNextRouteView {
      return currentView();
    },

    selectEvent(value: unknown): EmployeeNextRouteResult {
      if (
        !isEmployeeEventId(value)
        || registry.get(value) === undefined
      ) {
        return setError("INVALID_EVENT_SELECTION");
      }
      const shellResult = shell.selectEvent(value);
      if (!shellResult.ok) {
        return setError("INVALID_EVENT_SELECTION");
      }
      selectedEventId = value;
      draft = undefined;
      shell.setSubmitState(Object.freeze({ status: "IDLE" }));
      setReady();
      return success(currentView());
    },

    setSession(value: unknown): EmployeeNextRouteResult {
      if (!isEmployeeAuthSession(value)) {
        return setError("INVALID_AUTH_SESSION", selectedEventId);
      }
      const sessionSnapshot = snapshotSession(value);
      const shellResult = shell.setAuthState(Object.freeze({
        status: "AUTHENTICATED",
        session: sessionSnapshot,
      }));
      if (!shellResult.ok) {
        return setError("INVALID_AUTH_SESSION", selectedEventId);
      }
      session = sessionSnapshot;
      setReady();
      return success(currentView());
    },

    setDraft(value: unknown): EmployeeNextRouteResult {
      if (selectedEventId === undefined) {
        return setError("ROUTE_NOT_READY");
      }
      if (!isDraft(value)) {
        return setError("INVALID_DRAFT_INPUT", selectedEventId);
      }
      draft = snapshotDraft(value);
      setReady();
      return success(currentView());
    },

    async render(): Promise<EmployeeNextRouteResult> {
      unsafeRenderEcho = false;
      const shellResult = await shell.render();
      if (!shellResult.ok) {
        const errorCode = unsafeRenderEcho
          ? "UNSAFE_ERROR_ECHO"
          : "RENDER_FAILED";
        return setError(errorCode, selectedEventId);
      }
      setReady();
      return success(currentView(shellResult.view));
    },

    async submit(): Promise<EmployeeNextRouteResult> {
      if (state.status === "SUBMITTING") {
        return setError("SUBMIT_FLOW_FAILED", selectedEventId);
      }
      if (
        selectedEventId === undefined
        || session === undefined
        || draft === undefined
      ) {
        return setError("ROUTE_NOT_READY", selectedEventId);
      }

      const eventId = selectedEventId;
      state = progressState(eventId);
      shell.setSubmitState(Object.freeze({
        status: "SUBMITTING",
        eventId,
      }));
      const result = await submitFlow.submit({
        session,
        eventId,
        draft,
        buildApiRequest(context): EmployeeApiRequest {
          const request = options.buildApiRequest(context);
          if (!isSafeLocalPostRequest(request, allowedSubmitPath)) {
            throw new Error("INVALID_API_REQUEST");
          }
          return request;
        },
      });

      if (!result.ok) {
        state = errorState("SUBMIT_FLOW_FAILED", eventId);
        shell.setSubmitState(submitStateError(eventId));
        return failure("SUBMIT_FLOW_FAILED", currentView());
      }

      state = syncedState(eventId);
      shell.setSubmitState(Object.freeze({
        status: "SYNCED",
        eventId,
      }));
      return success(currentView(), result.response);
    },
  };

  return Object.freeze(controller);
}
