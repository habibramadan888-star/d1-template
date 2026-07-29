export const EMPLOYEE_AUTH_STATUSES = Object.freeze([
  "SIGNED_OUT",
  "RESTORING",
  "AUTHENTICATING",
  "AUTHENTICATED",
  "ERROR",
] as const);

export type EmployeeAuthStatus = (typeof EMPLOYEE_AUTH_STATUSES)[number];

export const EMPLOYEE_AUTH_ROLES = Object.freeze([
  "EMPLOYEE",
  "STAFF",
] as const);

export type EmployeeAuthRole = (typeof EMPLOYEE_AUTH_ROLES)[number];

export interface EmployeeAuthUser {
  readonly employeeId: string;
  readonly displayName: string;
  readonly role: EmployeeAuthRole;
  readonly userid?: string;
  readonly corpid?: string;
}

export interface EmployeeAuthSession {
  readonly user: EmployeeAuthUser;
}

export interface EmployeeLoginCredentials {
  readonly identifier: string;
  readonly secret: string;
}

export interface EmployeeAuthTransport {
  login(credentials: EmployeeLoginCredentials): Promise<EmployeeAuthSession>;
  restore(): Promise<EmployeeAuthSession | undefined>;
  logout(): Promise<void>;
}

export type EmployeeAuthErrorCode =
  | "EMPLOYEE_AUTH_INVALID_CREDENTIALS"
  | "EMPLOYEE_AUTH_INVALID_SESSION"
  | "EMPLOYEE_AUTH_LOGIN_FAILED"
  | "EMPLOYEE_AUTH_RESTORE_FAILED"
  | "EMPLOYEE_AUTH_LOGOUT_FAILED";

export type EmployeeAuthState =
  | Readonly<{ status: "SIGNED_OUT" }>
  | Readonly<{ status: "RESTORING" }>
  | Readonly<{ status: "AUTHENTICATING" }>
  | Readonly<{
    status: "AUTHENTICATED";
    session: EmployeeAuthSession;
  }>
  | Readonly<{
    status: "ERROR";
    errorCode: EmployeeAuthErrorCode;
  }>;

export interface EmployeeAuthController {
  getState(): EmployeeAuthState;
  login(credentials: EmployeeLoginCredentials): Promise<EmployeeAuthState>;
  restore(): Promise<EmployeeAuthState>;
  logout(): Promise<EmployeeAuthState>;
}

export function isEmployeeAuthStatus(
  value: unknown,
): value is EmployeeAuthStatus {
  return (
    typeof value === "string"
    && EMPLOYEE_AUTH_STATUSES.some((status) => status === value)
  );
}

export function isEmployeeAuthRole(value: unknown): value is EmployeeAuthRole {
  return (
    typeof value === "string"
    && EMPLOYEE_AUTH_ROLES.some((role) => role === value)
  );
}

export function isEmployeeAuthSession(
  value: unknown,
): value is EmployeeAuthSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  const userValue = candidate.user;
  if (typeof userValue !== "object" || userValue === null) {
    return false;
  }

  const user = userValue as Readonly<Record<string, unknown>>;
  return (
    typeof user.employeeId === "string"
    && user.employeeId.length > 0
    && typeof user.displayName === "string"
    && isEmployeeAuthRole(user.role)
    && (
      user.userid === undefined
      || (
        typeof user.userid === "string"
        && user.userid.trim().length > 0
      )
    )
    && (
      user.corpid === undefined
      || (
        typeof user.corpid === "string"
        && user.corpid.trim().length > 0
      )
    )
  );
}

function isEmployeeAuthTransport(
  value: unknown,
): value is EmployeeAuthTransport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate.login === "function"
    && typeof candidate.restore === "function"
    && typeof candidate.logout === "function"
  );
}

function signedOutState(): EmployeeAuthState {
  return Object.freeze({ status: "SIGNED_OUT" });
}

function statusState(
  status: "RESTORING" | "AUTHENTICATING",
): EmployeeAuthState {
  return Object.freeze({ status });
}

function errorState(errorCode: EmployeeAuthErrorCode): EmployeeAuthState {
  return Object.freeze({ status: "ERROR", errorCode });
}

function authenticatedState(
  session: EmployeeAuthSession,
): EmployeeAuthState {
  const user = Object.freeze({
    employeeId: session.user.employeeId,
    displayName: session.user.displayName,
    role: session.user.role,
    ...(session.user.userid === undefined
      ? {}
      : { userid: session.user.userid }),
    ...(session.user.corpid === undefined
      ? {}
      : { corpid: session.user.corpid }),
  });
  const sessionSnapshot = Object.freeze({ user });
  return Object.freeze({
    status: "AUTHENTICATED",
    session: sessionSnapshot,
  });
}

function hasValidCredentials(value: unknown): value is EmployeeLoginCredentials {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate.identifier === "string"
    && candidate.identifier.length > 0
    && typeof candidate.secret === "string"
    && candidate.secret.length > 0
  );
}

export function createEmployeeAuthController(
  transport: EmployeeAuthTransport,
): EmployeeAuthController {
  if (!isEmployeeAuthTransport(transport)) {
    throw new Error("EMPLOYEE_AUTH_INVALID_TRANSPORT");
  }

  let state: EmployeeAuthState = signedOutState();

  const controller: EmployeeAuthController = {
    getState(): EmployeeAuthState {
      return state;
    },

    async login(
      credentials: EmployeeLoginCredentials,
    ): Promise<EmployeeAuthState> {
      if (!hasValidCredentials(credentials)) {
        state = errorState("EMPLOYEE_AUTH_INVALID_CREDENTIALS");
        return state;
      }

      state = statusState("AUTHENTICATING");
      try {
        const session = await transport.login(credentials);
        state = isEmployeeAuthSession(session)
          ? authenticatedState(session)
          : errorState("EMPLOYEE_AUTH_INVALID_SESSION");
      } catch {
        state = errorState("EMPLOYEE_AUTH_LOGIN_FAILED");
      }
      return state;
    },

    async restore(): Promise<EmployeeAuthState> {
      state = statusState("RESTORING");
      try {
        const session = await transport.restore();
        if (session === undefined) {
          state = signedOutState();
        } else {
          state = isEmployeeAuthSession(session)
            ? authenticatedState(session)
            : errorState("EMPLOYEE_AUTH_INVALID_SESSION");
        }
      } catch {
        state = errorState("EMPLOYEE_AUTH_RESTORE_FAILED");
      }
      return state;
    },

    async logout(): Promise<EmployeeAuthState> {
      const wasAuthenticated = state.status === "AUTHENTICATED";
      state = signedOutState();
      if (!wasAuthenticated) {
        return state;
      }

      try {
        await transport.logout();
        state = signedOutState();
      } catch {
        state = errorState("EMPLOYEE_AUTH_LOGOUT_FAILED");
      }
      return state;
    },
  };

  return Object.freeze(controller);
}
