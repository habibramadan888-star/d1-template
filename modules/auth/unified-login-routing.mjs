export const UNIFIED_LOGIN_PATH = "/unified-login.html";
export const EMPLOYEE_DESTINATION = "/employee-v3.html";
export const OWNER_DESTINATION = "/index.html";
export const PRODUCTION_CUTOVER_STATUS = "PRODUCTION_NO_GO";

const EMPLOYEE_ROLES = new Set(["employee", "staff"]);
const OWNER_ROLES = new Set(["owner", "manager", "admin"]);

export function normalizeUnifiedLoginRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

export function getUnifiedLoginDestination(authClaim) {
  const role = normalizeUnifiedLoginRole(authClaim?.role);

  if (EMPLOYEE_ROLES.has(role)) {
    return {
      ok: true,
      role,
      roleGroup: "employee",
      destination: EMPLOYEE_DESTINATION
    };
  }

  if (OWNER_ROLES.has(role)) {
    return {
      ok: true,
      role,
      roleGroup: "owner",
      destination: OWNER_DESTINATION
    };
  }

  return {
    ok: false,
    role,
    roleGroup: "unknown",
    destination: null,
    reason: "UNKNOWN_ROLE"
  };
}

export function resolveUnifiedPostLoginRoute({
  meClaim,
  loginResponse = null,
  frontendRole = null
} = {}) {
  const decision = getUnifiedLoginDestination(meClaim);

  return {
    ...decision,
    authority: "/api/me",
    ignoredLoginRole: loginResponse?.role ?? null,
    ignoredFrontendRole: frontendRole ?? null
  };
}

export function shouldRedirectUnauthenticatedToUnifiedLogin({ meStatus, hasAuthClaim } = {}) {
  return meStatus === 401 || meStatus === 403 || hasAuthClaim === false;
}

export function getUnifiedLoginErrorMessage(errorCodeOrStatus) {
  const code = String(errorCodeOrStatus || "")
    .trim()
    .toLowerCase();
  if (["401", "403", "invalid_credentials", "invalid_employee_pin"].includes(code)) {
    return "Login failed. Check the account and password, then try again.";
  }
  if (["unknown_role", "unknown_role_denied"].includes(code)) {
    return "Login succeeded, but this account role is not enabled for the unified portal.";
  }
  if (["session_missing", "session_expired"].includes(code)) {
    return "Session expired. Please sign in again.";
  }
  return "Login failed. Please try again or contact the QA owner.";
}

export function canAccessOwnerProtectedResources(authClaim) {
  return OWNER_ROLES.has(normalizeUnifiedLoginRole(authClaim?.role));
}

export function canSubmitEmployeeWorkflow(authClaim, options = {}) {
  const role = normalizeUnifiedLoginRole(authClaim?.role);
  if (EMPLOYEE_ROLES.has(role)) return true;
  if (OWNER_ROLES.has(role)) return options.explicitEmployeeWorkflowGrant === true;
  return false;
}

export function getCommercialLaunchStatusForUnifiedLogin() {
  return PRODUCTION_CUTOVER_STATUS;
}
