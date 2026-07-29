// Feature flag configuration for staged rollout. Defaults are intentionally
// production-safe: disabled unless explicitly enabled by the environment.

export const FEATURE_FLAGS = Object.freeze({
  BACKEND_TOTALS_AUTHORITY_ENABLED: Object.freeze({
    key: "backend_totals_authority",
    default: false,
    envVar: "FF_BACKEND_TOTALS"
  }),
  RECEIVABLES_STATE_MACHINE_ENABLED: Object.freeze({
    key: "receivables_state_machine",
    default: false,
    envVar: "FF_RECEIVABLES_STATE"
  }),
  TENANT_ISOLATION_ENABLED: Object.freeze({
    key: "tenant_isolation",
    default: false,
    envVar: "FF_TENANT_ISOLATION"
  }),
  AUDIT_TRAIL_ENABLED: Object.freeze({
    key: "audit_trail",
    default: false,
    envVar: "FF_AUDIT_TRAIL"
  })
});

export function getFeatureFlag(env = {}, flagName) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) {
    console.warn(`Unknown feature flag: ${flagName}`);
    return false;
  }

  return parseBooleanFlag(env[flag.envVar], flag.default);
}

export function isFeatureEnabled(env = {}, flagName) {
  return getFeatureFlag(env, flagName);
}

export function getFeatureFlagSnapshot(env = {}) {
  return Object.fromEntries(
    Object.keys(FEATURE_FLAGS).map((flagName) => [flagName, getFeatureFlag(env, flagName)])
  );
}

export function logFeatureFlags(env = {}, logger = console) {
  const snapshot = getFeatureFlagSnapshot(env);
  logger.log("=== Feature Flags ===");
  for (const [flagName, enabled] of Object.entries(snapshot)) {
    logger.log(`${flagName}: ${enabled}`);
  }
  return snapshot;
}

export function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return Boolean(fallback);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return Boolean(fallback);
}
