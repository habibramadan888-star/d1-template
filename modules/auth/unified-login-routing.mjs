export const UNIFIED_LOGIN_PATH = "/unified-login.html";
export const EMPLOYEE_DESTINATION = "/employee-v3.html";
export const OWNER_DESTINATION = "/index.html";
export const PRODUCTION_CUTOVER_STATUS = "PRODUCTION_NO_GO";

const EMPLOYEE_ROLES = new Set(["employee", "staff"]);
const READONLY_ADMIN_ROLES = new Set(["admin_readonly", "readonly_admin"]);
const OWNER_ROLES = new Set(["owner", "manager", "admin", ...READONLY_ADMIN_ROLES]);

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

export function resolveUnifiedExistingSessionUx({ meStatus, meClaim, autoRedirect = false } = {}) {
  if (meStatus === 401 || meStatus === 403 || !meClaim) {
    return {
      page: "unified-login",
      action: "SHOW_LOGIN",
      authority: "/api/me",
      autoRedirect: false
    };
  }

  const decision = getUnifiedLoginDestination(meClaim);
  if (!decision.ok) {
    return {
      page: "unified-login",
      action: "DENY",
      authority: "/api/me",
      autoRedirect: false,
      reason: decision.reason
    };
  }

  return {
    page: "unified-login",
    action: autoRedirect ? "AUTO_REDIRECT" : "SHOW_MINIMAL_LOGIN",
    roleGroup: decision.roleGroup,
    destination: decision.destination,
    authority: "/api/me",
    autoRedirect
  };
}

export function resolveOwnerBootstrapUx({ meStatus, meClaim, mePending = false } = {}) {
  if (mePending) {
    return {
      page: "owner",
      action: "SHOW_AUTH_LOADING",
      showLegacyLogin: false,
      authority: "/api/me"
    };
  }

  const handoff = resolveOwnerSessionHandoff({ meStatus, meClaim });
  return {
    ...handoff,
    showLegacyLogin: false
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
  if (READONLY_ADMIN_ROLES.has(role)) return false;
  if (OWNER_ROLES.has(role)) return options.explicitEmployeeWorkflowGrant === true;
  return false;
}

export function canWriteOwnerData(authClaim) {
  const role = normalizeUnifiedLoginRole(authClaim?.role);
  return OWNER_ROLES.has(role) && !READONLY_ADMIN_ROLES.has(role);
}

export function getCommercialLaunchStatusForUnifiedLogin() {
  return PRODUCTION_CUTOVER_STATUS;
}

export function resolveOwnerSessionHandoff({ meStatus, meClaim } = {}) {
  if (meStatus === 401 || meStatus === 403 || !meClaim) {
    return {
      page: "owner",
      action: "REDIRECT",
      destination: UNIFIED_LOGIN_PATH,
      showSecondLogin: false,
      authority: "/api/me"
    };
  }

  const decision = getUnifiedLoginDestination(meClaim);
  if (decision.roleGroup === "owner") {
    const role = normalizeUnifiedLoginRole(meClaim?.role);
    return {
      page: "owner",
      action: "ENTER_OWNER_APP",
      roleForApp: READONLY_ADMIN_ROLES.has(role) ? "readonly_admin" : "manager",
      showSecondLogin: false,
      authority: "/api/me"
    };
  }

  if (decision.roleGroup === "employee") {
    return {
      page: "owner",
      action: "REDIRECT",
      destination: EMPLOYEE_DESTINATION,
      showSecondLogin: false,
      authority: "/api/me"
    };
  }

  return {
    page: "owner",
    action: "DENY",
    showSecondLogin: false,
    authority: "/api/me"
  };
}

export function resolveEmployeeSessionHandoff({ meStatus, meClaim } = {}) {
  if (meStatus === 401 || meStatus === 403 || !meClaim) {
    return {
      page: "employee",
      action: "REDIRECT",
      destination: UNIFIED_LOGIN_PATH,
      showSecondLogin: false,
      authority: "/api/me"
    };
  }

  const decision = getUnifiedLoginDestination(meClaim);
  if (decision.roleGroup === "employee") {
    return {
      page: "employee",
      action: "ENTER_EMPLOYEE_APP",
      showSecondLogin: false,
      authority: "/api/me"
    };
  }

  if (decision.roleGroup === "owner") {
    return {
      page: "employee",
      action: "REDIRECT",
      destination: OWNER_DESTINATION,
      showSecondLogin: false,
      authority: "/api/me"
    };
  }

  return {
    page: "employee",
    action: "DENY",
    showSecondLogin: false,
    authority: "/api/me"
  };
}
