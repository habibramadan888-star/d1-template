const STAGING_ENVIRONMENT = "staging";
const STAGING_WORKER = "homelink-finance-staging";
const STAGING_TTLOCK_MODE = "disabled_fail_closed";
const STAGING_CONTEXT_SNAPSHOT_MODE = "staging_kv_only";
const STAGING_CONTEXT_SNAPSHOT_SCHEMA_VERSION = 1;
const STAGING_CONTEXT_SNAPSHOT_TYPE = "ttlock_access_snapshot";
const STAGING_CONTEXT_SNAPSHOT_KEY_PREFIX = "staging:ttlock-context:";

function text(value) {
  return String(value ?? "").trim();
}

function stagingEnvironment(env = {}) {
  return text(env.APP_ENV).toLowerCase() === STAGING_ENVIRONMENT;
}

function normalizedHostHeader(value) {
  const raw = text(value).toLowerCase();
  if (!raw || /[\s/@?#]/.test(raw)) return "";
  try {
    const parsed = new URL(`https://${raw}`);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return "";
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function fail(errorCode, status = 503) {
  return {
    ok: false,
    success: false,
    error_code: errorCode,
    error: errorCode,
    status,
    no_write: true,
    write_attempted: false,
    formal_write_count: 0,
    external_ttlock_call_count: 0,
    production_cutover: "PRODUCTION_NO_GO"
  };
}

export function stagingIsolationConfig(env = {}) {
  if (!stagingEnvironment(env)) return { staging: false, ok: true };
  const allowedHost = text(env.STAGING_ALLOWED_HOST).toLowerCase();
  const allowedOrigin = text(env.STAGING_ALLOWED_ORIGIN);
  const valid =
    allowedHost.length > 0 &&
    allowedOrigin.length > 0 &&
    text(env.STAGING_TTLOCK_MODE) === STAGING_TTLOCK_MODE &&
    text(env.STAGING_CONTEXT_SNAPSHOT_MODE) === STAGING_CONTEXT_SNAPSHOT_MODE;
  return valid
    ? { staging: true, ok: true, allowedHost, allowedOrigin }
    : { staging: true, ok: false, failure: fail("STAGING_ISOLATION_CONFIG_MISSING") };
}

export function stagingRequestBoundaryFailure(request, env = {}) {
  const config = stagingIsolationConfig(env);
  if (!config.staging) return null;
  if (!config.ok) return config.failure;
  let urlHost = "";
  try {
    urlHost = new URL(request?.url || "").hostname.toLowerCase();
  } catch {
    return fail("STAGING_HOST_NOT_ALLOWED", 403);
  }
  const headerHost = normalizedHostHeader(request?.headers?.get?.("Host"));
  if (urlHost !== config.allowedHost || headerHost !== config.allowedHost) {
    return fail("STAGING_HOST_NOT_ALLOWED", 403);
  }
  const origin = text(request?.headers?.get?.("Origin"));
  if (origin && origin !== config.allowedOrigin) return fail("STAGING_ORIGIN_NOT_ALLOWED", 403);
  return null;
}

export function stagingTtlockLiveFetchAllowed(env = {}) {
  if (!stagingEnvironment(env)) return true;
  return false;
}

export function stagingFormalWriteFailure(env = {}) {
  if (!stagingEnvironment(env)) return null;
  const config = stagingIsolationConfig(env);
  if (!config.ok) return config.failure;
  return fail("STAGING_FORMAL_WRITE_DISABLED", 403);
}

function snapshotKey(bed) {
  return `${STAGING_CONTEXT_SNAPSHOT_KEY_PREFIX}${encodeURIComponent(bed)}`;
}

function validPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotFailure(code) {
  return {
    handled: true,
    ...fail(code),
    staging_snapshot: true,
    roomsData: {},
    locksCount: 0,
    data_source: "staging_kv_snapshot",
    access_context_available: false,
    _ttlock_meta: {
      external_call_count: 0,
      cache_hit: false,
      snapshot_reused: false,
      single_flight_joined: false
    }
  };
}

export async function readStagingTtlockContextSnapshot(env = {}, options = {}) {
  if (!stagingEnvironment(env)) return { handled: false };
  const config = stagingIsolationConfig(env);
  if (!config.ok) return snapshotFailure("STAGING_ISOLATION_CONFIG_MISSING");
  const bed = text(options.bed).replace(/^#/, "");
  if (!bed) return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_SCOPE_MISMATCH");
  if (!env?.RATE_LIMIT || typeof env.RATE_LIMIT.get !== "function") {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MISSING");
  }
  let record;
  try {
    const raw = await env.RATE_LIMIT.get(snapshotKey(bed));
    if (!raw) return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MISSING");
    record = JSON.parse(raw);
  } catch {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MALFORMED");
  }
  if (!validPlainObject(record) || !validPlainObject(record.payload)) {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MALFORMED");
  }
  if (
    record.schema_version !== STAGING_CONTEXT_SNAPSHOT_SCHEMA_VERSION ||
    record.snapshot_type !== STAGING_CONTEXT_SNAPSHOT_TYPE
  ) {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MALFORMED");
  }
  if (record.environment !== STAGING_ENVIRONMENT) {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_ENVIRONMENT_MISMATCH");
  }
  if (record.worker !== STAGING_WORKER || text(record.bed_identifier).replace(/^#/, "") !== bed) {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_SCOPE_MISMATCH");
  }
  const createdAt = Date.parse(record.created_at);
  const expiresAt = Date.parse(record.expires_at);
  const now = Number.isFinite(options.now) ? Number(options.now) : Date.now();
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || createdAt > now || expiresAt <= createdAt) {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MALFORMED");
  }
  if (expiresAt <= now) return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_STALE");
  const roomsData = record.payload.roomsData;
  if (
    !validPlainObject(roomsData) ||
    !Object.prototype.hasOwnProperty.call(roomsData, bed) ||
    !Array.isArray(roomsData[bed])
  ) {
    return snapshotFailure("STAGING_CONTEXT_SNAPSHOT_MALFORMED");
  }
  return {
    handled: true,
    ok: true,
    success: true,
    staging_snapshot: true,
    roomsData,
    locksCount: Number(record.payload.locksCount || Object.keys(roomsData).length),
    loadedAt: record.created_at,
    observed_at: record.created_at,
    expires_at: record.expires_at,
    snapshot_fingerprint: text(record.payload.snapshot_fingerprint),
    data_source: "staging_kv_snapshot",
    access_context_available: true,
    fallback: false,
    no_write: true,
    write_attempted: false,
    formal_write_count: 0,
    external_ttlock_call_count: 0,
    _ttlock_meta: {
      external_call_count: 0,
      page_count: 0,
      cache_hit: true,
      snapshot_reused: false,
      single_flight_joined: false,
      snapshot_age_ms: Math.max(0, now - createdAt)
    }
  };
}

export const stagingRuntimeIsolationContract = Object.freeze({
  environment: STAGING_ENVIRONMENT,
  worker: STAGING_WORKER,
  ttlock_mode: STAGING_TTLOCK_MODE,
  context_snapshot_mode: STAGING_CONTEXT_SNAPSHOT_MODE,
  snapshot_schema_version: STAGING_CONTEXT_SNAPSHOT_SCHEMA_VERSION,
  snapshot_type: STAGING_CONTEXT_SNAPSHOT_TYPE,
  snapshot_key_prefix: STAGING_CONTEXT_SNAPSHOT_KEY_PREFIX
});
