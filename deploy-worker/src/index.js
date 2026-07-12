var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

import { createEmployeeEntryLiveWriteAdapterDraft } from "../../modules/worker/employee-entry-live-write-adapter.mjs";
import {
  findBedTransferForbiddenIdentityFields,
  sanitizeBedTransferIdentityFields,
  validateBedTransferPhase1Contract
} from "../../modules/employees/bed-transfer-phase1-contract.mjs";
import {
  buildBedTransferCanonicalLinkAnchor
} from "../../modules/employees/bed-transfer-canonical-link-anchor.mjs";
import { resolveBedTransferSourceContext } from "../../modules/employees/bed-transfer-source-context-resolver.mjs";
import { classifyExistingCanonicalTransfer, prepareCanonicalTransferArchiveWrite } from "../../modules/employees/bed-transfer-canonical-archive-write.mjs";
import { projectOwnerHistoryTransferLineage } from "../../modules/owner-history/bed-transfer-lineage-projection.mjs";
import { evaluateStayGenesisTrigger } from "../../modules/employees/durable-stay-genesis-trigger.mjs";
import {
  materializePreparedStayGenesis,
  prepareStayGenesis
} from "../../modules/employees/durable-stay-persistence.mjs";
import { buildCanonicalStayBedContext } from "../../modules/employees/canonical-stay-bed-context.mjs";
import {
  buildCorrectionRequestFingerprint,
  buildOwnerCorrectionDryRunPreview,
  buildOwnerCorrectionPreviewHash,
  buildOwnerCorrectionSessionAnchor,
  hashCorrectionStablePayload,
  parseOwnerCorrectionAnchorText,
  validateOwnerCorrectionApplyRequest,
  validateOwnerCorrectionTargetScopedApplyAuthorization
} from "../../modules/owner-corrections/correction-anchor-parser.mjs";
import { createDashboardTotalsPayload } from "./handlers/dashboard-totals.js";
import { ErrorCodes } from "../../dist/lib/constants/error-codes.js";
import { fail, ok } from "../../dist/lib/lib/api-response.js";
import { logger } from "../../dist/lib/lib/logger.js";
import { requestIdMiddleware } from "../../dist/lib/lib/request-id.js";

// src/lib/jwt.js
var ALGO = { name: "HMAC", hash: "SHA-256" };
var SESSION_TTL_SECONDS = 72 * 60 * 60;
var DEFAULT_TTL_SECONDS = SESSION_TTL_SECONDS;
var READONLY_ADMIN_ROLES = /* @__PURE__ */ new Set(["admin_readonly", "readonly_admin"]);
function normalizeRoleValue(role) {
  return String(role || "").trim().toLowerCase();
}
__name(normalizeRoleValue, "normalizeRoleValue");
function isReadonlyAdminRoleValue(role) {
  return READONLY_ADMIN_ROLES.has(normalizeRoleValue(role));
}
__name(isReadonlyAdminRoleValue, "isReadonlyAdminRoleValue");
function isManagerRoleValue(role) {
  return normalizeRoleValue(role) === "manager";
}
__name(isManagerRoleValue, "isManagerRoleValue");
function isStaffRoleValue(role) {
  return ["staff", "employee"].includes(normalizeRoleValue(role));
}
__name(isStaffRoleValue, "isStaffRoleValue");
function isAllowedAuthRole(role) {
  return isManagerRoleValue(role) || isStaffRoleValue(role) || isReadonlyAdminRoleValue(role);
}
__name(isAllowedAuthRole, "isAllowedAuthRole");
function canReadOwnerData(user) {
  return isManagerRoleValue(user?.role) || isReadonlyAdminRoleValue(user?.role);
}
__name(canReadOwnerData, "canReadOwnerData");
function canWriteOwnerData(user) {
  return isManagerRoleValue(user?.role);
}
__name(canWriteOwnerData, "canWriteOwnerData");
function bytesToB64url(bytes) {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(bytesToB64url, "bytesToB64url");
function b64urlToBytes(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const binary = atob(pad ? padded + "=".repeat(4 - pad) : padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
__name(b64urlToBytes, "b64urlToBytes");
function toB64url(str) {
  return bytesToB64url(new TextEncoder().encode(str));
}
__name(toB64url, "toB64url");
function fromB64url(str) {
  return new TextDecoder().decode(b64urlToBytes(str));
}
__name(fromB64url, "fromB64url");
async function importKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALGO,
    false,
    [usage]
  );
}
__name(importKey, "importKey");
async function signJWT(payload, secret, ttl = DEFAULT_TTL_SECONDS) {
  if (!secret) throw new Error("jwt_secret_missing");
  const now = Math.floor(Date.now() / 1e3);
  const header = toB64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = toB64url(JSON.stringify({ ...payload, iat: now, exp: now + ttl }));
  const unsigned = `${header}.${claims}`;
  const key = await importKey(secret, "sign");
  const sigBuffer = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(unsigned));
  const sig = bytesToB64url(new Uint8Array(sigBuffer));
  return `${unsigned}.${sig}`;
}
__name(signJWT, "signJWT");
async function verifyJWT(token, secret, options = {}) {
  if (!secret) {
    throw new Error("jwt_secret_missing");
  }
  if (!token || typeof token !== "string") {
    throw new Error("malformed_token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed_token");
  let header;
  try {
    header = JSON.parse(fromB64url(parts[0]));
  } catch {
    throw new Error("malformed_token");
  }
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("malformed_token");
  }
  const key = await importKey(secret, "verify");
  const sigBytes = b64urlToBytes(parts[2]);
  const isValid = await crypto.subtle.verify(
    ALGO,
    key,
    sigBytes,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!isValid) throw new Error("invalid_signature");
  let payload;
  try {
    payload = JSON.parse(fromB64url(parts[1]));
  } catch {
    throw new Error("malformed_token");
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1e3)) {
    throw new Error("token_expired");
  }
  if (!isAllowedAuthRole(payload.role) || !payload.corpid) {
    throw new Error("malformed_token");
  }
  return payload;
}
__name(verifyJWT, "verifyJWT");

// src/lib/password.js
var ITERATIONS = 1e5;
var KEY_BITS = 256;
async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    KEY_BITS
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
__name(hashPassword, "hashPassword");
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(bytesToHex, "bytesToHex");
async function hashPasswordHex(password, salt, keyBits = KEY_BITS) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    keyBits
  );
  return bytesToHex(new Uint8Array(bits));
}
__name(hashPasswordHex, "hashPasswordHex");
function constantTimeEqual(a, b) {
  if (a.length !== b.length) {
    let diff2 = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diff2 |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
async function verifyPassword(inputPassword, storedHash, salt) {
  if (!inputPassword || !storedHash || !salt) return false;
  try {
    const normalized = String(storedHash || "").trim();
    const computed = /^[0-9a-f]{64}$/i.test(normalized) || /^[0-9a-f]{128}$/i.test(normalized) ? await hashPasswordHex(inputPassword, salt, normalized.length === 128 ? 512 : 256) : await hashPassword(inputPassword, salt);
    return constantTimeEqual(computed, normalized);
  } catch {
    return false;
  }
}
__name(verifyPassword, "verifyPassword");

// src/lib/middleware.js
var SESSION_COOKIE = "__session";
function getCookie(request, name = SESSION_COOKIE) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
__name(getCookie, "getCookie");
function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
__name(getBearerToken, "getBearerToken");
function makeSessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ].join("; ");
}
__name(makeSessionCookie, "makeSessionCookie");
function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
__name(clearSessionCookie, "clearSessionCookie");
async function requireAuth(request, env, requiredRole = null) {
  const token = getBearerToken(request) || getCookie(request);
  if (!token) {
    return { error: "unauthenticated", status: 401 };
  }
  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch (e) {
    return { error: e.message, status: 401 };
  }
  if (!payload.sid || !env.DB) {
    return { error: "session_required", status: 401 };
  }
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS active_sessions (
        sid TEXT PRIMARY KEY,
        corpid TEXT NOT NULL,
        userid TEXT NOT NULL,
        role TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        revoked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now')),
        expires_at INTEGER NOT NULL
      )`
    ).run();
    const active = await env.DB.prepare(
      `SELECT sid FROM active_sessions
       WHERE sid=? AND corpid=? AND userid=? AND role=? AND revoked=0 AND expires_at>? LIMIT 1`
    ).bind(
      payload.sid,
      payload.corpid,
      payload.userid || "",
      payload.role,
      Math.floor(Date.now() / 1e3)
    ).first();
    if (!active) return { error: "session_revoked", status: 401 };
  } catch {
    return { error: "session_check_failed", status: 401 };
  }
  if (requiredRole && payload.role !== requiredRole) {
    return { error: "forbidden", status: 403 };
  }
  return { payload };
}
__name(requireAuth, "requireAuth");
function requestOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}
__name(requestOrigin, "requestOrigin");
function configuredOrigins(request, env = {}) {
  const current = requestOrigin(request);
  const explicit = String(env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean);
  const host = String(env.ALLOWED_HOST || "").trim();
  const fromHost = host ? [`https://${host}`] : [];
  return new Set([
    current,
    "https://homelink-finance.habibramadan888.workers.dev",
    ...fromHost,
    ...explicit
  ].filter(Boolean));
}
__name(configuredOrigins, "configuredOrigins");
function isOriginValueAllowed(origin, request, env = {}) {
  if (!origin) return false;
  return configuredOrigins(request, env).has(origin);
}
__name(isOriginValueAllowed, "isOriginValueAllowed");
function enforceTrustedOrigin(request, env = {}) {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";
  if (origin) {
    return isOriginValueAllowed(origin, request, env) ? null : forbidden("invalid_origin");
  }
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return isOriginValueAllowed(refOrigin, request, env) ? null : forbidden("invalid_origin");
    } catch {
      return forbidden("invalid_origin");
    }
  }
  return forbidden("missing_origin");
}
__name(enforceTrustedOrigin, "enforceTrustedOrigin");
function corsOrigin(request, env = {}) {
  const origin = request.headers.get("Origin") || "";
  return isOriginValueAllowed(origin, request, env) ? origin : "";
}
__name(corsOrigin, "corsOrigin");
function makeNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let value = "";
  for (const b of bytes) value += String.fromCharCode(b);
  return btoa(value).replace(/=+$/g, "");
}
__name(makeNonce, "makeNonce");
function securityHeaders(request, env = {}, nonce = "") {
  const origin = requestOrigin(request);
  const apiOrigin = String(env.CLOUD_API_ORIGIN || "https://homelink-finance.habibramadan888.workers.dev").trim();
  const connect = Array.from(new Set(["'self'", origin, apiOrigin].filter(Boolean))).join(" ");
  const scriptSrc = nonce ? `script-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com` : "script-src 'self' https://cdnjs.cloudflare.com";
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `connect-src ${connect}`,
      scriptSrc,
      "script-src-attr 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "upgrade-insecure-requests"
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
  };
}
__name(securityHeaders, "securityHeaders");
function applyCors(headers, request, env = {}) {
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Methods");
  headers.delete("Access-Control-Allow-Headers");
  headers.delete("Access-Control-Allow-Credentials");
  const allowed = corsOrigin(request, env);
  if (allowed) {
    headers.set("Access-Control-Allow-Origin", allowed);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  headers.set("Vary", "Origin");
}
__name(applyCors, "applyCors");
function isHtmlResponse(headers) {
  return (headers.get("Content-Type") || "").toLowerCase().includes("text/html");
}
__name(isHtmlResponse, "isHtmlResponse");
async function withSecurityHeaders(response, request, env = {}) {
  const headers = new Headers(response.headers);
  let body = response.body;
  let nonce = "";
  if (isHtmlResponse(headers)) {
    nonce = makeNonce();
    const html = await response.text();
    body = html.replace(/<script(?![^>]*\bsrc=)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);
    headers.set("Content-Type", headers.get("Content-Type") || "text/html; charset=utf-8");
  }
  const currentType = headers.get("Content-Type") || "";
  if (/^text\/html\b/i.test(currentType) && !/charset=/i.test(currentType)) headers.set("Content-Type", "text/html; charset=utf-8");
  if (/^(?:application|text)\/javascript\b/i.test(currentType) && !/charset=/i.test(currentType)) headers.set("Content-Type", "application/javascript; charset=utf-8");
  for (const [key, value] of Object.entries(securityHeaders(request, env, nonce))) {
    headers.set(key, value);
  }
  applyCors(headers, request, env);
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
__name(withSecurityHeaders, "withSecurityHeaders");
function corsPreflightResponse(request, env = {}) {
  const allowed = corsOrigin(request, env);
  if (!allowed) return forbidden("invalid_origin");
  const headers = new Headers({ "Content-Type": "application/json" });
  applyCors(headers, request, env);
  for (const [key, value] of Object.entries(securityHeaders(request, env))) {
    headers.set(key, value);
  }
  return new Response(null, { status: 204, headers });
}
__name(corsPreflightResponse, "corsPreflightResponse");
var CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function createRequestContext(request) {
  const headers = {};
  for (const [key, value] of request.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }
  const requestLike = { headers };
  const responseHeaders = new Headers();
  requestIdMiddleware(
    requestLike,
    {
      setHeader(name, value) {
        responseHeaders.set(name, value);
      }
    },
    () => {}
  );
  const requestLogger =
    typeof logger.child === "function" ? logger.child({ requestId: requestLike.id }) : logger;
  return {
    requestId: requestLike.id,
    logger: requestLogger,
    responseHeaders
  };
}
__name(createRequestContext, "createRequestContext");
function attachRequestContext(request, context) {
  try {
    Object.defineProperty(request, "logger", {
      value: context.logger,
      configurable: true
    });
  } catch {
    // Cloudflare Request objects may be non-extensible in some runtimes.
  }
}
__name(attachRequestContext, "attachRequestContext");
function applyRequestIdHeader(response, context) {
  response.headers.set("x-request-id", context.requestId);
  return response;
}
__name(applyRequestIdHeader, "applyRequestIdHeader");
function authFailureResponse(auth) {
  const status = auth.status || 401;
  const code = status === 403 ? ErrorCodes.FORBIDDEN : ErrorCodes.UNAUTHORIZED;
  const message = status === 403 ? "Forbidden" : auth.error || "unauthenticated";
  return json(fail(code, message), status, status === 401 ? { "Set-Cookie": clearSessionCookie() } : {});
}
__name(authFailureResponse, "authFailureResponse");
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}
__name(json, "json");
function errorCodeForStatus(status = 500) {
  if (status === 400) return ErrorCodes.BAD_REQUEST;
  if (status === 401) return ErrorCodes.UNAUTHORIZED;
  if (status === 403) return ErrorCodes.FORBIDDEN;
  if (status === 404) return ErrorCodes.NOT_FOUND;
  if (status >= 400 && status < 500) return ErrorCodes.BAD_REQUEST;
  return ErrorCodes.INTERNAL_SERVER;
}
__name(errorCodeForStatus, "errorCodeForStatus");
function success(data, status = 200, extraHeaders = {}) {
  return json(ok(data), status, extraHeaders);
}
__name(success, "success");
function errorResponse(message = "Internal server error", status = 500, error, extra = {}) {
  return json({ ...fail(errorCodeForStatus(status), message, error), ...extra }, status);
}
__name(errorResponse, "errorResponse");
function unauthorized(message = "unauthenticated") {
  return json(fail(ErrorCodes.UNAUTHORIZED, message), 401);
}
__name(unauthorized, "unauthorized");
function forbidden(message = "forbidden") {
  return json(fail(ErrorCodes.FORBIDDEN, message), 403);
}
__name(forbidden, "forbidden");
function badRequest(message = "bad_request") {
  return json(fail(ErrorCodes.BAD_REQUEST, message), 400);
}
__name(badRequest, "badRequest");
function tooManyRequests(message = "too_many_attempts") {
  return json(fail(ErrorCodes.BAD_REQUEST, message), 429);
}
__name(tooManyRequests, "tooManyRequests");

// src/routes/auth.js
var LOGIN_WINDOW_SECONDS = 10 * 60;
var LOGIN_MAX_ATTEMPTS = 8;
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}
__name(clientIp, "clientIp");
async function checkRateLimit(request, env) {
  if (!env.RATE_LIMIT) return null;
  const key = `login:${clientIp(request)}`;
  const current = Number(await env.RATE_LIMIT.get(key) || "0");
  if (current >= LOGIN_MAX_ATTEMPTS) return tooManyRequests("too_many_attempts");
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: LOGIN_WINDOW_SECONDS });
  return null;
}
__name(checkRateLimit, "checkRateLimit");
async function clearRateLimit(request, env) {
  try {
    await env.RATE_LIMIT?.delete(`login:${clientIp(request)}`);
  } catch {
  }
}
__name(clearRateLimit, "clearRateLimit");
async function ensureSessionTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS active_sessions (
      sid TEXT PRIMARY KEY,
      corpid TEXT NOT NULL,
      userid TEXT NOT NULL,
      role TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      revoked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')),
      expires_at INTEGER NOT NULL
    )`
  ).run();
}
__name(ensureSessionTable, "ensureSessionTable");
async function createSession(request, env, user, ttlSeconds = SESSION_TTL_SECONDS) {
  const sid = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1e3);
  await ensureSessionTable(env);
  await env.DB.prepare(
    `INSERT INTO active_sessions (sid, corpid, userid, role, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sid,
    user.corpid,
    user.userid,
    user.role,
    String(request.headers.get("User-Agent") || "").slice(0, 240),
    clientIp(request),
    now + ttlSeconds
  ).run();
  return sid;
}
__name(createSession, "createSession");
async function revokeSession(request, env) {
  const token = getBearerToken(request) || getCookie(request);
  const result = { revoked: false, sid: "" };
  if (!token) return result;
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET, { skipSession: true });
    result.sid = payload.sid || "";
    if (!payload.sid || !env.DB) return result;
    await ensureSessionTable(env);
    const update = await env.DB.prepare(
      "UPDATE active_sessions SET revoked=1 WHERE sid=?"
    ).bind(payload.sid).run();
    result.revoked = Number(update?.meta?.changes ?? update?.changes ?? 0) > 0;
  } catch {
  }
  return result;
}
__name(revokeSession, "revokeSession");
function parseUserAccounts(env) {
  const raw = String(env.USER_ACCOUNTS || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([userid, value]) => ({ userid, ...value || {} }));
      return arr.map((u) => ({
        userid: String(u.userid || u.id || "").trim(),
        name: String(u.name || u.employee_name || u.displayName || u.userid || u.id || "").trim(),
        role: String(u.role || "staff").trim(),
        hash: String(u.hash || u.passwordHash || "").trim(),
        salt: String(u.salt || u.passwordSalt || "").trim()
      })).filter((u) => u.userid && isAllowedAuthRole(u.role) && u.hash);
  } catch {
    return [];
  }
}
__name(parseUserAccounts, "parseUserAccounts");
async function resolveRole(password, env) {
  const salt = env.PW_SALT;
  for (const account of parseUserAccounts(env)) {
    if (await verifyPassword(password, account.hash, account.salt || salt)) {
      return { role: account.role, userid: account.userid, employee_name: account.name || account.userid };
    }
  }
  if (await verifyPassword(password, env.MANAGER_PW_HASH, salt)) return "manager";
  if (await verifyPassword(password, env.STAFF_PW_HASH, salt)) return "staff";
  return null;
}
__name(resolveRole, "resolveRole");
async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid_json");
  }
  const { password } = body;
  if (!password || typeof password !== "string") {
    return badRequest("missing_or_invalid_password");
  }
  const blocked = await checkRateLimit(request, env);
  if (blocked) return blocked;
  const resolved = await resolveRole(password, env);
  if (!resolved) return unauthorized("invalid_credentials");
  await clearRateLimit(request, env);
  const role = typeof resolved === "string" ? resolved : resolved.role;
  const corpid = env.CORPID || "homelink";
  const userid = typeof resolved === "string" ? role : resolved.userid;
  const sid = await createSession(request, env, { role, userid, corpid });
  const token = await signJWT({
    role,
    userid,
    corpid,
    sid,
    employee_name: typeof resolved === "string" ? userid : resolved.employee_name || userid
  }, env.JWT_SECRET);
  return new Response(JSON.stringify({ role, userid, employee_name: typeof resolved === "string" ? userid : resolved.employee_name || userid }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Set-Cookie": makeSessionCookie(token)
    }
  });
}
__name(handleLogin, "handleLogin");
async function ensureEmployeeUsers(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS employee_users (
    employee_id TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT,
    updated_at TEXT
  )`).run();
  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
  const allowDevSeed=["1","true","yes","on"].includes(String(env.ALLOW_DEV_SEED||"").trim().toLowerCase());
  if(!allowDevSeed||!["development","dev","local","test"].includes(appEnv))return;
  const seedEmployeeId=cleanText(env.LOCAL_EMPLOYEE_ID||"abdul",80).toLowerCase();
  const seedEmployeePin=String(env.LOCAL_EMPLOYEE_PIN||"");
  const seedEmployeeName=cleanText(env.LOCAL_EMPLOYEE_NAME||seedEmployeeId,120)||seedEmployeeId;
  if(!seedEmployeeId||!seedEmployeePin)return;
  const row=await env.DB.prepare("SELECT employee_id FROM employee_users WHERE lower(employee_id)=? LIMIT 1").bind(seedEmployeeId).first();
  if(!row){
    const salt=env.PW_SALT||env.JWT_SECRET||"homelink";
    const pinHash=await hashPassword(seedEmployeePin,salt);
    await env.DB.prepare(`INSERT OR REPLACE INTO employee_users
      (employee_id, employee_name, pin_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'staff', 'ACTIVE', ?, ?)`)
      .bind(seedEmployeeId,seedEmployeeName,pinHash,new Date().toISOString(),new Date().toISOString()).run();
  }
}
__name(ensureEmployeeUsers,"ensureEmployeeUsers");
async function handleEmployeePinLogin(request,env){
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const employeeId=cleanText(body?.employee_id||body?.userid||"",80).toLowerCase();
  const pin=String(body?.pin||body?.password||"");
  if(!employeeId||!pin)return badRequest("employee_id_pin_required");
  const blocked=await checkRateLimit(request,env);
  if(blocked)return blocked;
  await ensureEmployeeUsers(env);
  const row=await env.DB.prepare("SELECT * FROM employee_users WHERE lower(employee_id)=? AND status='ACTIVE' LIMIT 1").bind(employeeId).first();
  const salt=env.PW_SALT||env.JWT_SECRET||"homelink";
  if(!row||!(await verifyPassword(pin,row.pin_hash,salt)))return unauthorized("invalid_employee_pin");
  await clearRateLimit(request,env);
  const corpid=env.CORPID||"homelink";
  const employeeTtl=SESSION_TTL_SECONDS;
  const sid=await createSession(request,env,{role:row.role||"staff",userid:row.employee_id,corpid},employeeTtl);
  const token=await signJWT({role:row.role||"staff",userid:row.employee_id,employee_name:row.employee_name,corpid,sid},env.JWT_SECRET,employeeTtl);
  return new Response(JSON.stringify({success:true,role:row.role||"staff",userid:row.employee_id,employee_name:row.employee_name}),{
    status:200,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":"Content-Type, Authorization",
      "Set-Cookie":makeSessionCookie(token,employeeTtl)
    }
  });
}
__name(handleEmployeePinLogin,"handleEmployeePinLogin");
async function handleConfirmManager(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid_json");
  }
  const { password } = body;
  if (!password || typeof password !== "string") {
    return badRequest("missing_or_invalid_password");
  }
  const blocked = await checkRateLimit(request, env);
  if (blocked) return blocked;
  const resolved = await resolveRole(password, env);
  const role = typeof resolved === "string" ? resolved : resolved?.role;
  if (role !== "manager") return unauthorized("invalid_credentials");
  await clearRateLimit(request, env);
  return new Response(JSON.stringify({ ok: true, role: "manager" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
__name(handleConfirmManager, "handleConfirmManager");
async function handleLogout(request, env) {
  const revoked = await revokeSession(request, env);
  return json(ok({ success: true, revoked: Boolean(revoked?.revoked) }), 200, {
    "Set-Cookie": clearSessionCookie()
  });
}
__name(handleLogout, "handleLogout");

// src/lib/secret-store.js
var PREFIX = "enc:v1:";
var TEXT = new TextEncoder();
var DECODER = new TextDecoder();
function bytesToB64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
__name(bytesToB64, "bytesToB64");
function b64ToBytes(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
__name(b64ToBytes, "b64ToBytes");
async function encryptionKey(env = {}) {
  const secret = String(env.DATA_ENCRYPTION_KEY || env.JWT_SECRET || "").trim();
  if (!secret) throw new Error("encryption_key_missing");
  const digest = await crypto.subtle.digest("SHA-256", TEXT.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
__name(encryptionKey, "encryptionKey");
function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}
__name(isEncryptedSecret, "isEncryptedSecret");
async function encryptSecret(value, env = {}) {
  const plain = String(value || "");
  if (!plain || isEncryptedSecret(plain)) return plain;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(env);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, TEXT.encode(plain));
  return `${PREFIX}${bytesToB64(iv)}:${bytesToB64(new Uint8Array(cipher))}`;
}
__name(encryptSecret, "encryptSecret");
async function decryptSecret(value, env = {}) {
  const raw = String(value || "");
  if (!isEncryptedSecret(raw)) return raw;
  const [ivB64, cipherB64] = raw.slice(PREFIX.length).split(":");
  if (!ivB64 || !cipherB64) return "";
  try {
    const key = await encryptionKey(env);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(ivB64) },
      key,
      b64ToBytes(cipherB64)
    );
    return DECODER.decode(plain);
  } catch {
    return "";
  }
}
__name(decryptSecret, "decryptSecret");

// src/index.js
var TTLOCK_API_ORIGIN = "https://api.sciener.com";
var MAX_TEXT = 240;
var MAX_LONG_TEXT = 1e3;
var MAX_MONEY = 1e6;
var MAX_SESSION_ENTRIES = 800;
var VALID_CATS = /* @__PURE__ */ new Set(["cash", "bank", "refund", "expense"]);
var VALID_TAGS = /* @__PURE__ */ new Set(["Old", "New", "Transfer"]);
var VALID_PAY_TYPES = /* @__PURE__ */ new Set(["", "full", "partial"]);
var VALID_ARREAR_TYPES = /* @__PURE__ */ new Set(["rent", "deposit"]);
function requireManager(user) {
  return canWriteOwnerData(user);
}
__name(requireManager, "requireManager");
async function audit(env, user, action, target = "", detail = {}) {
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        corpid TEXT NOT NULL,
        userid TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT DEFAULT '',
        detail TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT (datetime('now'))
      )`
    ).run();
    await env.DB.prepare(
      `INSERT INTO audit_logs (id, corpid, userid, role, action, target, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      user.corpid || "",
      user.userid || "",
      user.role || "",
      action,
      target,
      JSON.stringify(detail || {})
    ).run();
  } catch (e) {
    logger.warn({ action, err: e }, "Audit log failed");
  }
}
__name(audit, "audit");
function cleanText(value, max = MAX_TEXT) {
  return Array.from(String(value ?? ""))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return !(code <= 8 || code === 11 || code === 12 || code === 127 || code >= 14 && code <= 31);
    })
    .join("")
    .trim()
    .slice(0, max);
}
__name(cleanText, "cleanText");
function cleanId(value, max = 80) {
  const id = cleanText(value, max);
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : "";
}
__name(cleanId, "cleanId");
function cleanDate(value) {
  return cleanText(value, 32);
}
__name(cleanDate, "cleanDate");
function cleanMoney(value, min = 0, max = MAX_MONEY) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
}
__name(cleanMoney, "cleanMoney");
function cleanEnum(value, allowed, fallback = "") {
  const text = cleanText(value, 40);
  return allowed.has(text) ? text : fallback;
}
__name(cleanEnum, "cleanEnum");
function sanitizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const cat = cleanEnum(entry.cat, VALID_CATS, "");
  if (!cat) return null;
  const id = cleanId(entry.id) || crypto.randomUUID();
  return {
    id,
    cat,
    room: cleanText(entry.room, 40),
    amount: cleanMoney(entry.amount),
    due: cleanMoney(entry.due),
    paid: cleanMoney(entry.paid),
    deficit: cleanMoney(entry.deficit, -MAX_MONEY, MAX_MONEY),
    tag: cat === "expense" ? "Old" : cleanEnum(entry.tag, VALID_TAGS, "Old"),
    note: cleanText(entry.note, MAX_LONG_TEXT),
    roomTo: cleanText(entry.roomTo, 40),
    startDate: cleanDate(entry.startDate),
    depDue: cleanMoney(entry.depDue),
    depPaid: cleanMoney(entry.depPaid),
    depDef: cleanMoney(entry.depDef, -MAX_MONEY, MAX_MONEY),
    dueDate: cleanDate(entry.dueDate),
    depDate: cleanDate(entry.depDate),
    payType: cleanEnum(entry.payType, VALID_PAY_TYPES, ""),
    discountReason: cleanText(entry.discountReason, MAX_TEXT),
    depositCollection: !!entry.depositCollection
  };
}
__name(sanitizeEntry, "sanitizeEntry");
function sanitizeArrear(arrear, sessionId, validEntryIds) {
  if (!arrear || typeof arrear !== "object") return null;
  const id = cleanId(arrear.id) || crypto.randomUUID();
  const entryId = cleanId(arrear.entryId);
  return {
    id,
    room: cleanText(arrear.room, 40),
    note: cleanText(arrear.note, MAX_LONG_TEXT),
    remain: cleanMoney(arrear.remain),
    dueDate: cleanDate(arrear.dueDate),
    type: cleanEnum(arrear.type, VALID_ARREAR_TYPES, "rent"),
    sessionId,
    entryId: entryId && validEntryIds.has(entryId) ? entryId : ""
  };
}
__name(sanitizeArrear, "sanitizeArrear");
function sanitizeCustomer(customer) {
  if (!customer || typeof customer !== "object") return null;
  const payments = Array.isArray(customer.payments) ? customer.payments.slice(0, 240).map((payment) => {
    if (!payment || typeof payment !== "object") return null;
    return {
      id: cleanId(payment.id) || crypto.randomUUID(),
      exp: cleanDate(payment.exp),
      act: cleanDate(payment.act),
      amount: cleanMoney(payment.amount),
      note: cleanText(payment.note, MAX_TEXT)
    };
  }).filter(Boolean) : [];
  return {
    id: cleanId(customer.id) || crypto.randomUUID(),
    name: cleanText(customer.name, 120),
    room: cleanText(customer.room, 40),
    payments
  };
}
__name(sanitizeCustomer, "sanitizeCustomer");
async function decryptWifiAccounts(accounts, env) {
  const out = {};
  for (const [bed, account] of Object.entries(accounts || {})) {
    if (!account || typeof account !== "object") continue;
    out[bed] = {
      ...account,
      password: await decryptSecret(account.password || "", env)
    };
  }
  return out;
}
__name(decryptWifiAccounts, "decryptWifiAccounts");
async function encryptWifiAccounts(accounts, env) {
  const out = {};
  for (const [bed, account] of Object.entries(accounts || {})) {
    if (!account || typeof account !== "object") continue;
    out[bed] = {
      ...account,
      password: await encryptSecret(cleanText(account.password, 120), env)
    };
  }
  return out;
}
__name(encryptWifiAccounts, "encryptWifiAccounts");
function hasPlainWifiPasswords(accounts) {
  return Object.values(accounts || {}).some((account) => {
    const password = account && typeof account === "object" ? String(account.password || "") : "";
    return password && !isEncryptedSecret(password);
  });
}
__name(hasPlainWifiPasswords, "hasPlainWifiPasswords");
async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (text.startsWith("<")) throw new Error("upstream_html_response");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    let source = "upstream";
    try {
      source = new URL(url).pathname;
    } catch {
    }
    throw new Error(`upstream_invalid_json:${source}`);
  }
  if (!response.ok) throw new Error(data?.errmsg || data?.message || `upstream_${response.status}`);
  return data;
}
__name(fetchJson, "fetchJson");
async function fetchJsonOrNull(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (text.trim().startsWith("<")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(fetchJsonOrNull, "fetchJsonOrNull");
async function loadLockCards(env) {
  const apiOrigin = String(env.TTLOCK_API_ORIGIN || TTLOCK_API_ORIGIN).trim().replace(/\/+$/, "");
  const clientId = String(env.TTLOCK_CLIENT_ID || "").trim();
  const clientSecret = String(env.TTLOCK_CLIENT_SECRET || "").trim();
  const username = String(env.TTLOCK_USERNAME || "").trim();
  const password = String(env.TTLOCK_PASSWORD || "").trim();
  if (!clientId || !clientSecret || !username || !password) {
    return { error: "ttlock_not_configured", status: 500 };
  }
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
    grant_type: "password"
  });
  const tokenData = await fetchJson(`${apiOrigin}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString()
  });
  if (!tokenData.access_token) {
    return { error: tokenData.errmsg || "ttlock_token_failed", status: 502 };
  }
  const lockBody = new URLSearchParams({
    clientId,
    accessToken: tokenData.access_token,
    date: String(Date.now()),
    pageNo: "1",
    pageSize: "100"
  });
  const lockData = await fetchJson(`${apiOrigin}/v3/lock/list`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: lockBody.toString()
  });
  const locks = Array.isArray(lockData.list) ? lockData.list : [];
  locks.sort((a, b) => String(a.lockAlias || "").localeCompare(String(b.lockAlias || ""), void 0, { numeric: true }));
  const roomsData = {};
  for (const lock of locks) {
    const room = lock.lockAlias || lock.lockName || String(lock.lockId);
    roomsData[room] = [];
    const seen = /* @__PURE__ */ new Set();
    let page = 1;
    let total = 1;
    do {
      const qs = new URLSearchParams({
        clientId,
        accessToken: tokenData.access_token,
        lockId: String(lock.lockId),
        date: String(Date.now()),
        pageNo: String(page),
        pageSize: "20"
      });
      const data = await fetchJsonOrNull(`${apiOrigin}/v3/identityCard/list?${qs.toString()}`);
      if (!data) break;
      total = Number(data.pages || 1);
      for (const card of data.list || []) {
        const cid = card.cardId !== void 0 ? card.cardId : card.cardNumber;
        if (cid !== void 0 && seen.has(cid)) continue;
        if (cid !== void 0) seen.add(cid);
        const cardName = card.cardName || card.identityCardName || card.cardAlias || card.alias || card.name || card.userName || card.nickName || "(\u65E0)";
        const remark = [
          card.remark,
          card.remarks,
          card.cardRemark,
          card.memo,
          card.note,
          card.description,
          card.desc,
          card.comment
        ].filter((v)=>v !== void 0 && v !== null && String(v).trim()).join(" ");
        roomsData[room].push({
          ...card,
          room,
          cardName,
          endDate: card.endDate || 0,
          remark
        });
      }
      page++;
    } while (page <= total);
  }
  return { roomsData, locksCount: locks.length, loadedAt: (/* @__PURE__ */ new Date()).toISOString() };
}
__name(loadLockCards, "loadLockCards");
// EMPLOYEE_API_PATCH_START
const EMP_TX_COLUMNS = [
  "id","corpid","userid","session_id","cat","room","amount","due","paid","deficit","tag","note","room_to",
  "start_date","dep_due","dep_paid","dep_def","due_date","dep_date","pay_type","discount_reason","deposit_collection",
  "period_start","period_end","cycle","reason_code","operator_id","src","tenant_name","clr","reason","created_at",
  "type","tenant_card_id","list_price","period_day_count","period_due","custom_reason","entry_clr","excess","excess_to",
  "bank_ref","status","ts","checkout_date","deposit_held","deposit_return","deposit_amt","deposit_deduction",
  "ded_reason","ded_days","ded_rate","ded_note","early_days","arrear_handling","bed_from","bed_to","fee_paid",
  "fee_waiver_reason","expense_category","expense_desc","linked_task_id","original_period_start","original_period_end",
  "arrear_promise_date","arrear_reason_detail","promise_amount","operator_name",
  "voided_at","voided_by","void_reason","void_source"
];
const EMP_TASK_COLUMNS = [
  "task_id","corpid","userid","entry_id","bed","tenant_name","arrear_amount","arrear_reason","created_at",
  "followup_status","promise_date","promise_amount","actual_received","close_status","close_reason","owner_note","staff_note","last_followup_at","updated_by","updated_at",
  "tenant_card_id","original_entry_id","original_period_start","original_period_end","created_by",
  "boss_requested_at","boss_requested_by","boss_requested_due_date","directive_status","staff_promised_at",
  "write_off_authorized","write_off_reason","write_off_at",
  "source_type","source_ref","source_fingerprint","materialized_from",
  "voided_at","voided_by","void_reason","void_source"
];
const EMP_SESSION_COLUMNS = [
  "id","corpid","anchor_id","date","entries_count","created_by","created_at",
  "operator_id","operator_name","cash_handover","bank_transfer_total","bank_transfer_count",
  "gross_received","handover_status","exported_at","export_text","source",
  "entries_json","summary_json",
  "voided_at","voided_by","void_reason","void_source"
];
const EMP_EVENT_COLUMNS = [
  "event_id","corpid","userid","ref_id","ref_type","event_type","field_name","old_value","new_value","operator_id","ts"
];
const EMP_DEPOSIT_COLUMNS = [
  "ledger_id","corpid","userid","tenant_card_id","tenant_name","bed","entry_id","type","amount","delta",
  "balance_after","note","operator_id","ts","voided_at","voided_by","void_reason","void_source"
];
const BED_TRANSFER_EVENT_COLUMNS = [
  "id","transfer_id","corp_id","tenant_scope","from_bed","to_bed","transfer_date","effective_date",
  "customer_id","customer_code","customer_display_name","original_checkin_date","original_rent_period_start",
  "original_rent_period_end","original_deposit_amount_fils","current_rent_amount_fils","new_bed_rent_amount_fils",
  "rent_difference_fils","transfer_fee_fils","amount_fils","fee_mode","fee_status","payment_method","waiver_reason","category",
  "review_flags",
  "carry_over_arrears_fils","old_ttlock_ref","new_ttlock_ref",
  "old_lock_valid_from","old_lock_valid_until","new_lock_valid_from","new_lock_valid_until","reason","note",
  "operator_employee","status","audit_id","trace_id","entry_event_id","qa_tag","created_at","updated_at"
];
async function empTableColumns(env, table){
  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((r.results||[]).map(x=>x.name));
}
__name(empTableColumns,"empTableColumns");
async function empTableExists(env, table){
  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
  return !!r;
}
__name(empTableExists,"empTableExists");
async function empAddColumn(env, table, col, ddl){
  const cols=await empTableColumns(env,table);
  if(cols.has(col))return false;
  await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`).run();
  return true;
}
__name(empAddColumn,"empAddColumn");
async function empAddVoidColumns(env, table){
  await empAddColumn(env,table,"voided_at","TEXT");
  await empAddColumn(env,table,"voided_by","TEXT");
  await empAddColumn(env,table,"void_reason","TEXT");
  await empAddColumn(env,table,"void_source","TEXT");
}
__name(empAddVoidColumns,"empAddVoidColumns");
async function empEnsureSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    corpid TEXT,
    anchor_id TEXT,
    date TEXT,
    entries_count INTEGER,
    created_by TEXT,
    created_at TEXT
  )`).run();
  await empAddColumn(env,"sessions","operator_id","TEXT");
  await empAddColumn(env,"sessions","operator_name","TEXT");
  await empAddColumn(env,"sessions","cash_handover","REAL");
  await empAddColumn(env,"sessions","bank_transfer_total","REAL");
  await empAddColumn(env,"sessions","bank_transfer_count","INTEGER");
  await empAddColumn(env,"sessions","gross_received","REAL");
  await empAddColumn(env,"sessions","handover_status","TEXT");
  await empAddColumn(env,"sessions","exported_at","TEXT");
  await empAddColumn(env,"sessions","export_text","TEXT");
  await empAddColumn(env,"sessions","source","TEXT");
  await empAddVoidColumns(env,"sessions");
  if(await empTableExists(env,"transactions")){
    await empAddColumn(env,"transactions","pay_type","TEXT");
    await empAddColumn(env,"transactions","period_start","TEXT");
    await empAddColumn(env,"transactions","period_end","TEXT");
    await empAddColumn(env,"transactions","cycle","TEXT");
    await empAddColumn(env,"transactions","reason_code","TEXT");
    await empAddColumn(env,"transactions","operator_id","TEXT");
    await empAddColumn(env,"transactions","operator_name","TEXT");
    await empAddColumn(env,"transactions","src","TEXT DEFAULT 'EMP'");
    await empAddColumn(env,"transactions","tenant_name","TEXT");
    await empAddColumn(env,"transactions","clr","TEXT");
    await empAddColumn(env,"transactions","reason","TEXT");
    await empAddColumn(env,"transactions","type","TEXT");
    await empAddColumn(env,"transactions","tenant_card_id","TEXT");
    await empAddColumn(env,"transactions","list_price","REAL");
    await empAddColumn(env,"transactions","period_day_count","INTEGER");
    await empAddColumn(env,"transactions","period_due","REAL");
    await empAddColumn(env,"transactions","custom_reason","TEXT");
    await empAddColumn(env,"transactions","entry_clr","TEXT");
    await empAddColumn(env,"transactions","excess","REAL");
    await empAddColumn(env,"transactions","excess_to","TEXT");
    await empAddColumn(env,"transactions","bank_ref","TEXT");
    await empAddColumn(env,"transactions","status","TEXT DEFAULT 'ACTIVE'");
    await empAddColumn(env,"transactions","ts","TEXT");
    await empAddColumn(env,"transactions","checkout_date","TEXT");
    await empAddColumn(env,"transactions","deposit_held","REAL");
    await empAddColumn(env,"transactions","deposit_return","TEXT");
    await empAddColumn(env,"transactions","deposit_amt","REAL");
    await empAddColumn(env,"transactions","deposit_deduction","REAL");
    await empAddColumn(env,"transactions","ded_reason","TEXT");
    await empAddColumn(env,"transactions","ded_days","INTEGER");
    await empAddColumn(env,"transactions","ded_rate","REAL");
    await empAddColumn(env,"transactions","ded_note","TEXT");
    await empAddColumn(env,"transactions","early_days","INTEGER");
    await empAddColumn(env,"transactions","arrear_handling","TEXT");
    await empAddColumn(env,"transactions","bed_from","TEXT");
    await empAddColumn(env,"transactions","bed_to","TEXT");
    await empAddColumn(env,"transactions","fee_paid","TEXT");
    await empAddColumn(env,"transactions","fee_waiver_reason","TEXT");
    await empAddColumn(env,"transactions","expense_category","TEXT");
    await empAddColumn(env,"transactions","expense_desc","TEXT");
    await empAddColumn(env,"transactions","linked_task_id","TEXT");
    await empAddColumn(env,"transactions","original_period_start","TEXT");
    await empAddColumn(env,"transactions","original_period_end","TEXT");
    await empAddColumn(env,"transactions","arrear_promise_date","TEXT");
    await empAddColumn(env,"transactions","arrear_reason_detail","TEXT");
    await empAddColumn(env,"transactions","promise_amount","REAL");
    await empAddVoidColumns(env,"transactions");
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS arrear_tasks (
    task_id TEXT PRIMARY KEY,
    corpid TEXT,
    userid TEXT,
    entry_id TEXT,
    bed TEXT,
    tenant_name TEXT,
    arrear_amount REAL,
    arrear_reason TEXT,
    created_at TEXT,
    followup_status TEXT DEFAULT '待跟进',
    promise_date TEXT,
    promise_amount REAL,
    actual_received REAL DEFAULT 0,
    close_status TEXT,
    updated_by TEXT,
    updated_at TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS entry_events (
    event_id TEXT PRIMARY KEY,
    corpid TEXT,
    userid TEXT,
    ref_id TEXT,
    ref_type TEXT,
    event_type TEXT,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    operator_id TEXT,
    ts TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS deposit_ledger (
    ledger_id TEXT PRIMARY KEY,
    corpid TEXT,
    userid TEXT,
    tenant_card_id TEXT,
    tenant_name TEXT,
    bed TEXT,
    entry_id TEXT,
    type TEXT,
    amount REAL,
    delta REAL,
    balance_after REAL,
    note TEXT,
    operator_id TEXT,
    ts TEXT
  )`).run();
  await empAddColumn(env,"arrear_tasks","tenant_card_id","TEXT");
  await empAddColumn(env,"arrear_tasks","original_entry_id","TEXT");
  await empAddColumn(env,"arrear_tasks","original_period_start","TEXT");
  await empAddColumn(env,"arrear_tasks","original_period_end","TEXT");
  await empAddColumn(env,"arrear_tasks","created_by","TEXT");
  await empAddColumn(env,"arrear_tasks","close_reason","TEXT");
  await empAddColumn(env,"arrear_tasks","owner_note","TEXT");
  await empAddColumn(env,"arrear_tasks","staff_note","TEXT");
  await empAddColumn(env,"arrear_tasks","last_followup_at","TEXT");
  await empAddColumn(env,"arrear_tasks","boss_requested_at","TEXT");
  await empAddColumn(env,"arrear_tasks","boss_requested_by","TEXT");
  await empAddColumn(env,"arrear_tasks","boss_requested_due_date","TEXT");
  await empAddColumn(env,"arrear_tasks","directive_status","TEXT DEFAULT 'none'");
  await empAddColumn(env,"arrear_tasks","staff_promised_at","TEXT");
  await empAddColumn(env,"arrear_tasks","write_off_authorized","TEXT");
  await empAddColumn(env,"arrear_tasks","write_off_reason","TEXT");
  await empAddColumn(env,"arrear_tasks","write_off_at","TEXT");
  await empAddColumn(env,"arrear_tasks","source_type","TEXT");
  await empAddColumn(env,"arrear_tasks","source_ref","TEXT");
  await empAddColumn(env,"arrear_tasks","source_fingerprint","TEXT");
  await empAddColumn(env,"arrear_tasks","materialized_from","TEXT");
  await empAddVoidColumns(env,"arrear_tasks");
  await empAddVoidColumns(env,"deposit_ledger");
  if(await empTableExists(env,"arrears")){
    await empAddVoidColumns(env,"arrears");
  }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_cid_period ON transactions(corpid, tenant_card_id, period_start, period_end)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_directive ON arrear_tasks(corpid, directive_status, boss_requested_due_date, promise_date)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end)").run().catch(()=>{});
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_arrear_tasks_source_unique ON arrear_tasks(corpid, source_type, source_ref) WHERE source_type IS NOT NULL AND source_type!='' AND source_ref IS NOT NULL AND source_ref!=''").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid ON deposit_ledger(corpid, tenant_card_id, ts)").run();
}
__name(empEnsureSchema,"empEnsureSchema");
function empId(prefix){return prefix+"-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8);}
__name(empId,"empId");
function empNow(){return new Date().toISOString();}
__name(empNow,"empNow");
function empDateParts(value){
  const m=cleanText(value,20).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const dt=new Date(Date.UTC(y,mo-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;
  return {y,mo,d};
}
__name(empDateParts,"empDateParts");
function empDateMs(value){
  const p=empDateParts(value);
  return p?Date.UTC(p.y,p.mo-1,p.d):NaN;
}
__name(empDateMs,"empDateMs");
function empFormatDate(dt){
  const pad=n=>String(n).padStart(2,"0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}`;
}
__name(empFormatDate,"empFormatDate");
function empAddDays(dateStr,days){
  const ms=empDateMs(dateStr);
  if(!Number.isFinite(ms))return "";
  const dt=new Date(ms);
  dt.setUTCDate(dt.getUTCDate()+Number(days||0));
  return empFormatDate(dt);
}
__name(empAddDays,"empAddDays");
function empAddMonths(dateStr,months){
  const p=empDateParts(dateStr);
  if(!p)return "";
  const dt=new Date(Date.UTC(p.y,p.mo-1,p.d));
  const day=dt.getUTCDate();
  dt.setUTCMonth(dt.getUTCMonth()+Number(months||0));
  if(dt.getUTCDate()!==day)dt.setUTCDate(0);
  return empFormatDate(dt);
}
__name(empAddMonths,"empAddMonths");
function empTodayDubai(){
  try{
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const pick=t=>parts.find(p=>p.type===t)?.value;
    return `${pick("year")}-${pick("month")}-${pick("day")}`;
  }catch{
    return new Date().toISOString().slice(0,10);
  }
}
__name(empTodayDubai,"empTodayDubai");
function empDaysBetween(a,b){
  const am=empDateMs(a),bm=empDateMs(b);
  if(!Number.isFinite(am)||!Number.isFinite(bm))return 0;
  return Math.max(0,Math.round((bm-am)/86400000));
}
__name(empDaysBetween,"empDaysBetween");
function empCleanIsoDate(value){
  const d=cleanDate(value||"");
  return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:"";
}
__name(empCleanIsoDate,"empCleanIsoDate");
function empDirectiveStatus(t){
  const raw=cleanText(t?.directive_status||"none",20);
  return ["none","pending","assigned","viewed","promised","followed_up","needs_review","closed","cancelled","overdue"].includes(raw)?raw:"none";
}
__name(empDirectiveStatus,"empDirectiveStatus");
function empDirectiveIsOverdue(t){
  const status=empDirectiveStatus(t);
  const promise=empCleanIsoDate(t?.promise_date||"");
  return (status==="promised"||status==="followed_up"||status==="needs_review"||status==="overdue")&&promise&&promise<empTodayDubai()&&empTaskRemaining(t)>0;
}
__name(empDirectiveIsOverdue,"empDirectiveIsOverdue");
function arrearsDirectiveWriteApproved(env){
  return String(env?.ARREARS_DIRECTIVE_WRITE_APPROVED||"").toLowerCase()==="true" ||
    String(env?.ARREARS_DIRECTIVE_WRITE_MODE||"").toLowerCase()==="approved";
}
__name(arrearsDirectiveWriteApproved,"arrearsDirectiveWriteApproved");
function arrearsDirectiveApprovalRequired(operation="arrears_directive_write"){
  return errorResponse("production_write_approval_required",409,void 0,{
    approval_required:true,
    operation,
    dry_run_only:true
  });
}
__name(arrearsDirectiveApprovalRequired,"arrearsDirectiveApprovalRequired");
function normalizeDirectiveStatusForEmployee(status){
  const raw=cleanText(status||"none",30);
  if(raw==="pending")return "assigned";
  if(raw==="promised")return "promised";
  return ["assigned","viewed","followed_up","needs_review","closed","cancelled","overdue"].includes(raw)?raw:"none";
}
__name(normalizeDirectiveStatusForEmployee,"normalizeDirectiveStatusForEmployee");
async function empInsertDynamic(env, table, values, allowed){
  const cols=await empTableColumns(env,table);
  const names=[];
  const vals=[];
  for(const k of allowed){
    if(cols.has(k)&&values[k]!==void 0){names.push(k);vals.push(values[k]);}
  }
  if(!names.length)return {inserted:false,columns:[]};
  await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${names.join(",")}) VALUES (${names.map(()=>"?").join(",")})`).bind(...vals).run();
  return {inserted:true,columns:names};
}
__name(empInsertDynamic,"empInsertDynamic");
async function empInsertDynamicMode(env, table, values, allowed, mode="INSERT"){
  const cols=await empTableColumns(env,table);
  const names=[];
  const vals=[];
  for(const k of allowed){
    if(cols.has(k)&&values[k]!==void 0){names.push(k);vals.push(values[k]);}
  }
  if(!names.length)return {inserted:false,columns:[]};
  const verb=mode==="INSERT_OR_IGNORE"?"INSERT OR IGNORE":"INSERT";
  const result=await env.DB.prepare(`${verb} INTO ${table} (${names.join(",")}) VALUES (${names.map(()=>"?").join(",")})`).bind(...vals).run();
  return {inserted:Number(result?.meta?.changes??result?.changes??0)>0,columns:names};
}
__name(empInsertDynamicMode,"empInsertDynamicMode");
async function empEvent(env,user,event){
  await empInsertDynamic(env,"entry_events",{
    event_id:empId("evt"),corpid:user.corpid,userid:user.userid,ref_id:event.ref_id,ref_type:event.ref_type,
    event_type:event.event_type,field_name:event.field_name||"",old_value:event.old_value==null?"":String(event.old_value),
    new_value:event.new_value==null?"":String(event.new_value),operator_id:event.operator_id||user.userid||"",ts:event.ts||empNow()
  },EMP_EVENT_COLUMNS);
}
__name(empEvent,"empEvent");
async function empDepositBalance(env, corpid, tenantCardId){
  if(!tenantCardId)return 0;
  const row=await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM deposit_ledger WHERE corpid=? AND tenant_card_id=? AND COALESCE(voided_at,'')=''")
    .bind(corpid,tenantCardId).first();
  return Number(row?.balance||0);
}
__name(empDepositBalance,"empDepositBalance");
const CANONICAL_DEPOSIT_REQUIRED_TOTAL=200;
function canonicalDepositMoney(value){
  const amount=Number(value);
  return Number.isFinite(amount)?Math.round(amount*100)/100:0;
}
__name(canonicalDepositMoney,"canonicalDepositMoney");
function canonicalDepositUniqueTextParts(parts=[]){
  const seen=new Set();
  return (parts||[]).map(value=>cleanText(value??"",1000)).filter(Boolean).filter(value=>{
    const key=value.toLowerCase();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
__name(canonicalDepositUniqueTextParts,"canonicalDepositUniqueTextParts");
function canonicalDepositRemarkText(card={},lockRoom=""){
  return canonicalDepositUniqueTextParts([
    card.remark,
    card.remarks,
    card.cardRemark,
    card.memo,
    card.note,
    card.description,
    card.desc,
    card.comment,
    card.cardName,
    card.identityCardName,
    card.cardAlias,
    card.alias,
    card.name,
    card.tenant_name,
    card.tenant,
    card.userName,
    card.nickName,
    card.keyName,
    card.keyboardPwdName,
    card.room,
    lockRoom
  ]).join(" ");
}
__name(canonicalDepositRemarkText,"canonicalDepositRemarkText");
function canonicalDepositCardMatchesBed(card={},lockRoom="",bed=""){
  const cleanBed=cleanText(bed,80).replace(/^#/,"");
  if(!cleanBed)return false;
  const directBed=cleanText(card.bed||card.room||lockRoom||"",80).replace(/^#/,"");
  const remark=canonicalDepositRemarkText(card,lockRoom);
  const snapshot=buildAccessSnapshotDTO(remark,{property_id:"homelink"});
  return snapshot.bed===cleanBed||directBed===cleanBed;
}
__name(canonicalDepositCardMatchesBed,"canonicalDepositCardMatchesBed");
async function canonicalDepositAccessSnapshotForBed(env,user,bed,opts={}){
  const cleanBed=cleanText(bed,80).replace(/^#/,"");
  if(!cleanBed)return {snapshot:null,card:null,source_status:"missing_bed",warning:"bed_required"};
  const strict=opts.strict_access_snapshot===true;
  const lockResult=await empLoadLockCardsWithCacheFallback(env,user,{timeoutMs:8000,limit:500,strict_access_snapshot:strict}).catch(e=>({error:empTtlockReadErrorCode(e),roomsData:{},data_source:"live_api",fallback:false,strict_access_snapshot:strict}));
  const candidates=[];
  for(const [lockRoom,cards] of Object.entries(lockResult?.roomsData||{})){
    for(const card of cards||[]){
      if(!canonicalDepositCardMatchesBed(card,lockRoom,cleanBed))continue;
      const remark=canonicalDepositRemarkText(card,lockRoom);
      const snapshot=buildAccessSnapshotDTO(remark,{
        property_id:user?.corpid||"homelink",
        synced_at:lockResult?.loadedAt||empNow(),
        provider_metadata:{
          card_id:card.cardId||card.cardNumber||card.identityCardId||"",
          tenant_card_id:card.tenant_card_id||card.identityCardId||card.cardId||card.cardNumber||"",
          provider_phone:card.provider_phone||card.phone||card.mobile||""
        }
      });
      const cardLabel=cleanText(card.cardName||card.identityCardName||card.cardAlias||card.name||card.tenant_name||card.tenant||"",160);
      const inactive=(typeof empTtlockIsVacant==="function"&&empTtlockIsVacant(cardLabel))||(typeof empTtlockIsStaff==="function"&&empTtlockIsStaff(cardLabel));
      candidates.push({snapshot,card:{room:cleanText(card.room||lockRoom||"",80),card_name:cardLabel,remark:cleanText(remark,1000)},inactive});
    }
  }
  const candidateCount=candidates.length;
  const ambiguous=candidateCount!==1;
  const conflict=candidateCount>1;
  const fallback=lockResult?.fallback===true;
  const stale=lockResult?.stale===true||String(lockResult?.source_status||"").toLowerCase()==="stale";
  const metadata={data_source:cleanText(lockResult?.data_source||"unknown",80),fallback,candidate_count:candidateCount,ambiguous,conflict,stale,strict_access_snapshot:strict,fallback_rejected:strict&&fallback};
  if(strict&&(lockResult?.error||fallback||ambiguous||conflict))return {
    snapshot:null,
    card:null,
    source_status:lockResult?.error?"access_snapshot_unavailable":"strict_access_snapshot_unavailable",
    warning:lockResult?.error||"strict_access_snapshot_candidate_invalid",
    error:lockResult?.error||"strict_access_snapshot_candidate_invalid",
    ...metadata
  };
  const chosen=candidates.find(row=>!row.inactive&&row.snapshot?.parsed_deposit_amount!==null)||candidates.find(row=>!row.inactive)||candidates[0]||null;
  return {
    snapshot:chosen?.snapshot||null,
    card:chosen?.card||null,
    source_status:lockResult?.error?"access_snapshot_unavailable":(chosen?"loaded":"not_found"),
    warning:lockResult?.error||"",
    ...metadata
  };
}
__name(canonicalDepositAccessSnapshotForBed,"canonicalDepositAccessSnapshotForBed");
async function canonicalDepositAuditEventsForBed(env,user,bed,opts={}){
  const cleanBed=cleanText(bed,80).replace(/^#/,"");
  if(!cleanBed)return [];
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{limit:opts.limit||1000}).catch(()=>[]);
  const events=[];
  for(const session of sessions||[]){
    const anchors=extractEmployeeEntryAnchorsFromSession(session);
    for(let index=0;index<anchors.length;index++){
      const anchor=normalizeEntryAnchor(anchors[index]);
      const type=entryAnchorType(anchor);
      if(type!=="D"&&type!=="DR")continue;
      const anchorBed=cleanText(anchor.bed||anchor.room||"",80).replace(/^#/,"");
      if(anchorBed!==cleanBed)continue;
      const amount=type==="D"
        ?canonicalDepositMoney(anchor.deposit_amount||anchor.amount||anchor.deposit_paid_amount||0)
        :canonicalDepositMoney(anchor.refund_amount||anchor.actual_refund_amount||anchor.amount||0);
      events.push({
        event_type:type==="D"?"deposit_in":"deposit_out",
        event_id:cleanText(anchor.event_id||anchor.entry_id||anchor.anchor_id||"",120),
        session_id:cleanText(session.id||session.session_id||"",120),
        session_anchor:cleanText(session.anchor_id||"",160),
        date:cleanDate(session.date||anchor.created_at||""),
        amount,
        previous_deposit_recorded_amount:canonicalDepositMoney(anchor.previous_deposit_recorded_amount||0),
        deposit_required_total:canonicalDepositMoney(anchor.deposit_required_total||0),
        deposit_paid_amount:canonicalDepositMoney(anchor.deposit_paid_amount||amount),
        expected_deposit_after_payment:canonicalDepositMoney(anchor.expected_deposit_after_payment||0),
        deposit_remaining_after_payment:canonicalDepositMoney(anchor.deposit_remaining_after_payment ?? anchor.deposit_remaining ?? 0),
        payment_method:entryAnchorPaymentMethod(anchor.payment_method||anchor.pay_type||""),
        source:"cloud_deposit_event_audit_only"
      });
    }
  }
  return events;
}
__name(canonicalDepositAuditEventsForBed,"canonicalDepositAuditEventsForBed");
async function canonicalDepositGateway(env,user,opts={}){
  const bed=cleanText(opts.bed||"",80).replace(/^#/,"");
  const requiredTotal=canonicalDepositMoney(opts.deposit_required_total||CANONICAL_DEPOSIT_REQUIRED_TOTAL);
  const access=opts.access_snapshot
    ?{snapshot:opts.access_snapshot,card:opts.card||null,source_status:"provided"}
    :await canonicalDepositAccessSnapshotForBed(env,user,bed);
  const snapshot=access.snapshot||null;
  const recorded=snapshot&&snapshot.parsed_deposit_amount!==null?canonicalDepositMoney(snapshot.parsed_deposit_amount):null;
  const remaining=recorded===null?null:Math.max(0,canonicalDepositMoney(requiredTotal-recorded));
  const auditEvents=Array.isArray(opts.cloud_deposit_events)?opts.cloud_deposit_events:await canonicalDepositAuditEventsForBed(env,user,bed,{limit:opts.limit||1000});
  const cloudNet=canonicalDepositMoney(auditEvents.reduce((sum,event)=>sum+(event.event_type==="deposit_out"?-canonicalDepositMoney(event.amount):canonicalDepositMoney(event.amount)),0));
  const expectedAfterPayment=canonicalDepositMoney(auditEvents.reduce((max,event)=>Math.max(max,canonicalDepositMoney(event.expected_deposit_after_payment||0)),0));
  const warnings=[];
  let status=recorded===null?"MISSING_D":"RECORDED";
  if(access.warning)warnings.push(access.warning);
  if(recorded===null&&auditEvents.length){
    status="NEEDS_RECONCILIATION";
  }else if(recorded!==null&&expectedAfterPayment>0&&recorded+0.01<expectedAfterPayment){
    status="NEEDS_RECONCILIATION";
    warnings.push("DEPOSIT_D_RECONCILIATION_REQUIRED");
  }else if(recorded!==null&&expectedAfterPayment<=0&&auditEvents.length&&Math.abs(cloudNet-recorded)>0.01){
    status="NEEDS_RECONCILIATION";
    warnings.push("DEPOSIT_SOURCE_MISMATCH");
  }
  return {
    ok:true,
    success:true,
    gateway:"canonical_deposit_gateway",
    bed,
    deposit_required_total:requiredTotal,
    deposit_recorded_amount:recorded,
    deposit_remaining:remaining,
    refundable_baseline:recorded,
    deposit_source:"access_snapshot_remark_D",
    deposit_source_status:status,
    parsed_checkin_mmdd:snapshot?.parsed_checkin_mmdd||"",
    parsed_valid_until_mmdd:snapshot?.parsed_valid_until_mmdd||"",
    source_proof:{
      source_layer:"L0 Access Snapshot",
      canonical_source:"Access Snapshot parsed D amount",
      field:"parsed_deposit_amount",
      raw_source:"access_card_remark",
      current_balance_source:"access_snapshot_remark_D",
      cloud_deposit_events_role:"audit_supporting_only",
      forbidden_identity_excluded:true,
      forbidden_identity_fields:["tenant_card_id","card_id","old_ttlock_ref","provider_phone","phone_99099"]
    },
    access_snapshot:snapshot?{
      access_snapshot_id:snapshot.access_snapshot_id,
      bed:snapshot.bed,
      parsed_deposit_amount:snapshot.parsed_deposit_amount,
      parsed_checkin_mmdd:snapshot.parsed_checkin_mmdd,
      parsed_valid_until_mmdd:snapshot.parsed_valid_until_mmdd,
      parse_status:snapshot.parse_status,
      warnings:snapshot.warnings||[]
    }:null,
    cloud_deposit_events:auditEvents,
    cloud_deposit_events_role:"audit_supporting_only",
    cloud_deposit_event_net:cloudNet,
    cloud_deposit_expected_after_payment:expectedAfterPayment,
    reconciliation_warnings:warnings,
    readonly:true,
    no_write:true
  };
}
__name(canonicalDepositGateway,"canonicalDepositGateway");
async function empDepositMove(env,user,move){
  if(move.entry_id){
    const existing=await env.DB.prepare(`SELECT ledger_id,balance_after,delta FROM deposit_ledger
      WHERE corpid=? AND tenant_card_id=? AND entry_id=? AND type=? AND COALESCE(voided_at,'')='' LIMIT 1`)
      .bind(user.corpid,move.tenant_card_id,move.entry_id,move.type||"").first();
    if(existing)return {ledger_id:existing.ledger_id,balance_after:Number(existing.balance_after||0),delta:Number(existing.delta||0),duplicate:true};
  }
  const before=await empDepositBalance(env,user.corpid,move.tenant_card_id);
  const delta=Number(move.delta||0);
  const balanceAfter=Math.max(0,Math.round((before+delta)*100)/100);
  const ledgerId=empId("dep");
  await empInsertDynamic(env,"deposit_ledger",{
    ledger_id:ledgerId,corpid:user.corpid,userid:user.userid,tenant_card_id:move.tenant_card_id,tenant_name:move.tenant_name||"",
    bed:move.bed||"",entry_id:move.entry_id||"",type:move.type||"",amount:Number(move.amount||Math.abs(delta)||0),
    delta,balance_after:balanceAfter,note:move.note||"",operator_id:move.operator_id||user.userid,ts:move.ts||empNow()
  },EMP_DEPOSIT_COLUMNS);
  return {ledger_id:ledgerId,balance_before:before,balance_after:balanceAfter,delta};
}
__name(empDepositMove,"empDepositMove");
async function empFindProjectionArrearsForPayment(env,user,taskId,bed=""){
  const cleanTaskId=cleanId(taskId);
  if(!cleanTaskId)return null;
  const gateway=await canonicalArrearsGateway(env,user,{bed,arrears_ref:cleanTaskId,limit:2000});
  const rows=[...(gateway.open_items||[]),...(gateway.closed_items||[]),...(gateway.all_items||[])];
  return rows.find(row=>[row.task_id,row.arrears_ref,row.id,row.source_ref].some(v=>cleanText(v,160)===cleanTaskId))||null;
}
__name(empFindProjectionArrearsForPayment,"empFindProjectionArrearsForPayment");
async function empReconcileArrearTask(env,user,taskId,operatorId,now,bed=""){
  const cleanTaskId=cleanId(taskId);
  if(!cleanTaskId)return null;
  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
    WHERE task_id=? AND corpid=? AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`)
    .bind(cleanTaskId,user.corpid).first();
  if(!task){
    const projected=await empFindProjectionArrearsForPayment(env,user,cleanTaskId,bed);
    if(!projected)return null;
    return {
      task_id:cleanTaskId,
      projection:true,
      source_session_id:projected.source_session_id||"",
      actual_received:cleanMoney(projected.actual_received||0),
      arrear_amount:cleanMoney(projected.arrear_amount||projected.original_arrears_amount||0),
      remaining_arrears:cleanMoney(projected.remaining_arrears||0),
      closed:String(projected.status||"").toLowerCase()==="settled"||cleanMoney(projected.remaining_arrears||0)<=0
    };
  }
  const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM transactions
    WHERE corpid=? AND linked_task_id=? AND COALESCE(status,'ACTIVE')='ACTIVE' AND COALESCE(type,'')='AP'`)
    .bind(user.corpid,cleanTaskId).first();
  const actual=Math.round(Number(paidRow?.total_paid||0)*100)/100;
  const target=Number(task.arrear_amount||0);
  const closed=actual>=target-0.01;
  await env.DB.prepare(`UPDATE arrear_tasks
    SET actual_received=?, followup_status=?, close_status=?, updated_by=?, updated_at=?
    WHERE task_id=? AND corpid=?`).bind(
      actual,
      closed?"已结清":(actual>0?"部分支付":(task.followup_status||"待跟进")),
      closed?"PAID":"",
      operatorId||user.userid,
      now||empNow(),
      cleanTaskId,
      user.corpid
    ).run();
  if(await empTableExists(env,"arrears")){
    const remain=Math.max(0,Math.round((target-actual)*100)/100);
    await env.DB.prepare(`UPDATE arrears
      SET remain=?,
          cleared=?,
          cleared_by=CASE WHEN ? THEN ? ELSE cleared_by END,
          cleared_at=CASE WHEN ? THEN datetime("now") ELSE cleared_at END
      WHERE id=? AND corpid=?`).bind(
        remain,
        closed?1:0,
        closed?1:0,
        operatorId||user.userid,
        closed?1:0,
        cleanTaskId,
        user.corpid
      ).run().catch(()=>{});
  }
  return {task_id:cleanTaskId,actual_received:actual,arrear_amount:target,closed};
}
__name(empReconcileArrearTask,"empReconcileArrearTask");
function empLeftWithArrearsMetaFromEntry(entry,taskId){
  const phone=cleanText(entry.whatsapp_phone||entry.former_customer_phone||"",80);
  const contactMethod=cleanText(entry.contact_method||"",40);
  const contactNote=cleanText(entry.contact_note||"",300);
  return {
    left_with_arrears:true,
    customer_left:true,
    arrears_id:cleanText(taskId||entry.cloud_arrears_ref||"",120),
    arrears_ref:cleanText(taskId||entry.cloud_arrears_ref||"",120),
    bed:cleanText(entry.bed||entry.room||"",40).replace(/^#+/,""),
    former_bed:cleanText(entry.bed||entry.room||"",40).replace(/^#+/,""),
    former_customer_ref:cleanText(entry.former_customer_ref||entry.tenant_card_id||"",120),
    former_customer_name:cleanText(entry.former_customer_name||entry.card_name||entry.tenant_name||"",120),
    card_name:cleanText(entry.card_name||entry.former_customer_name||entry.tenant_name||"",120),
    former_customer_phone:phone,
    whatsapp_phone:phone,
    contact_method:contactMethod||"whatsapp",
    contact_note:contactNote,
    checkout_date:cleanDate(entry.checkout_date||entry.left_date||entry.checkout_attempt_date||""),
    left_date:cleanDate(entry.left_date||entry.checkout_date||""),
    checkout_attempt_date:cleanDate(entry.checkout_attempt_date||entry.checkout_date||""),
    arrears_amount:cleanMoney(entry.arrears_amount||entry.outstanding_arrears||0),
    left_arrears_amount:cleanMoney(entry.left_arrears_amount||entry.arrears_amount||entry.outstanding_arrears||0),
    coverage_end_date:cleanDate(entry.coverage_end_date||entry.card_end_date||entry.rent_coverage_end||entry.old_lock_valid_until||""),
    card_end_date:cleanDate(entry.card_end_date||entry.coverage_end_date||entry.rent_coverage_end||entry.old_lock_valid_until||""),
    rent_coverage_end:cleanDate(entry.rent_coverage_end||entry.coverage_end_date||entry.card_end_date||entry.old_lock_valid_until||""),
    cloud_arrears_ref:cleanText(entry.cloud_arrears_ref||taskId||"",120),
    deposit_balance:cleanMoney(entry.deposit_balance||entry.deposit_held||0),
    belongings_held:entry.belongings_held===true||String(entry.belongings_held||"").toLowerCase()==="yes",
    belongings_note:cleanText(entry.belongings_note||"",500),
    promised_payment_date:cleanDate(entry.promised_payment_date||entry.promise_date||""),
    promised_return_date:cleanDate(entry.promised_return_date||entry.promise_return_date||""),
    promise_return_date:cleanDate(entry.promise_return_date||entry.promised_return_date||""),
    promise_note:cleanText(entry.promise_note||entry.note||entry.final_note||"",500),
    note:cleanText(entry.note||entry.final_note||"",500),
    left_status:cleanText(entry.left_status||"left_pending_return",80),
    final_status:cleanText(entry.final_status||"left_pending_return",80),
    status:cleanText(entry.status||"open",40),
    grace_days_after_promise:Number(entry.grace_days_after_promise||0)||0,
    review_date:cleanDate(entry.review_date||""),
    confirmed_not_returning_date:cleanDate(entry.confirmed_not_returning_date||""),
    confirmed_not_returning_by:cleanText(entry.confirmed_not_returning_by||"",80),
    confirmation_note:cleanText(entry.confirmation_note||"",500),
    original_session_id:cleanText(entry.original_session_id||entry.session_id||"",120),
    original_event_id:cleanText(entry.original_event_id||entry.event_id||entry.id||"",120),
    operator:cleanText(entry.operator||entry.operator_name||entry.operator_id||"",120),
    created_at:cleanText(entry.created_at||empNow(),40)
  };
}
__name(empLeftWithArrearsMetaFromEntry,"empLeftWithArrearsMetaFromEntry");
async function empApplyLeftWithArrearsMetadata(env,user,entry,entryId,operatorId,now){
  if(!entry?.left_with_arrears)return null;
  const taskId=cleanId(entry.cloud_arrears_ref||entry.arrears_ref||"");
  if(!taskId)return {ok:false,error:"cloud_arrears_ref_required"};
  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
    WHERE task_id=? AND corpid=? AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`)
    .bind(taskId,user.corpid).first();
  if(!task)return {ok:false,error:"cloud_arrears_not_open",task_id:taskId};
  const meta=empLeftWithArrearsMetaFromEntry({...entry,id:entryId},taskId);
  const marker=`LEFT_WITH_ARREARS ${JSON.stringify(meta)}`;
  const existingStaff=cleanText(task.staff_note||"",4000);
  const staffNote=existingStaff.includes("LEFT_WITH_ARREARS")?existingStaff:cleanText([existingStaff,marker].filter(Boolean).join("\n"),4000);
  const ownerNote=cleanText(task.owner_note||marker,4000);
  await env.DB.prepare(`UPDATE arrear_tasks
    SET staff_note=?, owner_note=?, updated_by=?, updated_at=?
    WHERE task_id=? AND corpid=?`).bind(staffNote,ownerNote,operatorId||user.userid,now||empNow(),taskId,user.corpid).run();
  await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"left_with_arrears_anchor",field_name:"staff_note",old_value:task.staff_note||"",new_value:marker,operator_id:operatorId||user.userid,ts:now||empNow()});
  return {ok:true,task_id:taskId,metadata:meta};
}
__name(empApplyLeftWithArrearsMetadata,"empApplyLeftWithArrearsMetadata");
async function empEnsureOpenArrearTaskForPayment(env,user,taskId,operatorId,now,bed=""){
  const cleanTaskId=cleanId(taskId);
  if(!cleanTaskId)return null;
  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
    WHERE task_id=? AND corpid=? LIMIT 1`).bind(cleanTaskId,user.corpid).first();
  if(existing){
    return empCloseStatusIsOpen(existing.close_status)&&empTaskRemaining(existing)>0?existing:null;
  }
  const projected=await empFindProjectionArrearsForPayment(env,user,cleanTaskId,bed);
  if(projected&&["open","partial"].includes(String(projected.status||"").toLowerCase())&&cleanMoney(projected.remaining_arrears||0)>0){
    return {
      ...projected,
      task_id:cleanTaskId,
      source:"cloud_arrears_projection",
      materialized_from:projected.materialized_from||"sessions.entries_json",
      arrear_amount:cleanMoney(projected.arrear_amount||projected.original_arrears_amount||0),
      actual_received:cleanMoney(projected.actual_received||projected.already_paid_amount||0),
      close_status:""
    };
  }
  if(!await empTableExists(env,"arrears"))return null;
  const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? AND cleared=0 LIMIT 1")
    .bind(cleanTaskId,user.corpid).first().catch(()=>null);
  if(!legacy)return null;
  const mapped=empLegacyArrearToTask(legacy);
  const created={
    ...mapped,
    source:void 0,
    corpid:user.corpid,
    userid:user.userid,
    created_at:mapped.created_at||now||empNow(),
    created_by:operatorId||user.userid,
    updated_by:operatorId||user.userid,
    updated_at:now||empNow()
  };
  await empInsertDynamic(env,"arrear_tasks",created,EMP_TASK_COLUMNS);
  await empEvent(env,user,{ref_id:cleanTaskId,ref_type:"arrear_task",event_type:"create",field_name:"*",new_value:JSON.stringify(created),operator_id:operatorId||user.userid,ts:now||empNow()});
  return created;
}
__name(empEnsureOpenArrearTaskForPayment,"empEnsureOpenArrearTaskForPayment");
async function empRentConfig(env, corpid){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
      corpid TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT DEFAULT '{}',
      updated_by TEXT DEFAULT '',
      updated_at DATETIME DEFAULT (datetime('now')),
      PRIMARY KEY (corpid, key)
    )`).run();
  const row=await env.DB.prepare("SELECT value FROM app_settings WHERE corpid=? AND key=? LIMIT 1").bind(corpid,"rent_ref_room").first();
  try{return row?.value?JSON.parse(row.value):{};}catch{return {};}
}
__name(empRentConfig,"empRentConfig");
async function empRentForBed(env, corpid, bed){
  const cfg=await empRentConfig(env,corpid);
  const key=String(bed||"").trim();
  const value=Number(cfg[key]);
  return Number.isFinite(value)&&value>0?Math.round(value*100)/100:0;
}
__name(empRentForBed,"empRentForBed");
async function empRentConfigReadOnly(env,corpid){
  if(!env?.DB||!await empTableExists(env,"app_settings"))return {};
  const row=await env.DB.prepare("SELECT value FROM app_settings WHERE corpid=? AND key=? LIMIT 1").bind(corpid,"rent_ref_room").first().catch(()=>null);
  try{
    const parsed=row?.value?JSON.parse(row.value):{};
    return Object.fromEntries(Object.entries(parsed||{}).map(([key,value])=>[String(key||"").trim(),Number(value)]).filter(([key,value])=>key&&Number.isFinite(value)&&value>0));
  }catch{
    return {};
  }
}
__name(empRentConfigReadOnly,"empRentConfigReadOnly");
async function handleEmployeeDeposit(request,env,user){
  await empEnsureSchema(env);
  const url=new URL(request.url);
  const bed=cleanText(url.searchParams.get("bed"),80).replace(/^#/,"");
  if(!bed)return badRequest("bed_required");
  const gateway=await canonicalDepositGateway(env,user,{bed,limit:1000});
  return success({
    ...gateway,
    balance:gateway.deposit_recorded_amount,
    balance_source:"access_snapshot_remark_D",
    tenant_card_id_identity_allowed:false
  });
}
__name(handleEmployeeDeposit,"handleEmployeeDeposit");
async function handleEmployeeMigrate(request,env,user){
  if(!requireManager(user))return forbidden();
  await empEnsureSchema(env);
  await audit(env,user,"employee.schema.migrate","employee").catch(()=>{});
  return success({success:true,migrated:true});
}
__name(handleEmployeeMigrate,"handleEmployeeMigrate");
async function handleEmployeeLockCards(request,env,user){
  const result=await empLoadLockCardsWithCacheFallback(env,user,{timeoutMs:8000,limit:500});
  if(result.error)return errorResponse(result.error,result.status||503,result.error);
  await audit(env,user,"employee.lock.cards.load","",{locksCount:result.locksCount,data_source:result.data_source||"live_api",fallback:!!result.fallback}).catch(()=>{});
  return success(result);
}
__name(handleEmployeeLockCards,"handleEmployeeLockCards");
function employeeEntryValidationExplanation(errorCode,message){
  const map={
    PAYLOAD_PARSE_FAILED:{
      en:"Upload payload could not be parsed.",
      zh:"上传数据格式无法解析。",
      action_en:"Refresh the page and try Upload Session again. If it repeats, copy the diagnostic response.",
      action_zh:"请刷新页面后重新上传；如果重复出现，请复制诊断返回。"
    },
    SHORT_PAID_DUE_DATE_REQUIRED:{
      en:"Short-paid rent requires an arrears due date.",
      zh:"短付收租必须填写尾款承诺日期。",
      action_en:"Enter the arrears due date, then upload again.",
      action_zh:"请填写尾款承诺日期后重新上传。"
    },
    RENT_PERIOD_INVALID:{
      en:"Rent period is invalid.",
      zh:"租金覆盖账期无效。",
      action_en:"Check the rent period start and end dates, then upload again.",
      action_zh:"请核对租金开始和结束日期后重新上传。"
    },
    CHECKOUT_OPEN_ARREARS_LEFT_WITH_ARREARS_REQUIRED:{
      en:"This customer has unpaid arrears. Normal checkout is not allowed.",
      zh:"该客户存在未清欠款，不能直接正常退房。",
      action_en:"Collect arrears first, choose Left With Arrears, or contact the owner.",
      action_zh:"请先收欠款、选择离店未清欠款，或联系老板审核。"
    },
    CHECKOUT_REQUIRED_FIELD_MISSING:{
      en:"Checkout entry is missing required fields.",
      zh:"退房记录缺少必填字段。",
      action_en:"Complete the missing checkout fields, then validate again.",
      action_zh:"请补齐退房必填字段后重新校验。"
    },
    LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING:{
      en:"Left With Arrears is missing required tracking fields.",
      zh:"离店未清欠款缺少必填追踪字段。",
      action_en:"Fill WhatsApp phone, left date, promised payment date, arrears amount, belongings status, and required notes.",
      action_zh:"请填写 WhatsApp 号码、离开日期、承诺付款日期、欠款金额、物品留存状态和必填备注。"
    },
    CLOUD_ARREARS_REF_REQUIRED:{
      en:"Left With Arrears requires an open Cloud Arrears reference.",
      zh:"离店未清欠款必须关联一笔未清云端欠款。",
      action_en:"Refresh arrears and select an open Cloud Arrears item.",
      action_zh:"请刷新欠款并选择一笔未清云端欠款。"
    },
    CLOUD_ARREARS_NOT_OPEN:{
      en:"The selected Cloud Arrears item is no longer open.",
      zh:"所选云端欠款已不是未清状态。",
      action_en:"Refresh arrears and choose an open or partial item.",
      action_zh:"请刷新欠款并选择 open 或 partial 状态的欠款。"
    },
    DUPLICATE_EVENT_FOUND:{
      en:"Duplicate event detected. This record was already uploaded.",
      zh:"发现重复记录。这条记录已经上传过。",
      action_en:"Remove already-synced records and upload only new records.",
      action_zh:"请删除已经同步的旧记录，只上传新的记录。"
    },
    DUPLICATE_SOURCE_FINGERPRINT:{
      en:"Duplicate source fingerprint detected. This source record was already uploaded.",
      zh:"发现重复来源指纹。该来源记录已经上传过。",
      action_en:"Remove already-synced records and upload only new records.",
      action_zh:"请删除已经同步的旧记录，只上传新的记录。"
    },
    DUPLICATE_CANONICAL_FINGERPRINT:{
      en:"Duplicate business event detected. This business record was already uploaded.",
      zh:"发现重复业务记录。该业务记录已经上传过。",
      action_en:"Remove already-synced records and upload only new records.",
      action_zh:"请删除已经同步的旧记录，只上传新的记录。"
    },
    DUPLICATE_EVENT_IN_PAYLOAD:{
      en:"Duplicate records were found inside the current upload payload.",
      zh:"当前上传本票内发现重复记录。",
      action_en:"Remove duplicate records from the current session, then upload again.",
      action_zh:"请从当前本票删除重复记录后重新上传。"
    }
  };
  const info=map[errorCode]||{};
  return {
    message_en:info.en||message||errorCode,
    message_zh:info.zh||"上传前校验未通过。",
    suggested_action_en:info.action_en||"Fix or remove the highlighted record, then upload again.",
    suggested_action_zh:info.action_zh||"请修正或删除高亮记录后重新上传。"
  };
}
__name(employeeEntryValidationExplanation,"employeeEntryValidationExplanation");
const HOMELINK_DIAGNOSTIC_ASSET_VERSION="upload-diagnostic-trace-20260707-001";
const HOMELINK_DIAGNOSTIC_COMMIT_HASH="runtime-git-commit";
const HOMELINK_DIAGNOSTIC_WORKER_VERSION="runtime-response-header";
const HOMELINK_DIAGNOSTIC_BUILT_AT="2026-07-07T00:00:00+04:00";
function employeeEntryDiagnosticAssetInfo(body={}){
  const diagnostic=body?.diagnostic&&typeof body.diagnostic==="object"?body.diagnostic:{};
  const frontendAssetVersion=cleanText(diagnostic.frontend_asset_version||diagnostic.employee_asset_version||"",120);
  const expected=HOMELINK_DIAGNOSTIC_ASSET_VERSION;
  const stale=!!frontendAssetVersion&&frontendAssetVersion!==expected;
  return {
    frontend_asset_version:frontendAssetVersion||null,
    expected_frontend_asset_version:expected,
    stale_frontend_asset:stale,
    asset_status:stale?"STALE_FRONTEND_ASSET":"ASSET_VERSION_OK",
    built_at:HOMELINK_DIAGNOSTIC_BUILT_AT,
    worker_version:HOMELINK_DIAGNOSTIC_WORKER_VERSION,
    commit_hash:HOMELINK_DIAGNOSTIC_COMMIT_HASH
  };
}
__name(employeeEntryDiagnosticAssetInfo,"employeeEntryDiagnosticAssetInfo");
function homelinkDiagnosticTraceId(prefix="diag"){
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}
__name(homelinkDiagnosticTraceId,"homelinkDiagnosticTraceId");
function employeeEntryValidationFunctionForStage(stage,eventType=""){
  const byStage={
    payload:"handleEmployeeEntryValidate",
    schema:"empTableExists",
    rent_event_validation:"validateRentUploadFields",
    arrears_payment_event_validation:"validateArrearsPaymentUploadFields",
    deposit_in_event_validation:"validateDepositInUploadFields",
    deposit_out_event_validation:"validateDepositOutUploadFields",
    checkout_event_validation:"validateCheckoutUploadFields",
    left_with_arrears_event_validation:"validateCheckoutUploadFields",
    expense_event_validation:"validateExpenseUploadFields",
    bed_transfer_event_validation:"validateBedTransferUploadFields",
    anchor_validation:"normalizeEntryAnchor",
    session_anchor_validation:"normalizeEntryAnchor",
    owner_decoder_compat:"parseEmployeeEntryAnchorJson",
    export_text_build:"employeeEntryExportTextWithAnchors",
    basic_fields:"validateEmployeeEntryUploadPayload",
    rent_validation:"validateEmployeeEntryUploadPayload",
    rent_short_paid:"validateEmployeeEntryUploadPayload",
    bed_transfer_validation:"validateEmployeeEntryUploadPayload",
    arrears_payment_ref:"empFindOpenArrearTaskForPaymentReadOnly",
    deposit_out_validation:"validateEmployeeEntryUploadPayload",
    checkout_validation:"validateEmployeeEntryUploadPayload",
    left_with_arrears_validation:"validateEmployeeEntryUploadPayload",
    duplicate_validation:"checkEmployeeEntryDuplicates",
    validate_exception:"validateEmployeeEntryUploadPayload"
  };
  if(byStage[stage])return byStage[stage];
  return eventType?`validateEmployeeEntryUploadPayload:${eventType}`:"validateEmployeeEntryUploadPayload";
}
__name(employeeEntryValidationFunctionForStage,"employeeEntryValidationFunctionForStage");
function employeeEntryValidationTraceStep(stage,ok,extra={}){
  return {
    stage,
    function_name:extra.function_name||employeeEntryValidationFunctionForStage(stage,extra.event_type||""),
    function:extra.function_name||employeeEntryValidationFunctionForStage(stage,extra.event_type||""),
    ok:!!ok,
    duration_ms:Number(extra.duration_ms||0),
    event_index:Number(extra.event_index||0),
    event_type:extra.event_type||"",
    error_code:extra.error_code||"",
    message:extra.message||"",
    message_en:extra.message_en||extra.message||"",
    message_zh:extra.message_zh||"",
    missing_fields:Array.isArray(extra.missing_fields)?extra.missing_fields:[],
    invalid_fields:Array.isArray(extra.invalid_fields)?extra.invalid_fields:[]
  };
}
__name(employeeEntryValidationTraceStep,"employeeEntryValidationTraceStep");
function employeeEntryValidationFailure(stage,errorCode,message,extra={}){
  const explanation=employeeEntryValidationExplanation(errorCode,message);
  const traceStep=employeeEntryValidationTraceStep(stage,false,{
    ...extra,
    error_code:errorCode,
    message:message||errorCode
  });
  return {
    trace_id:extra.trace_id||homelinkDiagnosticTraceId("emp-upload"),
    action:extra.action||"employee_upload_validation",
    source:extra.source||"dry_run",
    ok:false,
    stage,
    event_index:Number(extra.event_index||0),
    event_type:extra.event_type||"",
    record_id:extra.record_id||extra.anchor_preview?.id||null,
    error_code:errorCode,
    message:message||errorCode,
    message_en:extra.message_en||explanation.message_en,
    message_zh:extra.message_zh||explanation.message_zh,
    missing_fields:Array.isArray(extra.missing_fields)?extra.missing_fields:[],
    invalid_fields:Array.isArray(extra.invalid_fields)?extra.invalid_fields:[],
    suggested_action_en:extra.suggested_action_en||explanation.suggested_action_en,
    suggested_action_zh:extra.suggested_action_zh||explanation.suggested_action_zh,
    last_successful_stage:extra.last_successful_stage||null,
    payload_preview:extra.payload_preview||{},
    anchor_preview:extra.anchor_preview||{},
    validation_trace:Array.isArray(extra.validation_trace)&&extra.validation_trace.length?extra.validation_trace:[traceStep],
    asset_version:extra.asset_version||HOMELINK_DIAGNOSTIC_ASSET_VERSION,
    worker_version:extra.worker_version||HOMELINK_DIAGNOSTIC_WORKER_VERSION,
    commit_hash:extra.commit_hash||HOMELINK_DIAGNOSTIC_COMMIT_HASH,
    frontend_asset_version:extra.frontend_asset_version||null,
    expected_frontend_asset_version:extra.expected_frontend_asset_version||HOMELINK_DIAGNOSTIC_ASSET_VERSION,
    stale_frontend_asset:!!extra.stale_frontend_asset,
    built_at:extra.built_at||HOMELINK_DIAGNOSTIC_BUILT_AT
  };
}
__name(employeeEntryValidationFailure,"employeeEntryValidationFailure");
function employeeEntryValidationSuccessTrace(type,eventIndex,eventType){
  const base={event_index:eventIndex,event_type:eventType};
  const eventStage={
    R:["rent_event_validation","validateRentUploadFields"],
    AP:["arrears_payment_event_validation","validateArrearsPaymentUploadFields"],
    D:["deposit_in_event_validation","validateDepositInUploadFields"],
    DR:["deposit_out_event_validation","validateDepositOutUploadFields"],
    CO:["checkout_event_validation","validateCheckoutUploadFields"],
    E:["expense_event_validation","validateExpenseUploadFields"],
    TF:["bed_transfer_event_validation","validateBedTransferUploadFields"],
    TFF:["bed_transfer_event_validation","validateBedTransferUploadFields"]
  }[type]||["rent_event_validation","validateRentUploadFields"];
  return [
    employeeEntryValidationTraceStep("payload_parse",true,{...base,function_name:"handleEmployeeEntryValidate"}),
    employeeEntryValidationTraceStep("event_dispatch",true,{...base,function_name:"validateEmployeeEntryUploadEventFields"}),
    employeeEntryValidationTraceStep(eventStage[0],true,{...base,function_name:eventStage[1]}),
    employeeEntryValidationTraceStep("anchor_validation",true,{...base,function_name:"normalizeEntryAnchor"}),
    employeeEntryValidationTraceStep("session_summary_build",true,{...base,function_name:"validateEmployeeEntryUploadPayload"}),
    employeeEntryValidationTraceStep("export_text_build",true,{...base,function_name:"employeeEntryExportTextWithAnchors"}),
    employeeEntryValidationTraceStep("structured_anchor_block_build",true,{...base,function_name:"JSON.stringify(entries_json)"}),
    employeeEntryValidationTraceStep("owner_decoder_compat",true,{...base,function_name:"parseEmployeeEntryAnchorJson"}),
    employeeEntryValidationTraceStep("final_preflight",true,{...base,function_name:"validateEmployeeEntryUploadPayload"})
  ];
}
__name(employeeEntryValidationSuccessTrace,"employeeEntryValidationSuccessTrace");
function employeeEntryUploadHasValue(value){
  if(value===true||value===false)return true;
  if(typeof value==="number")return Number.isFinite(value);
  return String(value??"").trim()!=="";
}
__name(employeeEntryUploadHasValue,"employeeEntryUploadHasValue");
function employeeEntryUploadAmount(value){
  return Number(String(value??0).replace(/,/g,""))||0;
}
__name(employeeEntryUploadAmount,"employeeEntryUploadAmount");
function employeeEntryUploadHasExplicitValue(value){
  if(value===true||value===false)return true;
  return String(value??"").trim()!=="";
}
__name(employeeEntryUploadHasExplicitValue,"employeeEntryUploadHasExplicitValue");
function employeeEntryUploadTruthy(value){
  if(value===true)return true;
  const raw=cleanText(value,40).toLowerCase();
  return ["true","yes","y","1","paid","charged","waived","none"].includes(raw);
}
__name(employeeEntryUploadTruthy,"employeeEntryUploadTruthy");
function employeeEntryFirstExplicitAmount(source={},fields=[]){
  for(const field of fields){
    if(Object.prototype.hasOwnProperty.call(source,field)&&employeeEntryUploadHasExplicitValue(source[field])){
      return {provided:true,field,amount:employeeEntryUploadAmount(source[field])};
    }
  }
  return {provided:false,field:"",amount:0};
}
__name(employeeEntryFirstExplicitAmount,"employeeEntryFirstExplicitAmount");
function employeeEntryBedTransferFee(entry={},normalized={}){
  const rawChoice=cleanText(entry.fee_choice||normalized.fee_choice||entry.fee_status||normalized.fee_status||entry.fee_mode||normalized.fee_mode||"",40).toLowerCase();
  const amountInfo=employeeEntryFirstExplicitAmount(entry,["fee_amount","transfer_fee","transfer_fee_aed","amount"]);
  const rawPaid=cleanText(entry.fee_paid,20).toLowerCase();
  const rawWaived=cleanText(entry.fee_waived,20).toLowerCase();
  const paidFlag=entry.fee_paid===true||["true","yes","y","1","paid","charged"].includes(rawPaid)||["paid","charged"].includes(rawChoice);
  const waivedFlag=entry.fee_waived===true||["true","yes","y","1","waived","waive"].includes(rawWaived)||["waived","waive"].includes(rawChoice);
  const noneFlag=["none","no_fee","nofee","zero","free"].includes(rawChoice);
  const feeAmount=amountInfo.provided?amountInfo.amount:employeeEntryUploadAmount(normalized.fee_amount||0);
  let feeChoice="";
  if(paidFlag||feeAmount>0)feeChoice="paid";
  else if(waivedFlag)feeChoice="waived";
  else if(noneFlag||(amountInfo.provided&&feeAmount===0))feeChoice="none";
  const waiverReason=cleanText(entry.fee_waived_reason||entry.waived_reason||entry.waiver_reason||entry.fee_waiver_reason||entry.custom_reason||entry.note||normalized.waiver_reason||"",240);
  return {
    fee_choice:feeChoice,
    fee_paid:feeChoice==="paid",
    fee_waived:feeChoice==="waived",
    fee_amount:feeChoice==="paid"?feeAmount:0,
    payment_method:entryAnchorPaymentMethod(entry.payment_method||entry.pay_type||normalized.payment_method||""),
    waiver_reason:waiverReason,
    amount_field:amountInfo.field,
    amount_provided:amountInfo.provided
  };
}
__name(employeeEntryBedTransferFee,"employeeEntryBedTransferFee");
function employeeEntryOccupancyCandidateNoWriteProof(){
  return {
    dry_run:true,
    write_endpoints_called:[],
    d1_write_count:0,
    session_write_attempted:false,
    transaction_write_attempted:false,
    arrear_task_write_attempted:false,
    deposit_write_attempted:false,
    access_snapshot_write_attempted:false,
    occupancy_write_attempted:false,
    owner_history_write_attempted:false,
    real_upload_called:false,
    candidate_persistence:"not_persisted",
    wrote_sessions:false,
    wrote_transactions:false,
    wrote_arrear_tasks:false,
    wrote_deposit_ledger:false,
    wrote_access_snapshot:false,
    wrote_occupancy_session:false,
    wrote_owner_history:false,
    write_guard_mode:"route_level_no_write",
    proof_limitations:"D1 write count not measured, but validate route does not call write functions"
  };
}
__name(employeeEntryOccupancyCandidateNoWriteProof,"employeeEntryOccupancyCandidateNoWriteProof");
function employeeEntryOccupancyForbiddenInputsUsed(){
  return {
    card_id:false,
    tenant_card_id:false,
    provider_phone:false,
    phone_99099:false
  };
}
__name(employeeEntryOccupancyForbiddenInputsUsed,"employeeEntryOccupancyForbiddenInputsUsed");
function employeeEntryOccupancyCandidateAnomaly(riskCode,eventIndex,eventId,suggestedAction,sourceFields=[],riskLevel="medium",confidence=0.7){
  return {
    risk_code:riskCode,
    risk_level:riskLevel,
    confidence_score:Math.max(0,Math.min(1,Number(confidence)||0)),
    event_index:Number(eventIndex||0),
    event_id:cleanText(eventId,100),
    suggested_action:cleanText(suggestedAction,300),
    source_fields:Array.isArray(sourceFields)?sourceFields.map(field=>cleanText(field,80)).filter(Boolean):[]
  };
}
__name(employeeEntryOccupancyCandidateAnomaly,"employeeEntryOccupancyCandidateAnomaly");
function employeeEntryOccupancyCandidateBed(entry,normalized,type){
  if(type==="TF"||type==="TFF")return cleanText(normalized.from_bed||entry.bed_from||entry.from_bed||entry.room||"",40).replace(/^#+/,"");
  if(type==="E")return cleanText(normalized.target_bed||entry.target_bed||entry.room||"",40).replace(/^#+/,"");
  return cleanText(normalized.bed||entry.bed||entry.room||"",40).replace(/^#+/,"");
}
__name(employeeEntryOccupancyCandidateBed,"employeeEntryOccupancyCandidateBed");
function employeeEntryOccupancyCandidateBusinessDate(entry,normalized){
  return cleanDate(normalized.date||entry.date||entry.business_date||entry.created_at||entry.rent_period_start||entry.period_start||entry.checkout_date||entry.transfer_date||empTodayDubai());
}
__name(employeeEntryOccupancyCandidateBusinessDate,"employeeEntryOccupancyCandidateBusinessDate");
function employeeEntryOccupancyCandidateId(propertyId,bed,businessDate,eventId){
  if(!propertyId||!bed||!businessDate||!eventId)return null;
  return `occ_candidate:${propertyId}:${bed}:${businessDate.replace(/-/g,"")}:${eventId}`;
}
__name(employeeEntryOccupancyCandidateId,"employeeEntryOccupancyCandidateId");
function employeeEntryOccupancyAccessSnapshotSummary(entry,bed){
  const remark=cleanText(entry.access_remark||entry.card_remark||entry.ttlock_context?.raw_remark||entry.access_snapshot?.raw_remark||"",1000);
  const snapshot=remark?buildAccessSnapshotDTO(remark,{property_id:"preview"}):null;
  return {
    bed:cleanText(snapshot?.bed||bed||"",40),
    parsed_deposit_amount:snapshot?.parsed_deposit_amount??null,
    parsed_checkin_mmdd:snapshot?.parsed_checkin_mmdd||"",
    parsed_valid_until_mmdd:snapshot?.parsed_valid_until_mmdd||"",
    parse_status:snapshot?.parse_status||"not_provided"
  };
}
__name(employeeEntryOccupancyAccessSnapshotSummary,"employeeEntryOccupancyAccessSnapshotSummary");
function buildEmployeeEntryOccupancyCandidateEventPreview(entry,index,user,body){
  const normalized=normalizeEntryAnchor(entry||{});
  const type=entryAnchorType(entry)||cleanText(entry?.type||entry?.reason_code||"R",12).toUpperCase();
  const eventType=normalized.event_type||entryAnchorEventType(type);
  const eventId=cleanText(normalized.id||normalized.event_id||entry?.id||entry?.event_id||`preview-${index}`,100);
  const propertyId=cleanText(user?.corpid||body?.corpid||body?.property_id||"homelink",80);
  const bed=employeeEntryOccupancyCandidateBed(entry,normalized,type);
  const businessDate=employeeEntryOccupancyCandidateBusinessDate(entry,normalized);
  const linkedArrearsRef=cleanId(normalized.arrears_ref||entry?.arrears_ref||entry?.linked_task_id||entry?.original_arrears_id||entry?.cloud_arrears_ref||"");
  const linkedEventId=cleanText(normalized.original_event_id||entry?.original_event_id||entry?.linked_event_id||"",100);
  const candidateBasis={
    property_id:propertyId,
    bed,
    business_date:businessDate,
    access_snapshot_summary:employeeEntryOccupancyAccessSnapshotSummary(entry,bed),
    linked_event_id:linkedEventId||null,
    linked_arrears_ref:linkedArrearsRef||null,
    staff_entered_customer_phone_present:!!cleanText(entry?.whatsapp_phone||entry?.former_customer_phone||entry?.customer_phone,80)
  };
  const anomalies=[];
  let status="candidate_unresolved";
  let candidateId=null;
  if(type==="R"){
    status=bed&&businessDate?"candidate_created":"candidate_unresolved";
    candidateId=status==="candidate_created"?employeeEntryOccupancyCandidateId(propertyId,bed,businessDate,eventId):null;
  }else if(type==="AP"){
    status="candidate_unresolved";
    candidateId=null;
    if(!linkedArrearsRef)anomalies.push(employeeEntryOccupancyCandidateAnomaly("ARREARS_PAYMENT_WITHOUT_ORIGINAL_CANDIDATE",index,eventId,"Select an arrears_ref that can inherit a future occupancy candidate.",["arrears_ref"],"high",0.85));
  }else if(type==="D"){
    const depositReason=cleanText(entry?.deposit_reason||normalized.deposit_reason||"",40).toLowerCase();
    candidateBasis.deposit_reason=depositReason||null;
    if(depositReason==="new"){
      status=bed&&businessDate?"candidate_created":"candidate_unresolved";
      candidateId=status==="candidate_created"?employeeEntryOccupancyCandidateId(propertyId,bed,businessDate,eventId):null;
    }else if(["balance","additional"].includes(depositReason)){
      status="candidate_continued";
      candidateId=bed&&businessDate?employeeEntryOccupancyCandidateId(propertyId,bed,businessDate,eventId):null;
    }else{
      status="candidate_unresolved";
    }
  }else if(type==="DR"){
    status=bed?"candidate_unresolved":"candidate_unresolved";
    anomalies.push(employeeEntryOccupancyCandidateAnomaly("DEPOSIT_OUT_WITHOUT_ACTIVE_CANDIDATE",index,eventId,"Future implementation must link Deposit Out to an active candidate before refund.",["bed"],"medium",0.7));
  }else if(type==="CO"){
    const left=!!normalized.left_with_arrears||!!entry?.left_with_arrears||entry?.checkout_mode==="left_with_arrears";
    candidateBasis.checkout_type=left?"left_with_arrears":"normal";
    status=left?"candidate_left_with_arrears":"candidate_checkout_pending";
    candidateId=bed&&businessDate?employeeEntryOccupancyCandidateId(propertyId,bed,businessDate,eventId):null;
    if(entry?.open_arrears_count||entry?.outstanding_arrears>0)anomalies.push(employeeEntryOccupancyCandidateAnomaly("CHECKOUT_WITH_OPEN_ARREARS",index,eventId,"Collect arrears first or use Left With Arrears / owner approval.",["open_arrears"],"high",0.8));
  }else if(type==="E"){
    status=bed?"candidate_unresolved":"candidate_not_applicable";
    candidateId=null;
  }else if(type==="TF"||type==="TFF"){
    const fromBed=cleanText(normalized.from_bed||entry?.bed_from||entry?.from_bed||entry?.room||"",40).replace(/^#+/,"");
    const toBed=cleanText(normalized.to_bed||entry?.bed_to||entry?.to_bed||entry?.roomTo||"",40).replace(/^#+/,"");
    candidateBasis.from_bed=fromBed;
    candidateBasis.to_bed=toBed;
    status=fromBed&&toBed?"candidate_unresolved":"candidate_unresolved";
    candidateId=null;
    if(entry?.to_bed_occupied||entry?.to_occupied){
      status="candidate_conflict";
      anomalies.push(employeeEntryOccupancyCandidateAnomaly("BED_TRANSFER_TO_OCCUPIED_BED",index,eventId,"Resolve target bed occupancy before transfer.",["to_bed"],"critical",0.9));
    }else if(!fromBed){
      anomalies.push(employeeEntryOccupancyCandidateAnomaly("BED_TRANSFER_WITHOUT_FROM_CANDIDATE",index,eventId,"Future implementation must identify the from_bed candidate before transfer.",["from_bed"],"high",0.85));
    }
    candidateBasis.from_state_before=fromBed?"active_or_unknown":"unknown";
    candidateBasis.to_state_before=toBed?"vacant_or_unknown":"unknown";
    candidateBasis.from_state_after_expected="vacant_or_closed_preview";
    candidateBasis.to_state_after_expected="active_under_same_candidate_preview";
    candidateBasis.deposit_moved="preview_only";
    candidateBasis.rent_coverage_moved="preview_only";
    candidateBasis.arrears_moved="preview_only";
    candidateBasis.access_validity_moved="preview_only";
  }
  return {
    event_index:Number(index||0),
    event_id:eventId,
    event_type:eventType,
    ...(bed?{bed}:{}),
    ...(candidateBasis.from_bed?{from_bed:candidateBasis.from_bed}:{}),
    ...(candidateBasis.to_bed?{to_bed:candidateBasis.to_bed}:{}),
    occupancy_candidate_id:candidateId,
    occupancy_candidate_status:status,
    candidate_basis:candidateBasis,
    forbidden_inputs_used:employeeEntryOccupancyForbiddenInputsUsed(),
    warnings:[],
    anomalies
  };
}
__name(buildEmployeeEntryOccupancyCandidateEventPreview,"buildEmployeeEntryOccupancyCandidateEventPreview");
function buildEmployeeEntryOccupancyCandidatePreview(user,body){
  const session=body?.session||{};
  const entries=Array.isArray(session.entries)&&session.entries.length?session.entries:[body?.entry||{}];
  const events=entries.map((entry,index)=>buildEmployeeEntryOccupancyCandidateEventPreview(entry,index,user,body));
  const batchAnomalies=events.flatMap(event=>event.anomalies||[]);
  return {
    enabled:true,
    mode:"dry_run_preview_only",
    no_write:true,
    source:"server_dry_run",
    candidate_persistence:"not_persisted",
    migration_required_for_durable_id:true,
    batch_id:cleanText(session.id||session.session_id||body?.batch_id||`dryrun-${Date.now().toString(36)}`,100),
    preview_generated_at:new Date().toISOString(),
    events,
    batch_warnings:[],
    batch_anomalies:batchAnomalies,
    no_write_proof:employeeEntryOccupancyCandidateNoWriteProof()
  };
}
__name(buildEmployeeEntryOccupancyCandidatePreview,"buildEmployeeEntryOccupancyCandidatePreview");
function employeeEntryOccupancyCandidateAccessSnapshotMetadata(value){
  const source=value&&typeof value==="object"?value:{};
  return {
    bed:cleanText(source.bed||"",40),
    parsed_deposit_amount:source.parsed_deposit_amount??null,
    parsed_checkin_mmdd:cleanText(source.parsed_checkin_mmdd||"",20),
    parsed_valid_until_mmdd:cleanText(source.parsed_valid_until_mmdd||"",20),
    parse_status:cleanText(source.parse_status||"not_provided",40)
  };
}
__name(employeeEntryOccupancyCandidateAccessSnapshotMetadata,"employeeEntryOccupancyCandidateAccessSnapshotMetadata");
function employeeEntryOccupancyCandidateBasisMetadata(value){
  const source=value&&typeof value==="object"?value:{};
  const basis={
    property_id:cleanText(source.property_id||"",80),
    bed:cleanText(source.bed||"",40),
    business_date:cleanDate(source.business_date||""),
    access_snapshot_summary:employeeEntryOccupancyCandidateAccessSnapshotMetadata(source.access_snapshot_summary),
    linked_event_id:source.linked_event_id?cleanText(source.linked_event_id,100):null,
    linked_arrears_ref:source.linked_arrears_ref?cleanId(source.linked_arrears_ref):null,
    staff_entered_customer_phone_present:!!source.staff_entered_customer_phone_present
  };
  for(const key of ["deposit_reason","checkout_type","from_bed","to_bed","from_state_before","to_state_before","from_state_after_expected","to_state_after_expected","deposit_moved","rent_coverage_moved","arrears_moved","access_validity_moved"]){
    if(source[key]!==undefined&&source[key]!==null&&String(source[key]).trim()!=="")basis[key]=cleanText(source[key],120);
  }
  return basis;
}
__name(employeeEntryOccupancyCandidateBasisMetadata,"employeeEntryOccupancyCandidateBasisMetadata");
function employeeEntryOccupancyCandidateMetadataFromPreviewEvent(event,generatedAt){
  const source=event&&typeof event==="object"?event:{};
  return {
    version:"occupancy_candidate_v1",
    non_authoritative:true,
    metadata_only:true,
    not_durable:true,
    not_final_identity:true,
    not_used_for_matching:true,
    candidate_id:source.occupancy_candidate_id?cleanText(source.occupancy_candidate_id,160):null,
    candidate_status:cleanText(source.occupancy_candidate_status||"candidate_unresolved",60),
    candidate_persistence:"metadata_only_not_authoritative",
    source:"server_upload_preflight",
    generated_at:cleanText(generatedAt||new Date().toISOString(),40),
    basis:employeeEntryOccupancyCandidateBasisMetadata(source.candidate_basis||{}),
    forbidden_inputs_used:employeeEntryOccupancyForbiddenInputsUsed(),
    warnings:Array.isArray(source.warnings)?source.warnings.slice(0,20):[],
    anomalies:Array.isArray(source.anomalies)?source.anomalies.slice(0,20):[]
  };
}
__name(employeeEntryOccupancyCandidateMetadataFromPreviewEvent,"employeeEntryOccupancyCandidateMetadataFromPreviewEvent");
function buildEmployeeEntryEntriesWithOccupancyCandidateMetadata(user,body,entries){
  const rows=Array.isArray(entries)?entries:[];
  if(!rows.length)return [];
  const preview=buildEmployeeEntryOccupancyCandidatePreview(user,body);
  const generatedAt=cleanText(preview.preview_generated_at||new Date().toISOString(),40);
  const events=Array.isArray(preview.events)?preview.events:[];
  return rows.map((row,index)=>{
    const anchor=normalizeEntryAnchor(row);
    delete anchor.occupancy_candidate_metadata;
    anchor.occupancy_candidate_metadata=employeeEntryOccupancyCandidateMetadataFromPreviewEvent(events[index],generatedAt);
    return anchor;
  });
}
__name(buildEmployeeEntryEntriesWithOccupancyCandidateMetadata,"buildEmployeeEntryEntriesWithOccupancyCandidateMetadata");
function validateRentUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const invalid=[];
  const expected=employeeEntryUploadAmount(normalized.expected_rent||entry.period_due||entry.due);
  const paid=employeeEntryUploadAmount(normalized.paid_amount||entry.paid||entry.amount);
  if(!employeeEntryUploadHasValue(normalized.bed||entry.room))missing.push("bed");
  if(paid<=0)missing.push("paid_amount");
  if(!employeeEntryUploadHasValue(normalized.payment_method||entry.payment_method||entry.pay_type))missing.push("payment_method");
  if(!employeeEntryUploadHasValue(normalized.rent_period_start||entry.period_start))missing.push("rent_period_start");
  if(!employeeEntryUploadHasValue(normalized.rent_period_end||entry.period_end))missing.push("rent_period_end");
  if(expected>0&&paid<expected){
    if(!employeeEntryUploadHasValue(normalized.arrears_due_date||entry.arrear_promise_date||entry.promise_date))missing.push("arrears_due_date");
    if(!employeeEntryUploadHasValue(normalized.arrears_note||entry.arrear_reason_detail||entry.custom_reason||entry.note))missing.push("arrears_note");
  }
  if(missing.length||invalid.length)return employeeEntryValidationFailure("rent_event_validation","RENT_REQUIRED_FIELD_MISSING","Rent entry is missing required fields.",{event_index:eventIndex,event_type:"rent",missing_fields:missing,invalid_fields:invalid,anchor_preview:anchorPreview});
  return null;
}
__name(validateRentUploadFields,"validateRentUploadFields");
function validateArrearsPaymentUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const invalid=[];
  const remainingBeforeValue=normalized.remaining_arrears_before_payment ?? entry.remaining_arrears_before_payment;
  const remainingAfterValue=normalized.remaining_arrears_after_payment ?? entry.remaining_arrears_after_payment ?? normalized.remaining_arrears ?? entry.remaining_arrears;
  const forbiddenIdentityFields=["card_id","tenant_card_id","old_ttlock_ref","provider_phone","phone_99099","ttlock_context","old_ttlock_context"];
  const forbiddenUsed=forbiddenIdentityFields.filter(field=>employeeEntryUploadHasValue(entry[field] ?? normalized[field]));
  if(!employeeEntryUploadHasValue(normalized.bed||entry.room))missing.push("bed");
  if(!employeeEntryUploadHasValue(normalized.arrears_ref||entry.arrears_ref||entry.original_arrears_id||entry.linked_task_id))missing.push("arrears_ref");
  if(employeeEntryUploadAmount(normalized.payment_amount||entry.payment_amount||entry.amount)<=0)missing.push("payment_amount");
  if(!employeeEntryUploadHasValue(normalized.payment_method||entry.payment_method||entry.pay_type))missing.push("payment_method");
  if(!employeeEntryUploadHasValue(remainingBeforeValue))missing.push("remaining_before");
  if(!employeeEntryUploadHasValue(remainingAfterValue))missing.push("remaining_after");
  if(!employeeEntryUploadHasValue(normalized.settlement_status||entry.settlement_status))missing.push("settlement_status");
  if(missing.length||invalid.length)return employeeEntryValidationFailure("arrears_payment_event_validation","ARREARS_PAYMENT_REQUIRED_FIELD_MISSING","Arrears Payment entry is missing required fields.",{event_index:eventIndex,event_type:"arrears_payment",missing_fields:missing,invalid_fields:invalid,anchor_preview:anchorPreview});
  if(forbiddenUsed.length)return employeeEntryValidationFailure("arrears_payment_event_validation","ARREARS_PAYMENT_FORBIDDEN_IDENTITY_FIELD","Arrears Payment must match by arrears_ref, not provider identity fields.",{event_index:eventIndex,event_type:"arrears_payment",invalid_fields:forbiddenUsed,anchor_preview:anchorPreview});
  const remainingAfter=employeeEntryUploadAmount(remainingAfterValue);
  const settlementStatus=cleanText(normalized.settlement_status||entry.settlement_status,40).toLowerCase();
  if((remainingAfter<=0.01&&settlementStatus!=="settled")||(remainingAfter>0.01&&!["partial","open"].includes(settlementStatus))){
    return employeeEntryValidationFailure("arrears_payment_event_validation","ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH","Arrears Payment settlement status must match remaining arrears.",{event_index:eventIndex,event_type:"arrears_payment",invalid_fields:["remaining_arrears_after_payment","settlement_status"],anchor_preview:{...anchorPreview,remaining_arrears_after_payment:remainingAfter,settlement_status:settlementStatus}});
  }
  return null;
}
__name(validateArrearsPaymentUploadFields,"validateArrearsPaymentUploadFields");
function validateDepositInUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const depositRequiredTotal=normalized.deposit_required_total ?? entry.deposit_required_total;
  const depositPaidAmount=normalized.deposit_paid_amount ?? entry.deposit_paid_amount ?? normalized.deposit_amount ?? entry.deposit_amount ?? entry.amount;
  const depositRemaining=normalized.deposit_remaining_after_payment ?? entry.deposit_remaining_after_payment ?? normalized.deposit_remaining ?? entry.deposit_remaining;
  if(!employeeEntryUploadHasValue(normalized.bed||entry.room))missing.push("bed");
  if(employeeEntryUploadAmount(normalized.deposit_amount||entry.deposit_amount||entry.amount)<=0)missing.push("deposit_amount");
  if(!employeeEntryUploadHasValue(depositRequiredTotal))missing.push("deposit_required_total");
  if(!employeeEntryUploadHasValue(depositPaidAmount))missing.push("deposit_paid_amount");
  if(!employeeEntryUploadHasValue(depositRemaining))missing.push("deposit_remaining_after_payment");
  if(!employeeEntryUploadHasValue(normalized.payment_method||entry.payment_method||entry.pay_type))missing.push("payment_method");
  if(missing.length)return employeeEntryValidationFailure("deposit_in_event_validation","DEPOSIT_IN_REQUIRED_FIELD_MISSING","Deposit In entry is missing required fields.",{event_index:eventIndex,event_type:"deposit_in",missing_fields:missing,anchor_preview:anchorPreview});
  return null;
}
__name(validateDepositInUploadFields,"validateDepositInUploadFields");
function validateDepositOutUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const invalid=[];
  const balance=employeeEntryUploadAmount(normalized.deposit_balance||entry.deposit_balance||entry.deposit_held);
  const refund=employeeEntryUploadAmount(normalized.actual_refund_amount||normalized.refund_amount||entry.actual_refund_amount||entry.refund_amount||entry.amount);
  const ownerOverrideRef=cleanId(normalized.owner_override_ref||entry.owner_override_ref||"");
  const overrideReason=cleanText(normalized.override_reason||entry.override_reason||normalized.owner_override_reason||entry.owner_override_reason||"",500);
  const openArrearsAmount=employeeEntryUploadAmount(normalized.open_arrears_amount||entry.open_arrears_amount||entry.outstanding_arrears);
  const arrearsOffsetRef=cleanId(normalized.arrears_offset_ref||entry.arrears_offset_ref||"");
  const arrearsOffsetAmount=employeeEntryUploadAmount(normalized.arrears_offset_amount||entry.arrears_offset_amount);
  if(!employeeEntryUploadHasValue(normalized.bed||entry.room))missing.push("bed");
  if(balance<=0)missing.push("deposit_balance");
  if(refund<=0)missing.push("actual_refund_amount");
  if(!employeeEntryUploadHasValue(normalized.refund_method||entry.refund_method||normalized.payment_method||entry.pay_type))missing.push("refund_method");
  if(!employeeEntryUploadHasValue(normalized.refund_date||entry.refund_date))missing.push("refund_date");
  if(!employeeEntryUploadHasValue(normalized.refund_reason||entry.refund_reason||entry.reason))missing.push("refund_reason");
  if(Math.abs(refund-balance)>0.01&&!employeeEntryUploadHasValue(normalized.difference_reason||entry.difference_reason))missing.push("difference_reason");
  if(missing.length||invalid.length)return employeeEntryValidationFailure("deposit_out_event_validation","DEPOSIT_OUT_REQUIRED_FIELD_MISSING","Deposit Out entry is missing required fields.",{event_index:eventIndex,event_type:"deposit_out",missing_fields:missing,invalid_fields:invalid,anchor_preview:anchorPreview});
  if(refund>balance+0.01&&(!ownerOverrideRef||!overrideReason)){
    return employeeEntryValidationFailure("deposit_out_validation","DEPOSIT_OUT_EXCEEDS_BALANCE","Deposit refund exceeds deposit balance and requires owner override.",{event_index:eventIndex,event_type:"deposit_out",missing_fields:["owner_override_ref","override_reason"].filter(field=>field==="owner_override_ref"?!ownerOverrideRef:!overrideReason),invalid_fields:["refund_amount"],anchor_preview:{...anchorPreview,deposit_balance:balance,refund_amount:refund}});
  }
  if(openArrearsAmount>0&&(!ownerOverrideRef&&(!arrearsOffsetRef||arrearsOffsetAmount<=0))){
    return employeeEntryValidationFailure("deposit_out_validation","DEPOSIT_OUT_OPEN_ARREARS_REQUIRES_OFFSET_OR_APPROVAL","Open arrears require explicit offset or owner approval before deposit refund.",{event_index:eventIndex,event_type:"deposit_out",missing_fields:["arrears_offset_ref","arrears_offset_amount","owner_override_ref"],invalid_fields:["open_arrears"],anchor_preview:{...anchorPreview,open_arrears_amount:openArrearsAmount}});
  }
  return null;
}
__name(validateDepositOutUploadFields,"validateDepositOutUploadFields");
function validateCheckoutUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const invalid=[];
  const left=!!normalized.left_with_arrears||!!entry.left_with_arrears||entry.checkout_mode==="left_with_arrears";
  const eventType=left?"left_with_arrears":"checkout";
  if(!employeeEntryUploadHasValue(normalized.bed||entry.room))missing.push("bed");
  if(!employeeEntryUploadHasValue(normalized.checkout_mode||entry.checkout_mode))missing.push("checkout_type");
  if(!left&&!employeeEntryUploadHasValue(normalized.checkout_date||entry.checkout_date))missing.push("checkout_date");
  if(left){
    if(!employeeEntryUploadHasValue(normalized.left_date||entry.left_date||normalized.checkout_date||entry.checkout_date))missing.push("left_date");
    if(!employeeEntryUploadHasValue(normalized.whatsapp_phone||entry.whatsapp_phone||entry.former_customer_phone||normalized.contact_method||entry.contact_method))missing.push("contact_phone_or_method");
    if(!employeeEntryUploadHasValue(normalized.promised_payment_date||entry.promised_payment_date||entry.promise_date))missing.push("promised_payment_date");
    if(employeeEntryUploadAmount(normalized.left_arrears_amount||normalized.arrears_amount||entry.left_arrears_amount||entry.arrears_amount)<=0)missing.push("left_arrears_amount");
    if(!employeeEntryUploadHasValue(normalized.final_note||entry.final_note||normalized.note||entry.note))missing.push("note");
  }
  if(missing.length||invalid.length)return employeeEntryValidationFailure(left?"left_with_arrears_event_validation":"checkout_event_validation",left?"LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING":"CHECKOUT_REQUIRED_FIELD_MISSING",left?"Left With Arrears is missing required fields.":"Checkout entry is missing required fields.",{event_index:eventIndex,event_type:eventType,missing_fields:missing,invalid_fields:invalid,anchor_preview:anchorPreview});
  return null;
}
__name(validateCheckoutUploadFields,"validateCheckoutUploadFields");
function validateExpenseUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const amount=employeeEntryUploadAmount(normalized.expense_amount||entry.expense_amount||entry.amount);
  const evidenceRef=cleanText(normalized.evidence_ref||entry.evidence_ref||normalized.receipt_ref||entry.receipt_ref||"",160);
  const rawPaymentMethod=cleanText(entry.payment_method||entry.pay_type||"",40);
  const rawReason=cleanText(entry.reason||"",500);
  if(amount<=0)missing.push("expense_amount");
  if(!employeeEntryUploadHasValue(normalized.expense_category||entry.expense_category||entry.reason_code))missing.push("expense_category");
  if(!employeeEntryUploadHasValue(rawPaymentMethod))missing.push("payment_method");
  if(!employeeEntryUploadHasValue(rawReason))missing.push("reason");
  if(missing.length)return employeeEntryValidationFailure("expense_event_validation","EXPENSE_REQUIRED_FIELD_MISSING","Expense entry is missing required fields.",{event_index:eventIndex,event_type:"expense",missing_fields:missing,anchor_preview:anchorPreview});
  if(amount>=100&&!evidenceRef)return employeeEntryValidationFailure("expense_event_validation","EXPENSE_EVIDENCE_REQUIRED","Expense evidence is required for expenses of 100 AED or more.",{event_index:eventIndex,event_type:"expense",missing_fields:["evidence_ref"],invalid_fields:[],anchor_preview:{...anchorPreview,expense_amount:amount}});
  return null;
}
__name(validateExpenseUploadFields,"validateExpenseUploadFields");
function validateBedTransferUploadFields(entry,normalized,eventIndex,anchorPreview){
  const missing=[];
  const fee=employeeEntryBedTransferFee(entry,normalized);
  const fromBed=cleanText(normalized.from_bed||entry.from_bed||entry.bed_from||entry.room||"",40).replace(/^#+/,"");
  const toBed=cleanText(normalized.to_bed||entry.to_bed||entry.bed_to||entry.roomTo||"",40).replace(/^#+/,"");
  if(!employeeEntryUploadHasValue(fromBed))missing.push("from_bed");
  if(!employeeEntryUploadHasValue(toBed))missing.push("to_bed");
  if(!employeeEntryUploadHasValue(normalized.transfer_date||entry.transfer_date))missing.push("transfer_date");
  if(!employeeEntryUploadHasValue(normalized.transfer_reason||entry.transfer_reason||entry.reason||entry.custom_reason||entry.note))missing.push("transfer_reason");
  if(missing.length)return employeeEntryValidationFailure("bed_transfer_event_validation","BED_TRANSFER_REQUIRED_FIELD_MISSING","Bed Transfer entry is missing required fields.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:missing,anchor_preview:anchorPreview});
  if(fromBed===toBed)return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_SAME_BED_NOT_ALLOWED","From Bed and To Bed must be different.",{event_index:eventIndex,event_type:"bed_transfer",invalid_fields:["from_bed","to_bed"],anchor_preview:{...anchorPreview,from_bed:fromBed,to_bed:toBed}});
  if(!fee.fee_choice)return employeeEntryValidationFailure("bed_transfer_validation","TRANSFER_FEE_CHOICE_REQUIRED","Bed transfer fee choice is required.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["fee_paid"],anchor_preview:anchorPreview});
  if(fee.fee_choice==="paid"&&fee.fee_amount<=0)return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_FEE_FIELD_MISSING","Bed Transfer paid fee requires a positive fee amount.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["fee_amount"],anchor_preview:anchorPreview});
  if(fee.fee_choice==="paid"&&!employeeEntryUploadHasValue(fee.payment_method))return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_FEE_FIELD_MISSING","Bed Transfer paid fee requires payment method.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["payment_method"],anchor_preview:anchorPreview});
  if(fee.fee_choice==="waived"&&!employeeEntryUploadHasValue(fee.waiver_reason))return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_WAIVER_REASON_REQUIRED","Waiver reason is required.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["fee_waiver_reason"],anchor_preview:anchorPreview});
  return null;
}
__name(validateBedTransferUploadFields,"validateBedTransferUploadFields");
function employeeBedTransferPhase1GatewayContext(gateway,companyScope){
  const occupancy=gateway?.occupancy_gateway||{};
  const access=gateway?.access_snapshot_context||occupancy.access_snapshot_context||{};
  return {
    company_scope:companyScope,
    property_id:cleanText(access.property_id||"",120),
    physical_bed_status:cleanText(occupancy.physical_bed_status||"",40),
    physical_bed_status_source:cleanText(occupancy.physical_bed_status_source||"",80),
    parsed_vacancy_marker:access.parsed_vacancy_marker===true,
    data_source:cleanText(access.data_source||"",80),
    fallback:access.fallback===true,
    candidate_count:access.candidate_count,
    ambiguous:access.ambiguous===true,
    conflict:access.conflict===true,
    stale:access.stale===true,
    parse_status:cleanText(access.parse_status||"",40),
    error:cleanText(access.error||gateway?.error||"",120),
    parsed_deposit_amount:occupancy.deposit_recorded_amount??access.parsed_deposit_amount??null,
    deposit_recorded_amount:occupancy.deposit_recorded_amount??null,
    current_rent_coverage_start:cleanDate(occupancy.current_rent_coverage_start||""),
    current_rent_coverage_end:cleanDate(occupancy.current_rent_coverage_end||""),
    open_arrears:Array.isArray(gateway?.open_arrears)?gateway.open_arrears:[]
  };
}
__name(employeeBedTransferPhase1GatewayContext,"employeeBedTransferPhase1GatewayContext");
async function validateEmployeeBedTransferPhase1(env,user,entry={},normalized={}){
  const fromBed=cleanText(normalized.from_bed||entry.from_bed||entry.bed_from||entry.room||"",40).replace(/^#+/,"");
  const toBed=cleanText(normalized.to_bed||entry.to_bed||entry.bed_to||entry.roomTo||"",40).replace(/^#+/,"");
  const companyScope=cleanText(user?.corpid||"",120);
  let sourceGateway;
  let targetGateway;
  try{
    [sourceGateway,targetGateway]=await Promise.all([
      canonicalBedContextGateway(env,user,{bed:fromBed,limit:1000,strict_access_snapshot:true}),
      canonicalBedContextGateway(env,user,{bed:toBed,limit:1000,strict_access_snapshot:true})
    ]);
  }catch(error){
    return {ok:false,error_code:"BED_TRANSFER_ACCESS_SNAPSHOT_UNAVAILABLE",message:"Strict Access Snapshot data could not be loaded.",invalid_fields:["source_context","target_context"],source_error:cleanText(error?.message||error||"",160)};
  }
  const fee=employeeEntryBedTransferFee(entry,normalized);
  const feeAmountAed=fee.fee_amount;
  const contractResult=validateBedTransferPhase1Contract({
    from_bed:fromBed,
    to_bed:toBed,
    fee_choice:fee.fee_choice==="paid"?"charged":fee.fee_choice,
    fee_amount_aed:feeAmountAed,
    fee_amount_fils:entry.fee_amount_fils??normalized.fee_amount_fils??Math.round(feeAmountAed*100),
    payment_method:fee.payment_method,
    waiver_reason:fee.waiver_reason,
    transfer_reason:normalized.transfer_reason||entry.transfer_reason||entry.reason||entry.custom_reason||entry.note||"",
    source_context:employeeBedTransferPhase1GatewayContext(sourceGateway,companyScope),
    target_context:employeeBedTransferPhase1GatewayContext(targetGateway,companyScope),
    cloud_arrears_ref:entry.cloud_arrears_ref||entry.arrears_ref||entry.linked_task_id||entry.original_arrears_id||"",
    arrears_carryover:entry.arrears_carryover===true,
    carried_arrears_amount:entry.carried_arrears_amount??entry.carry_over_arrears??0,
    company_scope:companyScope
  });
  return contractResult;
}
__name(validateEmployeeBedTransferPhase1,"validateEmployeeBedTransferPhase1");
async function resolveEmployeeBedTransferSourceContext(env,user,fromBed,gateway={}){
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{limit:1000});
  const archiveEntries=[];
  for(const session of sessions||[])for(const raw of extractEmployeeEntryAnchorsFromSession(session)){
    const anchor=normalizeEntryAnchor(raw),eventType=canonicalFinanceProjectionEventType(anchor);
    archiveEntries.push({
      event_type:eventType,anchor_ref:cleanText(anchor.anchor_id||anchor.event_id||anchor.id||anchor.entry_id||"",160),
      anchor_id:cleanText(anchor.anchor_id||anchor.event_id||anchor.id||anchor.entry_id||"",160),session_id:cleanText(session.id||anchor.session_id||"",160),
      bed:cleanText(anchor.bed||anchor.room||"",80).replace(/^#/,""),from_bed:cleanText(anchor.from_bed||anchor.bed_from||"",80).replace(/^#/,""),to_bed:cleanText(anchor.to_bed||anchor.bed_to||"",80).replace(/^#/,""),
      accepted_at:cleanText(anchor.transfer_at||anchor.transfer_date||anchor.checkout_date||anchor.created_at||session.created_at||session.date||"",80),
      effective_status:cleanText(anchor.archive_state||anchor.status||"active",40),voided_at:cleanText(anchor.voided_at||session.voided_at||"",80),
      stay_action:anchor.stay_action,genesis_candidate:anchor.genesis_candidate===true,genesis_group_id:cleanText(anchor.genesis_group_id||"",160),
      checkin_mmdd:cleanText(anchor.checkin_mmdd||anchor.parsed_checkin_mmdd||"",20),rent_coverage_ref:cleanText(anchor.rent_coverage_ref||"",160),
      transfer_anchor_id:cleanText(anchor.transfer_anchor_id||"",160),transfer_lineage_id:cleanText(anchor.transfer_lineage_id||"",160),previous_transfer_anchor_id:cleanText(anchor.previous_transfer_anchor_id||"",160)||null,
      source_context_anchor_refs:Array.isArray(anchor.source_context_anchor_refs)?anchor.source_context_anchor_refs:[]
    });
  }
  const access=gateway?.access_snapshot_context||{};
  return resolveBedTransferSourceContext({corpid:user?.corpid||"",from_bed:fromBed,archive_entries:archiveEntries,transfer_anchors:archiveEntries.filter(row=>row.event_type==="bed_transfer"),void_anchors:archiveEntries.filter(row=>row.event_type==="void_transfer"),open_arrears:gateway?.open_arrears||[],access_snapshot:{parsed_checkin_mmdd:access.parsed_checkin_mmdd,snapshot_fingerprint:access.snapshot_fingerprint}});
}
__name(resolveEmployeeBedTransferSourceContext,"resolveEmployeeBedTransferSourceContext");
async function validateEmployeeBedTransferCanonicalLink(env,user,entry={},normalized={}){
  const fromBed=cleanText(normalized.from_bed||entry.from_bed||entry.bed_from||entry.room||"",40).replace(/^#+/,"");
  const toBed=cleanText(normalized.to_bed||entry.to_bed||entry.bed_to||entry.roomTo||"",40).replace(/^#+/,"");
  const [sourceGateway,targetGateway]=await Promise.all([
    canonicalBedContextGateway(env,user,{bed:fromBed,limit:1000,strict_access_snapshot:true}),
    canonicalBedContextGateway(env,user,{bed:toBed,limit:1000,strict_access_snapshot:true})
  ]);
  const fee=employeeEntryBedTransferFee(entry,normalized);
  const resolved=await resolveEmployeeBedTransferSourceContext(env,user,fromBed,sourceGateway);
  if(resolved.resolution_status!=="resolved")return {ok:false,error_code:resolved.error_code||"BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS",message:"Canonical source context could not be resolved.",invalid_fields:["source_context"],source_context_resolution:resolved};
  const sourceAccess=sourceGateway?.access_snapshot_context||{},targetAccess=targetGateway?.access_snapshot_context||{};
  const source={...resolved,corpid:user?.corpid||"",physical_bed_status:sourceGateway?.occupancy_gateway?.physical_bed_status||"unknown",parsed_vacancy_marker:sourceAccess.parsed_vacancy_marker===true,snapshot_fingerprint:sourceAccess.snapshot_fingerprint||resolved.snapshot_fingerprint,candidate_count:sourceAccess.candidate_count??1,ambiguous:sourceAccess.ambiguous===true,conflict:sourceAccess.conflict===true,stale:sourceAccess.stale===true,parse_status:sourceAccess.parse_status||"parsed",parsed_deposit_amount:sourceAccess.parsed_deposit_amount,parsed_checkin_mmdd:sourceAccess.parsed_checkin_mmdd,parsed_valid_until_mmdd:sourceAccess.parsed_valid_until_mmdd,active_lineage:resolved.active_transfer_lineage_id?{current_bed:fromBed,transfer_lineage_id:resolved.active_transfer_lineage_id,last_active_transfer_anchor_id:resolved.previous_transfer_anchor_id}:null};
  const target={corpid:user?.corpid||"",physical_bed_status:targetGateway?.occupancy_gateway?.physical_bed_status||"unknown",parsed_vacancy_marker:targetAccess.parsed_vacancy_marker===true,snapshot_fingerprint:targetAccess.snapshot_fingerprint,candidate_count:targetAccess.candidate_count??1,ambiguous:targetAccess.ambiguous===true,conflict:targetAccess.conflict===true,stale:targetAccess.stale===true,parse_status:targetAccess.parse_status||"parsed",parsed_deposit_amount:targetAccess.parsed_deposit_amount,parsed_checkin_mmdd:targetAccess.parsed_checkin_mmdd,parsed_valid_until_mmdd:targetAccess.parsed_valid_until_mmdd,normalized_expiry_value:targetAccess.normalized_expiry_value};
  return buildBedTransferCanonicalLinkAnchor({
    client_payload:entry,from_bed:fromBed,to_bed:toBed,
    transfer_at:normalized.transfer_date||entry.transfer_date||entry.transfer_at||"",
    corpid:user?.corpid||"",canonical_source_context:source,canonical_target_context:target,
    active_lineage:source.active_lineage||null,
    fee_mode:entry.fee_mode||fee.fee_choice,
    fee_amount_aed:entry.fee_amount_aed??fee.fee_amount,
    fee_due_date:entry.fee_due_date||"",fee_waiver_reason:entry.fee_waiver_reason||fee.waiver_reason||""
    ,transfer_reason:normalized.transfer_reason||entry.transfer_reason||entry.reason||"",payment_method:fee.payment_method||entry.payment_method||"",ttlock_observation_at:empNow()
  });
}
__name(validateEmployeeBedTransferCanonicalLink,"validateEmployeeBedTransferCanonicalLink");
function validateEmployeeEntryUploadEventFields(type,entry,normalized,eventIndex,anchorPreview){
  const dispatch={
    R:validateRentUploadFields,
    AP:validateArrearsPaymentUploadFields,
    D:validateDepositInUploadFields,
    DR:validateDepositOutUploadFields,
    CO:validateCheckoutUploadFields,
    E:validateExpenseUploadFields,
    TF:validateBedTransferUploadFields,
    TFF:validateBedTransferUploadFields
  };
  const validator=dispatch[type];
  if(!validator)return employeeEntryValidationFailure("event_dispatch","UNKNOWN_EVENT_TYPE","Unsupported employee entry event type.",{
    event_index:eventIndex,
    event_type:cleanText(entry?.event_type||entryAnchorEventType(type)||"",80),
    invalid_fields:["event_type"],
    anchor_preview:anchorPreview
  });
  return validator(entry,normalized,eventIndex,anchorPreview);
}
__name(validateEmployeeEntryUploadEventFields,"validateEmployeeEntryUploadEventFields");
function employeeEntryUploadType(entry={}){
  const event=cleanText(entry.event_type,60).toLowerCase();
  const eventMap={rent:"R",arrears_payment:"AP",deposit_in:"D",deposit_out:"DR",checkout:"CO",left_with_arrears:"CO",expense:"E",bed_transfer:"TF",bed_transfer_fee:"TFF"};
  if(eventMap[event])return eventMap[event];
  if(event)return "";
  if(cleanId(entry.arrears_ref||entry.linked_task_id||entry.original_arrears_id))return "AP";
  const raw=cleanText(entry.type||entry.reason_code||"",20).toUpperCase();
  const legacyMap={R:"R",RENT:"R",SHORT_PAID:"R",AP:"AP",ARREARS_PAYMENT:"AP",D:"D",DEPOSIT:"D",DEPOSIT_IN:"D",DR:"DR",DEPOSIT_OUT:"DR",CO:"CO",CHECKOUT:"CO",E:"E",EXPENSE:"E",TF:"TF",TFF:"TFF",T:"TF",TRANSFER:"TF",BED_TRANSFER:"TF",BED_TRANSFER_FEE:"TFF"};
  return legacyMap[raw]||"";
}
__name(employeeEntryUploadType,"employeeEntryUploadType");
function employeeEntryValidationEntryFromBody(body={},eventIndex=0){
  if(body?.entry&&typeof body.entry==="object"&&Object.keys(body.entry).length)return body.entry;
  const sessionEntries=Array.isArray(body?.session?.entries)?body.session.entries:[];
  const bodyEntries=Array.isArray(body?.entries)?body.entries:[];
  const entries=sessionEntries.length?sessionEntries:bodyEntries;
  const index=Number.isInteger(Number(eventIndex))?Math.max(0,Number(eventIndex)):0;
  return entries[index]||entries[0]||{};
}
__name(employeeEntryValidationEntryFromBody,"employeeEntryValidationEntryFromBody");
function employeeEntryStayGenesisRows(body={},eventIndex=0){
  const index=Number.isInteger(Number(eventIndex))?Math.max(0,Number(eventIndex)):0;
  const rows=[
    body?.entry,
    Array.isArray(body?.entries)?body.entries[index]:null,
    Array.isArray(body?.session?.entries)?body.session.entries[index]:null
  ].filter(row=>row&&typeof row==="object"&&!Array.isArray(row));
  return rows.filter((row,rowIndex)=>rows.indexOf(row)===rowIndex);
}
__name(employeeEntryStayGenesisRows,"employeeEntryStayGenesisRows");
function employeeEntryStayGenesisEnvelopeFailure(body={},eventIndex=0){
  const rows=employeeEntryStayGenesisRows(body,eventIndex);
  const serverManagedFields=["stay_context_id","stay_event_link_id","lifecycle_status","genesis_anchor_id"];
  const forbiddenFields=[...new Set(rows.flatMap(row=>serverManagedFields.filter(field=>Object.hasOwn(row,field))))].sort((a,b)=>a.localeCompare(b));
  if(forbiddenFields.length){
    return {error_code:"STAY_SERVER_MANAGED_FIELD_FORBIDDEN",forbidden_fields:forbiddenFields};
  }
  const actions=rows.filter(row=>Object.hasOwn(row,"stay_action")).map(row=>row.stay_action);
  if(actions.length>1&&!actions.every(value=>Object.is(value,actions[0]))){
    return {error_code:"STAY_TRIGGER_CONFLICT",forbidden_fields:[]};
  }
  return null;
}
__name(employeeEntryStayGenesisEnvelopeFailure,"employeeEntryStayGenesisEnvelopeFailure");
function evaluateEmployeeEntryStayGenesis(body={},eventIndex=0){
  const envelopeFailure=employeeEntryStayGenesisEnvelopeFailure(body,eventIndex);
  if(envelopeFailure)return envelopeFailure;
  const rows=employeeEntryStayGenesisRows(body,eventIndex);
  const selected=employeeEntryValidationEntryFromBody(body,eventIndex);
  const eventType=Object.hasOwn(selected,"event_type")?selected.event_type:undefined;
  const actions=rows.filter(row=>Object.hasOwn(row,"stay_action")).map(row=>row.stay_action);
  const triggerInput={event_type:eventType};
  if(actions.length)triggerInput.stay_action=actions[0];
  return evaluateStayGenesisTrigger(triggerInput);
}
__name(evaluateEmployeeEntryStayGenesis,"evaluateEmployeeEntryStayGenesis");
function employeeEntryStayGenesisStartRequested(body={},eventIndex=0){
  const actions=employeeEntryStayGenesisRows(body,eventIndex).filter(row=>Object.hasOwn(row,"stay_action")).map(row=>row.stay_action);
  return actions.length>0&&actions.every(value=>value==="start");
}
__name(employeeEntryStayGenesisStartRequested,"employeeEntryStayGenesisStartRequested");
function validateEmployeeEntryStayGenesisBusinessFields(body={},eventIndex=0){
  const entry=employeeEntryValidationEntryFromBody(body,eventIndex);
  const type=employeeEntryUploadType(entry);
  if(!["R","D"].includes(type))return null;
  const normalized=normalizeEntryAnchor(entry);
  const anchorPreview={
    id:cleanText(normalized.id||normalized.event_id||normalized.anchor_id,80),
    type,
    event_type:normalized.event_type||entryAnchorEventType(type),
    bed:normalized.bed||normalized.room||entry.room||"",
    amount:entryAnchorMoney(normalized.amount||normalized.payment_amount||normalized.paid_amount||entry.amount)
  };
  return validateEmployeeEntryUploadEventFields(type,entry,normalized,eventIndex,anchorPreview);
}
__name(validateEmployeeEntryStayGenesisBusinessFields,"validateEmployeeEntryStayGenesisBusinessFields");
function employeeEntryStayGenesisFailure(result,eventIndex=0,eventType=""){
  const forbiddenFields=Array.isArray(result?.forbidden_fields)?[...new Set(result.forbidden_fields)].sort((a,b)=>a.localeCompare(b)):[];
  return {
    ...employeeEntryValidationFailure("stay_genesis_trigger",result?.error_code||"STAY_ACTION_INVALID","Durable stay genesis trigger validation failed.",{
      event_index:Number(eventIndex||0),
      event_type:typeof eventType==="string"?eventType:"",
      invalid_fields:forbiddenFields
    }),
    forbidden_fields:forbiddenFields,
    write_attempted:false,
    stay_identity_created:false,
    persistence_adapter_called:false
  };
}
__name(employeeEntryStayGenesisFailure,"employeeEntryStayGenesisFailure");
function stayGenesisWriteNotEnabledResponse(){
  return json({
    success:false,
    ok:false,
    error_code:"STAY_GENESIS_WRITE_NOT_ENABLED",
    write_attempted:false,
    stay_identity_created:false,
    persistence_adapter_called:false,
    migration_required:true
  },503);
}
__name(stayGenesisWriteNotEnabledResponse,"stayGenesisWriteNotEnabledResponse");
function durableStayWriteApproved(env={}){
  return env?.DURABLE_STAY_WRITE_APPROVED==="true";
}
__name(durableStayWriteApproved,"durableStayWriteApproved");
async function durableStayMissingTables(env){
  const required=["stay_contexts","stay_event_links"];
  const results=await Promise.all(required.map(async table=>[table,await empTableExists(env,table)]));
  return results.filter(([,exists])=>!exists).map(([table])=>table).sort((a,b)=>a.localeCompare(b));
}
__name(durableStayMissingTables,"durableStayMissingTables");
function stayGenesisSchemaNotReadyResponse(missingTables=[]){
  return json({
    success:false,
    ok:false,
    error_code:"STAY_GENESIS_SCHEMA_NOT_READY",
    write_attempted:false,
    stay_identity_created:false,
    missing_tables:[...new Set(missingTables)].sort((a,b)=>a.localeCompare(b))
  },503);
}
__name(stayGenesisSchemaNotReadyResponse,"stayGenesisSchemaNotReadyResponse");
function employeeEntryCanonicalGenesisEntries(session={},entry={},prepared,eventIndex=0){
  const source=Array.isArray(session?.entries)&&session.entries.length?session.entries:[entry];
  const index=Math.min(Math.max(0,Number(eventIndex)||0),Math.max(0,source.length-1));
  return source.map((row,rowIndex)=>rowIndex===index?{
    ...(row||{}),
    id:prepared.genesis_entry_id,
    entry_id:prepared.genesis_entry_id,
    event_id:prepared.genesis_anchor_id,
    anchor_id:prepared.genesis_anchor_id,
    session_id:prepared.genesis_session_id,
    event_type:prepared.genesis_event_type,
    stay_action:"start",
    stay_context_id:prepared.stay_context_id,
    stay_lifecycle_action:"genesis"
  }:row);
}
__name(employeeEntryCanonicalGenesisEntries,"employeeEntryCanonicalGenesisEntries");
function employeeEntryBedTransferInputRows(body={}){
  const rows=[
    body,
    body?.entry,
    ...(Array.isArray(body?.entries)?body.entries:[]),
    ...(Array.isArray(body?.session?.entries)?body.session.entries:[])
  ];
  return rows.filter(row=>row&&typeof row==="object"&&["TF","TFF"].includes(employeeEntryUploadType(row)));
}
__name(employeeEntryBedTransferInputRows,"employeeEntryBedTransferInputRows");
function bedTransferForbiddenIdentityFieldsFromBody(body={}){
  const transferRows=employeeEntryBedTransferInputRows(body);
  if(!transferRows.length)return [];
  const topLevel={};
  Object.entries(body||{}).forEach(([key,value])=>{
    if(!["entry","entries","session"].includes(key))topLevel[key]=value;
  });
  return findBedTransferForbiddenIdentityFields([topLevel,...transferRows]);
}
__name(bedTransferForbiddenIdentityFieldsFromBody,"bedTransferForbiddenIdentityFieldsFromBody");
function bedTransferForbiddenIdentityFailure(body={},eventIndex=0){
  const forbiddenFields=bedTransferForbiddenIdentityFieldsFromBody(body);
  if(!forbiddenFields.length)return null;
  return {
    ok:false,
    stage:"bed_transfer_source_of_truth_firewall",
    event_index:Number(eventIndex||0),
    event_type:"bed_transfer",
    error_code:"BED_TRANSFER_FORBIDDEN_IDENTITY_FIELD",
    message:"Bed Transfer provider/card identity fields are forbidden.",
    message_en:"Bed Transfer provider/card identity fields are forbidden.",
    message_zh:"换床请求不得包含供应商或门禁卡身份字段。",
    missing_fields:[],
    invalid_fields:forbiddenFields,
    forbidden_fields:forbiddenFields,
    write_attempted:false
  };
}
__name(bedTransferForbiddenIdentityFailure,"bedTransferForbiddenIdentityFailure");
async function empFindOpenArrearTaskForPaymentReadOnly(env,user,taskId,bed=""){
  const cleanTaskId=cleanId(taskId);
  if(!cleanTaskId)return null;
  const projected=await empFindProjectionArrearsForPayment(env,user,cleanTaskId,bed);
  if(projected&&["open","partial"].includes(String(projected.status||"").toLowerCase())&&cleanMoney(projected.remaining_arrears||0)>0){
    return {
      ...projected,
      task_id:cleanTaskId,
      source:"cloud_arrears_projection",
      materialized_from:projected.materialized_from||"sessions.entries_json",
      arrear_amount:cleanMoney(projected.arrear_amount||projected.original_arrears_amount||0),
      actual_received:cleanMoney(projected.actual_received||projected.already_paid_amount||0),
      close_status:""
    };
  }
  if(projected)return null;
  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
    WHERE task_id=? AND corpid=? LIMIT 1`).bind(cleanTaskId,user.corpid).first().catch(()=>null);
  if(existing)return empCloseStatusIsOpen(existing.close_status)&&empTaskRemaining(existing)>0?existing:null;
  if(!await empTableExists(env,"arrears"))return null;
  const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? AND cleared=0 LIMIT 1")
    .bind(cleanTaskId,user.corpid).first().catch(()=>null);
  return legacy?empLegacyArrearToTask(legacy):null;
}
__name(empFindOpenArrearTaskForPaymentReadOnly,"empFindOpenArrearTaskForPaymentReadOnly");
async function validateEmployeeEntryUploadPayload(env,user,body,opts={}){
  const rawEventIndex=Number(opts.event_index??body?.event_index??0)||0;
  const stayGenesis=evaluateEmployeeEntryStayGenesis(body||{},rawEventIndex);
  const stayGenesisEntry=employeeEntryValidationEntryFromBody(body||{},rawEventIndex);
  if(stayGenesis.error_code)return employeeEntryStayGenesisFailure(stayGenesis,rawEventIndex,stayGenesisEntry?.event_type);
  const firewallFailure=bedTransferForbiddenIdentityFailure(body||{},rawEventIndex);
  if(firewallFailure)return firewallFailure;
  body=normalizeEmployeeEntryBodyForValidation(body||{});
  const eventIndex=Number(opts.event_index ?? body?.event_index ?? 0)||0;
  if(!await empTableExists(env,"sessions")||!await empTableExists(env,"transactions")){
    return employeeEntryValidationFailure("schema","employee_entry_schema_not_ready","employee_entry_schema_not_ready",{event_index:eventIndex});
  }
  const session=body?.session||{};
  const entry=employeeEntryValidationEntryFromBody(body,eventIndex);
  const duplicateGuard=await checkEmployeeEntryDuplicates(env,user,body,{event_index:eventIndex});
  if(!duplicateGuard.ok)return employeeEntryDuplicateValidationFailure(duplicateGuard,eventIndex);
  if(duplicateGuard.idempotent){
    return {
      trace_id:homelinkDiagnosticTraceId("emp-upload"),
      action:"employee_upload_validation",
      source:"dry_run",
      ok:true,
      stage:"duplicate_preflight",
      event_index:eventIndex,
      event_type:entryAnchorEventType(cleanText(entry.type||entry.reason_code||"R",12).toUpperCase()),
      record_id:cleanText(entry.id||entry.event_id||entry.anchor_id||"",80),
      error_code:"",
      message:"Duplicate preflight matched an already synced session; no cloud write is needed.",
      message_en:"Duplicate preflight matched an already synced session; no cloud write is needed.",
      message_zh:"重复预检确认该本票已同步，无需再次写入云端。",
      missing_fields:[],
      invalid_fields:[],
      suggested_action_en:"Keep the existing synced session.",
      suggested_action_zh:"保留已经同步的本票即可。",
      last_successful_stage:"duplicate_preflight",
      payload_preview:{
        session_id:cleanText(session.id||session.session_id||"",80),
        entries_count:Array.isArray(session.entries)?session.entries.length:1,
        source:cleanText(session.source||"employee_entry",40)
      },
      summary:{cash_handover:0,bank_transfer_total:0,bank_transfer_count:0,gross_received:0,balance_total:0},
      entries_count:Array.isArray(session.entries)?session.entries.length:1,
      duplicate_guard:{
        ok:true,
        idempotent:true,
        existing_session_id:duplicateGuard.existing_session_id||"",
        existing_anchor:duplicateGuard.existing_anchor||"",
        canonical_fingerprint_persistence:duplicateGuard.canonical_fingerprint_persistence||"PARTIAL"
      },
      idempotent:true,
      existing_session_id:duplicateGuard.existing_session_id||"",
      existing_anchor:duplicateGuard.existing_anchor||"",
      validation_trace:[employeeEntryValidationTraceStep("duplicate_preflight",true,{event_index:eventIndex,function_name:"checkEmployeeEntryDuplicates"})],
      ...(stayGenesis.requested?{
        stay_genesis:{requested:true,genesis_event_type:stayGenesis.genesis_event_type,write_enabled:false},
        write_attempted:false,
        stay_identity_created:false,
        persistence_adapter_called:false
      }:{}),
      asset_version:HOMELINK_DIAGNOSTIC_ASSET_VERSION,
      worker_version:HOMELINK_DIAGNOSTIC_WORKER_VERSION,
      commit_hash:HOMELINK_DIAGNOSTIC_COMMIT_HASH,
      frontend_asset_version:null,
      expected_frontend_asset_version:HOMELINK_DIAGNOSTIC_ASSET_VERSION,
      stale_frontend_asset:false,
      built_at:HOMELINK_DIAGNOSTIC_BUILT_AT
    };
  }
  const type=employeeEntryUploadType(entry);
  const normalized=normalizeEntryAnchor(entry);
  const anchorPreview={
    id:cleanText(normalized.id||normalized.event_id||normalized.anchor_id,80),
    type,
    event_type:normalized.event_type||entryAnchorEventType(type),
    bed:normalized.bed||normalized.room||entry.room||"",
    amount:entryAnchorMoney(normalized.amount||normalized.payment_amount||normalized.paid_amount||entry.amount)
  };
  let bedTransferPhase1Preview=null;
  const eventFieldValidation=validateEmployeeEntryUploadEventFields(type,entry,normalized,eventIndex,anchorPreview);
  if(eventFieldValidation)return eventFieldValidation;
  if(type==="TF"||type==="TFF"){
    const phase1=opts.canonical_transfer_link_anchor===true
      ?await validateEmployeeBedTransferCanonicalLink(env,user,entry,normalized)
      :await validateEmployeeBedTransferPhase1(env,user,entry,normalized);
    if(!phase1.ok)return employeeEntryValidationFailure("bed_transfer_phase1_contract",phase1.error_code,phase1.message||"Bed Transfer Phase 1 contract rejected the dry-run payload.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:phase1.missing_fields||[],invalid_fields:phase1.invalid_fields||[],anchor_preview:{...anchorPreview,phase1_contract:phase1}});
    bedTransferPhase1Preview=phase1;
  }
  if(normalized.validation_status!=="valid"){
    return employeeEntryValidationFailure("anchor_validation","ANCHOR_CONTRACT_MISSING_FIELDS","Entry anchor is missing required fields.",{
      event_index:eventIndex,event_type:normalized.event_type||entryAnchorEventType(type),
      missing_fields:normalized.validation_missing_fields||[],
      anchor_preview:anchorPreview
    });
  }
  const rawSessionEntries=Array.isArray(session.entries)?session.entries:(Array.isArray(body?.entries)?body.entries:[]);
  const sessionAnchorEntries=rawSessionEntries.map(row=>normalizeEntryAnchor(row));
  for(let i=0;i<sessionAnchorEntries.length;i++){
    const row=sessionAnchorEntries[i];
    if(row.validation_status!=="valid"){
      return employeeEntryValidationFailure("session_anchor_validation","SESSION_ANCHOR_CONTRACT_MISSING_FIELDS","Session contains an invalid anchor.",{
        event_index:i,event_type:row.event_type||entryAnchorEventType(entryAnchorType(row)),
        missing_fields:row.validation_missing_fields||[],
        anchor_preview:{id:row.id||row.event_id||"",type:row.type||"",event_type:row.event_type||"",bed:row.bed||row.room||""}
      });
    }
  }
  const sessionEntriesJson=JSON.stringify({anchor_contract_version:"employee_entry_anchor_v1",entries:sessionAnchorEntries});
  const sessionExportText=employeeEntryExportTextWithAnchors(session.export_text||"",sessionAnchorEntries,{...session,id:session.id||session.session_id||""});
  const decoded=parseEmployeeEntryAnchorJson(sessionEntriesJson);
  if(sessionAnchorEntries.length&&decoded.length!==sessionAnchorEntries.length){
    return employeeEntryValidationFailure("owner_decoder_compat","OWNER_DECODER_CONTRACT_REJECTED","Structured entries_json could not be decoded.",{
      event_index:eventIndex,event_type:normalized.event_type||entryAnchorEventType(type),anchor_preview:anchorPreview
    });
  }
  const exportDecoded=sessionAnchorEntries.length?extractEmployeeEntryAnchorsFromSession({...session,id:session.id||session.session_id||"",entries_json:"",export_text:sessionExportText}):[];
  if(sessionAnchorEntries.length&&exportDecoded.length!==sessionAnchorEntries.length){
    return employeeEntryValidationFailure("export_text_build","EXPORT_TEXT_BUILD_FAILED","Structured anchor block could not be built into export_text.",{
      event_index:eventIndex,event_type:normalized.event_type||entryAnchorEventType(type),anchor_preview:anchorPreview
    });
  }
  let amount=Number(String((type==="AP"?(entry.amount||entry.payment_amount||normalized.payment_amount):entry.amount)||0).replace(/,/g,""));
  const room=cleanText(entry.room||entry.bed||normalized.bed||(type==="E"?entry.expense_category:""),40).replace(/^#+/,"");
  const amountOptional=type==="CO"||type==="TF";
  if(!room||!Number.isFinite(amount)||(!amountOptional&&amount<=0)){
    return employeeEntryValidationFailure("basic_fields","ROOM_AMOUNT_REQUIRED","Room and amount are required.",{
      event_index:eventIndex,event_type:normalized.event_type||entryAnchorEventType(type),
      missing_fields:[!room?"room":"",(!Number.isFinite(amount)||(!amountOptional&&amount<=0))?"amount":""].filter(Boolean),
      anchor_preview:anchorPreview
    });
  }
  let due=Number(String(entry.due||0).replace(/,/g,""));
  let paid=Number(String(entry.paid||0).replace(/,/g,""));
  let periodDue=Number(String(entry.period_due||due||0).replace(/,/g,""));
  const periodStart=cleanText(entry.period_start,20);
  const periodEnd=cleanText(entry.period_end,20);
  const tenantCardId=cleanText(entry.tenant_card_id,80);
  let listPrice=Number(String(entry.list_price||0).replace(/,/g,""));
  const cycle=cleanText(entry.cycle,20);
  const periodDays=Number(entry.period_day_count||0);
  const arrearHandling=cleanText(entry.arrear_handling,40);
  const arrearPromiseDate=cleanDate(entry.arrear_promise_date||entry.promise_date||"");
  const arrearReasonDetail=cleanText(entry.arrear_reason_detail||entry.custom_reason||entry.note,500);
  let apTaskForPayment=null;
  if(type==="R"){
    const cleanPeriodStart=cleanDate(periodStart);
    const cleanPeriodEnd=cleanDate(periodEnd);
    if(!cleanPeriodStart||!cleanPeriodEnd)return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Rent period dates are required.",{event_index:eventIndex,event_type:"rent",missing_fields:["period_start","period_end"],anchor_preview:anchorPreview});
    if(cleanPeriodEnd<cleanPeriodStart)return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Rent period end cannot be before start.",{event_index:eventIndex,event_type:"rent",invalid_fields:["period_end"],anchor_preview:anchorPreview});
    const rentConfig=await empRentConfigReadOnly(env,user.corpid);
    const configuredRent=Number(rentConfig[room]||0);
    if(cycle==="1M"){
      if(!configuredRent)return employeeEntryValidationFailure("rent_validation","RENT_CONFIG_MISSING","Monthly rent config is missing.",{event_index:eventIndex,event_type:"rent",missing_fields:["rent_config"],anchor_preview:anchorPreview});
      if(cleanPeriodEnd!==empAddMonths(cleanPeriodStart,1))return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Rent period end is invalid for 1M cycle.",{event_index:eventIndex,event_type:"rent",invalid_fields:["period_end"],anchor_preview:anchorPreview});
      listPrice=configuredRent;
      periodDue=configuredRent;
      due=configuredRent;
    }else if(cycle==="15D"){
      if(periodDays&&periodDays!==15)return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","15D cycle must use 15 days.",{event_index:eventIndex,event_type:"rent",invalid_fields:["period_day_count"],anchor_preview:anchorPreview});
      if(cleanPeriodEnd!==empAddDays(cleanPeriodStart,14))return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Rent period end is invalid for 15D cycle.",{event_index:eventIndex,event_type:"rent",invalid_fields:["period_end"],anchor_preview:anchorPreview});
      listPrice=configuredRent||listPrice;
      periodDue=400;
      due=400;
    }else if(cycle==="CUST"){
      if(!periodDays||periodDays<=0)return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Custom day count is required.",{event_index:eventIndex,event_type:"rent",missing_fields:["period_day_count"],anchor_preview:anchorPreview});
      if(!Number.isInteger(periodDays))return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Custom day count must be an integer.",{event_index:eventIndex,event_type:"rent",invalid_fields:["period_day_count"],anchor_preview:anchorPreview});
      if(cleanPeriodEnd!==empAddDays(cleanPeriodStart,periodDays-1))return employeeEntryValidationFailure("rent_validation","RENT_PERIOD_INVALID","Rent period end is invalid for custom cycle.",{event_index:eventIndex,event_type:"rent",invalid_fields:["period_end"],anchor_preview:anchorPreview});
      listPrice=configuredRent||listPrice;
      periodDue=Math.round(periodDays*40*100)/100;
      due=periodDue;
    }else if(cycle==="FIRST_PRO"||cycle==="LAST_PRO"){
      listPrice=configuredRent||listPrice;
      periodDue=Math.max(0,periodDays)*40;
      due=periodDue;
    }else if(cycle!=="CUST"&&configuredRent){
      listPrice=configuredRent;
      periodDue=configuredRent;
      due=configuredRent;
    }
    if(amount>due&&!["RETURNED","MANAGER"].includes(cleanText(entry.excess_to,40))){
      return employeeEntryValidationFailure("rent_validation","EXCESS_TO_REQUIRED","Overpaid rent requires an excess handling choice.",{event_index:eventIndex,event_type:"rent",missing_fields:["excess_to"],anchor_preview:anchorPreview});
    }
  }else if(type==="TF"){
    const fee=employeeEntryBedTransferFee(entry,normalized);
    if(!fee.fee_choice)return employeeEntryValidationFailure("bed_transfer_validation","TRANSFER_FEE_CHOICE_REQUIRED","Bed transfer fee choice is required.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["fee_paid"],anchor_preview:anchorPreview});
    if(fee.fee_choice==="paid"&&fee.fee_amount<=0)return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_FEE_FIELD_MISSING","Bed Transfer paid fee requires a positive fee amount.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["fee_amount"],anchor_preview:anchorPreview});
    if(fee.fee_choice==="paid"&&!employeeEntryUploadHasValue(fee.payment_method))return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_FEE_FIELD_MISSING","Bed Transfer paid fee requires payment method.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["payment_method"],anchor_preview:anchorPreview});
    if(fee.fee_choice==="waived"&&!employeeEntryUploadHasValue(fee.waiver_reason))return employeeEntryValidationFailure("bed_transfer_validation","BED_TRANSFER_WAIVER_REASON_REQUIRED","Waiver reason is required.",{event_index:eventIndex,event_type:"bed_transfer",missing_fields:["fee_waiver_reason"],anchor_preview:anchorPreview});
    amount=fee.fee_choice==="paid"?fee.fee_amount:0;
    due=amount;
    paid=amount;
    periodDue=0;
    listPrice=0;
  }else if(type==="AP"){
    const taskId=cleanId(entry.linked_task_id||entry.arrears_ref||entry.original_arrears_id);
    if(!taskId)return employeeEntryValidationFailure("arrears_payment_ref","LINKED_TASK_REQUIRED","Arrears Payment requires a selected cloud arrears ref.",{event_index:eventIndex,event_type:"arrears_payment",missing_fields:["linked_task_id","arrears_ref"],anchor_preview:anchorPreview});
    const projectedTask=await empFindProjectionArrearsForPayment(env,user,taskId,room);
    if(projectedTask&&!["open","partial"].includes(String(projectedTask.status||"").toLowerCase())){
      return employeeEntryValidationFailure("arrears_payment_ref","ARREARS_REF_STALE_REFRESH_REQUIRED","This arrears item is no longer open. Please refresh arrears.",{event_index:eventIndex,event_type:"arrears_payment",invalid_fields:["linked_task_id"],anchor_preview:{...anchorPreview,arrears_ref:taskId,projection_status:projectedTask.status||"",remaining_arrears:cleanMoney(projectedTask.remaining_arrears||0)}});
    }
    if(projectedTask&&cleanMoney(projectedTask.remaining_arrears||0)<=0){
      return employeeEntryValidationFailure("arrears_payment_ref","ARREARS_REF_STALE_REFRESH_REQUIRED","This arrears item is no longer open. Please refresh arrears.",{event_index:eventIndex,event_type:"arrears_payment",invalid_fields:["linked_task_id"],anchor_preview:{...anchorPreview,arrears_ref:taskId,projection_status:projectedTask.status||"",remaining_arrears:cleanMoney(projectedTask.remaining_arrears||0)}});
    }
    apTaskForPayment=await empFindOpenArrearTaskForPaymentReadOnly(env,user,taskId,room);
    if(!apTaskForPayment)return employeeEntryValidationFailure("arrears_payment_ref","ARREARS_REF_STALE_REFRESH_REQUIRED","This arrears item is no longer open. Please refresh arrears.",{event_index:eventIndex,event_type:"arrears_payment",invalid_fields:["linked_task_id"],anchor_preview:{...anchorPreview,arrears_ref:taskId}});
    const remain=Math.max(0,Number(apTaskForPayment.arrear_amount||0)-Number(apTaskForPayment.actual_received||0));
    if(amount<=0||amount>remain+0.01)return employeeEntryValidationFailure("arrears_payment_ref","ARREAR_PAYMENT_AMOUNT_INVALID","Arrears payment amount must be positive and no more than remaining arrears.",{event_index:eventIndex,event_type:"arrears_payment",invalid_fields:["amount"],anchor_preview:{...anchorPreview,arrears_ref:taskId,remaining_arrears:remain}});
    due=amount;
    periodDue=Number(String(entry.period_due||amount).replace(/,/g,""));
  }
  if(["R","TF","TFF"].includes(type))paid=Math.min(amount,due||amount);
  if(type==="AP")paid=amount;
  const currentShortfall=type==="R"&&periodDue>0 ? Math.max(0,periodDue-paid) : 0;
  if(currentShortfall>0){
    if(arrearHandling!=="ARREAR")return employeeEntryValidationFailure("rent_short_paid","ARREAR_TASK_REQUIRED_FOR_SHORTFALL","Short-paid rent must create an arrears task.",{event_index:eventIndex,event_type:"rent",missing_fields:["arrear_handling"],anchor_preview:anchorPreview});
    if(!arrearPromiseDate)return employeeEntryValidationFailure("rent_short_paid","SHORT_PAID_DUE_DATE_REQUIRED","Short-paid rent requires promised payment date.",{event_index:eventIndex,event_type:"rent",missing_fields:["arrear_promise_date"],anchor_preview:anchorPreview});
    if(arrearPromiseDate<empTodayDubai())return employeeEntryValidationFailure("rent_short_paid","ARREAR_PROMISE_DATE_IN_PAST","Short-paid rent promise date cannot be in the past.",{event_index:eventIndex,event_type:"rent",invalid_fields:["arrear_promise_date"],anchor_preview:anchorPreview});
    if(!arrearReasonDetail)return employeeEntryValidationFailure("rent_short_paid","ARREAR_REASON_REQUIRED","Short-paid rent requires reason/note.",{event_index:eventIndex,event_type:"rent",missing_fields:["arrear_reason_detail"],anchor_preview:anchorPreview});
  }
  const depositHeldInput=Number(String(entry.deposit_held||entry.deposit_balance||0).replace(/,/g,""));
  const depositDeduction=Number(String(entry.deposit_deduction||0).replace(/,/g,""));
  let depositBalance=tenantCardId?await empDepositBalance(env,user.corpid,tenantCardId):0;
  if(tenantCardId&&["DR","CO"].includes(type)&&depositBalance<=0&&depositHeldInput>0)depositBalance=depositHeldInput;
  if(!tenantCardId&&["DR","CO"].includes(type)&&depositHeldInput>0)depositBalance=depositHeldInput;
  if(type==="DR"){
    const diff=Math.round((amount-depositBalance)*100)/100;
    const differenceReason=cleanText(entry.difference_reason||"",500);
    if(Math.abs(diff)>0.01&&!differenceReason){
      return employeeEntryValidationFailure("deposit_out_validation","DEPOSIT_REFUND_DIFFERENCE_REASON_REQUIRED","Difference Reason is required when actual refund differs from deposit balance.",{event_index:eventIndex,event_type:"deposit_out",missing_fields:["difference_reason"],anchor_preview:{...anchorPreview,deposit_balance:depositBalance,actual_refund_amount:amount,refund_difference:diff}});
    }
  }
  if(["DR","CO"].includes(type)&&!(type==="CO"&&entry.left_with_arrears)){
    const openArrears=room?await getOpenCloudArrearsForBed(env,user,room,{limit:2000}).catch(()=>[]):[];
    if(openArrears.length){
      return employeeEntryValidationFailure(type==="DR"?"deposit_out_validation":"checkout_validation",type==="DR"?"DEPOSIT_REFUND_OPEN_ARREARS_OWNER_APPROVAL_REQUIRED":"CHECKOUT_OPEN_ARREARS_LEFT_WITH_ARREARS_REQUIRED",type==="DR"?"Open cloud arrears block direct deposit refund.":"This customer has unpaid arrears. Normal checkout is not allowed.",{event_index:eventIndex,event_type:type==="DR"?"deposit_out":"checkout",invalid_fields:["open_arrears"],anchor_preview:{...anchorPreview,open_arrears_count:openArrears.length}});
    }
  }
  if(type==="CO"&&entry.left_with_arrears){
    const missing=[];
    if(!cleanText(entry.whatsapp_phone||entry.former_customer_phone||entry.contact_method,80))missing.push("contact_phone_or_method");
    if(!cleanDate(entry.left_date||entry.checkout_date||entry.checkout_attempt_date||""))missing.push("left_date");
    if(!cleanDate(entry.promised_payment_date||entry.promise_date||""))missing.push("promised_payment_date");
    if(cleanMoney(entry.left_arrears_amount||entry.arrears_amount||entry.outstanding_arrears||0)<=0)missing.push("left_arrears_amount");
    if(!cleanText(entry.final_note||entry.note,500))missing.push("note");
    if(missing.length){
      return employeeEntryValidationFailure("left_with_arrears_validation","LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING","Left With Arrears is missing required fields.",{event_index:eventIndex,event_type:"left_with_arrears",missing_fields:missing,anchor_preview:anchorPreview});
    }
    const taskId=cleanId(entry.cloud_arrears_ref||entry.arrears_ref||"");
    if(!taskId)return employeeEntryValidationFailure("left_with_arrears_validation","CLOUD_ARREARS_REF_REQUIRED","Left With Arrears requires a cloud arrears ref.",{event_index:eventIndex,event_type:"left_with_arrears",missing_fields:["cloud_arrears_ref"],anchor_preview:anchorPreview});
    const openLeftTask=await empFindOpenArrearTaskForPaymentReadOnly(env,user,taskId,room);
    if(!openLeftTask)return employeeEntryValidationFailure("left_with_arrears_validation","CLOUD_ARREARS_NOT_OPEN","Left With Arrears cloud arrears ref is not open.",{event_index:eventIndex,event_type:"left_with_arrears",invalid_fields:["cloud_arrears_ref"],anchor_preview:{...anchorPreview,cloud_arrears_ref:taskId}});
  }
  if(type==="CO"&&depositDeduction>depositBalance+0.01){
    return employeeEntryValidationFailure("checkout_validation","DEPOSIT_DEDUCTION_EXCEEDS_BALANCE","Deposit deduction exceeds deposit balance.",{event_index:eventIndex,event_type:"checkout",invalid_fields:["deposit_deduction"],anchor_preview:{...anchorPreview,deposit_balance:depositBalance,deposit_deduction:depositDeduction}});
  }
  const summary={
    cash_handover:Number(String(session.cash_handover||0).replace(/,/g,"")),
    bank_transfer_total:Number(String(session.bank_transfer_total||0).replace(/,/g,"")),
    bank_transfer_count:Number(session.bank_transfer_count||0),
    gross_received:Number(String(session.gross_received||0).replace(/,/g,"")),
    balance_total:entryAnchorMoney(Number(String(session.cash_handover||0).replace(/,/g,""))+Number(String(session.bank_transfer_total||0).replace(/,/g,"")))
  };
  return {
    trace_id:homelinkDiagnosticTraceId("emp-upload"),
    action:"employee_upload_validation",
    source:"dry_run",
    ok:true,
    stage:"final_preflight",
    event_index:eventIndex,
    event_type:normalized.event_type||entryAnchorEventType(type),
    record_id:anchorPreview.id||null,
    error_code:"",
    message:"Upload validation passed.",
    message_en:"Upload validation passed.",
    message_zh:"上传前校验通过。",
    missing_fields:[],
    invalid_fields:[],
    suggested_action_en:"Continue upload.",
    suggested_action_zh:"可以继续上传。",
    last_successful_stage:"final_preflight",
    payload_preview:{
      session_id:cleanText(session.id||session.session_id||"",80),
      entries_count:sessionAnchorEntries.length||1,
      source:cleanText(session.source||"employee_entry",40)
    },
    summary,
    entries_count:sessionAnchorEntries.length||1,
    export_text_preview:String(sessionExportText||"").slice(0,1000),
    anchor_types:sessionAnchorEntries.map(row=>row.event_type||entryAnchorEventType(entryAnchorType(row))),
    anchor_preview:anchorPreview,
    bed_transfer_phase1_preview:bedTransferPhase1Preview,
    normalized_entry:normalized,
    ...(stayGenesis.requested?{
      stay_genesis:{requested:true,genesis_event_type:stayGenesis.genesis_event_type,write_enabled:false},
      write_attempted:false,
      stay_identity_created:false,
      persistence_adapter_called:false
    }:{}),
    duplicate_guard:{
      ok:true,
      idempotent:!!duplicateGuard.idempotent,
      existing_session_id:duplicateGuard.existing_session_id||"",
      existing_anchor:duplicateGuard.existing_anchor||"",
      canonical_fingerprint_persistence:duplicateGuard.canonical_fingerprint_persistence||"PARTIAL"
    },
    idempotent:!!duplicateGuard.idempotent,
    existing_session_id:duplicateGuard.existing_session_id||"",
    existing_anchor:duplicateGuard.existing_anchor||"",
    validation_trace:employeeEntryValidationSuccessTrace(type,eventIndex,normalized.event_type||entryAnchorEventType(type)),
    asset_version:HOMELINK_DIAGNOSTIC_ASSET_VERSION,
    worker_version:HOMELINK_DIAGNOSTIC_WORKER_VERSION,
    commit_hash:HOMELINK_DIAGNOSTIC_COMMIT_HASH,
    frontend_asset_version:null,
    expected_frontend_asset_version:HOMELINK_DIAGNOSTIC_ASSET_VERSION,
    stale_frontend_asset:false,
    built_at:HOMELINK_DIAGNOSTIC_BUILT_AT
  };
}
__name(validateEmployeeEntryUploadPayload,"validateEmployeeEntryUploadPayload");
async function handleEmployeeEntryValidate(request,env,user){
  let body;
  try{body=await request.json();}catch{return json({success:false,...employeeEntryValidationFailure("payload","PAYLOAD_PARSE_FAILED","Upload payload could not be parsed.",{
    event_index:0,
    event_type:"entry",
    message_en:"Upload payload could not be parsed.",
    message_zh:"上传数据格式无法解析。",
    invalid_fields:["request_body"],
    suggested_action_en:"Refresh the page and try Upload Session again. If it repeats, copy the diagnostic response.",
    suggested_action_zh:"请刷新页面后重新上传；如果重复出现，请复制诊断返回。"
  })},400);}
  const assetInfo=employeeEntryDiagnosticAssetInfo(body);
  let result;
  try{
    result=await validateEmployeeEntryUploadPayload(env,user,body,{event_index:body?.event_index,canonical_transfer_link_anchor:true});
  }catch(err){
    const eventIndex=Number(body?.event_index||0)||0;
    const eventType=entryAnchorEventType(cleanText(body?.entry?.type||body?.entry?.reason_code||"R",12).toUpperCase());
    return json({success:false,...employeeEntryValidationFailure("validate_exception","VALIDATION_EXCEPTION","Upload validation threw an exception before cloud write.",{
      ...assetInfo,
      event_index:eventIndex,
      event_type:eventType,
      message_en:"Upload validation threw an exception before cloud write.",
      message_zh:"上传前校验发生异常，未写入云端。",
      suggested_action_en:"Use the validation trace to identify the failing stage, then retry after the record is corrected.",
      suggested_action_zh:"请根据校验链路定位失败阶段，修正记录后重试。",
      anchor_preview:{exception_name:err?.name||"Error"}
    })},422);
  }
  result={...result,...assetInfo};
  if(!result.ok)return json({success:false,...result},422);
  return success({...result,occupancy_candidate_preview:buildEmployeeEntryOccupancyCandidatePreview(user,body)});
}
__name(handleEmployeeEntryValidate,"handleEmployeeEntryValidate");
function employeeBedTransferSingleEntryFailure(body={}){
  const rows=Array.isArray(body?.session?.entries)&&body.session.entries.length?body.session.entries:(Array.isArray(body?.entries)&&body.entries.length?body.entries:(body?.entry?[body.entry]:[]));
  if(rows.length!==1||employeeEntryUploadType(rows[0])!=='TF')return employeeEntryValidationFailure('bed_transfer_session_boundary','BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY','Bed Transfer must be the only entry in its canonical session.',{invalid_fields:['session.entries']});
  return null;
}
__name(employeeBedTransferSingleEntryFailure,"employeeBedTransferSingleEntryFailure");
async function persistEmployeeBedTransferCanonicalArchive(env,user,body,validationResult){
  const session=body?.session||{},sessionId=cleanId(session.id||session.session_id);
  const preview=validationResult?.bed_transfer_phase1_preview||{};
  const base=prepareCanonicalTransferArchiveWrite({validated_anchor:preview,session_id:sessionId,accepted_at:empNow(),operator_reference:cleanText(user?.userid||'',120)});
  if(!base.ok)return json({success:false,ok:false,error_code:base.error_code,no_write:true},422);
  const readExisting=()=>env.DB.prepare('SELECT id, entries_json FROM sessions WHERE id=? AND corpid=? LIMIT 1').bind(sessionId,user.corpid).first().catch(()=>null);
  const existing=await readExisting();
  if(existing){const classified=classifyExistingCanonicalTransfer(existing.entries_json,base.request_fingerprint);if(classified.status==='conflict')return json({success:false,ok:false,error_code:classified.error_code,no_write:true},409);return success({success:true,ok:true,idempotent:true,already_accepted:true,session_id:sessionId,canonical_entry:classified.entry});}
  const prepared=prepareCanonicalTransferArchiveWrite({validated_anchor:preview,session_id:sessionId,accepted_at:empNow(),operator_reference:cleanText(user?.userid||'',120)},{idFactory:()=>crypto.randomUUID()});
  try{
    await empInsertDynamicMode(env,'sessions',{id:sessionId,corpid:user.corpid,anchor_id:cleanText(session.anchorId||session.anchor_id||prepared.entry.transfer_anchor_id,160),date:cleanDate(session.date||prepared.entry.canonical_accepted_at),entries_count:1,created_by:user.userid,created_at:prepared.entry.canonical_accepted_at,operator_id:user.userid,operator_name:cleanText(user.employee_name||user.userid,120),cash_handover:0,bank_transfer_total:0,bank_transfer_count:0,gross_received:0,handover_status:'COMPLETED',exported_at:prepared.entry.canonical_accepted_at,export_text:'',source:'employee_entry',entries_json:prepared.entries_json,summary_json:JSON.stringify({cash_handover:0,bank_transfer_total:0,bank_transfer_count:0,gross_received:0,balance_total:0})},EMP_SESSION_COLUMNS,'INSERT');
  }catch(error){const raced=await readExisting();if(!raced)throw error;const classified=classifyExistingCanonicalTransfer(raced.entries_json,base.request_fingerprint);if(classified.status==='conflict')return json({success:false,ok:false,error_code:classified.error_code,no_write:true},409);return success({success:true,ok:true,idempotent:true,already_accepted:true,session_id:sessionId,canonical_entry:classified.entry});}
  return success({success:true,ok:true,idempotent:false,canonical_write_status:'accepted',session_id:sessionId,canonical_entry:prepared.entry});
}
__name(persistEmployeeBedTransferCanonicalArchive,"persistEmployeeBedTransferCanonicalArchive");
async function handleEmployeeEntry(request,env,user){
  const timingEnabled=request.headers.get("X-Employee-Entry-Timing")==="1";
  const timing={started_at:Date.now(),d1_write_ms:0,total_ms:0};
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const stayGenesisEnvelopeFailure=employeeEntryStayGenesisEnvelopeFailure(body||{},body?.event_index??0);
  const stayGenesisEntry=employeeEntryValidationEntryFromBody(body||{},body?.event_index??0);
  const stayGenesisStartRequested=employeeEntryStayGenesisStartRequested(body||{},body?.event_index??0);
  if(stayGenesisEnvelopeFailure)return json({success:false,...employeeEntryStayGenesisFailure(stayGenesisEnvelopeFailure,body?.event_index??0,stayGenesisEntry?.event_type)},422);
  if(stayGenesisStartRequested){
    const stayGenesisBusinessFailure=validateEmployeeEntryStayGenesisBusinessFields(body||{},body?.event_index??0);
    if(stayGenesisBusinessFailure)return json({success:false,...stayGenesisBusinessFailure},422);
  }
  const stayGenesis=evaluateEmployeeEntryStayGenesis(body||{},body?.event_index??0);
  if(stayGenesis.error_code)return json({success:false,...employeeEntryStayGenesisFailure(stayGenesis,body?.event_index??0,stayGenesisEntry?.event_type)},422);
  if(stayGenesisStartRequested&&!durableStayWriteApproved(env))return stayGenesisWriteNotEnabledResponse();
  if(stayGenesis.requested){
    const missingStayTables=await durableStayMissingTables(env);
    if(missingStayTables.length)return stayGenesisSchemaNotReadyResponse(missingStayTables);
  }
  const firewallFailure=bedTransferForbiddenIdentityFailure(body||{},body?.event_index??0);
  if(firewallFailure)return json({success:false,...firewallFailure},422);
  const entryForWriteGate=employeeEntryValidationEntryFromBody(body||{});
  const writeGateType=employeeEntryUploadType(entryForWriteGate);
  if(["TF","TFF"].includes(writeGateType)&&!bedTransferWriteApproved(env))return bedTransferWriteDisabledResponse();
  if(["TF","TFF"].includes(writeGateType)){
    const boundaryFailure=employeeBedTransferSingleEntryFailure(body||{});
    if(boundaryFailure)return json({success:false,...boundaryFailure},422);
  }
  if(!await empTableExists(env,"sessions")||!await empTableExists(env,"transactions"))return errorResponse("employee_entry_schema_not_ready",503,"employee_entry_schema_not_ready");
  body=normalizeEmployeeEntryBodyForValidation(body||{});
  const validationResult=await validateEmployeeEntryUploadPayload(env,user,body,{event_index:body?.event_index,canonical_transfer_link_anchor:["TF","TFF"].includes(writeGateType)});
  if(!validationResult.ok)return json({success:false,...validationResult},422);
  if(validationResult.idempotent){
    const entry=body?.entry||{};
    return success({
      success:true,
      ok:true,
      idempotent:true,
      no_write:true,
      entry_id:cleanId(entry.id)||cleanText(validationResult.record_id||"",80),
      session_id:validationResult.existing_session_id||cleanText(body?.session?.id||body?.session?.session_id||"",120),
      existing_session_id:validationResult.existing_session_id||"",
      existing_anchor:validationResult.existing_anchor||"",
      duplicate_guard:validationResult.duplicate_guard||{ok:true,idempotent:true,canonical_fingerprint_persistence:"PARTIAL"}
    });
  }
  const entry=stayGenesis.requested?employeeEntryValidationEntryFromBody(body||{},body?.event_index??0):(body?.entry||{});
  const session=body?.session||{};
  const liveRouteGate=eeaLiveRouteGate(env);
  let liveRouteAdapterDraft=null;
  if(liveRouteGate.enabled){
    if(!EEA_EMPLOYEE_ROLES.has(String(user.role||"").toLowerCase()))return hscError("FORBIDDEN","Only employee/staff may use the employee entry adapter live-route rehearsal.",403);
    liveRouteAdapterDraft=createEmployeeEntryLiveWriteAdapterDraft(eeaBuildAdapterInput(body,user));
    const adapterRefId=cleanId(entry.id)||liveRouteAdapterDraft.clientEntryId||empId("eea");
    await eeaRecordLiveRoutePrevalidation(env,user,adapterRefId,liveRouteAdapterDraft,liveRouteGate);
    if(liveRouteAdapterDraft.status==="SKIPPED_VOIDED"){
      return success({
        success:true,
        skipped:true,
        reason:"voided_row_excluded",
        adapter_live_route_rehearsal:eeaLiveRouteSummary(liveRouteAdapterDraft,liveRouteGate,{legacyWriteContinued:false})
      });
    }
    if(!liveRouteAdapterDraft.ok){
      return hscError("EMPLOYEE_ENTRY_ADAPTER_REJECTED","Employee entry adapter pre-validation rejected the request before legacy write.",422,{
        adapter_live_route_rehearsal:eeaLiveRouteSummary(liveRouteAdapterDraft,liveRouteGate,{legacyWriteContinued:false})
      });
    }
  }
  const type=cleanText(entry.type||entry.reason_code||"R",12).toUpperCase();
  let amount=Number(String(entry.amount||0).replace(/,/g,""));
  const room=cleanText(entry.room||(type==="E"?entry.expense_category:""),40).replace(/^#+/,"");
  const amountOptional=type==="CO"||type==="TF";
  const entryId=cleanId(entry.id)||empId("ent");
  const sessionId=cleanId(session.id)||empId("emp");
  const now=cleanText(entry.created_at,40)||empNow();
  const entryAnchorId=cleanId(entry.anchor_id||entry.event_id||entry.id)||entryId;
  const authOperatorId=cleanText(user.userid,80);
  const operatorName=cleanText(user.employee_name||user.userid,120);
  const existingTx=await env.DB.prepare("SELECT id,session_id,type,linked_task_id FROM transactions WHERE id=? AND corpid=? LIMIT 1").bind(entryId,user.corpid).first();
  if(existingTx){
    let arrearTask=null;
    if(existingTx.type==="AP"&&existingTx.linked_task_id){
      arrearTask=await empReconcileArrearTask(env,user,existingTx.linked_task_id,authOperatorId,now);
    }
    return success({
      success:true,
      entry_id:entryId,
      session_id:existingTx.session_id||sessionId,
      duplicate:true,
      arrear_task:arrearTask,
      ...(liveRouteAdapterDraft?{adapter_live_route_rehearsal:eeaLiveRouteSummary(liveRouteAdapterDraft,liveRouteGate,{legacyWriteContinued:false,duplicate:true})}: {})
    });
  }
  if(!room||!Number.isFinite(amount)||(!amountOptional&&amount<=0))return badRequest("room_amount_required");
  let due=Number(String(entry.due||0).replace(/,/g,""));
  let paid=Number(String(entry.paid||0).replace(/,/g,""));
  let periodDue=Number(String(entry.period_due||due||0).replace(/,/g,""));
  const periodStart=cleanText(entry.period_start,20);
  const periodEnd=cleanText(entry.period_end,20);
  const tenantCardId=cleanText(entry.tenant_card_id,80);
  const tenantName=cleanText(entry.tenant_name,120);
  let listPrice=Number(String(entry.list_price||0).replace(/,/g,""));
  const cycle=cleanText(entry.cycle,20);
  const periodDays=Number(entry.period_day_count||0);
  const arrearHandling=cleanText(entry.arrear_handling,40);
  const arrearPromiseDate=cleanDate(entry.arrear_promise_date||entry.promise_date||"");
  const arrearReasonDetail=cleanText(entry.arrear_reason_detail||entry.custom_reason||entry.note,500);
  const promiseAmount=Number(String(entry.promise_amount||0).replace(/,/g,""));
  let apTaskForPayment=null;
  if(type==="R"){
    const cleanPeriodStart=cleanDate(periodStart);
    const cleanPeriodEnd=cleanDate(periodEnd);
    if(!cleanPeriodStart||!cleanPeriodEnd)return badRequest("period_dates_required");
    if(cleanPeriodEnd<cleanPeriodStart)return badRequest("period_end_before_start");
    const configuredRent=await empRentForBed(env,user.corpid,room);
    if(cycle==="1M"){
      if(!configuredRent)return badRequest("rent_config_missing");
      if(cleanPeriodEnd!==empAddMonths(cleanPeriodStart,1))return badRequest("period_end_invalid_for_1m");
      listPrice=configuredRent;
      periodDue=configuredRent;
      due=configuredRent;
    }else if(cycle==="15D"){
      if(periodDays&&periodDays!==15)return badRequest("period_days_invalid_for_15d");
      if(cleanPeriodEnd!==empAddDays(cleanPeriodStart,14))return badRequest("period_end_invalid_for_15d");
      listPrice=configuredRent||listPrice;
      periodDue=400;
      due=400;
    }else if(cycle==="CUST"){
      if(!periodDays||periodDays<=0)return badRequest("custom_days_required");
      if(!Number.isInteger(periodDays))return badRequest("custom_days_must_be_integer");
      if(cleanPeriodEnd!==empAddDays(cleanPeriodStart,periodDays-1))return badRequest("period_end_invalid_for_custom");
      listPrice=configuredRent||listPrice;
      periodDue=Math.round(periodDays*40*100)/100;
      due=periodDue;
    }else if(cycle==="FIRST_PRO"||cycle==="LAST_PRO"){
      listPrice=configuredRent||listPrice;
      periodDue=Math.max(0,periodDays)*40;
      due=periodDue;
    }else if(cycle!=="CUST"&&configuredRent){
      listPrice=configuredRent;
      periodDue=configuredRent;
      due=configuredRent;
    }
    if(amount>due){
      const excessTo=cleanText(entry.excess_to,40);
      if(!["RETURNED","MANAGER"].includes(excessTo))return badRequest("excess_to_required");
    }
  }else if(type==="TF"){
    const fee=employeeEntryBedTransferFee(entry,{});
    if(!fee.fee_choice)return badRequest("transfer_fee_choice_required");
    if(fee.fee_choice==="paid"&&fee.fee_amount<=0)return badRequest("bed_transfer_fee_amount_required");
    if(fee.fee_choice==="paid"&&!employeeEntryUploadHasValue(fee.payment_method))return badRequest("bed_transfer_payment_method_required");
    if(fee.fee_choice==="waived"&&!employeeEntryUploadHasValue(fee.waiver_reason))return badRequest("bed_transfer_waiver_reason_required");
    amount=fee.fee_choice==="paid"?fee.fee_amount:0;
    due=amount;
    paid=amount;
    periodDue=0;
    listPrice=0;
  }else if(type==="TFF"){
    periodDue=50;
    due=50;
    listPrice=0;
  }else if(type==="AP"){
    const taskId=cleanId(entry.linked_task_id);
    if(!taskId)return badRequest("linked_task_required");
    apTaskForPayment=await empEnsureOpenArrearTaskForPayment(env,user,taskId,authOperatorId,now,room);
    if(!apTaskForPayment)return badRequest("linked_task_not_open");
    const remain=Math.max(0,Number(apTaskForPayment.arrear_amount||0)-Number(apTaskForPayment.actual_received||0));
    if(amount<=0||amount>remain+0.01)return badRequest("arrear_payment_amount_invalid");
    due=amount;
    periodDue=Number(String(entry.period_due||amount).replace(/,/g,""));
  }
  if(["R","TF","TFF"].includes(type))paid=Math.min(amount,due||amount);
  if(type==="AP")paid=amount;
  const entryClr = due&&amount<due ? "N" : "Y";
  const currentShortfall=type==="R"&&periodDue>0 ? Math.max(0,periodDue-paid) : 0;
  if(currentShortfall>0){
    if(arrearHandling!=="ARREAR")return badRequest("arrear_task_required_for_shortfall");
    if(!arrearPromiseDate)return badRequest("arrear_promise_date_required");
    if(arrearPromiseDate<empTodayDubai())return badRequest("arrear_promise_date_in_past");
    if(!arrearReasonDetail)return badRequest("arrear_reason_required");
  }
  const depositHeldInput=Number(String(entry.deposit_held||0).replace(/,/g,""));
  const depositDeduction=Number(String(entry.deposit_deduction||0).replace(/,/g,""));
  let depositBalance=tenantCardId?await empDepositBalance(env,user.corpid,tenantCardId):0;
  const seedLegacyDeposit=tenantCardId&&["DR","CO"].includes(type)&&depositBalance<=0&&depositHeldInput>0;
  if(seedLegacyDeposit)depositBalance=depositHeldInput;
  if(type==="DR"){
    const diff=Math.round((amount-depositBalance)*100)/100;
    const refundReason=cleanText(entry.refund_reason||entry.difference_reason||entry.ded_note||entry.note,500);
    if(Math.abs(diff)>0.01&&!refundReason)return badRequest("deposit_refund_difference_reason_required");
  }
  if(["DR","CO"].includes(type)&&!(type==="CO"&&entry.left_with_arrears)){
    const openArrears=room?await getOpenCloudArrearsForBed(env,user,room,{limit:2000}).catch(()=>[]):[];
    if(openArrears.length)return badRequest(type==="DR"?"deposit_refund_open_arrears_owner_approval_required":"checkout_open_arrears_owner_approval_required");
  }
  if(type==="CO"&&depositDeduction>depositBalance+0.01)return badRequest("deposit_deduction_exceeds_balance");
  const preparedStayGenesis=stayGenesis.requested?prepareStayGenesis({
    corpid:cleanText(user.corpid,120),
    genesis_event_type:stayGenesis.genesis_event_type,
    genesis_session_id:sessionId,
    genesis_entry_id:entryId,
    genesis_anchor_id:entryAnchorId,
    started_at:now
  },{randomUUID:()=>crypto.randomUUID()}):null;
  const d1WriteStart=Date.now();
  const canonicalInputEntries=preparedStayGenesis
    ?employeeEntryCanonicalGenesisEntries(session,entry,preparedStayGenesis,body?.event_index??0)
    :(Array.isArray(session.entries)?session.entries:[]);
  const sessionAnchorEntries=buildEmployeeEntryEntriesWithOccupancyCandidateMetadata(user,body,canonicalInputEntries);
  const sessionEntriesJson=JSON.stringify({anchor_contract_version:"employee_entry_anchor_v1",entries:sessionAnchorEntries});
  const sessionSummaryJson=JSON.stringify({
    cash_handover:Number(String(session.cash_handover||0).replace(/,/g,"")),
    bank_transfer_total:Number(String(session.bank_transfer_total||0).replace(/,/g,"")),
    bank_transfer_count:Number(session.bank_transfer_count||0),
    gross_received:Number(String(session.gross_received||0).replace(/,/g,"")),
    balance_total:entryAnchorMoney(Number(String(session.cash_handover||0).replace(/,/g,""))+Number(String(session.bank_transfer_total||0).replace(/,/g,"")))
  });
  const sessionExportText=employeeEntryExportTextWithAnchors(session.export_text||"",sessionAnchorEntries,{...session,id:sessionId});
  await empInsertDynamic(env,"sessions",{
    id:sessionId,
    corpid:user.corpid,
    anchor_id:cleanText(session.anchorId||session.anchor_id||("EMP-"+now.slice(0,10).replaceAll("-","")),80),
    date:cleanDate(session.date||now),
    entries_count:sessionAnchorEntries.length||1,
    created_by:user.userid,
    created_at:now,
    operator_id:authOperatorId,
    operator_name:operatorName,
    cash_handover:Number(String(session.cash_handover||0).replace(/,/g,"")),
    bank_transfer_total:Number(String(session.bank_transfer_total||0).replace(/,/g,"")),
    bank_transfer_count:Number(session.bank_transfer_count||0),
    gross_received:Number(String(session.gross_received||0).replace(/,/g,"")),
    handover_status:cleanText(session.handover_status||"EXPORTING",40),
    exported_at:cleanText(session.exported_at||now,40),
    export_text:cleanText(sessionExportText,50000),
    source:cleanText(session.source||"employee_entry",40)||"employee_entry",
    entries_json:cleanText(sessionEntriesJson,50000),
    summary_json:cleanText(sessionSummaryJson,5000)
  },EMP_SESSION_COLUMNS);
  const inserted=await empInsertDynamic(env,"transactions",{
    id:entryId,corpid:user.corpid,userid:user.userid,session_id:sessionId,cat:cleanText(entry.cat||"cash",20),
    room,amount,due,paid,deficit:Math.max(0,due-paid),
    tag:cleanText(entry.tag||"Old",20),note:cleanText(entry.note,500),room_to:cleanText(entry.roomTo||entry.room_to,40),
    pay_type:cleanText(entry.pay_type||entry.payType||"",10),
    period_start:periodStart,period_end:periodEnd,cycle,
    reason_code:cleanText(entry.reason_code,30),operator_id:authOperatorId,operator_name:operatorName,src:"EMP",
    tenant_name:tenantName,clr:entryClr,reason:cleanText(entry.reason||entry.custom_reason,120),created_at:now,
    type,tenant_card_id:tenantCardId,list_price:listPrice,period_day_count:periodDays,
    period_due:periodDue,custom_reason:cleanText(entry.custom_reason,240),entry_clr:entryClr,
    excess:Number(entry.excess||Math.max(0,amount-due)),excess_to:cleanText(entry.excess_to,40),bank_ref:cleanText(entry.bank_ref,80),
    status:cleanText(entry.status||"ACTIVE",20),ts:cleanText(entry.ts||now,40),checkout_date:cleanText(entry.checkout_date,20),
    deposit_held:type==="CO"?depositBalance:depositHeldInput,deposit_return:cleanText(entry.deposit_return,20),deposit_amt:Number(String(entry.deposit_amt||0).replace(/,/g,"")),
    deposit_deduction:depositDeduction,ded_reason:cleanText(entry.ded_reason,80),ded_days:Number(entry.ded_days||0),
    ded_rate:Number(String(entry.ded_rate||40).replace(/,/g,"")),ded_note:cleanText(entry.ded_note,240),early_days:Number(entry.early_days||0),
    arrear_handling:arrearHandling,bed_from:cleanText(entry.bed_from,40),bed_to:cleanText(entry.bed_to,40),
    fee_paid:type==="TF"?(employeeEntryBedTransferFee(entry,{}).fee_paid?"Y":"N"):cleanText(entry.fee_paid,5),fee_waiver_reason:type==="TF"?employeeEntryBedTransferFee(entry,{}).waiver_reason:cleanText(entry.fee_waiver_reason,240),
    expense_category:cleanText(entry.expense_category,40),expense_desc:cleanText(entry.expense_desc,240),
    linked_task_id:cleanText(entry.linked_task_id,80),original_period_start:cleanText(entry.original_period_start,20),
    original_period_end:cleanText(entry.original_period_end,20),
    arrear_promise_date:arrearPromiseDate,arrear_reason_detail:arrearReasonDetail,promise_amount:Number.isFinite(promiseAmount)?promiseAmount:0
  },EMP_TX_COLUMNS);
  let depositLedger=null;
  if(tenantCardId&&type==="D"){
    depositLedger=await empDepositMove(env,user,{tenant_card_id:tenantCardId,tenant_name:tenantName,bed:room,entry_id:entryId,type,amount,delta:amount,note:cleanText(entry.note,240),operator_id:authOperatorId,ts:now});
  }else if(tenantCardId&&type==="DR"){
    if(seedLegacyDeposit)await empDepositMove(env,user,{tenant_card_id:tenantCardId,tenant_name:tenantName,bed:room,entry_id:entryId,type:"LEGACY_SEED",amount:depositBalance,delta:depositBalance,note:"legacy deposit seed from lock card",operator_id:authOperatorId,ts:now});
    depositLedger=await empDepositMove(env,user,{tenant_card_id:tenantCardId,tenant_name:tenantName,bed:room,entry_id:entryId,type,amount,delta:-amount,note:cleanText(entry.note,240),operator_id:authOperatorId,ts:now});
  }else if(tenantCardId&&type==="CO"&&depositBalance>0&&depositDeduction>0){
    if(seedLegacyDeposit)await empDepositMove(env,user,{tenant_card_id:tenantCardId,tenant_name:tenantName,bed:room,entry_id:entryId,type:"LEGACY_SEED",amount:depositBalance,delta:depositBalance,note:"legacy deposit seed from lock card",operator_id:authOperatorId,ts:now});
    depositLedger=await empDepositMove(env,user,{tenant_card_id:tenantCardId,tenant_name:tenantName,bed:room,entry_id:entryId,type,amount:depositDeduction,delta:-depositDeduction,note:`checkout deduction ${depositDeduction}`,operator_id:authOperatorId,ts:now});
  }
  let arrearTask=null;
  if(type==="R"&&periodStart&&periodEnd&&periodDue>0){
    const existing=await env.DB.prepare(`SELECT task_id FROM arrear_tasks
      WHERE corpid=? AND bed=? AND original_period_start=? AND original_period_end=?
        AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`).bind(user.corpid,room,periodStart,periodEnd).first();
    const remain=currentShortfall;
    if(remain>0){
      if(existing?.task_id){
        await env.DB.prepare(`UPDATE arrear_tasks
          SET arrear_amount=?, promise_date=?, promise_amount=?, arrear_reason=?, staff_note=?, updated_by=?, updated_at=?
          WHERE task_id=? AND corpid=?`).bind(
            remain,
            arrearPromiseDate,
            remain,
            cleanText(entry.reason_code||"SHORT_PAID",80),
            arrearReasonDetail,
            authOperatorId,
            now,
            existing.task_id,
            user.corpid
          ).run();
        arrearTask={task_id:existing.task_id,arrear_amount:remain,period_due:periodDue,updated:true};
      }else{
        const taskId=empId("task");
        await empInsertDynamic(env,"arrear_tasks",{
          task_id:taskId,corpid:user.corpid,userid:user.userid,entry_id:entryId,original_entry_id:entryId,bed:room,
          tenant_name:tenantName,tenant_card_id:tenantCardId,arrear_amount:remain,arrear_reason:cleanText(entry.reason_code||"SHORT_PAID",80),
          created_at:now,created_by:authOperatorId,followup_status:"待跟进",
          promise_date:arrearPromiseDate,promise_amount:remain,staff_note:arrearReasonDetail,
          original_period_start:periodStart,original_period_end:periodEnd,updated_by:authOperatorId,updated_at:now,
          source_type:"employee_entry_short_paid",source_ref:entryId,
          source_fingerprint:[user.corpid,room,periodStart,periodEnd,entryId].join("|"),materialized_from:"employee_entry"
        },EMP_TASK_COLUMNS);
        arrearTask={task_id:taskId,arrear_amount:remain,period_due:periodDue};
      }
    }
  }
  if(type==="AP"){
    const taskId=cleanId(entry.linked_task_id);
    if(taskId&&apTaskForPayment)arrearTask=await empReconcileArrearTask(env,user,taskId,authOperatorId,now,room);
  }
  let leftWithArrearsTask=null;
  if(type==="CO"&&entry.left_with_arrears){
    leftWithArrearsTask=await empApplyLeftWithArrearsMetadata(env,user,{
      ...entry,
      id:entryId,
      room,
      bed:room,
      tenant_name:tenantName,
      tenant_card_id:tenantCardId,
      checkout_date:cleanText(entry.checkout_date,20),
      deposit_held:type==="CO"?depositBalance:depositHeldInput,
      session_id:sessionId
    },entryId,authOperatorId,now);
  }
  const finalEntryForAudit={
    ...entry,
    id:entryId,room,amount,due,paid,deficit:Math.max(0,due-paid),period_due:periodDue,
    list_price:listPrice,entry_clr:entryClr,clr:entryClr,deposit_held:type==="CO"?depositBalance:depositHeldInput,
    deposit_deduction:depositDeduction,type,tenant_card_id:tenantCardId,tenant_name:tenantName,
    arrear_handling:arrearHandling,arrear_promise_date:arrearPromiseDate,arrear_reason_detail:arrearReasonDetail,operator_name:operatorName
  };
  await empEvent(env,user,{ref_id:entryId,ref_type:"transaction",event_type:"create",field_name:"*",new_value:JSON.stringify(finalEntryForAudit),operator_id:authOperatorId,ts:now});
  await audit(env,user,"employee.entry.create",entryId,{room,amount}).catch(()=>{});
  let stayRegistryResult=null;
  if(preparedStayGenesis){
    try{
      stayRegistryResult=await materializePreparedStayGenesis(env.DB,preparedStayGenesis,{randomUUID:()=>crypto.randomUUID(),createdAt:now});
    }catch(error){
      const conflict=["STAY_GENESIS_ANCHOR_CONFLICT","STAY_REGISTRY_ORPHAN_LINK_CONFLICT"].includes(error?.code);
      return json({
        success:true,
        ok:true,
        entry_id:entryId,
        session_id:sessionId,
        canonical_write_status:"accepted",
        stay_registry_status:conflict?"conflict":"pending_rebuild",
        ...(conflict?{error_code:"STAY_GENESIS_ANCHOR_CONFLICT"}:{}),
        stay_context_id:preparedStayGenesis.stay_context_id,
        write_attempted:true,
        owner_review_required:true
      },202);
    }
  }
  if(["TF","TFF"].includes(writeGateType))return persistEmployeeBedTransferCanonicalArchive(env,user,body,validationResult);
  timing.d1_write_ms=Date.now()-d1WriteStart;
  timing.total_ms=Date.now()-timing.started_at;
  return success({
    success:true,
    entry_id:entryId,
    session_id:sessionId,
    inserted,
    timing:timingEnabled?timing:void 0,
    arrear_task:arrearTask,
    left_with_arrears_task:leftWithArrearsTask,
    deposit_ledger:depositLedger,
    ...(preparedStayGenesis?{stay_genesis:{
      requested:true,
      stay_context_id:preparedStayGenesis.stay_context_id,
      lifecycle_status:"active",
      canonical_write_status:"accepted",
      registry_status:stayRegistryResult?.status||"pending_rebuild"
    }}:{}),
    ...(liveRouteAdapterDraft?{adapter_live_route_rehearsal:eeaLiveRouteSummary(liveRouteAdapterDraft,liveRouteGate,{legacyWriteContinued:true})}: {})
  });
}
__name(handleEmployeeEntry,"handleEmployeeEntry");
const entryAnchorContract={
  R:["event_type","bed","expected_rent","paid_amount","payment_method","rent_period_start","rent_period_end","arrears_amount","arrears_due_date","arrears_note","short_paid","raw_display_line","operator","created_at","ttlock_context"],
  AP:["event_type","bed","arrears_ref","original_arrears_id","original_arrears_amount","already_paid_amount","payment_amount","remaining_arrears_before_payment","remaining_arrears_after_payment","remaining_arrears","settlement_status","payment_method","note","operator","created_at"],
  D:["event_type","bed","deposit_amount","deposit_required_total","previous_deposit_recorded_amount","deposit_paid_amount","expected_deposit_after_payment","deposit_remaining_after_payment","deposit_remaining","payment_method","linked_tenant","note","operator","created_at"],
  DR:["event_type","bed","deposit_balance","refund_amount","payment_method","refund_method","refund_date","refund_reason","deposit_remaining_after_refund","owner_override_ref","arrears_offset_ref","arrears_offset_amount","checkout_ref","note","operator","created_at"],
  CO:["event_type","bed","checkout_date","deposit_refund","outstanding_arrears","owner_approval_required","owner_approval_status","checkout_mode","left_with_arrears","customer_left","former_customer_name","whatsapp_phone","contact_method","contact_note","arrears_amount","cloud_arrears_ref","belongings_held","belongings_note","promised_payment_date","promised_return_date","deposit_balance","left_status","final_status","final_note","ttlock_context","operator","created_at"],
  E:["event_type","expense_amount","expense_category","target_bed","reason","note","payment_method","evidence_ref","operator","created_at"],
  TF:["event_type","from_bed","to_bed","transfer_date","transfer_reason","deposit_balance_carryover","arrears_carryover","rent_coverage_carryover","fee_amount","fee_status","payment_method","waiver_reason","fee_waived_reason","old_tenant_context","old_ttlock_context","note","operator","created_at"]
};
const employeeSourceFirewallForbiddenFields=["card_id","cardid","tenant_card_id","tenantCardId","old_ttlock_ref","oldTtlockRef","provider_phone","providerPhone","ttlock_phone","ttlockPhone","phone_99099","phone99099","access_card_phone","accessCardPhone","ttlock_account_phone","ttlockAccountPhone","ttlock_context","old_ttlock_context","provider_metadata","ttlock_metadata","card_provider_metadata"];
const employeeSourceFirewallAllowedFields={
  R:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","amount","due","paid","expected_rent","paid_amount","payment_method","pay_type","bank_ref","deficit","entry_clr","clr","excess","excess_to","list_price","period_start","period_end","rent_period_start","rent_period_end","cycle","period_day_count","period_due","custom_reason","original_period_start","original_period_end","arrear_handling","arrear_promise_date","arrear_reason_detail","arrears_amount","arrears_due_date","arrears_note","arrears_status","short_paid","promise_date","promise_amount","deposit_included_amount","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id","ttlock_context"],
  AP:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","amount","due","paid","payment_amount","paid_amount","payment_method","pay_type","bank_ref","deficit","entry_clr","clr","linked_task_id","arrears_ref","original_arrears_id","original_arrears_ref","original_arrears_amount","already_paid_amount","remaining_arrears_before_payment","remaining_arrears","remaining_arrears_after_payment","settlement_status","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id"],
  D:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","amount","deposit_amount","deposit_required_total","previous_deposit_recorded_amount","deposit_paid_amount","expected_deposit_after_payment","deposit_remaining_after_payment","deposit_remaining","deposit_ref","promise_date","payment_method","pay_type","bank_ref","linked_tenant","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id"],
  DR:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","amount","deposit_balance","actual_refund_amount","refund_amount","refund_difference","deposit_remaining_after_refund","payment_method","pay_type","refund_method","refund_date","refund_reason","difference_reason","owner_override_ref","override_reason","arrears_offset_ref","arrears_offset_amount","checkout_ref","open_arrears_amount","outstanding_arrears","owner_approval_required","owner_approval_status","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id"],
  CO:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","amount","checkout_date","checkout_type","deposit_refund","deposit_balance","outstanding_arrears","open_arrears_amount","owner_approval_required","owner_approval_status","checkout_mode","left_with_arrears","customer_left","former_customer_ref","former_customer_name","card_name","whatsapp_phone","former_customer_phone","contact_method","contact_note","arrears_amount","left_arrears_amount","cloud_arrears_ref","belongings_held","belongings_note","coverage_end_date","card_end_date","rent_coverage_end","promised_payment_date","promised_return_date","promise_return_date","left_date","checkout_attempt_date","left_status","final_status","overdue_days","grace_days_after_promise","review_date","confirmed_not_returning_date","confirmed_not_returning_by","confirmation_note","original_session_id","original_event_id","final_note","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id","ttlock_context"],
  E:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","amount","expense_amount","expense_category","target_bed","reason","expense_desc","evidence_ref","receipt_ref","payment_method","pay_type","bank_ref","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id"],
  TF:["id","entry_id","event_id","anchor_id","session_id","type","event_type","source","cat","room","bed","roomTo","room_to","bed_from","bed_to","from_bed","to_bed","amount","fee_amount","fee_status","fee_paid","fee_mode","payment_method","pay_type","bank_ref","waiver_reason","fee_waiver_reason","fee_waived_reason","transfer_date","transfer_reason","transfer_validation_status","deposit_balance_carryover","deposit_carried","arrears_carryover","carry_over_arrears","rent_coverage_carryover","rent_difference","old_tenant_context","old_ttlock_context","raw_display_line","anchor_contract_version","validation_status","validation_missing_fields","operator","operator_id","operator_name","employee","created_at","ts","note","remark","status","src","sync_status","upload_status","cloud_sync_status","cloud_sync_checked_at","upload_validation_error","upload_validation_error_code","sync_error","cloud_entry_id","upload_attempt_id","idempotency_key","original_local_entry_id"]
};
function entryAnchorType(row){
  const raw=String(row?.type||"").trim().toUpperCase();
  if(entryAnchorContract[raw])return raw;
  if(raw==="T"||raw==="TRANSFER"||raw==="BED_TRANSFER")return "TF";
  const event=String(row?.event_type||"").trim().toLowerCase();
  return {rent:"R",arrears_payment:"AP",deposit_in:"D",deposit_out:"DR",checkout:"CO",left_with_arrears:"CO",expense:"E",bed_transfer:"TF",bed_transfer_fee:"TFF"}[event]||raw;
}
__name(entryAnchorType,"entryAnchorType");
function normalizeEmployeeEntryForValidation(eventType,entry){
  if(!entry||typeof entry!=="object")return entry||{};
  const type=entryAnchorType({type:eventType,event_type:eventType,...entry});
  const copy={...(["TF","TFF"].includes(type)?sanitizeBedTransferIdentityFields(entry):entry)};
  const allowed=new Set(employeeSourceFirewallAllowedFields[type]||[]);
  employeeSourceFirewallForbiddenFields.forEach(field=>delete copy[field]);
  Object.keys(copy).forEach(field=>{
    const lower=String(field||"").toLowerCase();
    const providerLike=lower.includes("ttlock")||lower.includes("provider")||lower.includes("card_id")||lower.includes("tenantcard")||lower.includes("99099");
    if(providerLike&&!allowed.has(field))delete copy[field];
  });
  if(type==="R"||type==="CO")copy.ttlock_context="";
  if(type==="TF")copy.old_ttlock_context="";
  return copy;
}
__name(normalizeEmployeeEntryForValidation,"normalizeEmployeeEntryForValidation");
function applyEmployeeEntrySourceFirewall(eventType,entry){
  if(!entry||typeof entry!=="object")return entry||{};
  const sanitized=normalizeEmployeeEntryForValidation(eventType,entry);
  Object.keys(entry).forEach(field=>{
    if(!(field in sanitized))delete entry[field];
  });
  Object.assign(entry,sanitized);
  return entry;
}
__name(applyEmployeeEntrySourceFirewall,"applyEmployeeEntrySourceFirewall");
function normalizeEmployeeEntryBodyForValidation(body={}){
  const clone={...(body||{})};
  if(clone.entry)clone.entry=normalizeEmployeeEntryForValidation(clone.entry.event_type||clone.entry.type,clone.entry);
  if(Array.isArray(clone.entries))clone.entries=clone.entries.map(row=>normalizeEmployeeEntryForValidation(row?.event_type||row?.type,row));
  if(clone.session&&typeof clone.session==="object"){
    clone.session={...clone.session};
    if(Array.isArray(clone.session.entries))clone.session.entries=clone.session.entries.map(row=>normalizeEmployeeEntryForValidation(row?.event_type||row?.type,row));
  }
  return clone;
}
__name(normalizeEmployeeEntryBodyForValidation,"normalizeEmployeeEntryBodyForValidation");
function entryAnchorEventType(type){
  return {R:"rent",AP:"arrears_payment",D:"deposit_in",DR:"deposit_out",CO:"checkout",E:"expense",TF:"bed_transfer",TFF:"bed_transfer_fee"}[type]||String(type||"entry").toLowerCase();
}
__name(entryAnchorEventType,"entryAnchorEventType");
function entryAnchorPaymentMethod(value){
  const raw=String(value||"").trim().toLowerCase();
  if(raw==="b"||raw==="bank")return "bank";
  if(raw==="c"||raw==="cash")return "cash";
  if(raw==="none")return "none";
  return raw||"other";
}
__name(entryAnchorPaymentMethod,"entryAnchorPaymentMethod");
function entryAnchorMoney(value){
  return Math.round((Number(String(value??0).replace(/,/g,""))||0)*100)/100;
}
__name(entryAnchorMoney,"entryAnchorMoney");
const providerMetadataBusinessIdentityFields=new Set([
  "card_id","cardid","tenant_card_id","tenantcardid","physical_card_id","hardware_card_id",
  "provider_phone","providerphone","card_phone","cardphone","access_card_phone","accesscardphone",
  "ttlock_phone","ttlockphone"
]);
const authoritativeBusinessPhoneSources=new Set([
  "staff_entered","staff_entered_customer_phone","customer_profile","explicit_customer_profile",
  "checkin_form","left_with_arrears_staff_entered","explicit_left_with_arrears_phone"
]);
function normalizeProviderMetadataFieldName(field){
  return cleanText(field,80).toLowerCase().replace(/[^a-z0-9_]/g,"");
}
__name(normalizeProviderMetadataFieldName,"normalizeProviderMetadataFieldName");
function normalizeBusinessPhone(value){
  return cleanText(value,80).replace(/[^\d+]/g,"");
}
__name(normalizeBusinessPhone,"normalizeBusinessPhone");
function isProviderCardId(field,value){
  const name=normalizeProviderMetadataFieldName(field);
  return !!cleanText(value,160)&&["card_id","cardid","tenant_card_id","tenantcardid","physical_card_id","hardware_card_id"].includes(name);
}
__name(isProviderCardId,"isProviderCardId");
function isNonAuthoritativeProviderPhone(value,source=""){
  const phone=normalizeBusinessPhone(value);
  if(!phone)return false;
  const sourceName=normalizeProviderMetadataFieldName(source);
  if(/99099$/.test(phone))return true;
  return /provider|card|access|ttlock|lock/.test(sourceName)&&!authoritativeBusinessPhoneSources.has(sourceName);
}
__name(isNonAuthoritativeProviderPhone,"isNonAuthoritativeProviderPhone");
function classifyProviderMetadataAuthority(input={}){
  const field=normalizeProviderMetadataFieldName(input.field||input.name||"");
  const value=cleanText(input.value,240);
  const source=normalizeProviderMetadataFieldName(input.source||input.authority_source||"");
  if(isProviderCardId(field,value))return {authority:"non_authoritative",classification:"provider_lookup_handle_raw_audit_only",field,value,source};
  if((field.includes("phone")||source.includes("phone"))&&isNonAuthoritativeProviderPhone(value,source)){
    return {authority:"non_authoritative",classification:"provider_phone_raw_audit_only",field,value:normalizeBusinessPhone(value),source};
  }
  if(["remark","card_remark","access_card_remark","card_name","label"].includes(field)){
    return {authority:"context_only",classification:"business_readable_context",field,value,source};
  }
  if((field.includes("phone")||source.includes("phone"))&&authoritativeBusinessPhoneSources.has(source)){
    return {authority:"authoritative",classification:"explicit_business_contact",field,value:normalizeBusinessPhone(value),source};
  }
  return {authority:value?"unknown":"empty",classification:value?"source_authority_marker_required":"empty",field,value,source};
}
__name(classifyProviderMetadataAuthority,"classifyProviderMetadataAuthority");
function sanitizeBusinessContactFromProviderMetadata(value,opts={}){
  const source=cleanText(opts.source||opts.authority_source||"",80);
  const phone=normalizeBusinessPhone(value);
  if(!phone)return "";
  if(isNonAuthoritativeProviderPhone(phone,source))return "";
  if(authoritativeBusinessPhoneSources.has(normalizeProviderMetadataFieldName(source)))return phone;
  return opts.allowUnknownSource?phone:"";
}
__name(sanitizeBusinessContactFromProviderMetadata,"sanitizeBusinessContactFromProviderMetadata");
function assertNoProviderMetadataInBusinessIdentity(identity={}){
  const violations=[];
  for(const [field,value] of Object.entries(identity||{})){
    const name=normalizeProviderMetadataFieldName(field);
    const raw=cleanText(value,1000);
    if(!raw)continue;
    if(providerMetadataBusinessIdentityFields.has(name)||isProviderCardId(name,raw)){
      violations.push({field,reason:"provider_card_id_is_not_business_identity"});
    }
    if(name.includes("phone")&&isNonAuthoritativeProviderPhone(raw,identity[`${field}_source`]||identity.source||"")){
      violations.push({field,reason:"provider_phone_is_not_business_contact"});
    }
    if(name.includes("fingerprint")&&/(card_id|tenant_card_id|provider_phone|card_phone|access_card_phone|ttlock|99099)/i.test(raw)){
      violations.push({field,reason:"provider_metadata_in_fingerprint"});
    }
  }
  return {ok:violations.length===0,violations};
}
__name(assertNoProviderMetadataInBusinessIdentity,"assertNoProviderMetadataInBusinessIdentity");
function buildSafeBusinessIdentityContext(input={}){
  const customerPhone=sanitizeBusinessContactFromProviderMetadata(input.customer_phone||input.whatsapp_phone||"",{source:input.customer_phone_source||input.whatsapp_phone_source||input.source||""});
  const tenantPhone=sanitizeBusinessContactFromProviderMetadata(input.tenant_phone||"",{source:input.tenant_phone_source||input.source||""});
  const contactPhone=sanitizeBusinessContactFromProviderMetadata(input.contact_phone||"",{source:input.contact_phone_source||input.source||""});
  return {
    bed:cleanText(input.bed||input.room||"",80).replace(/^#/,""),
    customer_phone:customerPhone,
    tenant_phone:tenantPhone,
    contact_phone:contactPhone,
    card_remark_context:cleanText(input.card_remark||input.remark||"",500),
    card_remark_authority:cleanText(input.card_remark||input.remark||"",500)?"context_only":"none",
    deposit_context_authority:cleanText(input.card_remark||input.remark||"",500)?"context_only":"none",
    non_authoritative_card_id:cleanText(input.card_id||"",120),
    non_authoritative_tenant_card_id:cleanText(input.tenant_card_id||"",120),
    non_authoritative_provider_phone:isNonAuthoritativeProviderPhone(input.provider_phone||input.card_phone||input.access_card_phone||"",input.provider_phone_source||"provider_card_metadata")?normalizeBusinessPhone(input.provider_phone||input.card_phone||input.access_card_phone):""
  };
}
__name(buildSafeBusinessIdentityContext,"buildSafeBusinessIdentityContext");
function accessSnapshotRuntimeHash(value){
  let hash=2166136261;
  for(const char of String(value||"")){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(36);
}
__name(accessSnapshotRuntimeHash,"accessSnapshotRuntimeHash");
function accessSnapshotMonthDay(token){
  const match=String(token||"").match(/(\d{4})/);
  if(!match)return "";
  const value=match[1];
  const month=Number(value.slice(0,2));
  const day=Number(value.slice(2,4));
  if(month<1||month>12)return "";
  const maxDay=new Date(Date.UTC(2024,month,0)).getUTCDate();
  if(day<1||day>maxDay)return "";
  return `${String(month).padStart(2,"0")}${String(day).padStart(2,"0")}`;
}
__name(accessSnapshotMonthDay,"accessSnapshotMonthDay");
function accessSnapshotProviderMetadata(input={}){
  const providerPhone=normalizeBusinessPhone(input.provider_phone||input.providerPhone||input.card_phone||input.access_card_phone||"");
  const providerAccountPhone=normalizeBusinessPhone(input.provider_account_phone||input.providerAccountPhone||"");
  return {
    ...(cleanText(input.card_id||input.cardId,120)?{card_id:cleanText(input.card_id||input.cardId,120)}:{}),
    ...(cleanText(input.tenant_card_id||input.tenantCardId,120)?{tenant_card_id:cleanText(input.tenant_card_id||input.tenantCardId,120)}:{}),
    ...(cleanText(input.hardware_card_id||input.hardwareCardId,120)?{hardware_card_id:cleanText(input.hardware_card_id||input.hardwareCardId,120)}:{}),
    ...(providerPhone?{provider_phone:providerPhone}:{}),
    ...(providerAccountPhone?{provider_account_phone:providerAccountPhone}:{}),
    is_provider_phone_non_authoritative:true
  };
}
__name(accessSnapshotProviderMetadata,"accessSnapshotProviderMetadata");
function parseAccessCardRemark(rawRemark){
  const raw=cleanText(rawRemark,1000);
  const tokens=raw.replace(/[;,]+/g," ").replace(/\s+/g," ").trim().split(" ").filter(Boolean);
  let bed="";
  let parsedDepositAmount=null;
  let parsedCheckinMmdd="";
  let parsedValidUntilMmdd="";
  let parsedBusinessNote="";
  let parsedVacancyMarker=false;
  const warnings=[];
  for(let i=0;i<tokens.length;i++){
    const token=tokens[i];
    if(!bed)bed=(token.match(/^#?(\d{2,5}[A-Za-z]?)$/)||[])[1]||"";
    if(/^[Ee]$/.test(token))parsedVacancyMarker=true;
    if(parsedDepositAmount===null){
      const deposit=token.match(/^D(\d{1,5}(?:\.\d{1,2})?)$/i);
      if(deposit)parsedDepositAmount=entryAnchorMoney(deposit[1]);
    }
    if(!parsedCheckinMmdd&&!/^(exp|until|valid)$/i.test(token)){
      parsedCheckinMmdd=accessSnapshotMonthDay(token);
      if(parsedCheckinMmdd&&token.replace(/\d{4}/,""))parsedBusinessNote=token.replace(/\d{4}/,"");
    }
    if(/^(exp|until|valid)$/i.test(token))parsedValidUntilMmdd=accessSnapshotMonthDay(tokens[i+1]||"");
  }
  if(!parsedBusinessNote&&tokens.length){
    const noteTokens=[];
    let seenCheckin=false;
    for(let i=0;i<tokens.length;i++){
      const token=tokens[i];
      if(i===0&&bed)continue;
      if(/^[Ee]$/.test(token))continue;
      if(/^D\d/i.test(token))continue;
      if(/^(exp|until|valid)$/i.test(token)){i++;continue;}
      const md=accessSnapshotMonthDay(token);
      if(md&&!seenCheckin){
        seenCheckin=true;
        const remainder=token.replace(/\d{4}/,"");
        if(remainder)noteTokens.push(remainder);
        continue;
      }
      if(md&&seenCheckin)continue;
      noteTokens.push(token);
    }
    parsedBusinessNote=cleanText(noteTokens.join(" "),500);
  }
  if(!raw)return {bed:"",parsed_deposit_amount:null,parsed_checkin_mmdd:"",parsed_valid_until_mmdd:"",parsed_vacancy_marker:false,physical_bed_status:"unknown",physical_bed_status_source:"missing_access_snapshot",parsed_business_note:"",parse_status:"invalid",warnings:["empty_remark"]};
  if(!bed)return {bed:"",parsed_deposit_amount:parsedDepositAmount,parsed_checkin_mmdd:parsedCheckinMmdd,parsed_valid_until_mmdd:parsedValidUntilMmdd,parsed_vacancy_marker:parsedVacancyMarker,physical_bed_status:parsedVacancyMarker?"vacant":"unknown",physical_bed_status_source:parsedVacancyMarker?"access_snapshot_E_marker":"missing_access_snapshot",parsed_business_note:parsedBusinessNote,parse_status:"unparsed",warnings:["missing_bed"]};
  if(parsedDepositAmount===null||!parsedCheckinMmdd)warnings.push("missing_deposit_or_checkin");
  return {bed,parsed_deposit_amount:parsedDepositAmount,parsed_checkin_mmdd:parsedCheckinMmdd,parsed_valid_until_mmdd:parsedValidUntilMmdd,parsed_vacancy_marker:parsedVacancyMarker,physical_bed_status:parsedVacancyMarker?"vacant":"not_marked_vacant",physical_bed_status_source:parsedVacancyMarker?"access_snapshot_E_marker":"access_snapshot_no_E",parsed_business_note:parsedBusinessNote,parse_status:warnings.length?"partial":"parsed",warnings};
}
__name(parseAccessCardRemark,"parseAccessCardRemark");
function buildAccessSnapshotDTO(rawRemark,opts={}){
  const parsed=parseAccessCardRemark(rawRemark);
  const propertyId=cleanText(opts.property_id||opts.propertyId||"",80);
  const syncedAt=cleanText(opts.synced_at||opts.syncedAt||"",40);
  const provider=accessSnapshotProviderMetadata(opts.provider_metadata||opts.providerMetadata||opts);
  const idSeed=[propertyId,cleanText(rawRemark,1000),syncedAt,provider.card_id||provider.tenant_card_id||""].join("|");
  return {
    access_snapshot_id:cleanText(idSeed)?`runtime_access_snapshot_${accessSnapshotRuntimeHash(idSeed)}`:"",
    property_id:propertyId,
    bed:parsed.bed,
    raw_remark:cleanText(rawRemark,1000),
    parsed_deposit_amount:parsed.parsed_deposit_amount,
    parsed_checkin_mmdd:parsed.parsed_checkin_mmdd,
    parsed_valid_until_mmdd:parsed.parsed_valid_until_mmdd,
    parsed_vacancy_marker:parsed.parsed_vacancy_marker,
    physical_bed_status:parsed.physical_bed_status,
    physical_bed_status_source:parsed.physical_bed_status_source,
    parsed_business_note:parsed.parsed_business_note,
    parse_status:parsed.parse_status,
    source:"access_card_remark",
    synced_at:syncedAt,
    non_authoritative_provider_metadata:provider,
    warnings:parsed.warnings
  };
}
__name(buildAccessSnapshotDTO,"buildAccessSnapshotDTO");
function validateEntryAnchor(row){
  const type=entryAnchorType(row);
  const required=entryAnchorContract[type]||[];
  const missing=required.filter(field=>!(field in (row||{})));
  return {ok:missing.length===0,missing};
}
__name(validateEntryAnchor,"validateEntryAnchor");
function renderEntryAnchorForOwner(row){
  const type=entryAnchorType(row);
  const eventType=entryAnchorEventType(type);
  if(type==="R"){
    const parts=[row.room||row.bed,"rent","paid",entryAnchorMoney(row.paid_amount||row.paid||row.amount).toFixed(2),"expected",entryAnchorMoney(row.expected_rent||row.period_due||row.due).toFixed(2)];
    if(row.short_paid||entryAnchorMoney(row.arrears_amount)>0)parts.push("short_paid",entryAnchorMoney(row.arrears_amount).toFixed(2),"due",row.arrears_due_date||row.arrear_promise_date||"-","note",row.arrears_note||row.arrear_reason_detail||"-");
    return parts.join(" ");
  }
  if(type==="AP")return `${row.room||row.bed} arrears_payment ${entryAnchorMoney(row.payment_amount||row.amount).toFixed(2)} ref ${row.arrears_ref||row.original_arrears_id||row.linked_task_id||"-"} remaining ${entryAnchorMoney(row.remaining_arrears||row.remaining_arrears_after_payment).toFixed(2)}`.trim();
  if(type==="D")return `${row.room||row.bed} deposit_in ${entryAnchorMoney(row.deposit_amount||row.amount).toFixed(2)} ${row.payment_method||""} ${row.note||""}`.trim();
  if(type==="DR")return `${row.room||row.bed} deposit_out ${entryAnchorMoney(row.actual_refund_amount||row.refund_amount||row.amount).toFixed(2)} ${row.refund_method||row.payment_method||""} balance ${entryAnchorMoney(row.deposit_balance||0).toFixed(2)} diff ${entryAnchorMoney(row.refund_difference||0).toFixed(2)} reason ${row.refund_reason||row.difference_reason||row.reason||"-"} note ${row.note||"-"}`.trim();
  if(type==="CO"){
    const base=`${row.room||row.bed} checkout ${row.checkout_date||"-"} deposit_refund ${entryAnchorMoney(row.deposit_refund||row.deposit_amt||0).toFixed(2)} outstanding ${entryAnchorMoney(row.outstanding_arrears||0).toFixed(2)} note ${row.final_note||row.note||"-"}`.trim();
    if(row.left_with_arrears||row.checkout_mode==="left_with_arrears"){
      return `${base} left_with_arrears ref ${row.cloud_arrears_ref||"-"} phone ${row.whatsapp_phone||row.former_customer_phone||"-"} left_date ${row.left_date||row.checkout_date||"-"} confirmed_not_returning ${row.confirmed_not_returning_date||"-"} left_arrears ${entryAnchorMoney(row.left_arrears_amount||row.arrears_amount||row.outstanding_arrears||0).toFixed(2)} deposit_balance ${entryAnchorMoney(row.deposit_balance||0).toFixed(2)} belongings ${row.belongings_held?"yes":"no"} belongings_note ${row.belongings_note||"-"} promised_payment ${row.promised_payment_date||"-"} promised_return ${row.promised_return_date||row.promise_return_date||"-"} status ${row.final_status||row.left_status||row.status||"-"}`.trim();
    }
    return base;
  }
  if(type==="E")return `${row.target_bed||row.room||row.expense_category||""} expense ${entryAnchorMoney(row.expense_amount||row.amount).toFixed(2)} ${row.expense_category||""} ${row.reason||row.expense_desc||row.note||""}`.trim();
  if(type==="TF")return `${row.bed_from||row.from_bed||row.room}->${row.bed_to||row.to_bed||row.room_to} bed_transfer ${entryAnchorMoney(row.fee_amount||row.amount).toFixed(2)} ${row.fee_status||"paid"} reason ${row.transfer_reason||row.reason||"-"}`.trim();
  return `${row?.room||row?.bed||row?.expense_category||""} ${eventType} ${entryAnchorMoney(row?.amount).toFixed(2)}`.trim();
}
__name(renderEntryAnchorForOwner,"renderEntryAnchorForOwner");
function renderEntryAnchorForWhatsapp(row){
  return renderEntryAnchorForOwner(row);
}
__name(renderEntryAnchorForWhatsapp,"renderEntryAnchorForWhatsapp");
function normalizeEntryAnchor(row){
  const anchor={...(row||{})};
  const type=entryAnchorType(anchor);
  anchor.type=type||anchor.type;
  anchor.event_type=anchor.event_type||entryAnchorEventType(type);
  anchor.source=anchor.source||"employee_entry";
  anchor.payment_method=entryAnchorPaymentMethod(anchor.payment_method||anchor.pay_type);
  anchor.operator=anchor.operator||anchor.operator_name||anchor.operator_id||"";
  anchor.employee=anchor.employee||anchor.operator_name||anchor.operator||"";
  anchor.created_at=anchor.created_at||anchor.ts||"";
  anchor.event_id=anchor.event_id||anchor.anchor_id||anchor.id||"";
  anchor.anchor_id=anchor.anchor_id||anchor.event_id;
  if(type==="R"){
    const expected=entryAnchorMoney(anchor.expected_rent||anchor.period_due||anchor.due);
    const paid=entryAnchorMoney(anchor.paid_amount||anchor.paid||anchor.amount);
    const arrears=entryAnchorMoney(anchor.arrears_amount||Math.max(0,expected-paid));
    Object.assign(anchor,{bed:anchor.bed||anchor.room,expected_rent:expected,paid_amount:paid,arrears_amount:arrears,short_paid:arrears>0,arrears_status:arrears>0?"open":anchor.arrears_status||"",arrears_due_date:anchor.arrears_due_date||anchor.arrear_promise_date||"",arrears_note:anchor.arrears_note||anchor.arrear_reason_detail||anchor.note||"",rent_period_start:anchor.rent_period_start||anchor.period_start||"",rent_period_end:anchor.rent_period_end||anchor.period_end||"",deposit_included_amount:entryAnchorMoney(anchor.deposit_included_amount)});
  }else if(type==="AP"){
    const payment=entryAnchorMoney(anchor.payment_amount||anchor.amount);
    const original=entryAnchorMoney(anchor.original_arrears_amount||anchor.due||anchor.period_due);
    const already=entryAnchorMoney(anchor.already_paid_amount);
    const remainingBefore=entryAnchorMoney(anchor.remaining_arrears_before_payment||Math.max(0,original-already));
    const remaining=entryAnchorMoney(anchor.remaining_arrears_after_payment||anchor.remaining_arrears||Math.max(0,remainingBefore-payment));
    const ref=anchor.arrears_ref||anchor.original_arrears_id||anchor.linked_task_id||"";
    Object.assign(anchor,{bed:anchor.bed||anchor.room,arrears_ref:ref,original_arrears_id:ref,original_arrears_amount:original,already_paid_amount:already,payment_amount:payment,remaining_arrears_before_payment:remainingBefore,remaining_arrears_after_payment:remaining,remaining_arrears:remaining,settlement_status:anchor.settlement_status||(remaining<=0?"settled":"partial")});
  }else if(type==="TF"){
    const fee=employeeEntryBedTransferFee(anchor,{});
    Object.assign(anchor,{from_bed:anchor.from_bed||anchor.bed_from||anchor.room||"",to_bed:anchor.to_bed||anchor.bed_to||anchor.room_to||"",transfer_date:anchor.transfer_date||anchor.date||"",transfer_reason:anchor.transfer_reason||anchor.reason_code||anchor.reason||anchor.custom_reason||anchor.note||"",deposit_balance_carryover:entryAnchorMoney(anchor.deposit_balance_carryover||anchor.deposit_balance||0),arrears_carryover:entryAnchorMoney(anchor.arrears_carryover||anchor.open_arrears_amount||anchor.outstanding_arrears||0),rent_coverage_carryover:anchor.rent_coverage_carryover||anchor.rent_coverage_end||anchor.coverage_end_date||anchor.card_end_date||"",fee_amount:entryAnchorMoney(fee.fee_amount),fee_status:anchor.fee_status||fee.fee_choice||"",payment_method:entryAnchorPaymentMethod(anchor.payment_method||anchor.pay_type||fee.payment_method),waiver_reason:fee.waiver_reason||anchor.waiver_reason||anchor.fee_waiver_reason||"",fee_waived_reason:fee.waiver_reason||anchor.fee_waived_reason||anchor.waiver_reason||"",old_tenant_context:anchor.old_tenant_context||"",old_ttlock_context:anchor.old_ttlock_context||"",note:anchor.note||""});
  }else if(type==="D"){
    const depositAmount=entryAnchorMoney(anchor.deposit_amount||anchor.amount);
    const requiredTotal=entryAnchorMoney(anchor.deposit_required_total||anchor.deposit_total_required||anchor.required_deposit_total||depositAmount);
    const previousRecorded=entryAnchorMoney(anchor.previous_deposit_recorded_amount);
    const paidAmount=entryAnchorMoney(anchor.deposit_paid_amount||depositAmount);
    const expectedAfter=entryAnchorMoney(anchor.expected_deposit_after_payment||Math.min(requiredTotal,previousRecorded+paidAmount));
    const remaining=entryAnchorMoney(anchor.deposit_remaining_after_payment ?? anchor.deposit_remaining ?? Math.max(0,requiredTotal-expectedAfter));
    Object.assign(anchor,{bed:anchor.bed||anchor.room||"",deposit_amount:depositAmount,deposit_required_total:requiredTotal,previous_deposit_recorded_amount:previousRecorded,deposit_paid_amount:paidAmount,expected_deposit_after_payment:expectedAfter,deposit_remaining_after_payment:remaining,deposit_remaining:remaining,promise_date:anchor.promise_date||anchor.deposit_promise_date||"",deposit_ref:anchor.deposit_ref||anchor.occupancy_candidate_id||"",linked_tenant:anchor.linked_tenant||anchor.tenant_card_id||anchor.tenant_name||"",note:anchor.note||""});
  }else if(type==="DR"){
    const depositBalance=entryAnchorMoney(anchor.deposit_balance||anchor.deposit_held||0);
    const refundAmount=entryAnchorMoney(anchor.actual_refund_amount||anchor.refund_amount||anchor.amount);
    const offsetAmount=entryAnchorMoney(anchor.arrears_offset_amount||0);
    Object.assign(anchor,{bed:anchor.bed||anchor.room||"",deposit_balance:depositBalance,actual_refund_amount:refundAmount,refund_amount:refundAmount,refund_difference:entryAnchorMoney(refundAmount-depositBalance),deposit_remaining_after_refund:entryAnchorMoney(anchor.deposit_remaining_after_refund ?? Math.max(0,depositBalance-refundAmount-offsetAmount)),refund_method:entryAnchorPaymentMethod(anchor.refund_method||anchor.payment_method||anchor.pay_type),payment_method:entryAnchorPaymentMethod(anchor.payment_method||anchor.refund_method||anchor.pay_type),refund_date:cleanDate(anchor.refund_date||anchor.checkout_date||anchor.date||""),refund_reason:anchor.refund_reason||anchor.difference_reason||anchor.ded_reason||anchor.ded_note||anchor.reason||anchor.note||"",difference_reason:anchor.difference_reason||anchor.refund_reason||anchor.ded_note||anchor.note||"",owner_override_ref:anchor.owner_override_ref||"",override_reason:anchor.override_reason||anchor.owner_override_reason||"",arrears_offset_ref:anchor.arrears_offset_ref||"",arrears_offset_amount:offsetAmount,checkout_ref:anchor.checkout_ref||anchor.checkout_date||"",open_arrears_amount:entryAnchorMoney(anchor.open_arrears_amount||anchor.outstanding_arrears||0),owner_approval_required:!!anchor.owner_approval_required,owner_approval_status:anchor.owner_approval_status||"not_required",note:anchor.note||""});
  }else if(type==="CO"){
    const left=!!anchor.left_with_arrears||anchor.checkout_mode==="left_with_arrears";
    const contactSource=anchor.whatsapp_phone_source||anchor.former_customer_phone_source||(left?"left_with_arrears_staff_entered":"");
    const safePhone=sanitizeBusinessContactFromProviderMetadata(anchor.whatsapp_phone||anchor.former_customer_phone||"",{source:contactSource});
    Object.assign(anchor,{event_type:left?"left_with_arrears":"checkout",bed:anchor.bed||anchor.room||"",checkout_date:anchor.checkout_date||"",checkout_type:left?"left_with_arrears":anchor.checkout_type||anchor.checkout_mode||"normal",deposit_refund:left?0:entryAnchorMoney(anchor.deposit_refund||0),outstanding_arrears:entryAnchorMoney(anchor.outstanding_arrears||anchor.carry_over_arrears||anchor.deficit||0),open_arrears_amount:entryAnchorMoney(anchor.open_arrears_amount||anchor.outstanding_arrears||anchor.carry_over_arrears||0),owner_approval_required:left?false:!!anchor.owner_approval_required,owner_approval_status:left?"not_required":anchor.owner_approval_status||"not_required",checkout_mode:left?"left_with_arrears":anchor.checkout_mode||"normal",left_with_arrears:left,customer_left:left,former_customer_name:anchor.former_customer_name||anchor.card_name||anchor.tenant_name||"",card_name:anchor.card_name||anchor.former_customer_name||anchor.tenant_name||"",whatsapp_phone:safePhone,former_customer_phone:safePhone,contact_method:anchor.contact_method||"",contact_note:anchor.contact_note||"",arrears_amount:entryAnchorMoney(anchor.arrears_amount||anchor.left_arrears_amount||anchor.outstanding_arrears||0),left_arrears_amount:entryAnchorMoney(anchor.left_arrears_amount||anchor.arrears_amount||anchor.outstanding_arrears||0),cloud_arrears_ref:anchor.cloud_arrears_ref||anchor.arrears_ref||"",belongings_held:!!anchor.belongings_held,belongings_note:anchor.belongings_note||"",coverage_end_date:anchor.coverage_end_date||anchor.card_end_date||anchor.rent_coverage_end||anchor.old_lock_valid_until||"",card_end_date:anchor.card_end_date||anchor.coverage_end_date||anchor.rent_coverage_end||anchor.old_lock_valid_until||"",rent_coverage_end:anchor.rent_coverage_end||anchor.coverage_end_date||anchor.card_end_date||anchor.old_lock_valid_until||"",promised_payment_date:anchor.promised_payment_date||anchor.promise_date||"",promised_return_date:anchor.promised_return_date||anchor.promise_return_date||"",promise_return_date:anchor.promise_return_date||anchor.promised_return_date||"",deposit_balance:entryAnchorMoney(anchor.deposit_balance||anchor.deposit_held||0),left_date:anchor.left_date||anchor.checkout_date||"",checkout_attempt_date:anchor.checkout_attempt_date||anchor.checkout_date||"",left_status:anchor.left_status||(left?"left_pending_return":""),final_status:anchor.final_status||(left?"left_pending_return":""),status:anchor.status||(left?"left_pending_return":""),overdue_days:Number(anchor.overdue_days||0)||0,grace_days_after_promise:Number(anchor.grace_days_after_promise||0)||0,review_date:anchor.review_date||"",confirmed_not_returning_date:anchor.confirmed_not_returning_date||"",confirmed_not_returning_by:anchor.confirmed_not_returning_by||"",confirmation_note:anchor.confirmation_note||"",original_session_id:anchor.original_session_id||anchor.session_id||"",original_event_id:anchor.original_event_id||anchor.event_id||anchor.id||"",final_note:anchor.final_note||anchor.note||anchor.ded_note||""});
  }else if(type==="E"){
    Object.assign(anchor,{expense_amount:entryAnchorMoney(anchor.expense_amount||anchor.amount),expense_category:anchor.expense_category||anchor.reason_code||"",target_bed:anchor.target_bed||anchor.room||"",reason:anchor.reason||anchor.expense_desc||anchor.custom_reason||"",payment_method:entryAnchorPaymentMethod(anchor.payment_method||anchor.pay_type),evidence_ref:anchor.evidence_ref||anchor.receipt_ref||"",note:anchor.note||anchor.expense_desc||""});
  }
  applyEmployeeEntrySourceFirewall(type,anchor);
  anchor.raw_display_line=anchor.raw_display_line||renderEntryAnchorForOwner(anchor);
  applyEmployeeEntrySourceFirewall(type,anchor);
  anchor.anchor_contract_version="employee_entry_anchor_v1";
  const validation=validateEntryAnchor(anchor);
  anchor.validation_status=validation.ok?"valid":"missing_required_fields";
  anchor.validation_missing_fields=validation.missing;
  return anchor;
}
__name(normalizeEntryAnchor,"normalizeEntryAnchor");
function employeeEntryFingerprintText(value){
  return cleanText(value,240).toLowerCase().replace(/\s+/g," ");
}
__name(employeeEntryFingerprintText,"employeeEntryFingerprintText");
function employeeEntryFingerprintMoney(value){
  return entryAnchorMoney(value).toFixed(2);
}
__name(employeeEntryFingerprintMoney,"employeeEntryFingerprintMoney");
function employeeEntryFingerprintDate(value){
  return cleanDate(value||"").slice(0,10);
}
__name(employeeEntryFingerprintDate,"employeeEntryFingerprintDate");
function buildCanonicalEventFingerprint(row,user={}){
  const anchor=normalizeEntryAnchor(row);
  const type=entryAnchorType(anchor);
  const property=employeeEntryFingerprintText(anchor.property_id||anchor.corpid||user.corpid||"");
  const eventType=entryAnchorEventType(type);
  const bed=employeeEntryFingerprintText(anchor.bed||anchor.room||"");
  const pay=employeeEntryFingerprintText(anchor.payment_method||anchor.pay_type||"");
  let parts=[property,eventType];
  if(type==="R"){
    parts=parts.concat([
      bed,
      employeeEntryFingerprintDate(anchor.rent_period_start||anchor.period_start),
      employeeEntryFingerprintDate(anchor.rent_period_end||anchor.period_end),
      employeeEntryFingerprintMoney(anchor.paid_amount||anchor.paid||anchor.amount),
      employeeEntryFingerprintMoney(anchor.expected_rent||anchor.period_due||anchor.due),
      pay,
      employeeEntryFingerprintMoney(anchor.arrears_amount||0),
      employeeEntryFingerprintDate(anchor.arrears_due_date||anchor.arrear_promise_date||anchor.promise_date)
    ]);
  }else if(type==="AP"){
    parts=parts.concat([
      employeeEntryFingerprintText(anchor.arrears_ref||anchor.original_arrears_id||anchor.linked_task_id||""),
      employeeEntryFingerprintMoney(anchor.payment_amount||anchor.amount),
      pay,
      employeeEntryFingerprintMoney(anchor.remaining_arrears_before_payment||anchor.original_arrears_amount||anchor.due||anchor.period_due),
      employeeEntryFingerprintMoney(anchor.remaining_arrears_after_payment||anchor.remaining_arrears)
    ]);
  }else if(type==="D"){
    parts=parts.concat([
      bed,
      employeeEntryFingerprintMoney(anchor.deposit_amount||anchor.amount),
      pay,
      employeeEntryFingerprintText(anchor.deposit_reason||anchor.reason||""),
      employeeEntryFingerprintDate(anchor.business_date||anchor.date||anchor.created_at)
    ]);
  }else if(type==="DR"){
    parts=parts.concat([
      bed,
      employeeEntryFingerprintMoney(anchor.actual_refund_amount||anchor.refund_amount||anchor.amount),
      employeeEntryFingerprintText(anchor.refund_method||anchor.payment_method||anchor.pay_type||""),
      employeeEntryFingerprintMoney(anchor.deposit_deduction||anchor.deduction_amount||0),
      employeeEntryFingerprintDate(anchor.business_date||anchor.refund_date||anchor.date||anchor.created_at)
    ]);
  }else if(type==="CO"){
    parts=parts.concat([
      bed,
      employeeEntryFingerprintText(anchor.checkout_mode||anchor.checkout_type||"normal"),
      employeeEntryFingerprintDate(anchor.checkout_date||anchor.left_date||anchor.business_date||anchor.date)
    ]);
  }else if(type==="E"){
    parts=parts.concat([
      employeeEntryFingerprintText(anchor.expense_scope||anchor.scope||"property"),
      employeeEntryFingerprintText(anchor.target_bed||anchor.room||anchor.expense_category||""),
      employeeEntryFingerprintMoney(anchor.expense_amount||anchor.amount),
      pay,
      employeeEntryFingerprintText(anchor.expense_category||anchor.category||""),
      employeeEntryFingerprintDate(anchor.business_date||anchor.date||anchor.created_at)
    ]);
  }else if(type==="TF"||type==="TFF"){
    parts=parts.concat([
      employeeEntryFingerprintText(anchor.from_bed||anchor.bed_from||anchor.room||""),
      employeeEntryFingerprintText(anchor.to_bed||anchor.bed_to||anchor.room_to||""),
      employeeEntryFingerprintDate(anchor.transfer_date||anchor.business_date||anchor.date||anchor.created_at),
      employeeEntryFingerprintMoney(anchor.fee_amount||anchor.amount),
      employeeEntryFingerprintText(anchor.waiver_reason||anchor.fee_waiver_reason||"")
    ]);
  }else{
    parts=parts.concat([
      bed,
      employeeEntryFingerprintMoney(anchor.amount),
      employeeEntryFingerprintDate(anchor.business_date||anchor.date||anchor.created_at)
    ]);
  }
  return cleanText(parts.map(part=>String(part??"")).join("|"),1000);
}
__name(buildCanonicalEventFingerprint,"buildCanonicalEventFingerprint");
function buildEmployeeEntrySourceFingerprint(row){
  const raw=cleanText(row?.source_fingerprint||row?.sourceFingerprint||"",1000);
  return assertNoProviderMetadataInBusinessIdentity({source_fingerprint:raw}).ok?raw:"";
}
__name(buildEmployeeEntrySourceFingerprint,"buildEmployeeEntrySourceFingerprint");
function buildEmployeeEntryDuplicateKeys(row,user={},index=0){
  const anchor=normalizeEntryAnchor(row);
  const eventId=cleanText(anchor.event_id||anchor.id||anchor.anchor_id||"",120);
  const sourceFingerprint=buildEmployeeEntrySourceFingerprint(anchor);
  const canonicalFingerprint=cleanText(buildCanonicalEventFingerprint(anchor,user),1000);
  return {
    index,
    event_id:eventId,
    source_fingerprint:sourceFingerprint,
    canonical_fingerprint:canonicalFingerprint,
    event_type:anchor.event_type||entryAnchorEventType(entryAnchorType(anchor)),
    bed:anchor.bed||anchor.room||anchor.from_bed||anchor.target_bed||"",
    amount:entryAnchorMoney(anchor.payment_amount||anchor.paid_amount||anchor.deposit_amount||anchor.refund_amount||anchor.expense_amount||anchor.fee_amount||anchor.amount),
    anchor
  };
}
__name(buildEmployeeEntryDuplicateKeys,"buildEmployeeEntryDuplicateKeys");
function employeeEntryDuplicateDetail(errorCode,duplicateType,incoming,existing={}){
  return {
    duplicate_type:duplicateType,
    incoming_event_id:incoming?.event_id||"",
    incoming_source_fingerprint:incoming?.source_fingerprint||"",
    incoming_canonical_fingerprint:incoming?.canonical_fingerprint||"",
    incoming_event_type:incoming?.event_type||"",
    incoming_bed:incoming?.bed||"",
    incoming_index:Number(incoming?.index||0),
    existing_event_id:existing?.event_id||existing?.id||"",
    existing_session_id:existing?.session_id||existing?.id||"",
    existing_anchor:existing?.existing_anchor||existing?.anchor_id||"",
    existing_created_at:existing?.created_at||"",
    action_required:"remove_already_synced_records_and_upload_only_new_records"
  };
}
__name(employeeEntryDuplicateDetail,"employeeEntryDuplicateDetail");
function employeeEntryDuplicateValidationFailure(result,eventIndex=0){
  const duplicate=(result?.duplicates||[])[0]||{};
  const failure=employeeEntryValidationFailure("duplicate_validation",result?.error_code||"DUPLICATE_EVENT_FOUND",result?.message||"Duplicate event detected. This record was already uploaded.",{
    event_index:Number(duplicate.incoming_index??eventIndex)||0,
    event_type:duplicate.incoming_event_type||"",
    invalid_fields:[duplicate.duplicate_type||"duplicate"],
    anchor_preview:duplicate,
    payload_preview:{duplicates:result?.duplicates||[]},
    suggested_action_en:"Remove already-synced records and upload only new records.",
    suggested_action_zh:"请删除已经同步的旧记录，只上传新的记录。"
  });
  return {
    ...failure,
    duplicate_guard:{ok:false,canonical_fingerprint_persistence:"PARTIAL",duplicates:result?.duplicates||[]},
    duplicates:result?.duplicates||[],
    idempotent:false
  };
}
__name(employeeEntryDuplicateValidationFailure,"employeeEntryDuplicateValidationFailure");
function employeeEntryDuplicateIncomingRows(body){
  const session=body?.session||{};
  const rows=Array.isArray(session.entries)&&session.entries.length?session.entries:(Array.isArray(body?.entries)&&body.entries.length?body.entries:[body?.entry||{}]);
  return rows.map(row=>normalizeEntryAnchor(row));
}
__name(employeeEntryDuplicateIncomingRows,"employeeEntryDuplicateIncomingRows");
function employeeEntryDuplicateSetFingerprint(keys){
  return keys.map(key=>`${key.event_id}|${key.source_fingerprint}|${key.canonical_fingerprint}`).sort().join("\n");
}
__name(employeeEntryDuplicateSetFingerprint,"employeeEntryDuplicateSetFingerprint");
function employeeEntryCloudSyncMissing(entries,reason="cloud_missing"){
  return (entries||[]).map((entry,index)=>({
    index,
    local_event_id:cleanText(entry?.event_id||entry?.anchor_id||entry?.id||entry?.cloud_entry_id||"",120),
    status:"cloud_missing",
    sync_status:"CLOUD_MISSING",
    archive_state:"missing",
    cloud_match:false,
    matched:false,
    matched_by:"",
    cloud_record_id:"",
    source_proof:{source:"canonical_event_archive",reason},
    allowed_next_action:"server_validation_required",
    reason
  }));
}
__name(employeeEntryCloudSyncMissing,"employeeEntryCloudSyncMissing");
function employeeEntryCloudSyncKeySet(row,user){
  const normalized=normalizeEntryAnchor(row||{});
  const values=[
    normalized.event_id,
    normalized.anchor_id,
    normalized.id,
    normalized.cloud_entry_id
  ].map(v=>cleanText(v,160)).filter(Boolean);
  try{values.push(cleanText(buildCanonicalEventFingerprint(normalized,user),1000));}catch{}
  return new Set(values.filter(Boolean));
}
__name(employeeEntryCloudSyncKeySet,"employeeEntryCloudSyncKeySet");
async function employeeEntryCloudSyncCorrectionExists(env,user,session){
  const targetId=cleanText(session?.id||"",160);
  const targetAnchor=cleanText(session?.anchor_id||"",160);
  if(!targetId&&!targetAnchor)return null;
  if(!await empTableExists(env,"sessions").catch(()=>false))return null;
  const likeId=targetId?`%${targetId}%`:"";
  const likeAnchor=targetAnchor?`%${targetAnchor}%`:"";
  return await env.DB.prepare(`SELECT id, anchor_id FROM sessions
    WHERE corpid=? AND COALESCE(anchor_id,'') LIKE 'CORR-%'
      AND ((?<>'' AND COALESCE(export_text,'') LIKE ?) OR (?<>'' AND COALESCE(export_text,'') LIKE ?))
    ORDER BY created_at DESC LIMIT 1`).bind(user.corpid,targetId,likeId,targetAnchor,likeAnchor).first().catch(()=>null);
}
__name(employeeEntryCloudSyncCorrectionExists,"employeeEntryCloudSyncCorrectionExists");
async function handleEmployeeEntrySyncState(request,env,user){
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const localSession=body?.session||{};
  const entries=Array.isArray(body?.entries)?body.entries:(Array.isArray(localSession.entries)?localSession.entries:[]);
  const sessionId=cleanId(body?.session_id||body?.sessionId||localSession.id||localSession.session_id||"");
  const anchorId=cleanText(body?.anchor_id||body?.anchorId||localSession.anchor_id||localSession.anchorId||"",160);
  const base={ok:true,gateway:"canonical_sync_state_gateway",cloud_authoritative:true,production_write:false,no_write:true,session_id:sessionId,anchor_id:anchorId};
  if(!sessionId&&!anchorId)return success({...base,session_status:"missing_identifier",entries:employeeEntryCloudSyncMissing(entries,"missing_identifier")});
  if(!await empTableExists(env,"sessions").catch(()=>false))return success({...base,session_status:"schema_missing",entries:employeeEntryCloudSyncMissing(entries,"schema_missing")});
  const columns=await empTableColumns(env,"sessions").catch(()=>new Set());
  const entriesExpr=columns.has("entries_json")?"entries_json":"'' AS entries_json";
  const summaryExpr=columns.has("summary_json")?"summary_json":"'' AS summary_json";
  const predicates=[];
  const params=[user.corpid];
  if(sessionId){predicates.push("id=?");params.push(sessionId);}
  if(anchorId){predicates.push("anchor_id=?");params.push(anchorId);}
  const session=await env.DB.prepare(`SELECT id, anchor_id, date, created_by, operator_id, operator_name, handover_status, voided_at, export_text, source, entries_count, ${entriesExpr}, ${summaryExpr}
    FROM sessions WHERE corpid=? AND (${predicates.join(" OR ")}) ORDER BY created_at DESC LIMIT 1`).bind(...params).first().catch(()=>null);
  if(!session)return success({...base,session_status:"cloud_missing",entries:employeeEntryCloudSyncMissing(entries,"session_not_found")});
  const statusText=String(session.handover_status||"").trim().toUpperCase();
  const voided=!!String(session.voided_at||"").trim()||["VOID","VOIDED"].includes(statusText);
  const deleted=["DELETED","CANCELLED"].includes(statusText);
  const correction=(voided||deleted)?null:await employeeEntryCloudSyncCorrectionExists(env,user,session);
  const corrected=!!correction;
  if(voided||deleted||corrected){
    const status=corrected?"cloud_corrected":(voided?"cloud_voided":"cloud_deleted");
    const syncStatus=corrected?"CLOUD_CORRECTED":(voided?"CLOUD_VOIDED":"CLOUD_DELETED");
    const archiveState=corrected?"corrected":(voided?"voided":"deleted");
    return success({...base,session_status:status,archive_state:archiveState,cloud_session:{id:session.id,anchor_id:session.anchor_id,handover_status:session.handover_status||"",voided_at:session.voided_at||""},correction_anchor:correction?.anchor_id||"",entries:(entries||[]).map((entry,index)=>({index,local_event_id:cleanText(entry?.event_id||entry?.anchor_id||entry?.id||entry?.cloud_entry_id||"",120),status,sync_status:syncStatus,archive_state:archiveState,cloud_match:false,matched:false,matched_by:"",cloud_record_id:cleanText(session.id||"",160),source_proof:{source:"canonical_event_archive",session_id:session.id||"",anchor_id:session.anchor_id||"",correction_anchor:correction?.anchor_id||""},allowed_next_action:"owner_review_required",reason:status}))});
  }
  const cloudEntries=extractEmployeeEntryAnchorsFromSession(session);
  const cloudKeySets=cloudEntries.map(row=>employeeEntryCloudSyncKeySet(row,user));
  const results=(entries||[]).map((entry,index)=>{
    const localKeys=employeeEntryCloudSyncKeySet(entry,user);
    let matchedIndex=-1;
    for(let i=0;i<cloudKeySets.length;i++){
      for(const key of localKeys){
        if(key&&cloudKeySets[i].has(key)){matchedIndex=i;break;}
      }
      if(matchedIndex>=0)break;
    }
    if(matchedIndex>=0){
      const matched=cloudEntries[matchedIndex]||{};
      return {index,local_event_id:cleanText(entry?.event_id||entry?.anchor_id||entry?.id||entry?.cloud_entry_id||"",120),status:"cloud_confirmed",sync_status:"SYNCED",archive_state:"exists_active",cloud_match:true,matched:true,matched_by:"canonical_fingerprint_or_event_id",cloud_record_id:cleanText(session.id||"",160),matched_event_id:cleanText(matched.event_id||matched.anchor_id||matched.id||"",120),source_proof:{source:"canonical_event_archive",session_id:session.id||"",anchor_id:session.anchor_id||""},allowed_next_action:"none",reason:"matched_cloud_anchor"};
    }
    return {index,local_event_id:cleanText(entry?.event_id||entry?.anchor_id||entry?.id||entry?.cloud_entry_id||"",120),status:"cloud_mismatch",sync_status:"CLOUD_MISMATCH",archive_state:"mismatch",cloud_match:false,matched:false,matched_by:"",cloud_record_id:cleanText(session.id||"",160),source_proof:{source:"canonical_event_archive",session_id:session.id||"",anchor_id:session.anchor_id||"",cloud_entries_count:cloudEntries.length},allowed_next_action:"owner_review_required",reason:cloudEntries.length?"no_matching_cloud_anchor":"no_cloud_entries"};
  });
  return success({...base,session_status:"cloud_active",archive_state:"exists_active",cloud_session:{id:session.id,anchor_id:session.anchor_id,handover_status:session.handover_status||"",voided_at:session.voided_at||""},entries:results});
}
__name(handleEmployeeEntrySyncState,"handleEmployeeEntrySyncState");
function employeeEntryDuplicateInPayload(keys){
  const seenEvent=new Map();
  const seenSource=new Map();
  const seenCanonical=new Map();
  for(const key of keys){
    const checks=[
      ["event_id",key.event_id,seenEvent],
      ["source_fingerprint",key.source_fingerprint,seenSource],
      ["canonical_fingerprint",key.canonical_fingerprint,seenCanonical]
    ];
    for(const [type,value,map] of checks){
      if(!value)continue;
      if(map.has(value)){
        return employeeEntryDuplicateDetail("DUPLICATE_EVENT_IN_PAYLOAD",`${type}_in_payload`,key,map.get(value));
      }
      map.set(value,key);
    }
  }
  return null;
}
__name(employeeEntryDuplicateInPayload,"employeeEntryDuplicateInPayload");
async function employeeEntryExistingTransactionsByEventId(env,user,keys){
  const rows=new Map();
  for(const key of keys){
    if(!key.event_id||rows.has(key.event_id))continue;
    const row=await env.DB.prepare(`SELECT id, session_id, created_at, type FROM transactions
      WHERE id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' LIMIT 1`)
      .bind(key.event_id,user.corpid).first().catch(()=>null);
    if(row)rows.set(key.event_id,row);
  }
  return rows;
}
__name(employeeEntryExistingTransactionsByEventId,"employeeEntryExistingTransactionsByEventId");
async function employeeEntryExistingSessionAnchors(env,user,incomingSessionId){
  const rows=await env.DB.prepare(`SELECT id, anchor_id, created_at, entries_json, export_text FROM sessions
    WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID'
    ORDER BY created_at DESC LIMIT 1000`).bind(user.corpid).all().catch(()=>({results:[]}));
  const anchors=[];
  for(const session of rows.results||[]){
    if(incomingSessionId&&String(session.id||"")===String(incomingSessionId))continue;
    const extracted=extractEmployeeEntryAnchorsFromSession(session);
    extracted.forEach((anchor,index)=>anchors.push({session,index,anchor}));
  }
  return anchors;
}
__name(employeeEntryExistingSessionAnchors,"employeeEntryExistingSessionAnchors");
async function checkEmployeeEntryDuplicates(env,user,body,opts={}){
  const session=body?.session||{};
  const incomingSessionId=cleanText(session.id||session.session_id||"",120);
  const incomingRows=employeeEntryDuplicateIncomingRows(body);
  const incomingKeys=incomingRows.map((row,index)=>buildEmployeeEntryDuplicateKeys(row,user,index));
  const inPayload=employeeEntryDuplicateInPayload(incomingKeys);
  if(inPayload){
    return {ok:false,error_code:"DUPLICATE_EVENT_IN_PAYLOAD",message:"Duplicate records were found inside the current upload payload.",duplicates:[inPayload]};
  }
  const existingTx=await employeeEntryExistingTransactionsByEventId(env,user,incomingKeys);
  const txDuplicates=[];
  for(const key of incomingKeys){
    const existing=key.event_id?existingTx.get(key.event_id):null;
    if(existing&&String(existing.session_id||"")!==String(incomingSessionId||"")){
      txDuplicates.push(employeeEntryDuplicateDetail("DUPLICATE_EVENT_FOUND","event_id",key,{...existing,event_id:existing.id}));
    }
  }
  if(txDuplicates.length){
    return {ok:false,error_code:"DUPLICATE_EVENT_FOUND",message:"Duplicate event detected. This record was already uploaded.",duplicates:txDuplicates};
  }
  const allSameSessionExisting=incomingSessionId&&incomingKeys.length>0&&incomingKeys.every(key=>{
    const existing=key.event_id?existingTx.get(key.event_id):null;
    return existing&&String(existing.session_id||"")===String(incomingSessionId);
  });
  if(allSameSessionExisting){
    return {
      ok:true,
      idempotent:true,
      existing_session_id:incomingSessionId,
      existing_anchor:cleanText(session.anchorId||session.anchor_id||"",120),
      canonical_fingerprint_persistence:"PARTIAL",
      incoming_fingerprint_set:employeeEntryDuplicateSetFingerprint(incomingKeys)
    };
  }
  const existingAnchors=await employeeEntryExistingSessionAnchors(env,user,incomingSessionId);
  const sourceMap=new Map();
  const canonicalMap=new Map();
  for(const existing of existingAnchors){
    const key=buildEmployeeEntryDuplicateKeys(existing.anchor,user,existing.index);
    const detail={
      event_id:key.event_id,
      session_id:existing.session.id,
      anchor_id:existing.session.anchor_id,
      created_at:existing.session.created_at,
      existing_anchor:existing.session.anchor_id
    };
    if(key.source_fingerprint&&!sourceMap.has(key.source_fingerprint))sourceMap.set(key.source_fingerprint,detail);
    if(key.canonical_fingerprint&&!canonicalMap.has(key.canonical_fingerprint))canonicalMap.set(key.canonical_fingerprint,detail);
  }
  const sourceDuplicates=[];
  const canonicalDuplicates=[];
  for(const key of incomingKeys){
    if(key.source_fingerprint&&sourceMap.has(key.source_fingerprint)){
      sourceDuplicates.push(employeeEntryDuplicateDetail("DUPLICATE_SOURCE_FINGERPRINT","source_fingerprint",key,sourceMap.get(key.source_fingerprint)));
    }
    if(key.canonical_fingerprint&&canonicalMap.has(key.canonical_fingerprint)){
      canonicalDuplicates.push(employeeEntryDuplicateDetail("DUPLICATE_CANONICAL_FINGERPRINT","canonical_fingerprint",key,canonicalMap.get(key.canonical_fingerprint)));
    }
  }
  if(sourceDuplicates.length){
    return {ok:false,error_code:"DUPLICATE_SOURCE_FINGERPRINT",message:"Duplicate source fingerprint detected. This source record was already uploaded.",duplicates:sourceDuplicates};
  }
  if(canonicalDuplicates.length){
    return {ok:false,error_code:"DUPLICATE_CANONICAL_FINGERPRINT",message:"Duplicate business event detected. This business record was already uploaded.",duplicates:canonicalDuplicates};
  }
  return {ok:true,idempotent:false,canonical_fingerprint_persistence:"PARTIAL",incoming_fingerprint_set:employeeEntryDuplicateSetFingerprint(incomingKeys)};
}
__name(checkEmployeeEntryDuplicates,"checkEmployeeEntryDuplicates");
function parseEmployeeEntryAnchorJson(value){
  const raw=String(value||"").trim();
  if(!raw)return [];
  try{
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed))return parsed;
    if(Array.isArray(parsed?.entries))return parsed.entries;
    if(Array.isArray(parsed?.anchors))return parsed.anchors;
  }catch{}
  return [];
}
__name(parseEmployeeEntryAnchorJson,"parseEmployeeEntryAnchorJson");
function extractEmployeeEntryAnchorsFromSession(session){
  const direct=parseEmployeeEntryAnchorJson(session?.entries_json);
  const text=String(session?.export_text||"");
  const block=text.match(/==== ENTRY ANCHORS JSON ====\s*([\s\S]*?)\s*==== END ENTRY ANCHORS JSON ====/i);
  const fromBlock=block?parseEmployeeEntryAnchorJson(block[1]):[];
  const rows=(direct.length?direct:fromBlock).map(row=>normalizeEntryAnchor({
    session_id:session?.id||row?.session_id||"",
    corpid:session?.corpid||row?.corpid||"",
    userid:session?.created_by||session?.operator_id||row?.userid||"",
    operator_id:session?.operator_id||row?.operator_id||"",
    operator_name:session?.operator_name||row?.operator_name||"",
    created_at:session?.created_at||session?.exported_at||row?.created_at||"",
    ts:session?.exported_at||session?.created_at||row?.ts||"",
    source:"employee_entry",
    source_detail:direct.length?"employee_entry_entries_json":"employee_entry_export_anchor_json",
    ...row
  }));
  return rows;
}
__name(extractEmployeeEntryAnchorsFromSession,"extractEmployeeEntryAnchorsFromSession");
function cloudArrearsSessionIsActive(session){
  if(!session)return false;
  const status=String(session?.handover_status||"").trim().toUpperCase();
  return !String(session?.voided_at||"").trim()&&status!=="VOID";
}
__name(cloudArrearsSessionIsActive,"cloudArrearsSessionIsActive");
function cloudArrearsSourceEventId(anchor,index){
  return cleanText(anchor?.event_id||anchor?.anchor_id||anchor?.id||anchor?.entry_id||`entry-${index+1}`,120);
}
__name(cloudArrearsSourceEventId,"cloudArrearsSourceEventId");
function cloudArrearsProjectionRef(session,anchor,index,prefix="ca"){
  return cleanText(anchor?.arrears_ref||anchor?.cloud_arrears_ref||anchor?.original_arrears_id||anchor?.task_id||anchor?.source_ref||`${prefix}-${session?.id||"session"}-${cloudArrearsSourceEventId(anchor,index)}`,160);
}
__name(cloudArrearsProjectionRef,"cloudArrearsProjectionRef");
function cloudArrearsNormalizePaymentEvent(session,anchor,index){
  const ref=cleanText(anchor?.arrears_ref||anchor?.original_arrears_id||anchor?.linked_task_id||anchor?.cloud_arrears_ref||"",160);
  if(!ref)return null;
  const amount=entryAnchorMoney(anchor?.payment_amount||anchor?.amount);
  if(amount<=0)return null;
  return {
    ref,
    event_id:cloudArrearsSourceEventId(anchor,index),
    session_id:cleanText(session?.id||anchor?.session_id||"",120),
    date:cleanDate(anchor?.date||session?.date||anchor?.created_at||session?.created_at||""),
    payment_amount:amount,
    payment_method:entryAnchorPaymentMethod(anchor?.payment_method||anchor?.pay_type),
    note:cleanText(anchor?.note||anchor?.raw_display_line||"",300),
    operator:cleanText(anchor?.operator||anchor?.operator_name||session?.operator_name||"",120)
  };
}
__name(cloudArrearsNormalizePaymentEvent,"cloudArrearsNormalizePaymentEvent");
function cloudArrearsBaseItem(session,anchor,index,extra={}){
  const sourceEventId=cloudArrearsSourceEventId(anchor,index);
  const ref=cleanText(extra.arrears_ref||cloudArrearsProjectionRef(session,anchor,index,extra.prefix||"ca"),160);
  const amount=entryAnchorMoney(extra.arrears_amount||anchor?.arrears_amount||anchor?.outstanding_arrears||0);
  const originalDate=cleanDate(extra.original_date||anchor?.date||session?.date||anchor?.created_at||session?.created_at||"");
  return {
    task_id:ref,
    id:ref,
    arrears_ref:ref,
    corpid:cleanText(session?.corpid||anchor?.corpid||"",80),
    userid:cleanText(session?.created_by||anchor?.userid||anchor?.operator_id||"",80),
    entry_id:sourceEventId,
    original_entry_id:sourceEventId,
    source_session_id:cleanText(session?.id||anchor?.session_id||"",120),
    source_event_id:sourceEventId,
    source_type:cleanText(extra.source_type||"cloud_arrears_projection",80),
    source:"cloud_arrears_projection",
    materialized_from:"sessions.entries_json",
    bed:cleanText(extra.bed||anchor?.bed||anchor?.room||"",80).replace(/^#/,""),
    tenant_name:cleanText(extra.customer_name||anchor?.tenant_name||anchor?.former_customer_name||anchor?.card_name||"",120),
    tenant_card_id:cleanText(anchor?.tenant_card_id||anchor?.former_customer_ref||"",120),
    arrear_amount:amount,
    original_arrears_amount:amount,
    original_amount:amount,
    actual_received:0,
    already_paid_amount:0,
    remaining_arrears:amount,
    close_status:"",
    status:"open",
    followup_status:"待跟进",
    arrear_reason:cleanText(extra.reason||anchor?.arrears_note||anchor?.arrear_reason_detail||anchor?.note||"SHORT_PAID",500),
    original_note:cleanText(extra.original_note||anchor?.arrears_note||anchor?.arrear_reason_detail||anchor?.note||anchor?.raw_display_line||"",500),
    promise_date:cleanDate(extra.due_date||anchor?.arrears_due_date||anchor?.promise_date||anchor?.promised_payment_date||""),
    due_date:cleanDate(extra.due_date||anchor?.arrears_due_date||anchor?.promise_date||anchor?.promised_payment_date||""),
    promise_amount:amount,
    original_period_start:cleanDate(anchor?.rent_period_start||anchor?.period_start||""),
    original_period_end:cleanDate(anchor?.rent_period_end||anchor?.period_end||""),
    original_date:originalDate,
    original_type:cleanText(extra.original_type||anchor?.event_type||entryAnchorEventType(entryAnchorType(anchor)),80),
    expected_amount:entryAnchorMoney(extra.expected_amount||anchor?.expected_rent||anchor?.period_due||anchor?.due),
    paid_amount:entryAnchorMoney(extra.paid_amount||anchor?.paid_amount||anchor?.paid||anchor?.amount),
    created_at:cleanText(anchor?.created_at||session?.created_at||session?.exported_at||"",40),
    updated_at:cleanText(anchor?.updated_at||session?.exported_at||session?.created_at||"",40),
    source_ref:sourceEventId,
    source_fingerprint:[cleanText(session?.corpid||"",80),cleanText(session?.id||"",120),sourceEventId,ref].join("|"),
    linked_repayment_events:[]
  };
}
__name(cloudArrearsBaseItem,"cloudArrearsBaseItem");
function cloudArrearsApplyLeftWithArrearsMeta(item,anchor){
  if(!item||!anchor)return item;
  item.customer_left=true;
  item.left_with_arrears=true;
  item.belongings_held=!!anchor.belongings_held;
  item.belongings_note=cleanText(anchor.belongings_note||"",500);
  item.whatsapp_phone=cleanText(anchor.whatsapp_phone||anchor.former_customer_phone||"",80);
  item.former_customer_phone=cleanText(anchor.former_customer_phone||anchor.whatsapp_phone||"",80);
  item.former_customer_name=cleanText(anchor.former_customer_name||anchor.card_name||anchor.tenant_name||"",120);
  item.card_name=cleanText(anchor.card_name||anchor.former_customer_name||anchor.tenant_name||"",120);
  item.promised_payment_date=cleanDate(anchor.promised_payment_date||anchor.promise_date||"");
  item.promised_return_date=cleanDate(anchor.promised_return_date||anchor.promise_return_date||"");
  item.confirmed_not_returning_date=cleanDate(anchor.confirmed_not_returning_date||"");
  item.left_date=cleanDate(anchor.left_date||anchor.checkout_date||"");
  item.checkout_date=cleanDate(anchor.checkout_date||anchor.left_date||"");
  item.coverage_end_date=cleanDate(anchor.coverage_end_date||anchor.card_end_date||anchor.rent_coverage_end||"");
  item.card_end_date=cleanDate(anchor.card_end_date||anchor.coverage_end_date||anchor.rent_coverage_end||"");
  item.left_arrears_amount=entryAnchorMoney(anchor.left_arrears_amount||anchor.arrears_amount||anchor.outstanding_arrears||0);
  item.cloud_arrears_ref=cleanText(anchor.cloud_arrears_ref||anchor.arrears_ref||item.arrears_ref||"",160);
  item.overdue_days=Number(anchor.overdue_days||0)||0;
  item.deposit_balance=entryAnchorMoney(anchor.deposit_balance||anchor.deposit_held||0);
  item.left_status=cleanText(anchor.left_status||"left_pending_return",80);
  item.final_status=cleanText(anchor.final_status||"left_pending_return",80);
  item.owner_note=`${cleanText(item.owner_note||"",500)}\nLEFT_WITH_ARREARS ${JSON.stringify({
    left_with_arrears:true,
    customer_left:true,
    former_customer_name:item.former_customer_name,
    card_name:item.card_name,
    whatsapp_phone:item.whatsapp_phone,
    former_customer_phone:item.former_customer_phone,
    belongings_held:item.belongings_held,
    belongings_note:item.belongings_note,
    promised_payment_date:item.promised_payment_date,
    promised_return_date:item.promised_return_date,
    confirmed_not_returning_date:item.confirmed_not_returning_date,
    left_date:item.left_date,
    checkout_date:item.checkout_date,
    coverage_end_date:item.coverage_end_date,
    card_end_date:item.card_end_date,
    left_arrears_amount:item.left_arrears_amount,
    cloud_arrears_ref:item.cloud_arrears_ref,
    overdue_days:item.overdue_days,
    deposit_balance:item.deposit_balance,
    left_status:item.left_status,
    final_status:item.final_status
  })}`.trim();
  return item;
}
__name(cloudArrearsApplyLeftWithArrearsMeta,"cloudArrearsApplyLeftWithArrearsMeta");
function buildCloudArrearsProjectionFromSessions(sessions=[],opts={}){
  const itemsByRef=new Map();
  const payments=[];
  let activeSessions=0;
  let scannedAnchors=0;
  for(const session of sessions||[]){
    if(!cloudArrearsSessionIsActive(session))continue;
    activeSessions++;
    const anchors=extractEmployeeEntryAnchorsFromSession(session);
    for(let index=0;index<anchors.length;index++){
      const anchor=normalizeEntryAnchor(anchors[index]);
      const type=entryAnchorType(anchor);
      scannedAnchors++;
      if(type==="R"&&(anchor.short_paid||entryAnchorMoney(anchor.arrears_amount)>0)&&entryAnchorMoney(anchor.arrears_amount)>0){
        const item=cloudArrearsBaseItem(session,anchor,index,{
          prefix:"rent-short-paid",
          source_type:"employee_entry_short_paid",
          original_type:"rent_short_paid",
          arrears_amount:anchor.arrears_amount,
          reason:anchor.arrears_note||"SHORT_PAID",
          due_date:anchor.arrears_due_date,
          expected_amount:anchor.expected_rent,
          paid_amount:anchor.paid_amount
        });
        if(item.bed&&item.arrear_amount>0)itemsByRef.set(item.arrears_ref,item);
        continue;
      }
      if(type==="CO"&&(anchor.left_with_arrears||anchor.checkout_mode==="left_with_arrears")){
        const ref=cloudArrearsProjectionRef(session,anchor,index,"left-with-arrears");
        let item=itemsByRef.get(ref);
        const amount=entryAnchorMoney(anchor.arrears_amount||anchor.outstanding_arrears);
        if(!item&&amount>0){
          item=cloudArrearsBaseItem(session,anchor,index,{
            arrears_ref:ref,
            prefix:"left-with-arrears",
            source_type:"left_with_arrears",
            original_type:"left_with_arrears",
            arrears_amount:amount,
            reason:"LEFT_WITH_ARREARS",
            due_date:anchor.promised_payment_date
          });
          if(item.bed)itemsByRef.set(ref,item);
        }
        if(item)cloudArrearsApplyLeftWithArrearsMeta(item,anchor);
        continue;
      }
      if(type==="AP"){
        const payment=cloudArrearsNormalizePaymentEvent(session,anchor,index);
        if(payment)payments.push(payment);
      }
    }
  }
  for(const payment of payments){
    const item=itemsByRef.get(payment.ref);
    if(!item)continue;
    item.linked_repayment_events.push(payment);
    item.actual_received=entryAnchorMoney(Number(item.actual_received||0)+payment.payment_amount);
    item.already_paid_amount=item.actual_received;
    item.remaining_arrears=entryAnchorMoney(Math.max(0,Number(item.arrear_amount||0)-item.actual_received));
    if(item.remaining_arrears<=0){
      item.status="settled";
      item.close_status="PAID";
      item.followup_status="已结清";
    }else{
      item.status="partial";
      item.close_status="";
      item.followup_status="部分支付";
    }
  }
  const all_items=[...itemsByRef.values()].map(item=>({
    ...item,
    accounting_status:item.status==="settled"?"closed":"open",
    projection_source:"sessions.entries_json"
  }));
  const open_items=all_items.filter(item=>["open","partial"].includes(item.status)&&entryAnchorMoney(item.remaining_arrears)>0);
  const closed_items=all_items.filter(item=>!open_items.includes(item));
  const bed=cleanText(opts.bed||"",80).replace(/^#/,"");
  const filteredOpen=bed?open_items.filter(item=>item.bed===bed):open_items;
  const filteredClosed=bed?closed_items.filter(item=>item.bed===bed):closed_items;
  return {
    source:"cloud_arrears_projection",
    materialized_from:"sessions.entries_json",
    readonly:true,
    active_sessions_count:activeSessions,
    scanned_anchor_count:scannedAnchors,
    all_items:bed?[...filteredOpen,...filteredClosed]:all_items,
    open_items:filteredOpen,
    closed_items:filteredClosed,
    total_remaining:entryAnchorMoney(filteredOpen.reduce((sum,item)=>sum+entryAnchorMoney(item.remaining_arrears),0)),
    open_count:filteredOpen.filter(item=>item.status==="open").length,
    partial_count:filteredOpen.filter(item=>item.status==="partial").length,
    settled_count:filteredClosed.filter(item=>item.status==="settled").length
  };
}
__name(buildCloudArrearsProjectionFromSessions,"buildCloudArrearsProjectionFromSessions");
async function cloudArrearsFetchActiveSessionRows(env,user,opts={}){
  if(!await empTableExists(env,"sessions").catch(()=>false))return [];
  const limit=Math.min(Math.max(Number(opts.limit||1000),1),2000);
  const sessionId=cleanId(opts.session_id||opts.sessionId||"");
  const columns=await empTableColumns(env,"sessions").catch(()=>[]);
  const hasEntriesJson=columns.has("entries_json");
  const hasSummaryJson=columns.has("summary_json");
  const params=[user.corpid];
  let where="corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' AND ";
  where+=hasEntriesJson?"(COALESCE(entries_json,'')<>'' OR COALESCE(export_text,'') LIKE '%ENTRY ANCHORS JSON%')":"COALESCE(export_text,'') LIKE '%ENTRY ANCHORS JSON%'";
  if(sessionId){
    where+=" AND id=?";
    params.push(sessionId);
  }
  const entriesExpr=hasEntriesJson?"entries_json":"'' AS entries_json";
  const summaryExpr=hasSummaryJson?"summary_json":"'' AS summary_json";
  const rows=await env.DB.prepare(`SELECT id, corpid, anchor_id, date, entries_count, created_by, created_at, operator_id, operator_name, handover_status, exported_at, export_text, source, ${entriesExpr}, ${summaryExpr}, voided_at
    FROM sessions
    WHERE ${where}
    ORDER BY date ASC, COALESCE(exported_at,created_at,'') ASC
    LIMIT ?`).bind(...params,limit).all().catch(()=>({results:[]}));
  return rows.results||[];
}
__name(cloudArrearsFetchActiveSessionRows,"cloudArrearsFetchActiveSessionRows");
async function rebuildAllCloudArrears(env,user,opts={}){
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,opts);
  return buildCloudArrearsProjectionFromSessions(sessions,opts);
}
__name(rebuildAllCloudArrears,"rebuildAllCloudArrears");
async function updateCloudArrearsProjectionForSession(env,user,sessionId,opts={}){
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{...opts,session_id:sessionId});
  return buildCloudArrearsProjectionFromSessions(sessions,opts);
}
__name(updateCloudArrearsProjectionForSession,"updateCloudArrearsProjectionForSession");
async function rebuildCloudArrearsForBed(env,user,bed,opts={}){
  return rebuildAllCloudArrears(env,user,{...opts,bed});
}
__name(rebuildCloudArrearsForBed,"rebuildCloudArrearsForBed");
async function getOpenCloudArrearsForBed(env,user,bed,opts={}){
  const gateway=await canonicalArrearsGateway(env,user,{bed,limit:opts.limit||1000});
  return gateway.open_items||[];
}
__name(getOpenCloudArrearsForBed,"getOpenCloudArrearsForBed");
const canonicalArrearsForbiddenIdentityFields=["tenant_card_id","card_id","cardid","old_ttlock_ref","oldTtlockRef","provider_phone","providerPhone","ttlock_phone","ttlockPhone","phone_99099","phone99099","access_card_phone","accessCardPhone","ttlock_account_phone","ttlockAccountPhone","customer_code","card_code"];
function canonicalArrearsGatewayCleanItem(item={}){
  const remaining=entryAnchorMoney(item.remaining_arrears||empTaskRemaining(item));
  const original=entryAnchorMoney(item.original_arrears_amount||item.arrear_amount||item.original_amount||0);
  const already=entryAnchorMoney(item.already_paid_amount||item.actual_received||0);
  const status=remaining<=0?"settled":(["open","partial"].includes(String(item.status||"").toLowerCase())?String(item.status||"").toLowerCase():(already>0?"partial":"open"));
  const cleaned={
    task_id:cleanText(item.arrears_ref||item.task_id||item.id||item.source_ref||"",160),
    id:cleanText(item.arrears_ref||item.task_id||item.id||item.source_ref||"",160),
    arrears_ref:cleanText(item.arrears_ref||item.task_id||item.id||item.source_ref||"",160),
    bed:cleanText(item.bed||item.room_bed||item.room||item.bed_no||"",80).replace(/^#/,""),
    tenant_name:cleanText(item.tenant_name||item.customer_name||item.former_customer_name||item.card_name||"",120),
    original_arrears_amount:original,
    original_amount:original,
    arrear_amount:original,
    already_paid_amount:already,
    actual_received:already,
    remaining_arrears:remaining,
    status,
    close_status:status==="settled"?"PAID":"",
    accounting_status:status==="settled"?"closed":"open",
    promise_date:cleanDate(item.promise_date||item.due_date||item.promised_payment_date||""),
    due_date:cleanDate(item.due_date||item.promise_date||item.promised_payment_date||""),
    original_date:cleanDate(item.original_date||item.created_at||""),
    original_type:cleanText(item.original_type||item.source_event_type||item.source_type||"cloud_arrears",80),
    source_session_id:cleanText(item.source_session_id||item.session_id||"",120),
    source_event_id:cleanText(item.source_event_id||item.entry_id||item.original_entry_id||"",120),
    source_event_type:cleanText(item.source_event_type||item.original_type||item.source_type||"",80),
    entry_id:cleanText(item.entry_id||item.source_event_id||item.original_entry_id||"",120),
    original_entry_id:cleanText(item.original_entry_id||item.source_event_id||item.entry_id||"",120),
    source_type:cleanText(item.source_type||"cloud_arrears_projection",80),
    source:"canonical_arrears_gateway",
    materialized_from:"canonical_event_archive",
    projection_source:"sessions.entries_json",
    original_note:cleanText(item.original_note||item.staff_note||item.owner_note||item.arrear_reason||item.note||"",500),
    staff_note:cleanText(item.staff_note||item.original_note||item.arrear_reason||"",500),
    linked_repayment_events:Array.isArray(item.linked_repayment_events)?item.linked_repayment_events.map(event=>({
      event_id:cleanText(event.event_id||"",120),
      session_id:cleanText(event.session_id||"",120),
      date:cleanDate(event.date||""),
      payment_amount:entryAnchorMoney(event.payment_amount||0),
      payment_method:entryAnchorPaymentMethod(event.payment_method||""),
      operator:cleanText(event.operator||"",120),
      note:cleanText(event.note||"",300)
    })):[],
    source_proof:{
      gateway:"Canonical Arrears Gateway",
      source_layer:"L1 Canonical Event Archive",
      projection_layer:"L2 Derived Arrears Projection",
      archive_source:"cloud accepted sessions",
      anchor_source:"ENTRY ANCHORS JSON",
      identity:"arrears_ref",
      context:"bed",
      forbidden_identity_excluded:true
    }
  };
  canonicalArrearsForbiddenIdentityFields.forEach(field=>delete cleaned[field]);
  return cleaned;
}
__name(canonicalArrearsGatewayCleanItem,"canonicalArrearsGatewayCleanItem");
async function canonicalArrearsGateway(env,user,opts={}){
  const bed=cleanText(opts.bed||"",80).replace(/^#/,"");
  const arrearsRef=cleanText(opts.arrears_ref||opts.task_id||opts.ref||"",160);
  const limit=Math.min(Math.max(Number(opts.limit||1000),1),2000);
  const projection=bed?await rebuildCloudArrearsForBed(env,user,bed,{limit}):await rebuildAllCloudArrears(env,user,{limit});
  let allItems=(projection.all_items&&projection.all_items.length?projection.all_items:[...(projection.open_items||[]),...(projection.closed_items||[])])
    .map(canonicalArrearsGatewayCleanItem);
  if(arrearsRef)allItems=allItems.filter(item=>[item.arrears_ref,item.task_id,item.id].some(value=>cleanText(value,160)===arrearsRef));
  const open_items=allItems.filter(item=>["open","partial"].includes(String(item.status||"").toLowerCase())&&entryAnchorMoney(item.remaining_arrears)>0);
  const closed_items=allItems.filter(item=>!open_items.includes(item));
  return {
    ok:true,
    success:true,
    gateway:"canonical_arrears_gateway",
    source:"canonical_arrears_gateway",
    source_proof:{
      source_layer:"L1 Canonical Event Archive",
      projection_layer:"L2 Derived Arrears Projection",
      canonical_sources:["cloud accepted sessions","ENTRY ANCHORS JSON","correction/void status via active session filter"],
      identity:"arrears_ref",
      context_filter:bed?"bed":"none",
      forbidden_sources_excluded:["tenant_card_id","card_id","old_ttlock_ref","provider_phone","phone_99099","owner_history_text","local_cache","whatsapp_export_text","preview_text"]
    },
    bed,
    arrears_ref:arrearsRef,
    items:open_items,
    tasks:open_items,
    open_items,
    closed_items,
    all_items:allItems,
    total_remaining:entryAnchorMoney(open_items.reduce((sum,item)=>sum+entryAnchorMoney(item.remaining_arrears),0)),
    total_count:open_items.length,
    projection_result:{
      active_sessions_count:projection.active_sessions_count||0,
      scanned_anchor_count:projection.scanned_anchor_count||0,
      materialized_from:projection.materialized_from||"sessions.entries_json",
      total_remaining:projection.total_remaining||0
    },
    readonly:true,
    no_write:true
  };
}
__name(canonicalArrearsGateway,"canonicalArrearsGateway");
async function canonicalBedContextGateway(env,user,opts={}){
  const bed=cleanText(opts.bed||"",80).replace(/^#/,"");
  const arrears=await canonicalArrearsGateway(env,user,{bed,limit:opts.limit||1000});
  const occupancy=await canonicalOccupancyGateway(env,user,{bed,arrears_gateway:arrears,limit:opts.limit||1000,strict_access_snapshot:opts.strict_access_snapshot===true});
  const stayContext=await canonicalStayBedContextGateway(env,user,{bed,limit:opts.limit||500});
  return {
    ok:true,
    success:true,
    gateway:"canonical_bed_context_gateway",
    bed,
    occupancy_gateway:occupancy,
    access_snapshot_context:{...(occupancy.access_snapshot_context||{}),display_only:true,provider_identity_allowed:false},
    open_arrears:arrears.open_items,
    total_remaining:arrears.total_remaining,
    deposit_status:occupancy.deposit_recorded_amount===null?"MISSING_D":"ACCESS_SNAPSHOT_D",
    occupancy_status:occupancy.occupancy_status,
    stay_context:stayContext,
    warnings:occupancy.warnings||[],
    source_proof:{
      bed_context:"Access Snapshot context only",
      occupancy_gateway:"Canonical Occupancy Gateway",
      occupancy_source:occupancy.source_proof,
      arrears_gateway:"Canonical Arrears Gateway",
      arrears_source:arrears.source_proof,
      stay_context_gateway:"Canonical Stay Bed Context Gateway",
      stay_context_sources:["sessions.entries_json","stay_contexts","stay_event_links"],
      forbidden_identity_excluded:true
    },
    readonly:true,
    no_write:true
  };
}
__name(canonicalBedContextGateway,"canonicalBedContextGateway");
async function canonicalStayBedContextGateway(env,user,opts={}){
  const bed=cleanText(opts.bed||"",80).replace(/^#/,"");
  const limit=Math.min(Math.max(Number(opts.limit||500),1),1000);
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{limit}).catch(()=>[]);
  let stayContexts=[];
  let stayEventLinks=[];
  if(await empTableExists(env,"stay_contexts").catch(()=>false)){
    const rows=await env.DB.prepare(`SELECT stay_context_id, corpid, lifecycle_status, genesis_event_type,
      genesis_session_id, genesis_entry_id, genesis_anchor_id, started_at
      FROM stay_contexts WHERE corpid=? AND lifecycle_status='active' LIMIT ?`)
      .bind(user.corpid,limit).all().catch(()=>({results:[]}));
    stayContexts=rows.results||[];
  }
  if(await empTableExists(env,"stay_event_links").catch(()=>false)){
    const rows=await env.DB.prepare(`SELECT stay_event_link_id, corpid, stay_context_id, session_id,
      entry_id, anchor_id, event_type, link_role, occurred_at
      FROM stay_event_links WHERE corpid=? AND link_role='genesis' LIMIT ?`)
      .bind(user.corpid,limit).all().catch(()=>({results:[]}));
    stayEventLinks=rows.results||[];
  }
  return buildCanonicalStayBedContext({
    corpid:user.corpid,
    bed,
    sessions,
    stay_contexts:stayContexts,
    stay_event_links:stayEventLinks,
    limit
  });
}
__name(canonicalStayBedContextGateway,"canonicalStayBedContextGateway");
function canonicalOccupancySourceProof(){
  return {
    gateway:"canonical_occupancy_bed_status_gateway",
    source_layer:"L2 Occupancy / Bed Status Projection",
    allowed_sources:["TTLock / Access Snapshot / card remark context","canonical_event_archive","employee_7_event_anchors","entries_json","correction_anchors","void_anchors","reversal_anchors","canonical_archive_projections"],
    forbidden_truth_sources:["employee_local_cache","owner_display_text","whatsapp_export_text","preview_text","tenant_card_id","card_id","old_ttlock_ref","provider_phone","phone_99099","ttlock_provider_metadata"],
    physical_vacancy_source:"access_snapshot_E_marker",
    access_snapshot_role:"display_context_and_deposit_D_source_not_identity",
    archive_identity:"bed_context_and_event_anchor_refs",
    owner_history_write_source:false
  };
}
__name(canonicalOccupancySourceProof,"canonicalOccupancySourceProof");
function canonicalOccupancyAnchorDate(anchor={},session={}){
  return cleanDate(anchor.transfer_date||anchor.checkout_date||anchor.left_date||anchor.rent_period_end||anchor.rent_period_start||anchor.date||session.date||anchor.created_at||session.created_at||"");
}
__name(canonicalOccupancyAnchorDate,"canonicalOccupancyAnchorDate");
function canonicalOccupancyAnchorBed(anchor={}){
  return cleanText(anchor.bed||anchor.room||anchor.from_bed||anchor.bed_from||anchor.to_bed||anchor.bed_to||"",80).replace(/^#/,"");
}
__name(canonicalOccupancyAnchorBed,"canonicalOccupancyAnchorBed");
function canonicalOccupancyEventView(anchor={},session={}){
  const type=canonicalFinanceProjectionEventType(anchor);
  return {
    event_type:type,
    event_id:cleanText(anchor.event_id||anchor.anchor_id||anchor.id||anchor.entry_id||"",120),
    session_id:cleanText(session.id||anchor.session_id||"",120),
    session_anchor:cleanText(session.anchor_id||"",160),
    date:canonicalOccupancyAnchorDate(anchor,session),
    bed:cleanText(anchor.bed||anchor.room||"",80).replace(/^#/,""),
    from_bed:cleanText(anchor.from_bed||anchor.bed_from||"",80).replace(/^#/,""),
    to_bed:cleanText(anchor.to_bed||anchor.bed_to||"",80).replace(/^#/,""),
    rent_period_start:cleanDate(anchor.rent_period_start||anchor.period_start||""),
    rent_period_end:cleanDate(anchor.rent_period_end||anchor.period_end||anchor.rent_coverage_end||""),
    rent_coverage_carryover:cleanDate(anchor.rent_coverage_carryover||anchor.rent_coverage_end||anchor.coverage_end_date||anchor.card_end_date||""),
    arrears_carryover:entryAnchorMoney(anchor.arrears_carryover||anchor.open_arrears_amount||anchor.outstanding_arrears||0),
    deposit_balance_carryover:entryAnchorMoney(anchor.deposit_balance_carryover||anchor.deposit_balance||0),
    checkout_date:cleanDate(anchor.checkout_date||anchor.left_date||""),
    transfer_date:cleanDate(anchor.transfer_date||anchor.date||""),
    left_with_arrears:type==="left_with_arrears"||!!anchor.left_with_arrears||anchor.checkout_mode==="left_with_arrears",
    cloud_arrears_ref:cleanText(anchor.cloud_arrears_ref||anchor.arrears_ref||"",160),
    transfer_anchor_id:cleanText(anchor.transfer_anchor_id||"",160),
    transfer_lineage_id:cleanText(anchor.transfer_lineage_id||"",160),
    previous_transfer_anchor_id:cleanText(anchor.previous_transfer_anchor_id||"",160)||null,
    source_context_anchor_refs:Array.isArray(anchor.source_context_anchor_refs)?anchor.source_context_anchor_refs:[],
    carried_arrears_refs:Array.isArray(anchor.carried_arrears_refs)?anchor.carried_arrears_refs:[],
    rent_coverage_ref:cleanText(anchor.rent_coverage_ref||"",160),
    source:"canonical_event_archive_entries_json"
  };
}
__name(canonicalOccupancyEventView,"canonicalOccupancyEventView");
function canonicalOccupancyCompareEventDate(left={},right={}){
  return String(left.date||"").localeCompare(String(right.date||""));
}
__name(canonicalOccupancyCompareEventDate,"canonicalOccupancyCompareEventDate");
async function canonicalOccupancyArchiveEventsForBed(env,user,bed,opts={}){
  const cleanBed=cleanText(bed,80).replace(/^#/,"");
  if(!cleanBed)return [];
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{limit:opts.limit||1000}).catch(()=>[]);
  const events=[];
  for(const session of sessions||[]){
    for(const raw of extractEmployeeEntryAnchorsFromSession(session)){
      const anchor=normalizeEntryAnchor(raw);
      const type=canonicalFinanceProjectionEventType(anchor);
      const event=canonicalOccupancyEventView(anchor,session);
      const bedMatch=event.bed===cleanBed||event.from_bed===cleanBed||event.to_bed===cleanBed;
      if(!bedMatch)continue;
      if(["rent","checkout","left_with_arrears","bed_transfer","bed_transfer_fee"].includes(type))events.push(event);
    }
  }
  return events.sort(canonicalOccupancyCompareEventDate);
}
__name(canonicalOccupancyArchiveEventsForBed,"canonicalOccupancyArchiveEventsForBed");
function canonicalOccupancyProjectStatus(bed,events=[],openArrears=[]){
  const rentEvents=events.filter(event=>event.event_type==="rent"&&event.bed===bed);
  const checkoutEvents=events.filter(event=>(event.event_type==="checkout"||event.event_type==="left_with_arrears")&&event.bed===bed);
  const transferOutEvents=events.filter(event=>(event.event_type==="bed_transfer"||event.event_type==="bed_transfer_fee")&&event.from_bed===bed);
  const transferInEvents=events.filter(event=>(event.event_type==="bed_transfer"||event.event_type==="bed_transfer_fee")&&event.to_bed===bed);
  const latestRent=rentEvents.at(-1)||null;
  const latestCheckout=checkoutEvents.at(-1)||null;
  const latestTransfer=[...transferOutEvents,...transferInEvents].sort(canonicalOccupancyCompareEventDate).at(-1)||null;
  let occupancy_status=latestRent?"active":"unknown";
  if(latestCheckout?.left_with_arrears)occupancy_status="left_with_arrears";
  else if(latestCheckout){
    occupancy_status=openArrears.length?"checkout_pending":"vacant";
  }
  if(latestTransfer){
    if(latestTransfer.from_bed===bed)occupancy_status="transferred_out";
    if(latestTransfer.to_bed===bed)occupancy_status="transferred_in";
  }
  if(!latestRent&&!latestCheckout&&!latestTransfer&&!openArrears.length)occupancy_status="vacant";
  return {occupancy_status,latestRent,latestCheckout,latestTransfer};
}
__name(canonicalOccupancyProjectStatus,"canonicalOccupancyProjectStatus");
function canonicalOccupancyPhysicalBedStatus(access={}){
  const snapshot=access.snapshot||null;
  if(!snapshot)return {physical_bed_status:"unknown",physical_bed_status_source:"missing_access_snapshot",has_vacancy_marker:false};
  const hasMarker=!!snapshot.parsed_vacancy_marker||snapshot.physical_bed_status_source==="access_snapshot_E_marker";
  return {
    physical_bed_status:hasMarker?"vacant":"not_marked_vacant",
    physical_bed_status_source:hasMarker?"access_snapshot_E_marker":"access_snapshot_no_E",
    has_vacancy_marker:hasMarker
  };
}
__name(canonicalOccupancyPhysicalBedStatus,"canonicalOccupancyPhysicalBedStatus");
function canonicalOccupancyResolveStatusFromAccess(physical={},projected={},access={}){
  if(physical.physical_bed_status==="vacant")return "vacant";
  if(physical.physical_bed_status_source==="missing_access_snapshot")return "unknown";
  if(projected.latestCheckout||projected.latestTransfer?.from_bed||projected.openArrears?.length)return "needs_reconciliation";
  if(access.snapshot)return "active_or_occupied_context";
  return "unknown";
}
__name(canonicalOccupancyResolveStatusFromAccess,"canonicalOccupancyResolveStatusFromAccess");
function canonicalOccupancyConflictWarnings(physical={},projected={}){
  const warnings=[];
  if(physical.physical_bed_status==="vacant"&&!projected.latestCheckout)warnings.push("TTLOCK_VACANT_WITHOUT_CHECKOUT_EVENT");
  if(projected.latestCheckout&&physical.physical_bed_status!=="vacant")warnings.push("CHECKOUT_EVENT_WITHOUT_TTLOCK_E");
  if(projected.latestTransfer?.from_bed&&physical.physical_bed_status!=="vacant")warnings.push("TRANSFER_WITHOUT_TTLOCK_E_ON_FROM_BED");
  if(projected.latestRent&&physical.physical_bed_status==="vacant")warnings.push("RENT_COVERAGE_CONFLICTS_WITH_TTLOCK_E");
  return warnings;
}
__name(canonicalOccupancyConflictWarnings,"canonicalOccupancyConflictWarnings");
async function canonicalOccupancyGateway(env,user,opts={}){
  const bed=cleanText(opts.bed||"",80).replace(/^#/,"");
  const access=opts.access_snapshot
    ?{snapshot:opts.access_snapshot,card:opts.card||null,source_status:"provided",warning:""}
    :await canonicalDepositAccessSnapshotForBed(env,user,bed,{strict_access_snapshot:opts.strict_access_snapshot===true}).catch(e=>({snapshot:null,card:null,source_status:"access_snapshot_unavailable",warning:empReadErrorCode(e),error:empReadErrorCode(e),data_source:"live_api",fallback:false,candidate_count:0,ambiguous:false,conflict:false,stale:false}));
  const arrears=opts.arrears_gateway||await canonicalArrearsGateway(env,user,{bed,limit:opts.limit||1000});
  const events=Array.isArray(opts.events)?opts.events:await canonicalOccupancyArchiveEventsForBed(env,user,bed,{limit:opts.limit||1000});
  const openArrears=Array.isArray(arrears.open_items)?arrears.open_items:[];
  const projected=canonicalOccupancyProjectStatus(bed,events,openArrears);
  projected.openArrears=openArrears;
  const {latestRent,latestCheckout,latestTransfer}=projected;
  const physical=canonicalOccupancyPhysicalBedStatus(access);
  const occupancy_status=canonicalOccupancyResolveStatusFromAccess(physical,projected,access);
  const warnings=[];
  if(access.warning)warnings.push(access.warning);
  warnings.push(...canonicalOccupancyConflictWarnings(physical,projected));
  if(access.snapshot&&latestRent?.rent_period_end&&access.snapshot.parsed_valid_until_mmdd&&!String(latestRent.rent_period_end||"").includes(String(access.snapshot.parsed_valid_until_mmdd||"").slice(-2))){
    warnings.push("NEEDS_RECONCILIATION_ACCESS_SNAPSHOT_RENT_COVERAGE");
  }
  return {
    ok:true,
    success:true,
    gateway:"canonical_occupancy_bed_status_gateway",
    bed,
    physical_bed_status:physical.physical_bed_status,
    physical_bed_status_source:physical.physical_bed_status_source,
    occupancy_status,
    projected_event_status:projected.occupancy_status,
    current_rent_coverage_start:latestTransfer?.to_bed===bed&&latestTransfer?.rent_period_start?latestTransfer.rent_period_start:(latestRent?.rent_period_start||""),
    current_rent_coverage_end:latestTransfer?.to_bed===bed&&latestTransfer?.rent_period_end?latestTransfer.rent_period_end:(latestTransfer?.rent_coverage_carryover||latestRent?.rent_period_end||""),
    latest_rent_event:latestRent,
    latest_checkout_event:latestCheckout,
    latest_transfer_event:latestTransfer,
    checkout_event_status:latestCheckout?projected.occupancy_status:"",
    transfer_event_status:latestTransfer?projected.occupancy_status:"",
    from_bed:latestTransfer?.from_bed||"",
    to_bed:latestTransfer?.to_bed||"",
    deposit_recorded_amount:access.snapshot&&access.snapshot.parsed_deposit_amount!==null?canonicalDepositMoney(access.snapshot.parsed_deposit_amount):null,
    open_arrears:openArrears,
    access_snapshot_context:{
      bed,
      display_only:true,
      source_layer:"L0 Access Snapshot",
      status:access.source_status||"unknown",
      data_source:access.data_source||"unknown",
      fallback:access.fallback===true,
      candidate_count:access.candidate_count??null,
      ambiguous:access.ambiguous===true,
      conflict:access.conflict===true,
      stale:access.stale===true,
      error:access.error||"",
      provider_identity_allowed:false,
      card_name:cleanText(access.card?.card_name||"",160),
      parsed_deposit_amount:access.snapshot?.parsed_deposit_amount??null,
      parsed_checkin_mmdd:access.snapshot?.parsed_checkin_mmdd||"",
      parsed_valid_until_mmdd:access.snapshot?.parsed_valid_until_mmdd||"",
      parsed_vacancy_marker:!!access.snapshot?.parsed_vacancy_marker,
      snapshot_fingerprint:cleanText(access.snapshot?.snapshot_fingerprint||access.snapshot?.fingerprint||"",160),
      physical_bed_status:physical.physical_bed_status,
      physical_bed_status_source:physical.physical_bed_status_source,
      parse_status:access.snapshot?.parse_status||""
    },
    source_proof:canonicalOccupancySourceProof(),
    warnings,
    anomalies:warnings,
    readonly:true,
    no_write:true
  };
}
__name(canonicalOccupancyGateway,"canonicalOccupancyGateway");
function ownerTodayTodoSlug(value,max=160){
  return cleanText(value,max).replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,max)||"unknown";
}
__name(ownerTodayTodoSlug,"ownerTodayTodoSlug");
function ownerTodayTodoTaskId(type,bed,sourceSessionId,sourceEventId,sourceGateway){
  return [type,bed||"bed",sourceSessionId||"session",sourceEventId||"event",sourceGateway||"gateway"].map(value=>ownerTodayTodoSlug(value)).join("__");
}
__name(ownerTodayTodoTaskId,"ownerTodayTodoTaskId");
function ownerTodayTodoItem(type,fields={}){
  const bed=cleanText(fields.bed||"",80).replace(/^#/,"");
  const sourceGateway=cleanText(fields.source_gateway||"",120);
  const sessionId=cleanText(fields.session_id||fields.source_session_id||"",120);
  const eventId=cleanText(fields.event_id||fields.source_event_id||"",120);
  return {
    task_id:cleanText(fields.task_id||ownerTodayTodoTaskId(type,bed,sessionId,eventId,sourceGateway),240),
    task_type:type,
    category:cleanText(fields.category||"reconciliation",80),
    severity:cleanText(fields.severity||"medium",40),
    bed,
    session_id:sessionId,
    event_id:eventId,
    title:cleanText(fields.title||type,200),
    description:cleanText(fields.description||"",800),
    source_gateway:sourceGateway,
    source_proof:fields.source_proof||{},
    recommended_action:cleanText(fields.recommended_action||"",800),
    status:fields.status==="resolved_by_source"?"resolved_by_source":"open",
    created_at:cleanText(fields.created_at||empNow(),80),
    due_date:cleanDate(fields.due_date||""),
    auto_resolve_condition:cleanText(fields.auto_resolve_condition||"",500)
  };
}
__name(ownerTodayTodoItem,"ownerTodayTodoItem");
async function ownerTodayTodoCandidateBeds(env,user,opts={}){
  const candidates=new Map();
  const limit=Math.min(Math.max(Number(opts.limit||500),1),1000);
  const add=(bed,source)=>{
    const cleanBed=cleanText(bed||"",80).replace(/^#/,"");
    if(!cleanBed)return;
    if(!candidates.has(cleanBed))candidates.set(cleanBed,{bed:cleanBed,sources:new Set()});
    candidates.get(cleanBed).sources.add(source||"unknown");
  };
  if(opts.bed)add(opts.bed,"query");
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{limit}).catch(()=>[]);
  for(const session of sessions||[]){
    const anchors=extractEmployeeEntryAnchorsFromSession(session);
    for(const raw of anchors||[]){
      const anchor=normalizeEntryAnchor(raw);
      add(anchor.bed||anchor.room,"canonical_event_archive");
      add(anchor.from_bed,"canonical_event_archive");
      add(anchor.to_bed,"canonical_event_archive");
    }
  }
  const lockResult=await empLoadLockCardsWithCacheFallback(env,user,{timeoutMs:8000,limit:500}).catch(e=>({roomsData:{},error:empTtlockReadErrorCode(e)}));
  for(const [lockRoom,cards] of Object.entries(lockResult?.roomsData||{})){
    for(const card of cards||[]){
      const remark=canonicalDepositRemarkText(card,lockRoom);
      const snapshot=buildAccessSnapshotDTO(remark,{property_id:user?.corpid||"homelink"});
      add(snapshot.bed||card.bed||card.room||lockRoom,"access_snapshot");
    }
  }
  return [...candidates.values()].map(row=>({bed:row.bed,sources:[...row.sources]})).slice(0,limit);
}
__name(ownerTodayTodoCandidateBeds,"ownerTodayTodoCandidateBeds");
function ownerTodayTodoSourceProof(gateway,extra={}){
  return {
    gateway,
    derived_queue:true,
    source_of_truth:false,
    canonical_sources:["canonical_deposit_gateway","canonical_occupancy_bed_status_gateway","canonical_arrears_gateway","canonical_event_archive","access_snapshot_context"],
    forbidden_sources_excluded:["owner_display_text","employee_local_cache","preview_text","whatsapp_export_text","tenant_card_id","card_id","old_ttlock_ref","provider_phone","phone_99099","manual_todo_state"],
    ...extra
  };
}
__name(ownerTodayTodoSourceProof,"ownerTodayTodoSourceProof");
function ownerTodayTodoPush(todos,item,filters={}){
  if(!item)return;
  if(filters.category&&item.category!==filters.category)return;
  if(filters.severity&&item.severity!==filters.severity)return;
  if(!filters.includeResolved&&item.status==="resolved_by_source")return;
  if(todos.some(existing=>existing.task_id===item.task_id))return;
  todos.push(item);
}
__name(ownerTodayTodoPush,"ownerTodayTodoPush");
function ownerTodayTodoDepositExpectedAmount(deposit={}){
  const auditEvents=Array.isArray(deposit.cloud_deposit_events)?deposit.cloud_deposit_events:[];
  const expectedFromEvents=auditEvents.reduce((max,event)=>Math.max(max,canonicalDepositMoney(event.expected_deposit_after_payment||event.deposit_required_total||0)),0);
  const depositInNet=auditEvents.reduce((sum,event)=>sum+(event.event_type==="deposit_in"?canonicalDepositMoney(event.amount):0),0);
  return Math.max(canonicalDepositMoney(deposit.cloud_deposit_expected_after_payment||0),expectedFromEvents,depositInNet);
}
__name(ownerTodayTodoDepositExpectedAmount,"ownerTodayTodoDepositExpectedAmount");
function ownerTodayTodoDepositFirstEvent(deposit={}){
  return (deposit.cloud_deposit_events||[]).find(event=>event.event_type==="deposit_in")||{};
}
__name(ownerTodayTodoDepositFirstEvent,"ownerTodayTodoDepositFirstEvent");
function ownerTodayTodoBuildDepositAndOccupancy(todos,bed,deposit={},occupancy={},filters={}){
  const depositEvents=Array.isArray(deposit.cloud_deposit_events)?deposit.cloud_deposit_events:[];
  const depositInEvents=depositEvents.filter(event=>event.event_type==="deposit_in");
  const firstDeposit=ownerTodayTodoDepositFirstEvent(deposit);
  const expectedDeposit=ownerTodayTodoDepositExpectedAmount(deposit);
  const recorded=deposit.deposit_recorded_amount===null||deposit.deposit_recorded_amount===undefined?null:canonicalDepositMoney(deposit.deposit_recorded_amount);
  if(depositInEvents.length&&expectedDeposit>0&&(recorded===null||recorded+0.01<expectedDeposit)){
    ownerTodayTodoPush(todos,ownerTodayTodoItem("DEPOSIT_D_RECONCILIATION_REQUIRED",{
      category:"deposit_reconciliation",
      severity:"high",
      bed,
      session_id:firstDeposit.session_id,
      event_id:firstDeposit.event_id,
      title:`Bed ${bed} deposit D amount needs update`,
      description:`Deposit In ${expectedDeposit} exists, but TTLock remark does not show D${expectedDeposit}.`,
      source_gateway:"canonical_deposit_gateway",
      source_proof:ownerTodayTodoSourceProof("canonical_deposit_gateway",{deposit_recorded_amount:recorded,expected_deposit_amount:expectedDeposit,cloud_deposit_events_count:depositEvents.length}),
      recommended_action:`Update TTLock remark to include D${expectedDeposit} if the deposit is real, or void/correct the Deposit In if it was a test/error.`,
      auto_resolve_condition:`Access Snapshot D amount is updated to D${expectedDeposit} or the Deposit In anchor is voided/corrected.`
    }),filters);
  }
  if(depositInEvents.length&&occupancy.physical_bed_status==="vacant"&&occupancy.physical_bed_status_source==="access_snapshot_E_marker"){
    ownerTodayTodoPush(todos,ownerTodayTodoItem("DEPOSIT_IN_ON_TTLOCK_VACANT_BED",{
      category:"occupancy_reconciliation",
      severity:"high",
      bed,
      session_id:firstDeposit.session_id,
      event_id:firstDeposit.event_id,
      title:`Bed ${bed} deposit collected while TTLock shows vacant`,
      description:`Deposit In ${expectedDeposit} exists, but TTLock still marks bed ${bed} as vacant.`,
      source_gateway:"canonical_deposit_gateway + canonical_occupancy_bed_status_gateway",
      source_proof:ownerTodayTodoSourceProof("canonical_deposit_gateway + canonical_occupancy_bed_status_gateway",{physical_bed_status:occupancy.physical_bed_status,physical_bed_status_source:occupancy.physical_bed_status_source,deposit_events_count:depositInEvents.length,expected_deposit_amount:expectedDeposit}),
      recommended_action:`Verify whether the tenant has moved in. If yes, remove E/e and update TTLock remark to D${expectedDeposit}. If this was a test or error, void/correct the Deposit In.`,
      auto_resolve_condition:"The todo resolves when TTLock no longer shows E/e and D is updated correctly, or the Deposit In record is voided/corrected."
    }),filters);
  }
  const occupancyWarnings=Array.isArray(occupancy.warnings)?occupancy.warnings:[];
  for(const code of ["TTLOCK_VACANT_WITHOUT_CHECKOUT_EVENT","CHECKOUT_EVENT_WITHOUT_TTLOCK_E","RENT_COVERAGE_CONFLICTS_WITH_TTLOCK_E"]){
    if(!occupancyWarnings.includes(code))continue;
    const severity=code==="TTLOCK_VACANT_WITHOUT_CHECKOUT_EVENT"?"medium":"high";
    ownerTodayTodoPush(todos,ownerTodayTodoItem(code,{
      category:"occupancy_reconciliation",
      severity,
      bed,
      session_id:occupancy.latest_checkout_event?.session_id||occupancy.latest_rent_event?.session_id||"",
      event_id:occupancy.latest_checkout_event?.event_id||occupancy.latest_rent_event?.event_id||"",
      title:`Bed ${bed} ${code.replace(/_/g," ").toLowerCase()}`,
      description:`Canonical occupancy gateway reported ${code}.`,
      source_gateway:"canonical_occupancy_bed_status_gateway",
      source_proof:ownerTodayTodoSourceProof("canonical_occupancy_bed_status_gateway",{warning:code,physical_bed_status:occupancy.physical_bed_status,physical_bed_status_source:occupancy.physical_bed_status_source}),
      recommended_action:"Review Access Snapshot E/e marker and related employee event anchors, then correct the source record if needed.",
      auto_resolve_condition:"The canonical occupancy warning disappears after Access Snapshot or archive anchors are corrected."
    }),filters);
  }
}
__name(ownerTodayTodoBuildDepositAndOccupancy,"ownerTodayTodoBuildDepositAndOccupancy");
function ownerTodayTodoBuildReceivables(todos,sot={},filters={}){
  const rows=Array.isArray(sot.all_rows)?sot.all_rows:(Array.isArray(sot.rows)?sot.rows:[]);
  for(const row of rows){
    const bed=cleanText(row.bed||row.room_bed||row.room||"",80).replace(/^#/,"");
    const amountFils=Number(row.amount_fils??row.outstanding_amount_fils??row.remaining_amount_fils??0);
    const amount=amountFils>0?Math.round(amountFils)/100:cleanMoney(row.remain||row.remaining_arrears||row.amount||0);
    const status=cleanText(row.status||row.action_status||row.source_label||row.source_type||"required",80).toLowerCase();
    ownerTodayTodoPush(todos,ownerTodayTodoItem("CURRENT_RECEIVABLE_REQUIRED",{
      category:"receivables",
      severity:status.includes("overdue")?"high":(status.includes("today")?"medium":"low"),
      bed,
      session_id:cleanText(row.session_id||"",120),
      event_id:cleanText(row.event_id||row.entry_id||"",120),
      title:`Bed ${bed||"-"} receivable requires follow-up`,
      description:`Current receivables SOT shows ${amount} AED requiring follow-up.`,
      source_gateway:"current_receivables_sot",
      source_proof:ownerTodayTodoSourceProof("current_receivables_sot",{source:row.source||row.source_type||"",amount}),
      recommended_action:"Follow up the current receivable or update the canonical source if it is no longer due.",
      due_date:row.due_date||row.dueDate||row.valid_until||"",
      auto_resolve_condition:"Receivable disappears from current receivables SOT."
    }),filters);
  }
}
__name(ownerTodayTodoBuildReceivables,"ownerTodayTodoBuildReceivables");
function ownerTodayTodoAccessCandidates(lockResult={},user={}){
  const byBed=new Map();
  for(const [lockRoom,cards] of Object.entries(lockResult?.roomsData||{})){
    for(const card of cards||[]){
      const remark=canonicalDepositRemarkText(card,lockRoom);
      const snapshot=buildAccessSnapshotDTO(remark,{property_id:user?.corpid||"homelink"});
      const bed=cleanText(snapshot.bed||card.bed||card.room||lockRoom||"",80).replace(/^#/,"");
      if(!bed)continue;
      const cardLabel=cleanText(card.cardName||card.identityCardName||card.cardAlias||card.name||card.tenant_name||card.tenant||"",160);
      const inactive=(typeof empTtlockIsVacant==="function"&&empTtlockIsVacant(cardLabel))||(typeof empTtlockIsStaff==="function"&&empTtlockIsStaff(cardLabel));
      const row={snapshot,card:{room:cleanText(card.room||lockRoom||"",80),card_name:cardLabel,remark:cleanText(remark,1000)},inactive};
      const existing=byBed.get(bed);
      if(!existing
        ||(!row.inactive&&existing.inactive)
        ||(!row.inactive&&row.snapshot?.parsed_deposit_amount!==null&&existing.snapshot?.parsed_deposit_amount===null)
        ||(row.snapshot?.parsed_vacancy_marker&&!existing.snapshot?.parsed_vacancy_marker)){
        byBed.set(bed,row);
      }
    }
  }
  return byBed;
}
__name(ownerTodayTodoAccessCandidates,"ownerTodayTodoAccessCandidates");
function ownerTodayTodoArchiveContextFromSessions(sessions=[]){
  const byBed=new Map();
  const ensure=(bed)=>{
    const cleanBed=cleanText(bed||"",80).replace(/^#/,"");
    if(!cleanBed)return null;
    if(!byBed.has(cleanBed))byBed.set(cleanBed,{bed:cleanBed,deposit_events:[],occupancy_events:[],expense_events:[]});
    return byBed.get(cleanBed);
  };
  for(const session of sessions||[]){
    for(const raw of extractEmployeeEntryAnchorsFromSession(session)){
      const anchor=normalizeEntryAnchor(raw);
      const type=canonicalFinanceProjectionEventType(anchor);
      const event=canonicalOccupancyEventView(anchor,session);
      const beds=[event.bed,event.from_bed,event.to_bed].filter(Boolean);
      for(const bed of beds)ensure(bed);
      if(type==="deposit_in"||type==="deposit_out"){
        const bed=cleanText(anchor.bed||anchor.room||"",80).replace(/^#/,"");
        const row=ensure(bed);
        if(!row)continue;
        const amount=type==="deposit_in"
          ?canonicalDepositMoney(anchor.deposit_amount||anchor.amount||anchor.deposit_paid_amount||0)
          :canonicalDepositMoney(anchor.refund_amount||anchor.actual_refund_amount||anchor.amount||0);
        row.deposit_events.push({
          event_type:type,
          event_id:cleanText(anchor.event_id||anchor.entry_id||anchor.anchor_id||"",120),
          session_id:cleanText(session.id||session.session_id||"",120),
          session_anchor:cleanText(session.anchor_id||"",160),
          date:cleanDate(session.date||anchor.created_at||""),
          amount,
          previous_deposit_recorded_amount:canonicalDepositMoney(anchor.previous_deposit_recorded_amount||0),
          deposit_required_total:canonicalDepositMoney(anchor.deposit_required_total||0),
          deposit_paid_amount:canonicalDepositMoney(anchor.deposit_paid_amount||amount),
          expected_deposit_after_payment:canonicalDepositMoney(anchor.expected_deposit_after_payment||0),
          deposit_remaining_after_payment:canonicalDepositMoney(anchor.deposit_remaining_after_payment ?? anchor.deposit_remaining ?? 0),
          payment_method:entryAnchorPaymentMethod(anchor.payment_method||anchor.pay_type||""),
          source:"cloud_deposit_event_audit_only"
        });
      }
      if(type==="expense"){
        const bed=cleanText(anchor.target_bed||anchor.bed||anchor.room||"",80).replace(/^#/,"");
        const row=ensure(bed);
        if(!row)continue;
        row.expense_events.push({
          event_type:type,
          event_id:cleanText(anchor.event_id||anchor.entry_id||anchor.anchor_id||"",120),
          session_id:cleanText(session.id||session.session_id||"",120),
          session_anchor:cleanText(session.anchor_id||"",160),
          date:cleanDate(session.date||anchor.created_at||""),
          amount:entryAnchorMoney(anchor.expense_amount||anchor.amount||0),
          expense_category:cleanText(anchor.expense_category||"",120),
          reason:cleanText(anchor.reason||anchor.expense_desc||anchor.note||"",500),
          payment_method:entryAnchorPaymentMethod(anchor.payment_method||anchor.pay_type||""),
          evidence_ref:cleanText(anchor.evidence_ref||anchor.receipt_ref||"",160),
          source:"canonical_event_archive_expense"
        });
      }
      if(["rent","checkout","left_with_arrears","bed_transfer","bed_transfer_fee"].includes(type)){
        for(const bed of beds){
          const row=ensure(bed);
          if(row)row.occupancy_events.push(event);
        }
      }
    }
  }
  for(const row of byBed.values())row.occupancy_events.sort(canonicalOccupancyCompareEventDate);
  return byBed;
}
__name(ownerTodayTodoArchiveContextFromSessions,"ownerTodayTodoArchiveContextFromSessions");
function ownerTodayTodoDepositGatewayView(bed,accessRow={},archiveRow={}){
  const snapshot=accessRow?.snapshot||null;
  const recorded=snapshot&&snapshot.parsed_deposit_amount!==null?canonicalDepositMoney(snapshot.parsed_deposit_amount):null;
  const auditEvents=archiveRow?.deposit_events||[];
  const cloudNet=canonicalDepositMoney(auditEvents.reduce((sum,event)=>sum+(event.event_type==="deposit_out"?-canonicalDepositMoney(event.amount):canonicalDepositMoney(event.amount)),0));
  const expectedAfterPayment=canonicalDepositMoney(auditEvents.reduce((max,event)=>Math.max(max,canonicalDepositMoney(event.expected_deposit_after_payment||event.deposit_required_total||0)),0));
  const warnings=[];
  if(recorded===null&&auditEvents.length)warnings.push("DEPOSIT_D_RECONCILIATION_REQUIRED");
  else if(recorded!==null&&expectedAfterPayment>0&&recorded+0.01<expectedAfterPayment)warnings.push("DEPOSIT_D_RECONCILIATION_REQUIRED");
  else if(recorded!==null&&expectedAfterPayment<=0&&auditEvents.length&&Math.abs(cloudNet-recorded)>0.01)warnings.push("DEPOSIT_SOURCE_MISMATCH");
  return {
    gateway:"canonical_deposit_gateway",
    bed,
    deposit_recorded_amount:recorded,
    cloud_deposit_events:auditEvents,
    cloud_deposit_events_role:"audit_supporting_only",
    cloud_deposit_event_net:cloudNet,
    cloud_deposit_expected_after_payment:expectedAfterPayment,
    reconciliation_warnings:warnings,
    source_proof:ownerTodayTodoSourceProof("canonical_deposit_gateway",{fast_path:true})
  };
}
__name(ownerTodayTodoDepositGatewayView,"ownerTodayTodoDepositGatewayView");
function ownerTodayTodoBuildExpenseEvidence(todos,bed,archiveRow={},filters={}){
  const expenseEvents=Array.isArray(archiveRow.expense_events)?archiveRow.expense_events:[];
  for(const event of expenseEvents){
    if(entryAnchorMoney(event.amount)<100||cleanText(event.evidence_ref||"",160))continue;
    ownerTodayTodoPush(todos,ownerTodayTodoItem("EXPENSE_EVIDENCE_MISSING",{
      category:"finance_evidence",
      severity:"high",
      bed,
      session_id:event.session_id,
      event_id:event.event_id,
      title:`Bed ${bed} expense evidence is missing`,
      description:`Expense ${entryAnchorMoney(event.amount).toFixed(2)} AED requires evidence_ref because it is 100 AED or more.`,
      source_gateway:"canonical_event_archive + canonical_finance_projection_gateway",
      source_proof:ownerTodayTodoSourceProof("canonical_event_archive + canonical_finance_projection_gateway",{expense_amount:event.amount,evidence_ref:event.evidence_ref||"",expense_category:event.expense_category||""}),
      recommended_action:"Attach the missing receipt/evidence reference or void/correct the Expense anchor if it was entered in error.",
      auto_resolve_condition:"The Expense anchor has evidence_ref, or the invalid Expense anchor is voided/corrected."
    }),filters);
  }
}
__name(ownerTodayTodoBuildExpenseEvidence,"ownerTodayTodoBuildExpenseEvidence");
function ownerTodayTodoOccupancyGatewayView(bed,accessRow={},archiveRow={},openArrears=[]){
  const access={snapshot:accessRow?.snapshot||null,card:accessRow?.card||null,source_status:accessRow?"loaded":"not_found"};
  const physical=canonicalOccupancyPhysicalBedStatus(access);
  const projected=canonicalOccupancyProjectStatus(bed,archiveRow?.occupancy_events||[],openArrears||[]);
  projected.openArrears=openArrears||[];
  const occupancy_status=canonicalOccupancyResolveStatusFromAccess(physical,projected,access);
  const warnings=[...canonicalOccupancyConflictWarnings(physical,projected)];
  if(access.snapshot&&projected.latestRent?.rent_period_end&&access.snapshot.parsed_valid_until_mmdd&&!String(projected.latestRent.rent_period_end||"").includes(String(access.snapshot.parsed_valid_until_mmdd||"").slice(-2))){
    warnings.push("NEEDS_RECONCILIATION_ACCESS_SNAPSHOT_RENT_COVERAGE");
  }
  return {
    gateway:"canonical_occupancy_bed_status_gateway",
    bed,
    physical_bed_status:physical.physical_bed_status,
    physical_bed_status_source:physical.physical_bed_status_source,
    occupancy_status,
    latest_rent_event:projected.latestRent,
    latest_checkout_event:projected.latestCheckout,
    latest_transfer_event:projected.latestTransfer,
    warnings,
    access_snapshot_context:{
      parsed_vacancy_marker:!!access.snapshot?.parsed_vacancy_marker,
      physical_bed_status:physical.physical_bed_status,
      physical_bed_status_source:physical.physical_bed_status_source,
      display_only:true,
      provider_identity_allowed:false
    },
    source_proof:canonicalOccupancySourceProof(),
    readonly:true,
    no_write:true
  };
}
__name(ownerTodayTodoOccupancyGatewayView,"ownerTodayTodoOccupancyGatewayView");
async function buildOwnerTodayTodoGateway(env,user,opts={}){
  const limit=Math.min(Math.max(Number(opts.limit||100),1),500);
  const includeResolved=opts.include_resolved===true||opts.includeResolved===true;
  const filters={includeResolved,severity:cleanText(opts.severity||"",40),category:cleanText(opts.category||"",80)};
  const started=Date.now();
  const sessions=await cloudArrearsFetchActiveSessionRows(env,user,{limit:Math.min(limit,500)}).catch(()=>[]);
  const archiveByBed=ownerTodayTodoArchiveContextFromSessions(sessions);
  const lockResult=await empLoadLockCardsWithCacheFallback(env,user,{timeoutMs:6000,limit:500}).catch(e=>({roomsData:{},error:empTtlockReadErrorCode(e)}));
  const accessByBed=ownerTodayTodoAccessCandidates(lockResult,user);
  let arrearsProjection={open_items:[]};
  try{
    arrearsProjection=buildCloudArrearsProjectionFromSessions(sessions,{limit:Math.min(limit,500)})||{open_items:[]};
  }catch{
    arrearsProjection={open_items:[]};
  }
  const openArrearsByBed=new Map();
  for(const raw of arrearsProjection.open_items||[]){
    const item=canonicalArrearsGatewayCleanItem(raw);
    const bed=cleanText(item.bed||"",80).replace(/^#/,"");
    if(!bed)continue;
    if(!openArrearsByBed.has(bed))openArrearsByBed.set(bed,[]);
    openArrearsByBed.get(bed).push(item);
  }
  const candidateBedSet=new Set([...archiveByBed.keys(),...accessByBed.keys(),...openArrearsByBed.keys()]);
  if(opts.bed)candidateBedSet.add(cleanText(opts.bed,80).replace(/^#/,""));
  const candidates=[...candidateBedSet].filter(Boolean).slice(0,limit).map(bed=>({bed}));
  const todos=[];
  const receivables=await resolveConsoleReceivablesSot(env,user,{limit:Math.min(limit,100),ttlockTimeoutMs:6000}).catch(()=>null);
  if(receivables)ownerTodayTodoBuildReceivables(todos,receivables,filters);
  for(const candidate of candidates){
    const bed=candidate.bed;
    if(!bed)continue;
    const archiveRow=archiveByBed.get(bed)||{bed,deposit_events:[],occupancy_events:[],expense_events:[]};
    const accessRow=accessByBed.get(bed)||null;
    const deposit=ownerTodayTodoDepositGatewayView(bed,accessRow,archiveRow);
    const occupancy=ownerTodayTodoOccupancyGatewayView(bed,accessRow,archiveRow,openArrearsByBed.get(bed)||[]);
    ownerTodayTodoBuildDepositAndOccupancy(todos,bed,deposit,occupancy,filters);
    ownerTodayTodoBuildExpenseEvidence(todos,bed,archiveRow,filters);
  }
  todos.sort((a,b)=>{
    const score={high:0,medium:1,low:2};
    return (score[a.severity]??9)-(score[b.severity]??9)||String(a.bed).localeCompare(String(b.bed))||String(a.task_type).localeCompare(String(b.task_type));
  });
  const items=todos.slice(0,limit);
  const openTodos=items.filter(todo=>todo.status==="open");
  const summary={
    total_count:items.length,
    open_count:openTodos.length,
    high_count:openTodos.filter(todo=>todo.severity==="high").length,
    medium_count:openTodos.filter(todo=>todo.severity==="medium").length,
    low_count:openTodos.filter(todo=>todo.severity==="low").length,
    category_counts:openTodos.reduce((acc,todo)=>{acc[todo.category]=(acc[todo.category]||0)+1;return acc;},{}),
    receivables_count:openTodos.filter(todo=>todo.category==="receivables").length,
    reconciliation_count:openTodos.filter(todo=>todo.category!=="receivables").length
  };
  return {
    ok:true,
    success:true,
    gateway:"owner_today_todo_gateway",
    source:"derived_from_canonical_gateways",
    date:cleanDate(opts.date||empTodayDubai()),
    summary,
    todos:items,
    items,
    empty_state:"No todo items from canonical gateways",
    source_proof:ownerTodayTodoSourceProof("owner_today_todo_gateway",{candidate_beds:candidates.length,active_sessions_scanned:sessions.length,access_snapshot_loaded:!lockResult?.error,duration_ms:Date.now()-started}),
    readonly:true,
    no_write:true,
    production_cutover:"PRODUCTION_NO_GO"
  };
}
__name(buildOwnerTodayTodoGateway,"buildOwnerTodayTodoGateway");
async function handleOwnerTodayTodos(request,env,user){
  if(!canReadOwnerData(user))return forbidden();
  const url=new URL(request.url);
  try{
    const payload=await buildOwnerTodayTodoGateway(env,user,{
      date:url.searchParams.get("date")||"",
      include_resolved:url.searchParams.get("include_resolved")==="1",
      severity:url.searchParams.get("severity")||"",
      category:url.searchParams.get("category")||"",
      bed:url.searchParams.get("bed")||"",
      limit:url.searchParams.get("limit")||100
    });
    return success(payload);
  }catch(e){
    return json({
      code:ErrorCodes.INTERNAL_SERVER,
      error_code:"TODAY_TODO_GATEWAY_FAILED",
      message:"Today Todo gateway failed.",
      message_en:"Today Todo gateway failed.",
      message_zh:"今日待办网关读取失败。",
      data:{
        ok:false,
        success:false,
        gateway:"owner_today_todo_gateway",
        items:[],
        todos:[],
        summary:{total_count:0,open_count:0},
        degraded:true,
        source_proof:ownerTodayTodoSourceProof("owner_today_todo_gateway",{failed_closed:true}),
        safe_error:empReadErrorCode(e),
        readonly:true,
        no_write:true
      }
    },200);
  }
}
__name(handleOwnerTodayTodos,"handleOwnerTodayTodos");
function employeeEntryExportTextWithAnchors(exportText,entries,session){
  const base=String(exportText||"").replace(/\n*==== ENTRY ANCHORS JSON ====\s*[\s\S]*?\s*==== END ENTRY ANCHORS JSON ====\s*$/i,"").trimEnd();
  const normalized=Array.isArray(entries)?entries.map(row=>normalizeEntryAnchor(row)):[];
  if(!normalized.length)return base;
  const payload={
    anchor_contract_version:"employee_entry_anchor_v1",
    session_id:session?.id||session?.session_id||"",
    anchor_id:session?.anchorId||session?.anchor_id||"",
    source:"employee_entry",
    entries:normalized
  };
  return `${base}\n\n==== ENTRY ANCHORS JSON ====\n${JSON.stringify(payload)}\n==== END ENTRY ANCHORS JSON ====`;
}
__name(employeeEntryExportTextWithAnchors,"employeeEntryExportTextWithAnchors");
function isEmployeeEntrySession(row){
  const source=String(row?.source||"").trim().toLowerCase();
  const anchor=String(row?.anchor_id||row?.anchorId||"").trim().toUpperCase();
  return source==="employee_entry"||source==="emp"||anchor.startsWith("EMP")||anchor.startsWith("EMPV3");
}
__name(isEmployeeEntrySession,"isEmployeeEntrySession");
function parseEmployeeExportAmount(raw){
  const m=String(raw||"").match(/([\d,]+(?:\.\d+)?)/);
  return m?Math.round(Number(m[1].replace(/,/g,""))*100)/100:0;
}
__name(parseEmployeeExportAmount,"parseEmployeeExportAmount");
function employeeExportNote(line,key){
  const re=new RegExp(`${key}:([^\\n]+?)(?:\\s+[A-Z_]+:|\\s+STATUS:|\\s+TASK\\s|$)`,"i");
  const m=String(line||"").match(re);
  return cleanText(m?.[1]||"",240);
}
__name(employeeExportNote,"employeeExportNote");
function parseEmployeeEntryExportRows(session){
  const text=String(session?.export_text||"");
  if(!text.trim())return [];
  const rows=[];
  const seen=new Set();
  let section="";
  const transferBeds=[];
  const add=row=>{
    const key=[row.type,row.room,row.room_to||"",row.amount,row.linked_task_id||""].join("|");
    if(seen.has(key))return;
    seen.add(key);
    rows.push(normalizeEntryAnchor({
      id:row.id||`employee-export-${rows.length+1}`,
      session_id:session.id,
      corpid:session.corpid,
      userid:session.created_by||session.operator_id||"",
      cat:"cash",
      tag:"Old",
      status:"ACTIVE",
      voided_at:"",
      created_at:session.created_at||session.exported_at||"",
      ts:session.exported_at||session.created_at||"",
      operator_id:session.operator_id||session.created_by||"",
      operator_name:session.operator_name||"",
      source:"employee_entry",
      source_detail:"employee_entry_export_text",
      ...row
    }));
  };
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    if(!line)continue;
    const sec=line.match(/^====\s+(.+?)\s+====$/);
    if(sec){section=sec[1].toUpperCase();transferBeds.length=0;continue;}
    if(/^(CASH|BANK|ARREARS|DEPOSIT|TRANSFER|EXPENSE)\s+DETAILS$/i.test(line)){
      section=line.toUpperCase();
      transferBeds.length=0;
      continue;
    }
    if(line.startsWith("[")){
      const paid=line.match(/^\[(\S+?)\]\s+paid\s+([\d,]+(?:\.\d+)?)\s+(cash|bank)\b(.*)$/i);
      if(paid){
        const amount=parseEmployeeExportAmount(paid[2]);
        const method=paid[3].toLowerCase()==="bank"?"B":"C";
        const rest=paid[4]||"";
        const short=rest.match(/\bshort\s+([\d,]+(?:\.\d+)?)/i);
        const shortAmount=short?parseEmployeeExportAmount(short[1]):0;
        const promise=(rest.match(/\b(?:due|promise)\s+(\S+)/i)||[])[1]||"";
        const note=(rest.match(/\bnote\s+(.+)$/i)||[])[1]||"";
        add({
          type:"R",
          reason_code:shortAmount>0?"SHORT_PAID":"R",
          room:cleanText(paid[1],40),
          amount,
          due:entryAnchorMoney(amount+shortAmount),
          paid:amount,
          period_due:entryAnchorMoney(amount+shortAmount),
          deficit:shortAmount,
          pay_type:method,
          arrear_promise_date:cleanText(promise,40),
          arrear_reason_detail:cleanText(note,500),
          note:cleanText(note||line,500)
        });
        continue;
      }
      const arrears=line.match(/^\[(\S+?)\]\s+arrears\s+paid\s+([\d,]+(?:\.\d+)?)\s+(cash|bank)\b(.*)$/i);
      if(arrears){
        const amount=parseEmployeeExportAmount(arrears[2]);
        add({
          type:"AP",
          reason_code:"AP",
          room:cleanText(arrears[1],40),
          amount,
          due:amount,
          paid:amount,
          period_due:amount,
          pay_type:arrears[3].toLowerCase()==="bank"?"B":"C",
          note:cleanText(arrears[4]||line,500)
        });
        continue;
      }
      const deposit=line.match(/^\[(\S+?)\]\s+deposit\s+([\d,]+(?:\.\d+)?)\s+(cash|bank)\b(.*)$/i);
      if(deposit){
        const amount=parseEmployeeExportAmount(deposit[2]);
        add({
          type:"D",
          reason_code:"D",
          room:cleanText(deposit[1],40),
          amount,
          due:amount,
          paid:amount,
          period_due:amount,
          pay_type:deposit[3].toLowerCase()==="bank"?"B":"C",
          note:cleanText(deposit[4]||line,500)
        });
        continue;
      }
      const expense=line.match(/^\[(\S+?)\]\s+expense\s+([\d,]+(?:\.\d+)?)\s+(cash|bank)\b(.*)$/i);
      if(expense){
        const amount=parseEmployeeExportAmount(expense[2]);
        add({
          type:"E",
          reason_code:"E",
          cat:"expense",
          room:cleanText(expense[1],40),
          amount,
          due:amount,
          paid:amount,
          period_due:amount,
          pay_type:expense[3].toLowerCase()==="bank"?"B":"C",
          note:cleanText(expense[4]||line,500)
        });
        continue;
      }
      const bedOnly=line.match(/^\[(\S+?)\]$/);
      if(bedOnly&&section==="TRANSFER DETAILS"){
        transferBeds.push(cleanText(bedOnly[1],40));
        continue;
      }
    }
    if(section==="TRANSFER DETAILS"&&transferBeds.length>=2&&/^transfer\s+/i.test(line)){
      const m=line.match(/^transfer\s+(waived|[\d,]+(?:\.\d+)?)\s*(cash|bank)?\b(.*)$/i);
      if(m){
        const waived=m[1].toLowerCase()==="waived";
        const amount=waived?0:parseEmployeeExportAmount(m[1]);
        add({
          type:"TF",
          reason_code:"TF",
          room:transferBeds[0],
          room_to:transferBeds[1],
          bed_from:transferBeds[0],
          bed_to:transferBeds[1],
          amount,
          due:amount,
          paid:amount,
          period_due:amount,
          pay_type:(m[2]||"cash").toLowerCase()==="bank"?"B":"C",
          note:cleanText(m[3]||line,500)
        });
        transferBeds.length=0;
        continue;
      }
    }
    if(!line.startsWith("#"))continue;
    if(section==="CASH RECEIVED"&&/\sTF\s/i.test(line)){
      const m=line.match(/^#(\S+)\s*(?:->|→)\s*#?(\S+).*?\sTF\s+FEE\s*([\d,]+(?:\.\d+)?)/i);
      if(m)add({
        type:"TF",
        reason_code:"TF",
        room:cleanText(m[1],40),
        room_to:cleanText(m[2],40),
        bed_from:cleanText(m[1],40),
        bed_to:cleanText(m[2],40),
        amount:parseEmployeeExportAmount(m[3]),
        due:parseEmployeeExportAmount(m[3]),
        paid:parseEmployeeExportAmount(m[3]),
        period_due:parseEmployeeExportAmount(m[3]),
        pay_type:/\sB(?:\s|$)/i.test(line)?"B":"C",
        note:cleanText(line,500)
      });
      continue;
    }
    if(section==="CASH RECEIVED"&&/\sR\s/i.test(line)){
      const m=line.match(/^#(\S+).*?\sR\s+\S+\s+paid\s+([\d,]+(?:\.\d+)?)\s+AED\s+expected\s+([\d,]+(?:\.\d+)?)/i);
      if(m){
        const amount=parseEmployeeExportAmount(m[2]);
        const due=parseEmployeeExportAmount(m[3]);
        add({
          type:"R",
          reason_code:/short\s+paid/i.test(line)?"SHORT_PAID":"R",
          room:cleanText(m[1],40),
          amount,
          due,
          paid:amount,
          period_due:due,
          deficit:Math.max(0,due-amount),
          pay_type:/\sB(?:\s|$)/i.test(line)?"B":"C",
          arrear_promise_date:employeeExportNote(line,"PROMISE"),
          arrear_reason_detail:employeeExportNote(line,"NOTE"),
          note:employeeExportNote(line,"NOTE")||cleanText(line,500)
        });
      }
      continue;
    }
    if(section==="ARREAR REPAID"&&/\sAP\s/i.test(line)){
      const m=line.match(/^#(\S+).*?\sAP\s+([\d,]+(?:\.\d+)?)\s+AED\b.*?(?:TASK\s+(\S+))?/i);
      if(m){
        const amount=parseEmployeeExportAmount(m[2]);
        add({
          type:"AP",
          reason_code:"AP",
          room:cleanText(m[1],40),
          amount,
          due:amount,
          paid:amount,
          period_due:amount,
          pay_type:/\sB(?:\s|$)/i.test(line)?"B":"C",
          linked_task_id:cleanText(m[3]||"",80),
          note:cleanText(line,500)
        });
      }
    }
  }
  return rows;
}
__name(parseEmployeeEntryExportRows,"parseEmployeeEntryExportRows");
function ownerEmployeeDetailRowsTotals(rows=[]){
  const totals={cash:0,bank:0,expense:0,refund:0,gross:0};
  for(const row of rows||[]){
    const type=entryAnchorType(row);
    const event=String(row?.event_type||"").trim().toLowerCase();
    const cat=String(row?.cat||"").trim().toLowerCase();
    const method=entryAnchorPaymentMethod(row?.payment_method||row?.pay_type||cat);
    const amount=entryAnchorMoney(row?.amount??row?.paid_amount??row?.payment_amount??row?.deposit_amount??row?.refund_amount??row?.actual_refund_amount??row?.expense_amount??row?.fee_amount??0);
    if(type==="E"||event==="expense"||cat==="expense"){
      totals.expense=entryAnchorMoney(totals.expense+amount);
      continue;
    }
    if(type==="DR"||event==="deposit_out"||cat==="refund"){
      totals.refund=entryAnchorMoney(totals.refund+amount);
      continue;
    }
    if(method==="bank"||cat==="bank")totals.bank=entryAnchorMoney(totals.bank+amount);
    else totals.cash=entryAnchorMoney(totals.cash+amount);
  }
  totals.gross=entryAnchorMoney(totals.cash+totals.bank);
  return totals;
}
__name(ownerEmployeeDetailRowsTotals,"ownerEmployeeDetailRowsTotals");
function ownerEmployeeDetailRowsReconcileSession(session,rows=[]){
  const count=Array.isArray(rows)?rows.length:0;
  const expectedCount=Number(session?.entries_count||session?.entriesCount||0)||0;
  const summaryCash=entryAnchorMoney(session?.cash_handover||0);
  const summaryBank=entryAnchorMoney(session?.bank_transfer_total||0);
  const summaryGross=entryAnchorMoney(session?.gross_received||0);
  const totals=ownerEmployeeDetailRowsTotals(rows);
  const moneyOk=(expected,actual)=>!expected||Math.abs(entryAnchorMoney(expected)-entryAnchorMoney(actual))<0.01;
  const countOk=!expectedCount||count===expectedCount;
  const cashOk=moneyOk(summaryCash,totals.cash);
  const bankOk=moneyOk(summaryBank,totals.bank);
  const grossOk=moneyOk(summaryGross,totals.gross);
  return {ok:countOk&&cashOk&&bankOk&&grossOk,count,expectedCount,totals,summary:{cash:summaryCash,bank:summaryBank,gross:summaryGross},countOk,cashOk,bankOk,grossOk};
}
__name(ownerEmployeeDetailRowsReconcileSession,"ownerEmployeeDetailRowsReconcileSession");
function chooseOwnerEmployeeSessionDetailRows(session,transactionRows=[],anchorRows=[],exportRows=[]){
  const candidates=[
    {source:"structured",rows:Array.isArray(anchorRows)?anchorRows:[]},
    {source:"transactions",rows:Array.isArray(transactionRows)?transactionRows:[]},
    {source:"export_text",rows:Array.isArray(exportRows)?exportRows:[]}
  ].filter(candidate=>candidate.rows.length);
  for(const candidate of candidates){
    const reconciliation=ownerEmployeeDetailRowsReconcileSession(session,candidate.rows);
    if(reconciliation.ok)return {...candidate,reconciliation};
  }
  if(!candidates.length)return {source:"none",rows:[],reconciliation:ownerEmployeeDetailRowsReconcileSession(session,[])};
  return candidates
    .map(candidate=>({...candidate,reconciliation:ownerEmployeeDetailRowsReconcileSession(session,candidate.rows)}))
    .sort((a,b)=>{
      const countDelta=(b.reconciliation.count||0)-(a.reconciliation.count||0);
      if(countDelta)return countDelta;
      const sourceRank={structured:0,transactions:1,export_text:2};
      return (sourceRank[a.source]??9)-(sourceRank[b.source]??9);
    })[0];
}
__name(chooseOwnerEmployeeSessionDetailRows,"chooseOwnerEmployeeSessionDetailRows");
function canonicalOwnerHistoryArchiveState(session={},correctionFields=null){
  const status=String(session?.handover_status||session?.status||"").trim().toUpperCase();
  const anchor=String(session?.anchor_id||"").trim().toUpperCase();
  const source=String(session?.source||"").trim().toLowerCase();
  if(!session||(!session?.id&&!session?.anchor_id&&!status&&!anchor))return "missing";
  if(status==="REVERSED"||status==="REVERSAL"||source.includes("reversal")||anchor.startsWith("REV-"))return "reversed";
  if(status==="DELETED"||status==="CANCELLED")return "deleted";
  if(String(session?.voided_at||"").trim()||["VOID","VOIDED"].includes(status))return "voided";
  if(correctionFields?.correction_summary?.correction_applied)return "corrected";
  if(anchor.startsWith("CORR-")||source.includes("correction"))return "correction_anchor";
  return "active";
}
__name(canonicalOwnerHistoryArchiveState,"canonicalOwnerHistoryArchiveState");
function canonicalOwnerHistoryZeroTotals(){
  return ownerHistoryDetailNormalizeTotals({});
}
__name(canonicalOwnerHistoryZeroTotals,"canonicalOwnerHistoryZeroTotals");
function canonicalOwnerHistoryActiveForTotals(archiveState){
  return archiveState==="active"||archiveState==="corrected";
}
__name(canonicalOwnerHistoryActiveForTotals,"canonicalOwnerHistoryActiveForTotals");
function canonicalOwnerHistoryEffectiveTotalsForState(archiveState,correctedTotals={}){
  return canonicalOwnerHistoryActiveForTotals(archiveState)?ownerHistoryDetailNormalizeTotals(correctedTotals):canonicalOwnerHistoryZeroTotals();
}
__name(canonicalOwnerHistoryEffectiveTotalsForState,"canonicalOwnerHistoryEffectiveTotalsForState");
function canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics(session={},summary={}){
  const rawTotals=ownerHistoryDetailNormalizeTotals(summary.raw_totals||{});
  const correctionTotals=summary.correction_totals||ownerHistoryDetailZeroCorrectionTotals();
  const correctedTotals=ownerHistoryDetailNormalizeTotals(summary.corrected_totals||summary.adjusted_totals||rawTotals);
  const archiveState=canonicalOwnerHistoryArchiveState(session,{correction_summary:summary});
  const archiveEffectiveTotals=canonicalOwnerHistoryEffectiveTotalsForState(archiveState,correctedTotals);
  return {
    ...summary,
    raw_totals:rawTotals,
    correction_totals:correctionTotals,
    corrected_totals:correctedTotals,
    adjusted_totals:correctedTotals,
    archive_effective_totals:archiveEffectiveTotals,
    archive_state:archiveState,
    active_for_totals:canonicalOwnerHistoryActiveForTotals(archiveState),
    correction_history_visible:Boolean((summary.correction_events_count||0)>0||(summary.correction_sessions_count||0)>0)
  };
}
__name(canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics,"canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics");
function canonicalOwnerHistorySourceProof(session={},detailSource=""){
  return {
    gateway:"canonical_owner_history_archive_gateway",
    source_layer:"L1 Canonical Event Archive",
    canonical_sources:["sessions","entries_json","correction_anchors","void_reversal_anchors","canonical_archive_projections"],
    preferred_entry_source:"entries_json",
    detail_source:detailSource||"",
    fallback_parser_role:"display_only_legacy_compatibility",
    forbidden_truth_sources:["employee_local_cache","whatsapp_export_text","preview_text","owner_display_text_as_write_source","tenant_card_id","card_id","old_ttlock_ref","provider_phone","phone_99099"],
    session_id:cleanText(session?.id||"",160),
    anchor_id:cleanText(session?.anchor_id||"",180)
  };
}
__name(canonicalOwnerHistorySourceProof,"canonicalOwnerHistorySourceProof");
function canonicalOwnerHistorySessionRow(session={},correctionFields=null){
  const archiveState=canonicalOwnerHistoryArchiveState(session,correctionFields);
  const active=canonicalOwnerHistoryActiveForTotals(archiveState);
  const summary=correctionFields?.correction_summary||null;
  return {
    ...session,
    archive_state:archiveState,
    canonical_archive_gateway:"canonical_owner_history_archive_gateway",
    active_archive_record:active,
    active_for_totals:active,
    totals_mode:summary?.correction_applied?"archive_effective_correction_aware":"archive_effective_raw",
    raw_totals:summary?.raw_totals||null,
    correction_totals:summary?.correction_totals||null,
    corrected_totals:summary?.corrected_totals||summary?.adjusted_totals||null,
    adjusted_totals:summary?.adjusted_totals||summary?.corrected_totals||null,
    archive_effective_totals:summary?.archive_effective_totals||canonicalOwnerHistoryEffectiveTotalsForState(archiveState,summary?.corrected_totals||summary?.adjusted_totals||summary?.raw_totals||{}),
    source_proof:canonicalOwnerHistorySourceProof(session)
  };
}
__name(canonicalOwnerHistorySessionRow,"canonicalOwnerHistorySessionRow");
function canonicalOwnerHistoryDetailGatewayFields(session={},rows=[],correctionFields=null,detailSource=""){
  const archiveState=canonicalOwnerHistoryArchiveState(session,correctionFields);
  const anchors=extractEmployeeEntryAnchorsFromSession(session);
  return {
    archive_gateway:{
      ok:true,
      gateway:"canonical_owner_history_archive_gateway",
      archive_state:archiveState,
      session_id:cleanText(session?.id||"",160),
      anchor_id:cleanText(session?.anchor_id||"",180),
      detail_source:detailSource,
      entries_json_preferred:anchors.length>0,
      entries_json_anchor_count:anchors.length,
      fallback_parser_display_only:detailSource==="export_text",
      owner_history_write_source:false,
      provider_identity_used:false,
      active_for_totals:canonicalOwnerHistoryActiveForTotals(archiveState),
      raw_totals:correctionFields?.correction_summary?.raw_totals||null,
      correction_totals:correctionFields?.correction_summary?.correction_totals||null,
      corrected_totals:correctionFields?.correction_summary?.corrected_totals||correctionFields?.correction_summary?.adjusted_totals||null,
      archive_effective_totals:correctionFields?.correction_summary?.archive_effective_totals||canonicalOwnerHistoryEffectiveTotalsForState(archiveState,correctionFields?.correction_summary?.corrected_totals||correctionFields?.correction_summary?.adjusted_totals||correctionFields?.correction_summary?.raw_totals||{}),
      source_proof:canonicalOwnerHistorySourceProof(session,detailSource),
      warnings:detailSource==="export_text"?["LEGACY_DISPLAY_TEXT_FALLBACK_USED_FOR_DISPLAY_ONLY"]:[]
    }
  };
}
__name(canonicalOwnerHistoryDetailGatewayFields,"canonicalOwnerHistoryDetailGatewayFields");
function empCloseStatusIsOpen(status){
  const raw=cleanText(status,40);
  const upper=raw.toUpperCase();
  if(["PAID","CLOSED","CLEARED","VOID","WAIVED","WRITTEN_OFF"].includes(upper))return false;
  if(["\u5df2\u7ed3\u6e05","\u7ed3\u6e05","\u4f5c\u5e9f"].includes(raw))return false;
  return true;
}
__name(empCloseStatusIsOpen,"empCloseStatusIsOpen");
function empTaskRemaining(task){
  return cleanMoney(Math.max(0,Number(task?.arrear_amount||0)-Number(task?.actual_received||0)));
}
__name(empTaskRemaining,"empTaskRemaining");
function empLegacyArrearToTask(a){
  const id=cleanId(a?.id)||empId("legacy-arrear");
  return {
    task_id:id,source:"arrears",corpid:a?.corpid||"",userid:a?.userid||"",entry_id:cleanText(a?.entry_id||"",80),
    bed:cleanText(a?.room||"",160),tenant_name:cleanText(a?.tenant_name||"",120),
    arrear_amount:cleanMoney(a?.remain||0),arrear_reason:cleanText(a?.note||"\u6b20\u6b3e",500),
    created_at:cleanText(a?.created_at||"",40),followup_status:"\u5f85\u8ddf\u8fdb",promise_date:cleanDate(a?.due_date||""),
    promise_amount:cleanMoney(a?.remain||0),actual_received:0,close_status:a?.cleared?"CLEARED":"",
    close_reason:"",owner_note:"",staff_note:"",last_followup_at:"",updated_by:"",updated_at:"",
    tenant_card_id:"",original_entry_id:cleanText(a?.entry_id||"",80),original_period_start:"",original_period_end:cleanDate(a?.due_date||""),
    boss_requested_at:"",boss_requested_by:"",boss_requested_due_date:"",directive_status:"none",staff_promised_at:""
  };
}
__name(empLegacyArrearToTask,"empLegacyArrearToTask");
function empTaskToBossArrear(t){
  const reason=cleanText(t?.arrear_reason||"",500);
  const remain=empTaskRemaining(t);
  const dueDate=cleanDate(t?.promise_date||t?.original_period_end||String(t?.created_at||"").slice(0,10));
  const type=/deposit|\u62bc\u91d1/i.test(reason)?"deposit":"rent";
  const directiveStatus=empDirectiveStatus(t);
  const isOverdue=empDirectiveIsOverdue(t);
  const rawSourceType=cleanText(t?.source_type||t?.source||"",80);
  return {
    id:cleanId(t?.task_id)||empId("arrear-view"),
    task_id:cleanText(t?.task_id||"",100),
    source:cleanText(t?.source||"arrear_tasks",40),
    source_type:/ttlock/i.test(String(t?.source_type||t?.source||""))?"ttlock_expired_unpaid":(rawSourceType||"existing_arrears_record"),
    source_ref:cleanText(t?.source_ref||t?.task_id||"",120),
    dedupe_key:cleanText(t?.source_ref||t?.task_id||"",120)||[
      cleanText(t?.source||"arrear_tasks",40),
      cleanText(t?.bed||"",160),
      dueDate,
      remain.toFixed(2)
    ].join("|"),
    room_bed:cleanText(t?.bed||"",160),
    customer_code:cleanText(t?.tenant_card_id||t?.tenant_name||"",120),
    card_code:cleanText(t?.tenant_card_id||"",80),
    package_code:type,
    amount_authority_status:"known",
    accounting_status:"open",
    amount_fils:Math.round(Math.max(0,remain)*100),
    overdue_days:dueDate?Math.max(0,empDaysBetween(dueDate,empTodayDubai())):0,
    room:cleanText(t?.bed||"",160),
    note:reason||"\u6b20\u6b3e",
    remain,
    due_date:dueDate,
    type,
    session_id:"",
    entry_id:cleanText(t?.entry_id||t?.original_entry_id||"",80),
    cleared:false,
    tenant_name:cleanText(t?.tenant_name||"",120),
    tenant_card_id:cleanText(t?.tenant_card_id||"",80),
    followup_status:cleanText(t?.followup_status||"",40),
    promise_date:cleanDate(t?.promise_date||""),
    promise_amount:cleanMoney(t?.promise_amount||0),
    promised_amount_fils:Math.round(cleanMoney(t?.promise_amount||0)*100),
    promised_payment_date:cleanDate(t?.promise_date||""),
    followup_note:cleanText(t?.staff_note||"",500),
    actual_received:cleanMoney(t?.actual_received||0),
    owner_note:cleanText(t?.owner_note||"",500),
    staff_note:cleanText(t?.staff_note||"",500),
    userid:cleanText(t?.userid||"",80),
    assigned_employee_id:cleanText(t?.userid||"",80),
    assigned_employee_name:cleanText(t?.userid||"",80),
    boss_requested_at:cleanText(t?.boss_requested_at||"",40),
    boss_requested_by:cleanText(t?.boss_requested_by||"",80),
    boss_requested_due_date:empCleanIsoDate(t?.boss_requested_due_date||""),
    directive_status:directiveStatus,
    staff_promised_at:cleanText(t?.staff_promised_at||"",40),
    is_overdue:isOverdue,
    effective_directive_status:isOverdue?"overdue":directiveStatus,
    created_at:cleanText(t?.created_at||"",40),
    updated_at:cleanText(t?.updated_at||"",40)
  };
}
__name(empTaskToBossArrear,"empTaskToBossArrear");
async function empCachedTtlockTaskRows(env,user,limit=500){
  if(!env?.DB||!await empTableExists(env,"arrear_tasks"))return [];
  const rows=await env.DB.prepare(
    `SELECT * FROM arrear_tasks
      WHERE corpid=?
        AND lower(COALESCE(source_type,source,'')) LIKE '%ttlock%'
        AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WRITTEN_OFF','WAIVED','closed','paid','cleared')
      ORDER BY COALESCE(updated_at,created_at) DESC
      LIMIT ?`
  ).bind(user.corpid,Math.min(Math.max(Number(limit||500),1),500)).all();
  return (rows.results||[]).filter(t=>empCloseStatusIsOpen(t.close_status)&&empTaskRemaining(t)>0);
}
__name(empCachedTtlockTaskRows,"empCachedTtlockTaskRows");
function empCachedTtlockRoomsDataFromTasks(rows){
  const roomsData={};
  for(const task of rows||[]){
    const bed=cleanText(task?.bed||task?.room_bed||"",80);
    if(!bed)continue;
    const due=cleanDate(task?.promise_date||task?.original_period_end||String(task?.created_at||"").slice(0,10));
    const endMs=due?Date.parse(`${due}T23:59:59Z`):0;
    const cardName=cleanText(task?.tenant_name||task?.tenant_card_id||task?.source_ref||`TTLock ${bed}`,120);
    const cardId=cleanText(task?.tenant_card_id||task?.source_ref||task?.task_id||bed,120);
    if(!roomsData[bed])roomsData[bed]=[];
    roomsData[bed].push({
      room:bed,
      cardName,
      identityCardName:cardName,
      tenant_card_id:cardId,
      cardId,
      cardNumber:cardId,
      remark:cardName,
      endDate:Number.isFinite(endMs)?endMs:0,
      startDate:0,
      source:"cached_materialized_ttlock",
      source_type:"ttlock_expired_unpaid",
      task_id:cleanText(task?.task_id||"",100)
    });
  }
  return roomsData;
}
__name(empCachedTtlockRoomsDataFromTasks,"empCachedTtlockRoomsDataFromTasks");
async function empLoadLockCardsWithCacheFallback(env,user,opts={}){
  const strict=opts.strict_access_snapshot===true;
  try{
    const live=await empWithTimeout(loadLockCards(env),opts.timeoutMs||8000,"ttlock_api");
    if(!live?.error)return {...live,data_source:"live_api",fallback:false,strict_access_snapshot:strict};
    if(strict)return {...live,data_source:"live_api",fallback:false,strict_access_snapshot:true,fallback_rejected:true,candidate_count:0,ambiguous:false,conflict:false};
    const cached=await empCachedTtlockTaskRows(env,user,opts.limit||500);
    if(cached.length)return {
      roomsData:empCachedTtlockRoomsDataFromTasks(cached),
      locksCount:cached.length,
      loadedAt:empNow(),
      data_source:"materialized_cache",
      fallback:true,
      fallback_reason:live.error,
      source_status:empSourceStatus(true,"",{data_source:"materialized_cache",fallback_reason:live.error,count:cached.length})
    };
    return live;
  }catch(e){
    if(strict)return {error:empTtlockReadErrorCode(e),status:503,roomsData:{},locksCount:0,data_source:"live_api",fallback:false,strict_access_snapshot:true,fallback_rejected:true,candidate_count:0,ambiguous:false,conflict:false};
    const cached=await empCachedTtlockTaskRows(env,user,opts.limit||500).catch(()=>[]);
    if(cached.length)return {
      roomsData:empCachedTtlockRoomsDataFromTasks(cached),
      locksCount:cached.length,
      loadedAt:empNow(),
      data_source:"materialized_cache",
      fallback:true,
      fallback_reason:empTtlockReadErrorCode(e),
      source_status:empSourceStatus(true,"",{data_source:"materialized_cache",fallback_reason:empTtlockReadErrorCode(e),count:cached.length})
    };
    return {error:empTtlockReadErrorCode(e),status:503,roomsData:{},locksCount:0};
  }
}
__name(empLoadLockCardsWithCacheFallback,"empLoadLockCardsWithCacheFallback");
function bossArrearsListLimit(request){
  try{
    const raw=Number(new URL(request.url).searchParams.get("limit")||20);
    if(!Number.isFinite(raw))return 20;
    return Math.min(Math.max(Math.floor(raw),1),100);
  }catch{
    return 20;
  }
}
__name(bossArrearsListLimit,"bossArrearsListLimit");
function bossArrearsListParams(request){
  try{
    const url=new URL(request.url);
    const rawLimit=Number(url.searchParams.get("limit")||20);
    const rawOffset=Number(url.searchParams.get("offset")||0);
    const rawPreview=Number(url.searchParams.get("preview_limit")||5);
    const limit=Number.isFinite(rawLimit)?Math.min(Math.max(Math.floor(rawLimit),1),100):20;
    const offset=Number.isFinite(rawOffset)?Math.min(Math.max(Math.floor(rawOffset),0),10000):0;
    const previewLimit=Number.isFinite(rawPreview)?Math.min(Math.max(Math.floor(rawPreview),1),20):5;
    return {limit,offset,previewLimit};
  }catch{
    return {limit:20,offset:0,previewLimit:5};
  }
}
__name(bossArrearsListParams,"bossArrearsListParams");
function empSourceStatus(ok,error="",extra={}){
  return {ok:!!ok,error:cleanText(error||"",120),...extra};
}
__name(empSourceStatus,"empSourceStatus");
function empSourceContract(status={},count=0){
  const ok=status?.ok!==false;
  const errorCode=cleanText(status?.error_code||status?.error||"",120);
  return {
    count:Number(count||0),
    status:ok?"ok":"error",
    error_code:ok?"":(errorCode||"SOURCE_UNAVAILABLE")
  };
}
__name(empSourceContract,"empSourceContract");
function empBossArrearDedupeKey(row){
  const sourceType=cleanText(row?.source_type||row?.sourceType||"",80);
  const sourceRef=cleanText(row?.source_ref||row?.sourceRef||"",160);
  if(sourceRef)return `${sourceType}|${sourceRef}`;
  return [
    sourceType,
    cleanText(row?.task_id||row?.id||"",160),
    cleanText(row?.room_bed||row?.bed||row?.room||"",160),
    cleanText(row?.due_date||"",40),
    Math.max(0,Math.round(cleanMoney(row?.remain||0)*100))
  ].join("|");
}
__name(empBossArrearDedupeKey,"empBossArrearDedupeKey");
function empNormalizeMaterializedSourceType(value){
  const raw=cleanText(value||"",80);
  if(raw==="ttlock_expired_unpaid"||/ttlock/i.test(raw))return "ttlock_expired_unpaid";
  return "existing_arrears_record";
}
__name(empNormalizeMaterializedSourceType,"empNormalizeMaterializedSourceType");
function empMaterializationSourceRef(sotTask){
  const sourceType=empNormalizeMaterializedSourceType(sotTask?.source_type||sotTask?.source||"");
  const explicit=cleanText(sotTask?.source_ref||sotTask?.sourceRef||"",160);
  if(sourceType==="existing_arrears_record")return explicit||cleanText(sotTask?.task_id||sotTask?.id||"",160);
  if(explicit)return explicit;
  const room=cleanText(sotTask?.room_bed||sotTask?.bed||sotTask?.room||"",80);
  const due=empCleanIsoDate(sotTask?.due_date||"");
  const amount=String(Math.max(0,Math.round(Number(sotTask?.amount_fils||cleanMoney(sotTask?.remain||0)*100)||0)));
  const card=cleanText(sotTask?.card_code||sotTask?.customer_code||sotTask?.tenant_card_id||"",80);
  if(!room||!due||!amount||!card)return "";
  return `ttlock:${room}:${due}:${amount}:${card}`;
}
__name(empMaterializationSourceRef,"empMaterializationSourceRef");
async function empMaterializableTaskContract(sotTask,user){
  const sourceType=empNormalizeMaterializedSourceType(sotTask?.source_type||sotTask?.source||"");
  const sourceRef=empMaterializationSourceRef(sotTask);
  if(!sourceRef)return {ok:false,reason:"BLOCKED_TASK_ID_UNSTABLE",source_type:sourceType};
  const roomBed=cleanText(sotTask?.room_bed||sotTask?.bed||sotTask?.room||"",160);
  const dueDate=empCleanIsoDate(sotTask?.due_date||"");
  const amountFils=Math.max(0,Math.round(Number(sotTask?.amount_fils||cleanMoney(sotTask?.remain||0)*100)||0));
  if(!roomBed||!dueDate||amountFils<=0)return {ok:false,reason:"BLOCKED_MISSING_REQUIRED_FIELDS",source_type:sourceType,source_ref:sourceRef};
  const rawTaskId=cleanId(sotTask?.task_id||sotTask?.id||"",120);
  const stableTaskId=rawTaskId||cleanId(`${sourceType}-${sourceRef}`,120);
  if(!stableTaskId)return {ok:false,reason:"BLOCKED_TASK_ID_UNSTABLE",source_type:sourceType,source_ref:sourceRef};
  const fingerprint=await hscSha256(JSON.stringify(hscStableValue({
    source_type:sourceType,
    source_ref:sourceRef,
    room_bed:roomBed,
    due_date:dueDate,
    amount_fils:amountFils,
    corpid:user.corpid
  })));
  return {
    ok:true,
    stable_task_id:stableTaskId,
    source_type:sourceType,
    source_ref:sourceRef,
    source_fingerprint:fingerprint,
    room_bed:roomBed,
    customer_code:cleanText(sotTask?.customer_code||sotTask?.tenant_card_id||sotTask?.tenant_name||"",120),
    amount_fils:amountFils,
    due_date:dueDate,
    overdue_days:Number(sotTask?.overdue_days||0),
    status:cleanText(sotTask?.followup_status||"pending_followup",80),
    corpid:user.corpid,
    idempotency_scope:`${user.corpid}:${sourceType}:${sourceRef}`
  };
}
__name(empMaterializableTaskContract,"empMaterializableTaskContract");
async function empResolveBossSotTaskMap(env,user,ids){
  const wanted=new Set(ids.map(x=>cleanText(x,160)).filter(Boolean));
  const detailed=await resolveConsoleReceivablesSot(env,user,{limit:500,ttlockTimeoutMs:12000});
  const map=new Map();
  for(const task of detailed.all_rows||[]){
    const keys=[task?.task_id,task?.id,task?.source_ref].map(x=>cleanText(x,160)).filter(Boolean);
    for(const key of keys){
      if(wanted.has(key)&&!map.has(key))map.set(key,task);
    }
  }
  return {map,detailed};
}
__name(empResolveBossSotTaskMap,"empResolveBossSotTaskMap");
async function materializeArrearsTaskFromSot(env,user,sotTask,options={}){
  const existingById=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1")
    .bind(cleanId(sotTask?.task_id||sotTask?.id||"",120),user.corpid).first().catch(()=>null);
  if(existingById)return {ok:true,row:existingById,materialized:false,reused:true,contract:null};
  const contract=await empMaterializableTaskContract(sotTask,user);
  if(!contract.ok)return {ok:false,reason:contract.reason,contract};
  const existingBySource=await env.DB.prepare(
    "SELECT * FROM arrear_tasks WHERE corpid=? AND source_type=? AND source_ref=? LIMIT 1"
  ).bind(user.corpid,contract.source_type,contract.source_ref).first().catch(()=>null);
  if(existingBySource)return {ok:true,row:existingBySource,materialized:false,reused:true,contract};
  const now=options.now||empNow();
  const row={
    task_id:contract.stable_task_id,
    corpid:user.corpid,
    userid:cleanText(options.assigned_employee_id||sotTask?.assigned_employee_id||sotTask?.userid||"",80),
    entry_id:cleanText(sotTask?.entry_id||"",80),
    bed:contract.room_bed,
    tenant_name:contract.customer_code,
    tenant_card_id:contract.customer_code,
    arrear_amount:cleanMoney(contract.amount_fils/100),
    arrear_reason:contract.source_type==="ttlock_expired_unpaid"?"TTLock expired unpaid; amount from bed rent mapping":"existing arrears record",
    created_at:now,
    followup_status:"pending_followup",
    promise_date:contract.due_date,
    promise_amount:0,
    actual_received:0,
    close_status:"",
    close_reason:"",
    owner_note:"",
    staff_note:"",
    last_followup_at:"",
    updated_by:cleanText(options.actor||user.userid||"",80),
    updated_at:now,
    created_by:cleanText(options.actor||user.userid||"",80),
    original_entry_id:cleanText(sotTask?.entry_id||"",80),
    original_period_start:"",
    original_period_end:contract.due_date,
    boss_requested_at:"",
    boss_requested_by:"",
    boss_requested_due_date:"",
    directive_status:"none",
    staff_promised_at:"",
    source_type:contract.source_type,
    source_ref:contract.source_ref,
    source_fingerprint:contract.source_fingerprint,
    materialized_from:"boss_arrears_followup_sot"
  };
  await empInsertDynamicMode(env,"arrear_tasks",row,EMP_TASK_COLUMNS,"INSERT_OR_IGNORE");
  const inserted=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? AND source_type=? AND source_ref=? LIMIT 1")
    .bind(user.corpid,contract.source_type,contract.source_ref).first();
  if(!inserted)return {ok:false,reason:"MATERIALIZATION_INSERT_FAILED",contract};
  await empEvent(env,user,{ref_id:inserted.task_id,ref_type:"arrear_task",event_type:"materialized",field_name:"source_ref",old_value:"",new_value:contract.source_ref,operator_id:options.actor||user.userid,ts:now});
  return {ok:true,row:inserted,materialized:true,reused:false,contract};
}
__name(materializeArrearsTaskFromSot,"materializeArrearsTaskFromSot");
function empReadErrorCode(error){
  const msg=String(error?.message||error||"").toLowerCase();
  if(msg.includes("no such table"))return "TABLE_MISSING";
  if(msg.includes("no such column"))return "CONTRACT_MISMATCH";
  if(msg.includes("permission")||msg.includes("forbidden"))return "AUTH_DENIED";
  if(msg.includes("ttlock_not_configured"))return "TTLOCK_SECRET_MISSING";
  if(msg.includes("ttlock_token")||msg.includes("token"))return "TTLOCK_TOKEN_EXPIRED";
  if(msg.includes("timeout")||msg.includes("timed out"))return "TTLOCK_API_TIMEOUT";
  if(msg.includes("upstream_invalid_json"))return "TTLOCK_PARSE_ERROR";
  if(msg.includes("401")||msg.includes("403")||msg.includes("auth"))return "TTLOCK_AUTH_FAILED";
  return "READ_FAILED";
}
__name(empReadErrorCode,"empReadErrorCode");
function empWithTimeout(promise,timeoutMs,label){
  const guarded=Promise.resolve(promise);
  guarded.catch(()=>{});
  return Promise.race([
    guarded,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label||"operation"}_timeout`)),Math.max(1,Number(timeoutMs)||1)))
  ]);
}
__name(empWithTimeout,"empWithTimeout");
function empTtlockReadErrorCode(resultOrError){
  const raw=String(resultOrError?.error||resultOrError?.message||resultOrError||"").toLowerCase();
  const status=Number(resultOrError?.status||0);
  if(raw.includes("not_configured"))return "TTLOCK_SECRET_MISSING";
  if(status===401||raw.includes("401"))return "TTLOCK_AUTH_FAILED";
  if(status===403||raw.includes("403"))return "TTLOCK_AUTH_FAILED";
  if(raw.includes("token"))return "TTLOCK_TOKEN_EXPIRED";
  if(raw.includes("timeout")||raw.includes("timed out"))return "TTLOCK_API_TIMEOUT";
  if(raw.includes("invalid_json")||raw.includes("parse"))return "TTLOCK_PARSE_ERROR";
  if(raw.includes("empty"))return "TTLOCK_EMPTY_RESPONSE";
  if(raw.includes("bed_mapping"))return "TTLOCK_BED_MAPPING_FAILED";
  if(raw.includes("rent_mapping"))return "TTLOCK_RENT_MAPPING_FAILED";
  return "TTLOCK_API_NOT_IMPLEMENTED";
}
__name(empTtlockReadErrorCode,"empTtlockReadErrorCode");
function empTtlockBedNumber(value){
  const match=String(value||"").trim().match(/^(\d+)/);
  return match?match[1]:"";
}
__name(empTtlockBedNumber,"empTtlockBedNumber");
function empTtlockIsVacant(value){
  const raw=String(value||"").trim();
  return !!raw&&(/(?:^|\s)e(?:\s|$)/i.test(raw)||/^\d+\s+empty$/i.test(raw)||/^empty$/i.test(raw));
}
__name(empTtlockIsVacant,"empTtlockIsVacant");
function empTtlockIsStaff(value){
  return /abdul|abdu|bilal|bilali|bilaili|\u963f\u5e03|\u963f\u535c|\u6bd4\u62c9/i.test(String(value||""));
}
__name(empTtlockIsStaff,"empTtlockIsStaff");
function empRentLookupKeys(lockRoom,bed,cardName){
  const room=cleanText(lockRoom||"",160);
  const bedKey=cleanText(bed||"",80);
  const card=cleanText(cardName||"",160);
  const keys=[
    bedKey,
    room,
    room&&bedKey?`${room}-${bedKey}`:"",
    room&&bedKey?`${room}/${bedKey}`:"",
    room&&bedKey?`${room} / ${bedKey}`:"",
    card
  ];
  return [...new Set(keys.map(k=>String(k||"").trim()).filter(Boolean))];
}
__name(empRentLookupKeys,"empRentLookupKeys");
function empRentForTtlockCard(rentConfig,lockRoom,bed,cardName){
  for(const key of empRentLookupKeys(lockRoom,bed,cardName)){
    const amount=Number(rentConfig?.[key]);
    if(Number.isFinite(amount)&&amount>0)return {amount:Math.round(amount*100)/100,key};
  }
  return {amount:0,key:""};
}
__name(empRentForTtlockCard,"empRentForTtlockCard");
function sotDateMs(value){
  const d=new Date(value);
  return Number.isNaN(d.getTime())?0:new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
}
__name(sotDateMs,"sotDateMs");
function sotNormalizeBed(value){
  const raw=cleanText(value||"",80).replace(/^#+/,"").trim();
  const m=raw.match(/^(\d+)/);
  return m?m[1]:raw;
}
__name(sotNormalizeBed,"sotNormalizeBed");
function sotCardName(card){
  return cleanText(card?.cardName||card?.identityCardName||card?.cardAlias||card?.name||"",160);
}
__name(sotCardName,"sotCardName");
function sotCardEndMs(card){
  const end=Number(card?.endDate||card?.end||0);
  return Number.isFinite(end)&&end>0?end:0;
}
__name(sotCardEndMs,"sotCardEndMs");
function sotCurrentOccupiedCards(roomsData){
  const map=new Map();
  for(const [lockRoom,cards] of Object.entries(roomsData||{})){
    for(const card of cards||[]){
      const cardName=sotCardName(card);
      if(empTtlockIsVacant(cardName)||empTtlockIsStaff(cardName))continue;
      const bed=empTtlockBedNumber(cardName)||sotNormalizeBed(card?.bed||card?.room||lockRoom);
      if(!bed)continue;
      const end=sotCardEndMs(card);
      const old=map.get(bed);
      if(!old||end>(old.end||0)){
        map.set(bed,{bed,lockRoom:cleanText(lockRoom||"",120),cardName,end,endDate:end?new Date(end):null,card});
      }
    }
  }
  return [...map.values()];
}
__name(sotCurrentOccupiedCards,"sotCurrentOccupiedCards");
function sotCardCycleAnchor(cardName){
  const matches=[...String(cardName||"").matchAll(/(?:^|\D)(\d{4})(?=\D*$)/g)];
  if(!matches.length)return null;
  const token=matches[matches.length-1][1];
  const month=Number(token.slice(0,2));
  const day=Number(token.slice(2));
  if(month<1||month>12||day<1||day>31)return null;
  return {month,day,token};
}
__name(sotCardCycleAnchor,"sotCardCycleAnchor");
function sotLastDayOfMonth(y,m){return new Date(y,m+1,0).getDate();}
__name(sotLastDayOfMonth,"sotLastDayOfMonth");
function sotCycleDate(y,m,day){return new Date(y,m,Math.min(day,sotLastDayOfMonth(y,m))).getTime();}
__name(sotCycleDate,"sotCycleDate");
function sotAddCycleMonths(ts,delta,day){
  const d=new Date(ts);
  return sotCycleDate(d.getFullYear(),d.getMonth()+delta,day||d.getDate());
}
__name(sotAddCycleMonths,"sotAddCycleMonths");
function sotRentMonthsPaid(rentPaid,monthly){
  if(!monthly||!rentPaid)return 0;
  const raw=rentPaid/monthly;
  const rounded=Math.max(1,Math.round(raw));
  const tolerance=Math.max(60,monthly*0.12);
  return Math.abs(rentPaid-monthly*rounded)<=tolerance?rounded:raw;
}
__name(sotRentMonthsPaid,"sotRentMonthsPaid");
function sotLedgerRentPaid(row){
  const amount=cleanMoney(row?.paid??row?.amount??0);
  const deposit=cleanMoney(row?.deposit_amt||row?.deposit_held||0);
  return Math.max(0,Math.round((amount-deposit)*100)/100);
}
__name(sotLedgerRentPaid,"sotLedgerRentPaid");
function sotLedgerPaymentCandidates(card,monthly,ledgerRows){
  const bed=sotNormalizeBed(card?.bed);
  const anchor=sotCardCycleAnchor(card?.cardName);
  const dayMs=86400000;
  const eff=monthly||700;
  const endDate=card?.end?new Date(card.end):null;
  const daysInMonth=endDate?new Date(endDate.getFullYear(),endDate.getMonth()+1,0).getDate():30;
  const daily=eff/daysInMonth;
  const raw=[];
  for(const row of ledgerRows||[]){
    const paidTs=sotDateMs(row?.ts||row?.created_at||row?.period_start||row?.due_date);
    if(!paidTs)continue;
    const cat=String(row?.cat||"").toLowerCase();
    const type=String(row?.type||"").toUpperCase();
    const tag=String(row?.tag||"").toLowerCase();
    if(!(cat==="cash"||cat==="bank"))continue;
    if(tag==="transfer"||type==="TF"||type==="TFF"||row?.bed_from||row?.bed_to)continue;
    if(sotNormalizeBed(row?.room||row?.bed)!==bed)continue;
    const rentPaid=sotLedgerRentPaid(row);
    if(rentPaid<=0)continue;
    raw.push({paidTs,rentPaid,row,cash:cat==="cash"?rentPaid:0,bank:cat==="bank"?rentPaid:0});
  }
  if(!raw.length)return [];
  const rows=[];
  if(anchor&&card?.end){
    const cycleDay=anchor.day||new Date(card.end).getDate();
    const earlyWindow=25*dayMs;
    const lateWindow=7*dayMs;
    const cycleWins=[];
    for(let n=1;n<=12;n++){
      const cStart=sotAddCycleMonths(card.end,-n,cycleDay);
      const cEnd=n===1?card.end:sotAddCycleMonths(card.end,-(n-1),cycleDay);
      cycleWins.push({cStart,cEnd,wStart:cStart-earlyWindow,wEnd:cEnd+lateWindow,pays:[]});
    }
    const assigned=new Set();
    raw.forEach((p,idx)=>{
      for(const w of cycleWins){
        if(p.paidTs>=w.wStart&&p.paidTs<=w.wEnd){
          w.pays.push(p);
          assigned.add(idx);
          break;
        }
      }
    });
    for(const w of cycleWins){
      if(!w.pays.length)continue;
      const total=Math.round(w.pays.reduce((s,p)=>s+p.rentPaid,0)*100)/100;
      const totalCash=Math.round(w.pays.reduce((s,p)=>s+p.cash,0)*100)/100;
      const totalBank=Math.round(w.pays.reduce((s,p)=>s+p.bank,0)*100)/100;
      const lastTs=Math.max(...w.pays.map(p=>p.paidTs));
      const notes=w.pays.map(p=>`${p.row?.note||""} ${p.row?.pay_type||""}`).join(" ");
      const hasDiscount=/discount|diacount|disacount|\u6298\u6263|\u4f18\u60e0/i.test(notes);
      const hasInstallment=/installment|\u5206\u671f/i.test(notes);
      const hasShortCycle=/\b\d+\s*days?\b|\u534a\u6708|half/i.test(notes);
      const enoughForCycle=total>=eff*0.75||hasDiscount;
      let coverTs;
      let cycleAnchored=false;
      if(!hasInstallment&&!hasShortCycle&&enoughForCycle){
        coverTs=w.cEnd;
        cycleAnchored=true;
      }else{
        coverTs=lastTs+(total/daily)*dayMs;
      }
      rows.push({bed,paidTs:lastTs,coverTs,rentPaid:total,monthly:eff,daily,months:sotRentMonthsPaid(total,eff),cycleAnchored,cash:totalCash,bank:totalBank,paymentCount:w.pays.length});
    }
    raw.forEach((p,idx)=>{
      if(assigned.has(idx))return;
      rows.push({bed,paidTs:p.paidTs,coverTs:p.paidTs+(p.rentPaid/daily)*dayMs,rentPaid:p.rentPaid,monthly:eff,daily,months:sotRentMonthsPaid(p.rentPaid,eff),cycleAnchored:false,cash:p.cash,bank:p.bank,paymentCount:1});
    });
    return rows.sort((a,b)=>(b.coverTs||0)-(a.coverTs||0));
  }
  const dayGroups={};
  for(const p of raw){
    const dateKey=new Date(p.paidTs).toISOString().slice(0,10);
    const key=`${bed}|${dateKey}`;
    if(!dayGroups[key])dayGroups[key]={bed,paidTs:p.paidTs,rentPaid:0,cash:0,bank:0,paymentCount:0};
    dayGroups[key].rentPaid=Math.round((dayGroups[key].rentPaid+p.rentPaid)*100)/100;
    dayGroups[key].cash=Math.round((dayGroups[key].cash+p.cash)*100)/100;
    dayGroups[key].bank=Math.round((dayGroups[key].bank+p.bank)*100)/100;
    dayGroups[key].paymentCount+=1;
  }
  return Object.values(dayGroups).map(g=>({...g,coverTs:g.paidTs+(g.rentPaid/daily)*dayMs,monthly:eff,daily,months:sotRentMonthsPaid(g.rentPaid,eff),cycleAnchored:false})).sort((a,b)=>(b.coverTs||0)-(a.coverTs||0));
}
__name(sotLedgerPaymentCandidates,"sotLedgerPaymentCandidates");
function sotActiveArrearsBedSet(existingTasks){
  const set=new Set();
  for(const task of existingTasks||[]){
    if(!empCloseStatusIsOpen(task?.close_status))continue;
    if(empTaskRemaining(task)<=0)continue;
    const bed=sotNormalizeBed(task?.bed||task?.room_bed||task?.room);
    if(bed)set.add(bed);
  }
  return set;
}
__name(sotActiveArrearsBedSet,"sotActiveArrearsBedSet");
function empTtlockRoomsToConsoleUnresolvedArrears(roomsData,rentConfig,ledgerRows,existingTasks){
  const rows=[];
  const missingRent=[];
  const knownArrearsBeds=sotActiveArrearsBedSet(existingTasks);
  const dayMs=86400000;
  const gapLimit=3;
  for(const card of sotCurrentOccupiedCards(roomsData)){
    const rent=empRentForTtlockCard(rentConfig,card.lockRoom,card.bed,card.cardName);
    const dueDate=card.end?new Date(card.end).toISOString().slice(0,10):"";
    if(!(rent.amount>0)){
      missingRent.push({room_bed:card.bed,lockRoom:card.lockRoom,cardName:card.cardName,due_date:dueDate,reason:"RENT_MAPPING_FAILED"});
      continue;
    }
    if(knownArrearsBeds.has(sotNormalizeBed(card.bed)))continue;
    const cov=sotLedgerPaymentCandidates(card,rent.amount,ledgerRows)[0]||null;
    if(!cov)continue;
    const shortAmount=Math.max(0,Math.round((rent.amount-(cov.rentPaid||0))*100)/100);
    const anchoredShort=!!(cov.cycleAnchored&&shortAmount>1);
    let gapDays=Math.max(0,Math.ceil(((card.end||0)-(cov.coverTs||0))/dayMs));
    let gapAmount=Math.round(gapDays*(rent.amount/(card.endDate?new Date(card.endDate.getFullYear(),card.endDate.getMonth()+1,0).getDate():30))*100)/100;
    let amount=0;
    let reason="";
    if(anchoredShort){
      gapDays=0;
      gapAmount=shortAmount;
      amount=shortAmount;
      reason="cycle_short_payment";
    }else if(gapDays>gapLimit){
      amount=gapAmount;
      reason="coverage_gap";
    }else{
      continue;
    }
    const sourceRef=`console:${card.bed}:${card.end||0}:${card.cardName}`.replace(/[^\w:.-]+/g,"-").slice(0,160);
    rows.push({
      id:`ttlock-unresolved-${sourceRef}`.replace(/[^\w.-]+/g,"-").slice(0,120),
      task_id:`ttlock-unresolved-${sourceRef}`.replace(/[^\w.-]+/g,"-").slice(0,120),
      source:"ttlock",
      source_type:"ttlock_expired_unpaid",
      source_ref:sourceRef,
      room_bed:card.bed,
      bed:card.bed,
      room:card.bed,
      customer_code:card.cardName||card.bed,
      card_code:card.cardName||sourceRef,
      package_code:"ttlock_unresolved_missing",
      amount_fils:Math.max(0,Math.round(amount*100)),
      amount_source:"owner_console_unresolved_missing",
      amount_authority_status:"owner_console_unresolved_missing",
      accounting_status:"unverified",
      remain:Math.max(0,Math.round(amount*100)/100),
      due_date:dueDate,
      followup_status:"pending_followup",
      note:`Owner console unresolved missing: ${reason}`,
      rent_mapping_key:rent.key,
      lock_room:card.lockRoom,
      overdue_days:dueDate?Math.max(0,empDaysBetween(dueDate,empTodayDubai())):0,
      console_status:"missing",
      console_gap_days:gapDays,
      console_gap_amount_fils:Math.max(0,Math.round(gapAmount*100)),
      console_coverage_source:"owner_console_continuity_filter"
    });
  }
  rows.sort((a,b)=>(b.console_gap_amount_fils||0)-(a.console_gap_amount_fils||0)||String(a.room_bed).localeCompare(String(b.room_bed),undefined,{numeric:true}));
  return {rows,missingRent,source_function:"owner_console_unresolved_missing_continuity_filter"};
}
__name(empTtlockRoomsToConsoleUnresolvedArrears,"empTtlockRoomsToConsoleUnresolvedArrears");
async function empLoadTtlockConsoleUnresolvedForArrears(env,user,existingTasks,opts={}){
  const timeoutMs=Math.min(Math.max(Number(opts.timeoutMs||8000),1000),12000);
  try{
    const today=empTodayDubai();
    const range={start:empAddMonths(today,-24)||"2024-01-01",end:today};
    const [lockResult,rentConfig,ledgerRows]=await Promise.all([
      empWithTimeout(loadLockCards(env),timeoutMs,"ttlock_api"),
      empRentConfigReadOnly(env,user.corpid),
      ownerOverviewFetchTransactions(env,user,range).catch(()=>[])
    ]);
    if(lockResult?.error){
      return {rows:[],missingRent:[],source_status:empSourceStatus(false,empTtlockReadErrorCode(lockResult),{endpoint:"/api/lock/cards",status:lockResult.status||0,source_function:"owner_console_unresolved_missing_continuity_filter"})};
    }
    const mapped=empTtlockRoomsToConsoleUnresolvedArrears(lockResult?.roomsData||{},rentConfig,ledgerRows,existingTasks);
    return {
      rows:mapped.rows,
      missingRent:mapped.missingRent,
      source_status:empSourceStatus(true,"",{
        endpoint:"/api/lock/cards",
        data_source:"live_api_plus_cloud_ledger",
        source_function:mapped.source_function,
        count:mapped.rows.length,
        missing_rent_count:mapped.missingRent.length,
        locks_count:Number(lockResult?.locksCount||0),
        ledger_rows_checked:ledgerRows.length
      })
    };
  }catch(e){
    return {rows:[],missingRent:[],source_status:empSourceStatus(false,empTtlockReadErrorCode(e),{endpoint:"/api/lock/cards",source_function:"owner_console_unresolved_missing_continuity_filter"})};
  }
}
__name(empLoadTtlockConsoleUnresolvedForArrears,"empLoadTtlockConsoleUnresolvedForArrears");
function empTtlockRoomsToExpiredArrears(roomsData,rentConfig){
  const rows=[];
  const missingRent=[];
  const now=Date.now();
  for(const [lockRoom,cards] of Object.entries(roomsData||{})){
    for(const card of cards||[]){
      const cardName=cleanText(card?.cardName||card?.identityCardName||card?.cardAlias||card?.name||"",160);
      if(empTtlockIsVacant(cardName)||empTtlockIsStaff(cardName))continue;
      const endMs=Number(card?.endDate||card?.end||0);
      if(!(Number.isFinite(endMs)&&endMs>0&&endMs<now))continue;
      const bed=empTtlockBedNumber(cardName)||cleanText(card?.bed||card?.room||lockRoom||"",80);
      if(!bed){
        missingRent.push({lockRoom:cleanText(lockRoom||"",120),cardName,reason:"BED_MAPPING_FAILED"});
        continue;
      }
      const rent=empRentForTtlockCard(rentConfig,lockRoom,bed,cardName);
      const dueDate=new Date(endMs).toISOString().slice(0,10);
      if(!(rent.amount>0)){
        missingRent.push({room_bed:bed,lockRoom:cleanText(lockRoom||"",120),cardName,due_date:dueDate,reason:"RENT_MAPPING_FAILED"});
        continue;
      }
      const sourceRef=cleanText(card?.cardId||card?.cardNumber||card?.identityCardId||"",80)||`${lockRoom}|${bed}|${endMs}|${cardName}`;
      rows.push({
        id:`ttlock-expired-${sourceRef}`.replace(/[^\w.-]+/g,"-").slice(0,120),
        task_id:`ttlock-expired-${sourceRef}`.replace(/[^\w.-]+/g,"-").slice(0,120),
        source:"ttlock",
        source_type:"ttlock_expired_unpaid",
        source_ref:sourceRef,
        room_bed:bed,
        bed,
        room:bed,
        customer_code:cardName||bed,
        card_code:cardName||sourceRef,
        package_code:"ttlock_card",
        amount_fils:Math.round(rent.amount*100),
        amount_source:"bed_rent_mapping",
        amount_authority_status:"bed_rent_mapping",
        accounting_status:"unverified",
        remain:rent.amount,
        due_date:dueDate,
        followup_status:"pending_followup",
        note:"TTLock expired unpaid; amount comes from bed rent mapping",
        rent_mapping_key:rent.key,
        lock_room:cleanText(lockRoom||"",120),
        overdue_days:Math.max(0,empDaysBetween(dueDate,empTodayDubai()))
      });
    }
  }
  return {rows,missingRent};
}
__name(empTtlockRoomsToExpiredArrears,"empTtlockRoomsToExpiredArrears");
async function empLoadTtlockExpiredUnpaidForArrears(env,user,opts={}){
  const timeoutMs=Math.min(Math.max(Number(opts.timeoutMs||8000),1000),12000);
  try{
    const [lockResult,rentConfig]=await Promise.all([
      empWithTimeout(loadLockCards(env),timeoutMs,"ttlock_api"),
      empRentConfigReadOnly(env,user.corpid)
    ]);
    if(lockResult?.error){
      return {rows:[],missingRent:[],source_status:empSourceStatus(false,empTtlockReadErrorCode(lockResult),{endpoint:"/api/lock/cards",status:lockResult.status||0})};
    }
    const mapped=empTtlockRoomsToExpiredArrears(lockResult?.roomsData||{},rentConfig);
    return {
      rows:mapped.rows,
      missingRent:mapped.missingRent,
      source_status:empSourceStatus(true,"",{
        endpoint:"/api/lock/cards",
        data_source:"live_api",
        count:mapped.rows.length,
        missing_rent_count:mapped.missingRent.length,
        locks_count:Number(lockResult?.locksCount||0)
      })
    };
  }catch(e){
    return {rows:[],missingRent:[],source_status:empSourceStatus(false,empTtlockReadErrorCode(e),{endpoint:"/api/lock/cards"})};
  }
}
__name(empLoadTtlockExpiredUnpaidForArrears,"empLoadTtlockExpiredUnpaidForArrears");
function consoleSotCardName(card){
  return cleanText(card?.cardName||card?.identityCardName||card?.cardAlias||card?.name||"",160);
}
__name(consoleSotCardName,"consoleSotCardName");
function consoleSotDateKey(ts){
  const d=new Date(ts);
  if(Number.isNaN(d.getTime()))return "";
  try{
    return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
  }catch{
    return d.toISOString().slice(0,10);
  }
}
__name(consoleSotDateKey,"consoleSotDateKey");
function consoleSotDateKeyMs(key){
  const m=String(key||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return 0;
  return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]));
}
__name(consoleSotDateKeyMs,"consoleSotDateKeyMs");
function consoleSotStatus(card,now=Date.now()){
  const name=consoleSotCardName(card);
  if(empTtlockIsStaff(name))return {type:"staff",label:"staff"};
  if(empTtlockIsVacant(name))return {type:"vacant",label:"vacant"};
  const end=Number(card?.endDate||card?.end||0);
  if(!Number.isFinite(end)||end<=0)return {type:"active",label:"permanent"};
  const todayMs=consoleSotDateKeyMs(consoleSotDateKey(now));
  const endDayMs=consoleSotDateKeyMs(consoleSotDateKey(end));
  if(now>end){
    const days=Math.max(0,Math.round((todayMs-endDayMs)/86400000));
    return {type:"overdue",label:"overdue",days,end_ms:end,due_date:consoleSotDateKey(end)};
  }
  const rem=Math.round((endDayMs-todayMs)/86400000);
  if(rem===0)return {type:"today",label:"due_today",days:0,end_ms:end,due_date:consoleSotDateKey(end)};
  if(rem<=3)return {type:"soon",label:"due_soon",days:rem,end_ms:end,due_date:consoleSotDateKey(end)};
  return {type:"active",label:"active",days:rem,end_ms:end,due_date:consoleSotDateKey(end)};
}
__name(consoleSotStatus,"consoleSotStatus");
function consoleSotBed(lockRoom,card){
  const name=consoleSotCardName(card);
  return empTtlockBedNumber(name)||sotNormalizeBed(card?.bed||card?.room||lockRoom)||cleanText(lockRoom||"",80);
}
__name(consoleSotBed,"consoleSotBed");
function consoleSotAmountFils(card,rentConfig,lockRoom,bed,cardName){
  const raw=card?.amount??card?.rent??card?.remain??card?.arrears??card?.totalRent;
  const rawNum=Number(raw);
  if(Number.isFinite(rawNum)&&raw!==""&&rawNum>0)return {amount_fils:Math.round(rawNum*100),amount_source:"ttlock_card_field"};
  const rent=empRentForTtlockCard(rentConfig,lockRoom,bed,cardName);
  if(rent.amount>0)return {amount_fils:Math.round(rent.amount*100),amount_source:"bed_rent_mapping",rent_mapping_key:rent.key};
  return {amount_fils:0,amount_source:"not_configured",rent_mapping_key:""};
}
__name(consoleSotAmountFils,"consoleSotAmountFils");
function consoleSotTaskFromCard(lockRoom,card,info,rentConfig){
  const cardName=consoleSotCardName(card);
  const bed=consoleSotBed(lockRoom,card);
  const amount=consoleSotAmountFils(card,rentConfig,lockRoom,bed,cardName);
  const sourceRef=`console-current:${info.type}:${lockRoom}:${bed}:${info.end_ms||0}:${cardName}`.replace(/[^\w:.-]+/g,"-").slice(0,180);
  const amountFils=Math.max(0,Math.round(Number(amount.amount_fils||0)));
  const remain=Math.round(amountFils)/100;
  return {
    id:`ttlock-current-${sourceRef}`.replace(/[^\w.-]+/g,"-").slice(0,120),
    task_id:`ttlock-current-${sourceRef}`.replace(/[^\w.-]+/g,"-").slice(0,120),
    source:"ttlock",
    source_type:"ttlock_expired_unpaid",
    source_ref:sourceRef,
    room_bed:bed,
    bed,
    room:bed,
    customer_code:cardName||bed,
    card_code:cardName||sourceRef,
    package_code:"ttlock_current_view",
    amount_fils:amountFils,
    amount_source:amount.amount_source,
    amount_authority_status:amount.amount_source,
    accounting_status:"unverified",
    remain,
    due_date:info.due_date||"",
    followup_status:"pending_followup",
    note:`Owner console current ${info.type}`,
    rent_mapping_key:amount.rent_mapping_key||"",
    lock_room:cleanText(lockRoom||"",120),
    overdue_days:info.type==="overdue"?Number(info.days||0):0,
    console_status:info.type,
    console_source:"owner_console_current_view"
  };
}
__name(consoleSotTaskFromCard,"consoleSotTaskFromCard");
function consoleSotSortRows(a,b){
  const rank={overdue:0,today:1,soon:2,"":3};
  const ar=rank[a?.console_status]??(a?.source_type==="existing_arrears_record"?3:4);
  const br=rank[b?.console_status]??(b?.source_type==="existing_arrears_record"?3:4);
  if(ar!==br)return ar-br;
  return String(a?.room_bed||a?.bed||"").localeCompare(String(b?.room_bed||b?.bed||""),undefined,{numeric:true});
}
__name(consoleSotSortRows,"consoleSotSortRows");
function consoleSotRowsFromLockCards(roomsData,rentConfig){
  const rows=[];
  const byStatus={overdue:[],today:[],soon:[]};
  const missingRent=[];
  let total_cards=0;
  let staff_count=0;
  let vacant_count=0;
  let occupied_count=0;
  for(const [lockRoom,cards] of Object.entries(roomsData||{})){
    for(const card of cards||[]){
      const info=consoleSotStatus(card);
      if(info.type==="staff"){staff_count++;continue;}
      total_cards++;
      if(info.type==="vacant"){vacant_count++;continue;}
      occupied_count++;
      if(!["overdue","today","soon"].includes(info.type))continue;
      const row=consoleSotTaskFromCard(lockRoom,card,info,rentConfig);
      rows.push(row);
      byStatus[info.type].push(row);
      if(row.amount_source==="not_configured")missingRent.push({room_bed:row.room_bed,lockRoom,cardName:row.customer_code,due_date:row.due_date,reason:"RENT_MAPPING_NOT_CONFIGURED"});
    }
  }
  rows.sort(consoleSotSortRows);
  return {rows,byStatus,missingRent,total_cards,staff_count,vacant_count,occupied_count};
}
__name(consoleSotRowsFromLockCards,"consoleSotRowsFromLockCards");
async function empCachedTtlockRowsForConsoleSot(env,user,opts={}){
  const limit=Math.min(Math.max(Number(opts.limit||500),1),500);
  const tasks=await empCachedTtlockTaskRows(env,user,limit).catch(()=>[]);
  const rows=tasks.map(empTaskToBossArrear).filter(row=>cleanMoney(row?.remain||0)>0);
  const today=empTodayDubai();
  const byStatus={overdue:[],today:[],soon:[]};
  for(const row of rows){
    const due=cleanDate(row?.due_date||"");
    if(due&&due<today){
      row.console_status="overdue";
      row.overdue_days=Math.max(1,empDaysBetween(due,today));
      byStatus.overdue.push(row);
    }else if(due===today){
      row.console_status="today";
      byStatus.today.push(row);
    }else if(due&&empDaysBetween(today,due)<=3){
      row.console_status="soon";
      byStatus.soon.push(row);
    }else{
      row.console_status="";
    }
    row.console_source="materialized_cache";
  }
  rows.sort(consoleSotSortRows);
  return {rows:rows.slice(0,limit),byStatus,missingRent:[],source_status:empSourceStatus(true,"",{data_source:"materialized_cache",source_function:"materialized_ttlock_arrear_tasks",count:rows.length})};
}
__name(empCachedTtlockRowsForConsoleSot,"empCachedTtlockRowsForConsoleSot");
async function empAppendCloudArrearsProjectionRows(env,user,tasks,seenIds,seenKeys,source_status,opts={}){
  let added=0;
  try{
    const projection=await rebuildAllCloudArrears(env,user,{limit:opts.limit||1000});
    for(const item of projection.open_items||[]){
      const mappedId=cleanText(item.task_id||item.arrears_ref||"",160);
      const mappedKey=[
        cleanText(item.bed||"",160),
        cleanText(item.entry_id||item.original_entry_id||item.source_event_id||"",120),
        empTaskRemaining(item).toFixed(2)
      ].join("|");
      if((mappedId&&seenIds.has(mappedId))||seenKeys.has(mappedKey))continue;
      if(empTaskRemaining(item)>0){
        tasks.push(item);
        added++;
        if(mappedId)seenIds.add(mappedId);
        seenKeys.add(mappedKey);
      }
    }
    source_status.existing_arrears_record={
      ...(source_status.existing_arrears_record||empSourceStatus(true,"")),
      ok:true,
      projection:"sessions.entries_json",
      projection_count:added,
      projection_active_sessions:projection.active_sessions_count,
      projection_total_remaining:projection.total_remaining
    };
  }catch(e){
    source_status.existing_arrears_record={
      ...(source_status.existing_arrears_record||empSourceStatus(false,"projection_failed")),
      projection:"sessions.entries_json",
      projection_error:empReadErrorCode(e)
    };
  }
  return added;
}
__name(empAppendCloudArrearsProjectionRows,"empAppendCloudArrearsProjectionRows");
async function empLoadExistingArrearsRowsForConsoleSot(env,user,opts={}){
  const limit=Math.min(Math.max(Number(opts.limit||500),1),500);
  const tasks=[];
  const source_status={existing_arrears_record:empSourceStatus(false,"not_loaded")};
  let dedupeDroppedCount=0;
  if(await empTableExists(env,"arrear_tasks")){
    try{
      const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC LIMIT ?").bind(user.corpid,limit).all();
      tasks.push(...(taskRows.results||[]).filter(t=>empCloseStatusIsOpen(t.close_status)&&empTaskRemaining(t)>0&&!/ttlock/i.test(String(t?.source_type||t?.source||""))));
      source_status.existing_arrears_record=empSourceStatus(true,"",{table:"arrear_tasks",count:tasks.length});
    }catch(e){
      source_status.existing_arrears_record=empSourceStatus(false,empReadErrorCode(e),{table:"arrear_tasks"});
    }
  }else{
    source_status.existing_arrears_record=empSourceStatus(true,"",{table:"arrear_tasks",missing:true,count:0});
  }
  const seenIds=new Set(tasks.map(t=>cleanText(t.task_id,100)).filter(Boolean));
  const seenKeys=new Set(tasks.map(t=>[cleanText(t.bed||"",160),cleanText(t.entry_id||t.original_entry_id||"",80),empTaskRemaining(t).toFixed(2)].join("|")));
  if(await empTableExists(env,"arrears")){
    try{
      const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC LIMIT ?").bind(user.corpid,limit).all();
      let legacyAdded=0;
      for(const row of legacy.results||[]){
        const mapped=empLegacyArrearToTask(row);
        const mappedId=cleanText(mapped.task_id,100);
        const mappedKey=[cleanText(mapped.bed||"",160),cleanText(mapped.entry_id||mapped.original_entry_id||"",80),empTaskRemaining(mapped).toFixed(2)].join("|");
        if((mappedId&&seenIds.has(mappedId))||seenKeys.has(mappedKey)){dedupeDroppedCount++;continue;}
        if(empTaskRemaining(mapped)>0){
          tasks.push(mapped);
          legacyAdded++;
          if(mappedId)seenIds.add(mappedId);
          seenKeys.add(mappedKey);
        }
      }
      source_status.existing_arrears_record=empSourceStatus(true,"",{table:"arrear_tasks+arrears",count:tasks.length,legacy_added:legacyAdded});
    }catch(e){
      if(!tasks.length)source_status.existing_arrears_record=empSourceStatus(false,empReadErrorCode(e),{table:"arrears"});
      else source_status.existing_arrears_record={...source_status.existing_arrears_record,legacy_error:empReadErrorCode(e)};
    }
  }
  await empAppendCloudArrearsProjectionRows(env,user,tasks,seenIds,seenKeys,source_status,{limit});
  const rows=[];
  const seenMapped=new Set();
  for(const row of tasks.map(empTaskToBossArrear)){
    if(cleanMoney(row?.remain||0)<=0)continue;
    const key=empBossArrearDedupeKey(row);
    if(seenMapped.has(key)){dedupeDroppedCount++;continue;}
    seenMapped.add(key);
    rows.push(row);
  }
  rows.sort(consoleSotSortRows);
  return {rows,source_status,dedupe_dropped_count:dedupeDroppedCount};
}
__name(empLoadExistingArrearsRowsForConsoleSot,"empLoadExistingArrearsRowsForConsoleSot");
async function resolveConsoleReceivablesSot(env,user,opts={}){
  const limit=Math.min(Math.max(Number(opts.limit||500),1),500);
  const started=Date.now();
  const timeoutMs=Math.min(Math.max(Number(opts.ttlockTimeoutMs||8000),1000),12000);
  const [lockResult,rentConfig,existing]=await Promise.all([
    empWithTimeout(loadLockCards(env),timeoutMs,"ttlock_api").catch(e=>({error:String(e?.message||e),roomsData:{},locksCount:0,status:0})),
    empRentConfigReadOnly(env,user.corpid).catch(()=>({})),
    empLoadExistingArrearsRowsForConsoleSot(env,user,{limit})
  ]);
  let ttlockRows=[];
  let byStatus={overdue:[],today:[],soon:[]};
  let ttlockMissingRent=[];
  let ttlockMeta={total_cards:0,staff_count:0,vacant_count:0,occupied_count:0};
  const ttlockOk=!lockResult?.error;
  if(ttlockOk){
    const mapped=consoleSotRowsFromLockCards(lockResult?.roomsData||{},rentConfig);
    ttlockRows=mapped.rows;
    byStatus=mapped.byStatus;
    ttlockMissingRent=mapped.missingRent;
    ttlockMeta={total_cards:mapped.total_cards,staff_count:mapped.staff_count,vacant_count:mapped.vacant_count,occupied_count:mapped.occupied_count};
  }else{
    const cached=await empCachedTtlockRowsForConsoleSot(env,user,{limit});
    ttlockRows=cached.rows||[];
    byStatus=cached.byStatus||byStatus;
    ttlockMissingRent=cached.missingRent||[];
    ttlockMeta={total_cards:ttlockRows.length,staff_count:0,vacant_count:0,occupied_count:ttlockRows.length};
    lockResult.cacheFallbackStatus=cached.source_status;
  }
  const existingRows=existing.rows||[];
  const allRows=[...ttlockRows,...existingRows].sort(consoleSotSortRows).slice(0,limit);
  const amountFils=allRows.reduce((sum,row)=>sum+Math.max(0,Math.round(Number(row?.amount_fils||cleanMoney(row?.remain||0)*100)||0)),0);
  const overdueCount=byStatus.overdue.length;
  const dueTodayCount=byStatus.today.length;
  const dueSoonCount=byStatus.soon.length;
  const sourceBreakdown={
    overdue_count:overdueCount,
    due_today_count:dueTodayCount,
    due_soon_count:dueSoonCount,
    ttlock_overdue_count:overdueCount,
    ttlock_due_today_count:dueTodayCount,
    ttlock_due_soon_count:dueSoonCount,
    ttlock_expired_unpaid_count:ttlockRows.length,
    existing_arrears_count:existingRows.length,
    action_count:ttlockRows.length+existingRows.length,
    amount_fils:amountFils,
    outstanding_amount_fils:amountFils
  };
  return {
    ttlock_expired_unpaid:ttlockRows.slice(0,limit),
    existing_arrears:existingRows.slice(0,limit),
    overdue:byStatus.overdue,
    due_today:byStatus.today,
    due_soon:byStatus.soon,
    all_rows:allRows,
    source_breakdown:sourceBreakdown,
    summary:{
      overdue_count:overdueCount,
      due_today_count:dueTodayCount,
      due_soon_count:dueSoonCount,
      ttlock_count:ttlockRows.length,
      ttlock_expired_unpaid_count:ttlockRows.length,
      existing_arrears_count:existingRows.length,
      action_count:ttlockRows.length+existingRows.length,
      total_count:ttlockRows.length+existingRows.length,
      outstanding_amount_fils:amountFils,
      total_amount_fils:amountFils,
      config_missing_count:ttlockMissingRent.length,
      dedupe_dropped_count:Number(existing.dedupe_dropped_count||0),
      console_total_cards:ttlockMeta.total_cards,
      console_occupied_count:ttlockMeta.occupied_count,
      console_vacant_count:ttlockMeta.vacant_count,
      console_staff_count:ttlockMeta.staff_count,
      duration_ms:Date.now()-started
    },
    sources:{
      existing_arrears_record:empSourceContract(existing.source_status?.existing_arrears_record,existingRows.length),
      ttlock_expired_unpaid:empSourceContract(ttlockOk?empSourceStatus(true,"",{endpoint:"/api/lock/cards",source_function:"cp_getStatus_cp_computeMetrics",count:ttlockRows.length,locks_count:Number(lockResult?.locksCount||0)}):(lockResult.cacheFallbackStatus||empSourceStatus(false,empTtlockReadErrorCode(lockResult),{endpoint:"/api/lock/cards",source_function:"cp_getStatus_cp_computeMetrics"})),ttlockRows.length)
    },
    source_status:{
      existing_arrears_record:existing.source_status?.existing_arrears_record,
      ttlock_expired_unpaid:ttlockOk?empSourceStatus(true,"",{endpoint:"/api/lock/cards",data_source:"live_api",source_function:"cp_getStatus_cp_computeMetrics",count:ttlockRows.length,locks_count:Number(lockResult?.locksCount||0)}):(lockResult.cacheFallbackStatus||empSourceStatus(false,empTtlockReadErrorCode(lockResult),{endpoint:"/api/lock/cards",source_function:"cp_getStatus_cp_computeMetrics"}))
    },
    ttlock_missing_rent:ttlockMissingRent,
    generated_at:empNow(),
    source:"owner_console_current_view",
    source_function:"cp_getStatus_cp_computeMetrics",
    readonly:true,
    production_cutover:"PRODUCTION_NO_GO"
  };
}
__name(resolveConsoleReceivablesSot,"resolveConsoleReceivablesSot");
async function empListMergedArrearTasksDetailed(env,user,opts={}){
  const limit=Math.min(Math.max(Number(opts.limit||100),1),500);
  const started=Date.now();
  const tasks=[];
  let ttlockRows=[];
  let ttlockMissingRent=[];
  let dedupeDroppedCount=0;
  const source_status={
    existing_arrears_record:empSourceStatus(false,"not_loaded"),
    ttlock_expired_unpaid:empSourceStatus(false,"not_loaded")
  };
  if(await empTableExists(env,"arrear_tasks")){
    try{
      const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC LIMIT ?").bind(user.corpid,limit).all();
      tasks.push(...(taskRows.results||[]).filter(t=>empCloseStatusIsOpen(t.close_status)&&empTaskRemaining(t)>0));
      source_status.existing_arrears_record=empSourceStatus(true,"",{table:"arrear_tasks",count:tasks.length});
    }catch(e){
      source_status.existing_arrears_record=empSourceStatus(false,empReadErrorCode(e),{table:"arrear_tasks"});
    }
  }else{
    source_status.existing_arrears_record=empSourceStatus(true,"",{table:"arrear_tasks",missing:true,count:0});
  }
  const seenIds=new Set(tasks.map(t=>cleanText(t.task_id,100)).filter(Boolean));
  const seenKeys=new Set(tasks.map(t=>[
    cleanText(t.bed||"",160),
    cleanText(t.entry_id||t.original_entry_id||"",80),
    empTaskRemaining(t).toFixed(2)
  ].join("|")));
  if(await empTableExists(env,"arrears")){
    try{
      const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC LIMIT ?").bind(user.corpid,limit).all();
      let legacyAdded=0;
      for(const row of legacy.results||[]){
        const mapped=empLegacyArrearToTask(row);
        const mappedId=cleanText(mapped.task_id,100);
        const mappedKey=[
          cleanText(mapped.bed||"",160),
          cleanText(mapped.entry_id||mapped.original_entry_id||"",80),
          empTaskRemaining(mapped).toFixed(2)
        ].join("|");
        if((mappedId&&seenIds.has(mappedId))||seenKeys.has(mappedKey)){
          dedupeDroppedCount++;
          continue;
        }
        if(empTaskRemaining(mapped)>0){
          tasks.push(mapped);
          legacyAdded++;
          if(mappedId)seenIds.add(mappedId);
          seenKeys.add(mappedKey);
        }
      }
      source_status.existing_arrears_record=empSourceStatus(true,"",{table:"arrear_tasks+arrears",count:tasks.length,legacy_added:legacyAdded});
    }catch(e){
      if(!tasks.length)source_status.existing_arrears_record=empSourceStatus(false,empReadErrorCode(e),{table:"arrears"});
      else source_status.existing_arrears_record={...source_status.existing_arrears_record,legacy_error:empReadErrorCode(e)};
    }
  }
  await empAppendCloudArrearsProjectionRows(env,user,tasks,seenIds,seenKeys,source_status,{limit});
  const ttlock=await empLoadTtlockConsoleUnresolvedForArrears(env,user,tasks,{timeoutMs:opts.ttlockTimeoutMs||8000});
  ttlockRows=ttlock.rows||[];
  ttlockMissingRent=ttlock.missingRent||[];
  source_status.ttlock_expired_unpaid=ttlock.source_status||empSourceStatus(false,"TTLOCK_READ_FAILED");
  tasks.sort((a,b)=>String(b.updated_at||b.created_at||"").localeCompare(String(a.updated_at||a.created_at||"")));
  const seenMapped=new Set();
  const mapped=[];
  for(const row of [...tasks.map(empTaskToBossArrear),...ttlockRows]){
    if(cleanMoney(row?.remain||0)<=0)continue;
    const key=empBossArrearDedupeKey(row);
    if(seenMapped.has(key)){
      dedupeDroppedCount++;
      continue;
    }
    seenMapped.add(key);
    mapped.push(row);
  }
  const existingCount=mapped.filter(a=>a.source_type==="existing_arrears_record").length;
  const ttlockCount=mapped.filter(a=>a.source_type==="ttlock_expired_unpaid").length;
  const promisedCount=mapped.filter(a=>cleanMoney(a.promised_amount_fils||0)>0||cleanText(a.promised_payment_date||"",40)).length;
  return {
    tasks,
    mapped,
    source_status,
    ttlock_missing_rent:ttlockMissingRent,
    total_count:mapped.length,
    total_amount_fils:mapped.reduce((sum,a)=>sum+Math.max(0,Math.round(cleanMoney(a.remain||0)*100)),0),
    existing_arrears_count:existingCount,
    ttlock_expired_unpaid_count:ttlockCount,
    employee_promised_count:promisedCount,
    promised_unpaid_count:promisedCount,
    config_missing_count:ttlockMissingRent.length,
    dedupe_dropped_count:dedupeDroppedCount,
    duration_ms:Date.now()-started,
    limit
  };
}
__name(empListMergedArrearTasksDetailed,"empListMergedArrearTasksDetailed");
async function empListMergedArrearTasks(env,user,opts={}){
  const detailed=await empListMergedArrearTasksDetailed(env,user,opts);
  return detailed.tasks;
}
__name(empListMergedArrearTasks,"empListMergedArrearTasks");
function arrearTasksDiagnosticTraceStep(stage,ok,extra={}){
  return {
    stage,
    function_name:extra.function_name||"handleArrearTasks",
    ok:!!ok,
    error_code:extra.error_code||"",
    message:extra.message||"",
    count:Number(extra.count||0),
    bed:cleanText(extra.bed||"",80),
    source:extra.source||""
  };
}
__name(arrearTasksDiagnosticTraceStep,"arrearTasksDiagnosticTraceStep");
function arrearTasksBedFromRequest(request){
  const url=new URL(request.url);
  return cleanText(url.searchParams.get("bed")||url.searchParams.get("room")||url.searchParams.get("room_bed")||"",80).replace(/^#/,"");
}
__name(arrearTasksBedFromRequest,"arrearTasksBedFromRequest");
function arrearTasksFilterByBed(tasks=[],bed=""){
  const cleanBed=cleanText(bed,80).replace(/^#/,"");
  if(!cleanBed)return tasks||[];
  return (tasks||[]).filter(t=>cleanText(t?.bed||t?.room_bed||t?.room||t?.bed_no||"",80).replace(/^#/,"")===cleanBed);
}
__name(arrearTasksFilterByBed,"arrearTasksFilterByBed");
function arrearTasksTotalRemaining(tasks=[]){
  return cleanMoney((tasks||[]).reduce((sum,t)=>sum+cleanMoney(t?.remaining_arrears||t?.remain||empTaskRemaining(t)),0));
}
__name(arrearTasksTotalRemaining,"arrearTasksTotalRemaining");
async function arrearTasksProjectionFallback(env,user,bed,trace,opts={}){
  try{
    const projection=bed?await rebuildCloudArrearsForBed(env,user,bed,{limit:opts.limit||1000}):await rebuildAllCloudArrears(env,user,{limit:opts.limit||1000});
    const tasks=(projection.open_items||[]).filter(t=>cleanMoney(t?.remaining_arrears||empTaskRemaining(t))>0);
    trace.push(arrearTasksDiagnosticTraceStep("build_projection_fallback",true,{function_name:bed?"rebuildCloudArrearsForBed":"rebuildAllCloudArrears",bed,count:tasks.length,source:"cloud_arrears_projection"}));
    return {ok:true,tasks,projection};
  }catch(e){
    const code=empReadErrorCode(e);
    trace.push(arrearTasksDiagnosticTraceStep("build_projection_fallback",false,{function_name:bed?"rebuildCloudArrearsForBed":"rebuildAllCloudArrears",bed,error_code:"PROJECTION_FALLBACK_FAILED",message:code,source:"cloud_arrears_projection"}));
    return {ok:false,tasks:[],error_code:"PROJECTION_FALLBACK_FAILED",message:code};
  }
}
__name(arrearTasksProjectionFallback,"arrearTasksProjectionFallback");
function arrearTasksPayload(tasks=[],closedTasks=[],source="arrear_tasks",trace=[],extra={}){
  return {
    success:true,
    ok:true,
    tasks,
    items:tasks,
    closed_tasks:closedTasks,
    source,
    total_remaining:arrearTasksTotalRemaining(tasks),
    total_count:(tasks||[]).length,
    diagnostic_trace:trace,
    ...extra
  };
}
__name(arrearTasksPayload,"arrearTasksPayload");
async function resolveCurrentReceivablesSot(env,user,opts={}){
  return resolveConsoleReceivablesSot(env,user,opts);
}
__name(resolveCurrentReceivablesSot,"resolveCurrentReceivablesSot");
async function handleBossArrears(request,env,user){
  const sot=await resolveCurrentReceivablesSot(env,user,{limit:bossArrearsListLimit(request)});
  return success(sot.all_rows);
}
__name(handleBossArrears,"handleBossArrears");
async function handleBossArrearsFollowupTasks(request,env,user){
  const params=bossArrearsListParams(request);
  const sourceLimit=Math.min(Math.max(params.offset+params.limit,100),500);
  const sot=await resolveCurrentReceivablesSot(env,user,{limit:sourceLimit});
  const fullTasks=sot.all_rows||[];
  const previewTasks=fullTasks.slice(0,Math.min(params.previewLimit,fullTasks.length));
  const pageTasks=fullTasks.slice(params.offset,params.offset+params.limit);
  const existingTasks=fullTasks.filter(a=>a.source_type==="existing_arrears_record");
  const ttlockTasks=fullTasks.filter(a=>a.source_type==="ttlock_expired_unpaid");
  const configMissingCount=Number(sot.summary?.config_missing_count||0);
  const promisedUnpaidCount=fullTasks.filter(a=>cleanMoney(a.promised_amount_fils||0)>0||cleanText(a.promised_payment_date||"",40)).length;
  const dedupeDroppedCount=Number(sot.summary?.dedupe_dropped_count||0);
  const pagination={
    limit:params.limit,
    offset:params.offset,
    total_count:sot.summary?.total_count||fullTasks.length,
    has_more:params.offset+params.limit<(sot.summary?.total_count||fullTasks.length)
  };
  const sources={
    existing_arrears_record:sot.sources?.existing_arrears_record||empSourceContract({},existingTasks.length),
    ttlock_expired_unpaid:sot.sources?.ttlock_expired_unpaid||empSourceContract({},ttlockTasks.length)
  };
  return success({
    tasks:pageTasks,
    all_tasks:fullTasks,
    preview_tasks:previewTasks,
    recent_tasks:previewTasks,
    summary:{
      total_count:sot.summary?.total_count||fullTasks.length,
      total_amount_fils:sot.summary?.total_amount_fils||0,
      outstanding_amount_fils:sot.summary?.outstanding_amount_fils||sot.summary?.total_amount_fils||0,
      overdue_count:sot.summary?.overdue_count||0,
      due_today_count:sot.summary?.due_today_count||0,
      due_soon_count:sot.summary?.due_soon_count||0,
      action_count:sot.summary?.action_count||fullTasks.length,
      existing_arrears_count:sot.summary?.existing_arrears_count||existingTasks.length,
      ttlock_expired_unpaid_count:sot.summary?.ttlock_expired_unpaid_count||ttlockTasks.length,
      promised_unpaid_count:promisedUnpaidCount,
      config_missing_count:configMissingCount,
      dedupe_dropped_count:dedupeDroppedCount,
      employee_promised_count:promisedUnpaidCount,
      visible_preview_count:previewTasks.length
    },
    pagination,
    sources,
    source_tasks:{
      existing_arrears_record:existingTasks,
      ttlock_expired_unpaid:ttlockTasks
    },
    total_amount_fils:sot.summary?.total_amount_fils||0,
    total_count:sot.summary?.total_count||fullTasks.length,
    existing_arrears_count:sot.summary?.existing_arrears_count||existingTasks.length,
    ttlock_expired_unpaid_count:sot.summary?.ttlock_expired_unpaid_count||ttlockTasks.length,
    employee_promised_count:promisedUnpaidCount,
    promised_unpaid_count:promisedUnpaidCount,
    config_missing_count:configMissingCount,
    dedupe_dropped_count:dedupeDroppedCount,
    has_more:pagination.has_more,
    source_status:sot.source_status,
    ttlock_missing_rent:sot.ttlock_missing_rent||[],
    ttlock_missing_rent_count:configMissingCount,
    source_authority:["existing_arrears_record","ttlock_expired_unpaid"],
    source:sot.source,
    source_function:sot.source_function,
    source_breakdown:sot.source_breakdown,
    limit:params.limit,
    offset:params.offset
  });
}
__name(handleBossArrearsFollowupTasks,"handleBossArrearsFollowupTasks");
async function empCloseArrearEverywhere(env,user,id,now){
  await empEnsureSchema(env);
  let changed=false;
  if(await empTableExists(env,"arrears")){
    await env.DB.prepare(
      `UPDATE arrears
         SET cleared=1, cleared_by=?, cleared_at=datetime("now")
         WHERE id=? AND corpid=?`
    ).bind(user.userid,id,user.corpid).run();
    changed=true;
  }
  const task=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(id,user.corpid).first();
  if(task&&empCloseStatusIsOpen(task.close_status)){
    await env.DB.prepare(
      `UPDATE arrear_tasks
         SET close_status='CLEARED',
             close_reason=CASE WHEN COALESCE(close_reason,'')='' THEN 'manager_clear' ELSE close_reason END,
             updated_by=?, updated_at=?
         WHERE task_id=? AND corpid=?`
    ).bind(user.userid,now,id,user.corpid).run();
    await empEvent(env,user,{ref_id:id,ref_type:"arrear_task",event_type:"close",field_name:"close_status",old_value:task.close_status||"",new_value:"CLEARED",operator_id:user.userid,ts:now});
    changed=true;
  }
  return changed;
}
__name(empCloseArrearEverywhere,"empCloseArrearEverywhere");
async function handleArrearTasks(request,env,user){
  const bed=arrearTasksBedFromRequest(request);
  const trace=[
    arrearTasksDiagnosticTraceStep("auth",true,{function_name:"requireAuth",bed,source:"authenticated_user"})
  ];
  try{
    const gateway=await canonicalArrearsGateway(env,user,{bed,limit:1000});
    trace.push(arrearTasksDiagnosticTraceStep("canonical_arrears_gateway",true,{function_name:"canonicalArrearsGateway",bed,count:gateway.open_items.length,source:"canonical_arrears_gateway"}));
    trace.push(arrearTasksDiagnosticTraceStep("response_mapping",true,{function_name:"handleArrearTasks",bed,count:gateway.open_items.length,source:"canonical_arrears_gateway"}));
    return json(arrearTasksPayload(gateway.open_items,gateway.closed_items,"canonical_arrears_gateway",trace,{
      gateway:"canonical_arrears_gateway",
      source_proof:gateway.source_proof,
      projection_result:gateway.projection_result,
      fallback_attempted:false,
      no_write:true,
      readonly:true
    }));
  }catch(e){
    trace.push(arrearTasksDiagnosticTraceStep("canonical_arrears_gateway",false,{function_name:"canonicalArrearsGateway",bed,error_code:"CANONICAL_ARREARS_GATEWAY_FAILED",message:empReadErrorCode(e),source:"canonical_arrears_gateway"}));
    trace.push(arrearTasksDiagnosticTraceStep("response_mapping",false,{function_name:"handleArrearTasks",bed,error_code:"ARREAR_TASKS_UNAVAILABLE",message:empReadErrorCode(e),source:"canonical_arrears_gateway_failed"}));
    return json({
      ...arrearTasksPayload([],[],"canonical_arrears_gateway_failed",trace,{
        success:false,
        ok:false,
        error_code:"ARREAR_TASKS_UNAVAILABLE",
        root_cause:"CANONICAL_ARREARS_GATEWAY_FAILED",
        message:"Arrears temporarily unavailable.",
        message_en:"Arrears temporarily unavailable.",
        message_zh:"欠款信息暂不可用。",
        fallback_attempted:false,
        projection_result:{ok:false,count:0,error_code:"CANONICAL_ARREARS_GATEWAY_FAILED"},
        no_write:true,
        readonly:true,
        safe_error:empReadErrorCode(e)
      })
    },200);
  }
}
__name(handleArrearTasks,"handleArrearTasks");
async function handleEmployeeBedContext(request,env,user){
  const url=new URL(request.url);
  const bed=cleanText(url.searchParams.get("bed")||"",80).replace(/^#/,"");
  try{
    return success(await canonicalBedContextGateway(env,user,{bed,limit:1000}));
  }catch(e){
    return json({
      success:false,
      ok:false,
      gateway:"canonical_bed_context_gateway",
      bed,
      error_code:"BED_CONTEXT_UNAVAILABLE",
      message:"Bed context temporarily unavailable.",
      message_en:"Bed context temporarily unavailable.",
      message_zh:"床位信息暂不可用。",
      safe_error:empReadErrorCode(e),
      no_write:true,
      readonly:true
    },200);
  }
}
__name(handleEmployeeBedContext,"handleEmployeeBedContext");
async function handleOwnerBedStatus(request,env,user){
  if(!canReadOwnerData(user))return forbidden();
  const url=new URL(request.url);
  const bed=cleanText(url.searchParams.get("bed")||"",80).replace(/^#/,"");
  try{
    return success(await canonicalOccupancyGateway(env,user,{bed,limit:1000}));
  }catch(e){
    return json({
      success:false,
      ok:false,
      gateway:"canonical_occupancy_bed_status_gateway",
      bed,
      error_code:"BED_STATUS_UNAVAILABLE",
      message:"Bed status temporarily unavailable.",
      message_en:"Bed status temporarily unavailable.",
      message_zh:"床位状态暂不可用。",
      safe_error:empReadErrorCode(e),
      no_write:true,
      readonly:true
    },200);
  }
}
__name(handleOwnerBedStatus,"handleOwnerBedStatus");
async function handleArrearTaskDirective(request,env,user){
  if(!requireManager(user))return forbidden();
  await empEnsureSchema(env);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const ids=Array.isArray(body?.task_ids)?body.task_ids.map(x=>cleanId(x)).filter(Boolean):[];
  const uniqueIds=[...new Set(ids)].slice(0,100);
  const dueDate=empCleanIsoDate(body?.due_date);
  if(!uniqueIds.length)return badRequest("task_ids_required");
  if(!dueDate)return badRequest("due_date_required");
  if(dueDate<empTodayDubai())return badRequest("due_date_in_past");
  const note=cleanText(body?.note||"",500);
  const actor=cleanText(user.userid,80);
  const now=empNow();
  let updatedCount=0;
  const notFound=[];
  for(const taskId of uniqueIds){
    let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
    if(!old&&await empTableExists(env,"arrears")){
      const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
      if(legacy){
        const mapped=empLegacyArrearToTask(legacy);
        await empInsertDynamic(env,"arrear_tasks",{
          ...mapped,
          created_by:actor,
          updated_by:actor,
          updated_at:now
        },EMP_TASK_COLUMNS);
        old=mapped;
      }
    }
    if(!old||!empCloseStatusIsOpen(old.close_status)){notFound.push(taskId);continue;}
    const updates=[
      "boss_requested_at=?",
      "boss_requested_by=?",
      "boss_requested_due_date=?",
      "directive_status='pending'",
      "updated_by=?",
      "updated_at=?"
    ];
    const vals=[now,actor,dueDate,actor,now];
    if(note){
      updates.push("owner_note=?");
      vals.push(note);
    }
    vals.push(taskId,user.corpid);
    const result=await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
    const changes=Number(result?.meta?.changes??result?.changes??0);
    if(changes>0){
      updatedCount+=changes;
      await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"directive",field_name:"directive_status",old_value:old.directive_status||"none",new_value:"pending",operator_id:actor,ts:now});
    }else{
      notFound.push(taskId);
    }
  }
  await audit(env,user,"arrear_task.directive",uniqueIds.join(","),{due_date:dueDate,updated_count:updatedCount,not_found:notFound.length}).catch(()=>{});
  return success({success:true,updated_count:updatedCount,not_found:notFound});
}
__name(handleArrearTaskDirective,"handleArrearTaskDirective");
async function arrearsDirectiveRequestHash(payload){
  return hscSha256(JSON.stringify(hscStableValue(payload)));
}
__name(arrearsDirectiveRequestHash,"arrearsDirectiveRequestHash");
async function arrearsDirectiveIdempotencyReplay(env,options){
  const row=await env.DB.prepare(
    `SELECT * FROM request_idempotency_keys
     WHERE scope=? AND action=? AND idempotency_key=?
     LIMIT 1`
  ).bind(options.scope,options.action,options.idempotencyKey).first();
  if(!row)return null;
  if(row.actor_user_id!==options.actorUserId||row.actor_role!==options.actorRole||row.request_hash!==options.requestHash){
    return errorResponse("idempotency_conflict",409,"idempotency_conflict");
  }
  if(row.response_body){
    try{
      return json(JSON.parse(row.response_body),200,{"X-Idempotency-Replayed":"true"});
    }catch{
      return success({success:true,idempotency_status:"IDEMPOTENT_REPLAY"},200,{"X-Idempotency-Replayed":"true"});
    }
  }
  return success({success:true,idempotency_status:"IDEMPOTENT_REPLAY"},200,{"X-Idempotency-Replayed":"true"});
}
__name(arrearsDirectiveIdempotencyReplay,"arrearsDirectiveIdempotencyReplay");
async function arrearsDirectiveRecordIdempotency(env,options,responseBody){
  const responseText=JSON.stringify(responseBody);
  const responseHash=await hscSha256(responseText);
  await env.DB.prepare(
    `INSERT INTO request_idempotency_keys (
      id, scope, idempotency_key, actor_user_id, actor_role, action,
      request_hash, response_hash, response_body, resource_type, resource_id,
      status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    empId("idem"),
    options.scope,
    options.idempotencyKey,
    options.actorUserId,
    options.actorRole,
    options.action,
    options.requestHash,
    responseHash,
    responseText,
    options.resourceType||"",
    options.resourceId||"",
    options.status||"RECORDED",
    empNow(),
    options.expiresAt||""
  ).run();
}
__name(arrearsDirectiveRecordIdempotency,"arrearsDirectiveRecordIdempotency");
function empTaskToEmployeeDirective(t){
  const view=empTaskToBossArrear(t);
  return {
    id:view.task_id||view.id,
    directive_id:view.task_id||view.id,
    task_id:view.task_id||view.id,
    room_bed:view.room_bed,
    customer_code:view.customer_code,
    amount_fils:view.amount_fils,
    source_type:view.source_type,
    due_date:view.due_date,
    overdue_days:view.overdue_days,
    directive_status:normalizeDirectiveStatusForEmployee(view.directive_status),
    promised_payment_date:view.promised_payment_date,
    followup_note:view.followup_note,
    owner_note:view.owner_note,
    assigned_employee_id:cleanText(t?.userid||"",80),
    assigned_employee_name:cleanText(t?.userid||"",80),
    staff_promised_at:view.staff_promised_at
  };
}
__name(empTaskToEmployeeDirective,"empTaskToEmployeeDirective");
async function handleBossArrearsDirectives(request,env,user){
  if(!requireManager(user))return forbidden();
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const ids=Array.isArray(body?.task_ids)?body.task_ids.map(x=>cleanId(x)).filter(Boolean):[];
  const uniqueIds=[...new Set(ids)].slice(0,100);
  const idempotencyKey=cleanText(body?.idempotency_key||request.headers.get("Idempotency-Key")||"",120);
  if(!uniqueIds.length)return badRequest("task_ids_required");
  if(!idempotencyKey)return badRequest("idempotency_key_required");
  if(!arrearsDirectiveWriteApproved(env))return arrearsDirectiveApprovalRequired("boss_arrears_directives_create");
  await empEnsureSchema(env);
  const assignedFallback=cleanText(body?.assigned_employee_id||"",80);
  const note=cleanText(body?.note||"",500);
  const actor=cleanText(user.userid,80);
  const action="boss_arrears_directive_create";
  const requestHash=await arrearsDirectiveRequestHash({
    corpid:user.corpid,
    actor,
    assigned_employee_id:assignedFallback,
    note,
    materialization_version:"v1",
    task_ids:uniqueIds
  });
  const replay=await arrearsDirectiveIdempotencyReplay(env,{
    scope:user.corpid,
    action,
    idempotencyKey,
    requestHash,
    actorUserId:actor,
    actorRole:user.role
  });
  if(replay)return replay;
  const now=empNow();
  const sourceResolution=await empResolveBossSotTaskMap(env,user,uniqueIds);
  const candidates=[];
  const blocked=[];
  for(const taskId of uniqueIds){
    const persisted=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
    if(persisted){
      if(!empCloseStatusIsOpen(persisted.close_status)){
        blocked.push({task_id:taskId,reason:"not_open"});
      }else{
        candidates.push({input_task_id:taskId,row:persisted,materialized:false,reused:true});
      }
      continue;
    }
    const sotTask=sourceResolution.map.get(taskId);
    if(!sotTask){
      blocked.push({task_id:taskId,reason:"not_found_in_boss_sot"});
      continue;
    }
    const contract=await empMaterializableTaskContract(sotTask,user);
    if(!contract.ok){
      blocked.push({task_id:taskId,reason:contract.reason||"materialization_contract_failed"});
      continue;
    }
    candidates.push({input_task_id:taskId,sotTask,contract,materialized:false,reused:false});
  }
  if(blocked.length){
    return errorResponse("materialization_blocked",422,void 0,{
      requested_count:uniqueIds.length,
      materialized_count:0,
      created_count:0,
      skipped_already_assigned_count:0,
      blocked_count:blocked.length,
      blocked_reasons:blocked,
      all_or_nothing:true
    });
  }
  let materializedCount=0;
  const materializedTaskIds=[];
  for(const candidate of candidates){
    if(candidate.row){
      materializedTaskIds.push(candidate.row.task_id);
      continue;
    }
    const materialized=await materializeArrearsTaskFromSot(env,user,candidate.sotTask,{assigned_employee_id:assignedFallback,actor,now});
    if(!materialized.ok){
      return errorResponse("materialization_blocked",422,void 0,{
        requested_count:uniqueIds.length,
        materialized_count:materializedCount,
        created_count:0,
        skipped_already_assigned_count:0,
        blocked_count:1,
        blocked_reasons:[{task_id:candidate.input_task_id,reason:materialized.reason||"materialization_failed"}],
        all_or_nothing:true
      });
    }
    candidate.row=materialized.row;
    candidate.materialized=!!materialized.materialized;
    candidate.reused=!!materialized.reused;
    if(materialized.materialized)materializedCount+=1;
    materializedTaskIds.push(materialized.row.task_id);
  }
  let createdCount=0;
  let skippedDuplicateCount=0;
  const notFound=[];
  const directives=[];
  const createdTaskIds=[];
  for(const candidate of candidates){
    const old=candidate.row;
    const taskId=old?.task_id||candidate.input_task_id;
    if(!old||!empCloseStatusIsOpen(old.close_status)){notFound.push(taskId);continue;}
    const current=empDirectiveStatus(old);
    if(["assigned","pending","viewed","promised","followed_up","needs_review"].includes(current)){
      skippedDuplicateCount+=1;
      directives.push(empTaskToEmployeeDirective(old));
      continue;
    }
    const assigned=assignedFallback||cleanText(old.userid||"",80)||actor;
    const updates=[
      "userid=?",
      "boss_requested_at=?",
      "boss_requested_by=?",
      "directive_status='assigned'",
      "updated_by=?",
      "updated_at=?"
    ];
    const vals=[assigned,now,actor,actor,now];
    if(note){updates.push("owner_note=?");vals.push(note);}
    vals.push(taskId,user.corpid);
    const result=await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
    const changes=Number(result?.meta?.changes??result?.changes??0);
    if(changes>0){
      createdCount+=changes;
      createdTaskIds.push(taskId);
      const updated={...old,userid:assigned,boss_requested_at:now,boss_requested_by:actor,directive_status:"assigned",owner_note:note||old.owner_note,updated_by:actor,updated_at:now};
      directives.push(empTaskToEmployeeDirective(updated));
      await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"directive_assigned",field_name:"directive_status",old_value:old.directive_status||"none",new_value:"assigned",operator_id:actor,ts:now});
    }else{
      notFound.push(taskId);
    }
  }
  const responseBody=ok({
    ok:true,
    requested_count:uniqueIds.length,
    materialized_count:materializedCount,
    created_count:createdCount,
    skipped_already_assigned_count:skippedDuplicateCount,
    skipped_duplicate_count:skippedDuplicateCount,
    blocked_count:notFound.length,
    blocked_reasons:notFound.map(task_id=>({task_id,reason:"not_open_or_update_failed"})),
    created_task_ids:createdTaskIds,
    materialized_task_ids:materializedTaskIds,
    not_found:notFound,
    directives,
    idempotency_status:"NEW"
  });
  await arrearsDirectiveRecordIdempotency(env,{
    scope:user.corpid,
    action,
    idempotencyKey,
    requestHash,
    actorUserId:actor,
    actorRole:user.role,
    resourceType:"arrear_task",
    resourceId:materializedTaskIds.join(",")||uniqueIds.join(","),
    status:"SUCCESS"
  },responseBody);
  await audit(env,user,"boss.arrears.directives.create",uniqueIds.join(","),{
    idempotency_key:idempotencyKey,
    requested_count:uniqueIds.length,
    materialized_count:materializedCount,
    created_count:createdCount,
    skipped_duplicate_count:skippedDuplicateCount,
    blocked_count:notFound.length,
    not_found:notFound.length
  }).catch(()=>{});
  return json(responseBody);
}
__name(handleBossArrearsDirectives,"handleBossArrearsDirectives");
async function handleEmployeeSystemReminders(request,env,user){
  if(!isStaffRoleValue(user?.role))return forbidden();
  const url=new URL(request.url);
  const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||100),1),500);
  const sot=await resolveCurrentReceivablesSot(env,user,{limit,ttlockTimeoutMs:8000});
  const sourceBreakdown={
    overdue_count:sot.source_breakdown?.overdue_count||0,
    due_today_count:sot.source_breakdown?.due_today_count||0,
    due_soon_count:sot.source_breakdown?.due_soon_count||0,
    ttlock_overdue_count:sot.source_breakdown?.ttlock_overdue_count||0,
    ttlock_due_today_count:sot.source_breakdown?.ttlock_due_today_count||0,
    ttlock_due_soon_count:sot.source_breakdown?.ttlock_due_soon_count||0,
    ttlock_expired_unpaid_count:sot.source_breakdown?.ttlock_expired_unpaid_count||0,
    existing_arrears_count:sot.source_breakdown?.existing_arrears_count||0,
    action_count:sot.source_breakdown?.action_count||0,
    amount_fils:sot.source_breakdown?.amount_fils||0,
    outstanding_amount_fils:sot.source_breakdown?.outstanding_amount_fils||0
  };
  return success({
    success:true,
    readonly:true,
    tasks:sot.all_rows||[],
    all_tasks:sot.all_rows||[],
    summary:{
      total_count:sot.summary?.total_count||0,
      total_amount_fils:sot.summary?.total_amount_fils||0,
      existing_arrears_count:sot.summary?.existing_arrears_count||0,
      ttlock_expired_unpaid_count:sot.summary?.ttlock_expired_unpaid_count||0,
      promised_unpaid_count:0,
      config_missing_count:sot.summary?.config_missing_count||0,
      required_followup_count:sourceBreakdown.action_count,
      action_count:sourceBreakdown.action_count,
      overdue_count:sourceBreakdown.overdue_count,
      due_today_count:sourceBreakdown.due_today_count,
      due_soon_count:sourceBreakdown.due_soon_count
    },
    source_breakdown:sourceBreakdown,
    sources:{
      existing_arrears_record:sot.sources?.existing_arrears_record||empSourceContract({},0),
      ttlock_expired_unpaid:sot.sources?.ttlock_expired_unpaid||empSourceContract({},0)
    },
    source_authority:["existing_arrears_record","ttlock_expired_unpaid"],
    source_status:sot.source_status,
    source:sot.source,
    source_function:sot.source_function,
    generated_at:empNow(),
    production_cutover:"PRODUCTION_NO_GO"
  });
}
__name(handleEmployeeSystemReminders,"handleEmployeeSystemReminders");
async function handleEmployeeArrearsDirectives(request,env,user){
  if(!isStaffRoleValue(user?.role))return forbidden();
  const rows=await env.DB.prepare(
    `SELECT * FROM arrear_tasks
      WHERE corpid=? AND userid=?
        AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WRITTEN_OFF','WAIVED','closed','paid','cleared')
        AND COALESCE(directive_status,'none') IN ('assigned','pending','viewed','promised','followed_up','needs_review','overdue')
      ORDER BY COALESCE(boss_requested_at,updated_at,created_at) DESC
      LIMIT 100`
  ).bind(user.corpid,user.userid).all();
  const directives=(rows.results||[]).map(empTaskToEmployeeDirective);
  return success({success:true,directives,tasks:directives});
}
__name(handleEmployeeArrearsDirectives,"handleEmployeeArrearsDirectives");
async function handleEmployeeArrearsDirectiveFollowup(request,env,user,taskId){
  if(!isStaffRoleValue(user?.role))return forbidden();
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  if(body?.promised_amount!==void 0||body?.promise_amount!==void 0||body?.promised_amount_fils!==void 0)return badRequest("promised_amount_not_allowed");
  const idempotencyKey=cleanText(body?.idempotency_key||request.headers.get("Idempotency-Key")||"",120);
  if(!idempotencyKey)return badRequest("idempotency_key_required");
  const promisedDate=empCleanIsoDate(body?.promised_payment_date||"");
  if(!promisedDate)return badRequest("promised_payment_date_required");
  if(promisedDate<empTodayDubai())return badRequest("promise_date_in_past");
  const note=cleanText(body?.followup_note||"",500);
  if(!arrearsDirectiveWriteApproved(env))return arrearsDirectiveApprovalRequired("employee_arrears_directive_followup");
  await empEnsureSchema(env);
  const action="employee_arrears_followup_update";
  const requestHash=await arrearsDirectiveRequestHash({
    corpid:user.corpid,
    actor:user.userid,
    task_id:taskId,
    promised_payment_date:promisedDate,
    followup_note:note
  });
  const replay=await arrearsDirectiveIdempotencyReplay(env,{
    scope:user.corpid,
    action,
    idempotencyKey,
    requestHash,
    actorUserId:user.userid,
    actorRole:user.role
  });
  if(replay)return replay;
  const task=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? AND userid=? LIMIT 1").bind(taskId,user.corpid,user.userid).first();
  if(!task)return errorResponse("not_found",404,"not_found");
  const now=empNow();
  await env.DB.prepare(
    `UPDATE arrear_tasks
       SET promise_date=?,
           staff_note=?,
           directive_status='followed_up',
           staff_promised_at=?,
           last_followup_at=?,
           updated_by=?,
           updated_at=?
       WHERE task_id=? AND corpid=? AND userid=?`
  ).bind(promisedDate,note,now,now,user.userid,now,taskId,user.corpid,user.userid).run();
  await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"employee_followup",field_name:"promise_date",old_value:task.promise_date||"",new_value:promisedDate,operator_id:user.userid,ts:now});
  const responseBody=ok({success:true,directive:empTaskToEmployeeDirective({...task,promise_date:promisedDate,staff_note:note,directive_status:"followed_up",staff_promised_at:now,updated_by:user.userid,updated_at:now}),idempotency_status:"NEW"});
  await arrearsDirectiveRecordIdempotency(env,{
    scope:user.corpid,
    action,
    idempotencyKey,
    requestHash,
    actorUserId:user.userid,
    actorRole:user.role,
    resourceType:"arrear_task",
    resourceId:taskId,
    status:"SUCCESS"
  },responseBody);
  await audit(env,user,"employee.arrears.directive.followup",taskId,{idempotency_key:idempotencyKey,has_note:!!note}).catch(()=>{});
  return json(responseBody);
}
__name(handleEmployeeArrearsDirectiveFollowup,"handleEmployeeArrearsDirectiveFollowup");
async function handleArrearTaskUpdate(request,env,user){
  await empEnsureSchema(env);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const taskId=cleanId(body?.task_id);
  const patch=(body?.patch&&typeof body.patch==="object")?body.patch:{};
  if(!taskId)return badRequest("task_id_required");
  const isManager=requireManager(user);
  const actor=cleanText(user.userid,80);
  const now=empNow();
  const patchAmount=Number(String(patch.arrear_amount||0).replace(/,/g,""));
  const patchStatus=cleanText(patch.followup_status||"",40);
  const patchPromise=cleanDate(patch.promise_date||patch.promised_payment_date||"");
  const patchNote=cleanText(patch.staff_note||patch.followup_note||"",500);
  const managerStatuses=new Set(["待跟进","已联系","承诺付款","部分支付","已结清","无法联系","转老板处理"]);
  const staffStatuses=new Set(["待跟进","已联系","承诺付款","无法联系","转老板处理"]);
  if(patchStatus&&!(isManager?managerStatuses:staffStatuses).has(patchStatus))return badRequest("followup_status_invalid");
  if(patchStatus==="承诺付款"&&!patchPromise)return badRequest("promise_date_required");
  if(patchPromise&&patchPromise<empTodayDubai())return badRequest("promise_date_in_past");
  if(patchStatus&&patchStatus!=="待跟进"&&!patchNote)return badRequest("staff_note_required");
  let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
  const taskAnchor=cleanDate(patch.original_period_end||old?.original_period_end||old?.promise_date||"");
  if(taskAnchor&&empDaysBetween(taskAnchor,empTodayDubai())>3){
    const effectivePromise=patchPromise||cleanDate(old?.promise_date||"");
    const effectiveNote=patchNote||cleanText(old?.staff_note||"",500);
    if(!effectivePromise||!effectiveNote)return badRequest("overdue_followup_required");
    if(effectivePromise<empTodayDubai())return badRequest("promise_date_in_past");
  }
  if(!old){
    const fallback=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
    const isLockDue=/^LOCKDUE-[A-Za-z0-9_-]+-\d{8}$/.test(taskId);
    if(!isManager&&!fallback&&!isLockDue)return forbidden();
    const bed=cleanText(fallback?.room||patch.bed,40).replace(/^#+/,"");
    const amount=Number(fallback?.remain??patch.arrear_amount??0);
    if(!bed)return badRequest("bed_required");
    if(!Number.isFinite(amount)||amount<=0)return badRequest("arrear_amount_required");
    if(!fallback&&!isManager){
      const configuredRent=await empRentForBed(env,user.corpid,bed);
      if(!configuredRent)return badRequest("rent_config_missing");
      if(Math.abs(amount-configuredRent)>0.01)return badRequest("arrear_amount_must_match_configured_rent");
      const pEnd=cleanDate(patch.original_period_end||"");
      if(!pEnd||!taskId.endsWith("-"+pEnd.replaceAll("-","")))return badRequest("task_period_anchor_invalid");
    }
    const insertedTask={
      task_id:taskId,corpid:user.corpid,userid:user.userid,entry_id:cleanText(fallback?.entry_id||patch.entry_id||"",80),bed,
      tenant_name:cleanText(patch.tenant_name||fallback?.tenant_name||"",120),arrear_amount:cleanMoney(amount),
      arrear_reason:cleanText(patch.arrear_reason||fallback?.note||"欠款",120),created_at:cleanText(fallback?.created_at||now,40),
      followup_status:patchStatus||"待跟进",promise_date:patchPromise,promise_amount:cleanMoney(patch.promise_amount||0),
      actual_received:isManager?cleanMoney(patch.actual_received||0):0,close_status:isManager?cleanText(patch.close_status,40):"",
      close_reason:isManager?cleanText(patch.close_reason,120):"",owner_note:cleanText(patch.owner_note||"",500),
      staff_note:patchNote,last_followup_at:now,tenant_card_id:cleanText(patch.tenant_card_id||"",80),
      original_entry_id:cleanText(patch.original_entry_id||"",80),original_period_start:cleanDate(patch.original_period_start||""),
      original_period_end:cleanDate(patch.original_period_end||""),created_by:actor,
      boss_requested_at:"",boss_requested_by:"",boss_requested_due_date:"",directive_status:"none",staff_promised_at:"",
      updated_by:actor,updated_at:now
    };
    await empInsertDynamic(env,"arrear_tasks",{
      ...insertedTask
    },EMP_TASK_COLUMNS);
    await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"create",field_name:"*",new_value:JSON.stringify(insertedTask),operator_id:actor,ts:now});
    await audit(env,user,"employee.arrear_task.create",taskId,{status:insertedTask.followup_status}).catch(()=>{});
    return success({success:true,created:true});
  }
  const updateValues={};
  if(isManager){
    const managerAllowed={
      followup_status:()=>patchStatus,
      promise_date:()=>patchPromise,
      promise_amount:()=>cleanMoney(patch.promise_amount||0),
      actual_received:()=>cleanMoney(patch.actual_received||0),
      arrear_reason:()=>cleanText(patch.arrear_reason,120),
      tenant_name:()=>cleanText(patch.tenant_name,120),
      tenant_card_id:()=>cleanText(patch.tenant_card_id,80),
      bed:()=>cleanText(patch.bed,40).replace(/^#+/,""),
      arrear_amount:()=>cleanMoney(patch.arrear_amount||0),
      original_period_start:()=>cleanDate(patch.original_period_start||""),
      original_period_end:()=>cleanDate(patch.original_period_end||""),
      close_status:()=>cleanText(patch.close_status,40),
      close_reason:()=>cleanText(patch.close_reason,120),
      owner_note:()=>cleanText(patch.owner_note,500),
      staff_note:()=>patchNote,
      last_followup_at:()=>now
    };
    for(const [k,fn] of Object.entries(managerAllowed)){
      if(patch[k]!==void 0)updateValues[k]=fn();
    }
    if(patch.promised_payment_date!==void 0)updateValues.promise_date=patchPromise;
    if(patch.followup_note!==void 0)updateValues.staff_note=patchNote;
  }else{
    const staffAllowed=new Set(["followup_status","promise_date","promised_payment_date","promise_amount","promised_amount","promised_amount_fils","staff_note","followup_note"]);
    const illegal=Object.keys(patch).filter(k=>!staffAllowed.has(k));
    if(illegal.length)return badRequest("staff_field_not_allowed");
    if(patch.followup_status!==void 0)updateValues.followup_status=patchStatus||"待跟进";
    if(patch.promise_date!==void 0||patch.promised_payment_date!==void 0)updateValues.promise_date=patchPromise;
    // promise_amount / promised_amount* are legacy optional compatibility fields.
    // Staff follow-up now uses system amount plus promise_date and staff_note only.
    if(patch.staff_note!==void 0||patch.followup_note!==void 0)updateValues.staff_note=patchNote;
    if(Object.keys(updateValues).length)updateValues.last_followup_at=now;
  }
  if(!Object.keys(updateValues).length)return badRequest("no_update_fields");
  const bossDue=empCleanIsoDate(old?.boss_requested_due_date||"");
  const promisedAfterBossDue=!isManager&&bossDue&&patchPromise&&patchPromise>bossDue;
  if(!isManager&&empDirectiveStatus(old)==="pending"){
    updateValues.directive_status="promised";
    updateValues.staff_promised_at=now;
  }
  updateValues.updated_by=actor;
  updateValues.updated_at=now;
  const updates=[];const vals=[];
  for(const [k,v] of Object.entries(updateValues)){updates.push(`${k}=?`);vals.push(v);}
  vals.push(taskId,user.corpid);
  await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
  for(const [k,v] of Object.entries(updateValues)){
    if(String(old?.[k]??"")!==String(v??"")){
      await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"update",field_name:k,old_value:old?.[k],new_value:v,operator_id:actor,ts:now});
    }
  }
  if(promisedAfterBossDue){
    await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"directive_warning",field_name:"promise_date",old_value:bossDue,new_value:patchPromise,operator_id:actor,ts:now});
  }
  await audit(env,user,"employee.arrear_task.update",taskId,{status:patch.followup_status||"",directive_status:updateValues.directive_status||old?.directive_status||"none",promise_after_requested_due:!!promisedAfterBossDue}).catch(()=>{});
  return success({success:true,directive_status:updateValues.directive_status||empDirectiveStatus(old)});
}
__name(handleArrearTaskUpdate,"handleArrearTaskUpdate");
function bedTransferCleanBed(value){
  return cleanText(value,40).replace(/^#+/,"").trim();
}
__name(bedTransferCleanBed,"bedTransferCleanBed");
function bedTransferAedToFils(value){
  const amount=cleanMoney(value||0,0,MAX_MONEY);
  return Math.round(amount*100);
}
__name(bedTransferAedToFils,"bedTransferAedToFils");
function bedTransferFilsToAed(value){
  const num=Number(value||0);
  return Number.isFinite(num)?Math.round(num)/100:0;
}
__name(bedTransferFilsToAed,"bedTransferFilsToAed");
async function bedTransferRequiredTablesReady(env){
  const required=["bed_transfer_events","request_idempotency_keys","entry_events"];
  const missing=[];
  for(const table of required){
    if(!await empTableExists(env,table).catch(()=>false))missing.push(table);
  }
  return {ready:missing.length===0,missing};
}
__name(bedTransferRequiredTablesReady,"bedTransferRequiredTablesReady");
async function bedTransferOpenArrearsAed(env,user,fromBed){
  const projectionRows=await getOpenCloudArrearsForBed(env,user,fromBed,{limit:1000}).catch(()=>[]);
  if(projectionRows.length)return projectionRows.reduce((sum,row)=>sum+entryAnchorMoney(row.remaining_arrears||empTaskRemaining(row)),0);
  if(!await empTableExists(env,"arrear_tasks").catch(()=>false))return 0;
  const rows=await env.DB.prepare(`SELECT arrear_amount, actual_received, close_status
    FROM arrear_tasks
    WHERE corpid=? AND bed=?
      AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废')`)
    .bind(user.corpid,fromBed).all().catch(()=>({results:[]}));
  return (rows.results||[]).reduce((sum,row)=>{
    const amount=cleanMoney(row?.arrear_amount||0);
    const received=cleanMoney(row?.actual_received||0);
    return sum+Math.max(0,amount-received);
  },0);
}
__name(bedTransferOpenArrearsAed,"bedTransferOpenArrearsAed");
async function bedTransferRequestHash(payload){
  return hscSha256(JSON.stringify(hscStableValue(payload)));
}
__name(bedTransferRequestHash,"bedTransferRequestHash");
function bedTransferParseReviewFlags(value){
  try{
    const parsed=JSON.parse(cleanText(value||"[]",1000)||"[]");
    return Array.isArray(parsed)?parsed.map((x)=>cleanText(x,80)).filter(Boolean):[];
  }catch{
    return [];
  }
}
__name(bedTransferParseReviewFlags,"bedTransferParseReviewFlags");
function bedTransferEventView(row){
  return {
    id:cleanText(row?.id||"",80),
    transfer_id:cleanText(row?.transfer_id||"",100),
    from_bed:cleanText(row?.from_bed||"",40),
    to_bed:cleanText(row?.to_bed||"",40),
    transfer_date:cleanDate(row?.transfer_date||""),
    effective_date:cleanDate(row?.effective_date||""),
    customer_code:cleanText(row?.customer_code||"",80),
    customer_display_name:cleanText(row?.customer_display_name||"",120),
    original_deposit_amount_fils:Number(row?.original_deposit_amount_fils||0),
    current_rent_amount_fils:Number(row?.current_rent_amount_fils||0),
    new_bed_rent_amount_fils:Number(row?.new_bed_rent_amount_fils||0),
    rent_difference_fils:Number(row?.rent_difference_fils||0),
    transfer_fee_fils:Number(row?.transfer_fee_fils ?? row?.amount_fils ?? 0),
    amount_fils:Number(row?.amount_fils ?? row?.transfer_fee_fils ?? 0),
    fee_mode:cleanText(row?.fee_mode||((Number(row?.amount_fils ?? row?.transfer_fee_fils ?? 0)>0)?"charged":"waived"),20),
    waiver_reason:cleanText(row?.waiver_reason||"",240),
    category:cleanText(row?.category||"bed_transfer_fee",40),
    review_flags:bedTransferParseReviewFlags(row?.review_flags),
    carry_over_arrears_fils:Number(row?.carry_over_arrears_fils||0),
    old_ttlock_ref:cleanText(row?.old_ttlock_ref||"",80),
    old_lock_valid_from:cleanDate(row?.old_lock_valid_from||""),
    old_lock_valid_until:cleanDate(row?.old_lock_valid_until||""),
    reason:cleanText(row?.reason||"",120),
    note:cleanText(row?.note||"",500),
    operator_employee:cleanText(row?.operator_employee||"",80),
    status:cleanText(row?.status==="pending_review"?"recorded":row?.status||"recorded",40),
    audit_id:cleanText(row?.audit_id||"",80),
    trace_id:cleanText(row?.trace_id||"",80),
    entry_event_id:cleanText(row?.entry_event_id||row?.trace_id||"",80),
    qa_tag:cleanText(row?.qa_tag||"",120),
    created_at:cleanText(row?.created_at||"",40),
    review_required:false,
    record_only:true
  };
}
__name(bedTransferEventView,"bedTransferEventView");
function bedTransferWriteApproved(env={}){
  return String(env?.BED_TRANSFER_WRITE_APPROVED??"").trim()==="true";
}
__name(bedTransferWriteApproved,"bedTransferWriteApproved");
function bedTransferWriteDisabledResponse(){
  return json({
    success:false,
    ok:false,
    error:"bed_transfer_write_disabled_phase1_safety",
    dry_run_only:true,
    validate_endpoint:"/api/employee/entry/validate",
    production_cutover:"PRODUCTION_NO_GO"
  },409);
}
__name(bedTransferWriteDisabledResponse,"bedTransferWriteDisabledResponse");
function bedTransferCanonicalPathRequiredResponse(){
  return json({
    success:false,
    ok:false,
    error_code:"BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED",
    event_type:"bed_transfer",
    canonical_write_endpoint:"/api/employee/entry",
    validate_endpoint:"/api/employee/entry/validate",
    bed_transfer_write_enabled:false,
    write_attempted:false,
    business_data_written:false,
    message:"Use the canonical employee entry path. Bed Transfer writing remains disabled; no business data was written.",
    production_cutover:"PRODUCTION_NO_GO"
  },409);
}
__name(bedTransferCanonicalPathRequiredResponse,"bedTransferCanonicalPathRequiredResponse");
function isBedTransferSaveSessionEntry(entry){
  if(!entry||typeof entry!=="object"||Array.isArray(entry))return false;
  const eventType=cleanText(entry.event_type||entry.eventType||"",60).toLowerCase();
  if(eventType==="bed_transfer"||eventType==="bed_transfer_fee")return true;
  const legacyType=cleanText(entry.type||entry.reason_code||"",20).toUpperCase();
  if(["TF","TFF","T","TRANSFER","BED_TRANSFER","BED_TRANSFER_FEE"].includes(legacyType))return true;
  if(cleanText(entry.tag||"",40).toLowerCase()==="transfer")return true;
  return ["TF","TFF"].includes(employeeEntryUploadType(entry));
}
__name(isBedTransferSaveSessionEntry,"isBedTransferSaveSessionEntry");
function saveSessionContainsBedTransfer(body={}){
  const candidates=[
    body?.entry,
    body?.transaction,
    body?.session?.entry,
    body?.session,
    ...(Array.isArray(body?.entries)?body.entries:[]),
    ...(Array.isArray(body?.transactions)?body.transactions:[]),
    ...(Array.isArray(body?.session?.entries)?body.session.entries:[]),
    ...(Array.isArray(body?.session?.transactions)?body.session.transactions:[])
  ];
  return candidates.some(isBedTransferSaveSessionEntry);
}
__name(saveSessionContainsBedTransfer,"saveSessionContainsBedTransfer");
async function handleEmployeeBedTransferCreate(request,env,user){
  return bedTransferCanonicalPathRequiredResponse();
}
__name(handleEmployeeBedTransferCreate,"handleEmployeeBedTransferCreate");
function authSafeId(value){
  return cleanText(value,100);
}
__name(authSafeId,"authSafeId");
async function handleOwnerBedTransfers(request,env,user){
  if(!canReadOwnerData(user))return forbidden();
  if(!await empTableExists(env,"bed_transfer_events").catch(()=>false)){
    return success({transfers:[],count:0,schema_ready:false,readonly:isReadonlyAdminRoleValue(user.role)});
  }
  const url=new URL(request.url);
  const status=cleanText(url.searchParams.get("status")||"",40);
  const rawLimit=Number(url.searchParams.get("limit")||50);
  const limit=Number.isFinite(rawLimit)&&rawLimit>0?Math.min(Math.floor(rawLimit),100):50;
  const where=["corp_id=?"];
  const params=[user.corpid];
  if(status==="recorded"){
    where.push("status IN ('recorded','pending_review')");
  }else if(status){
    where.push("status=?");
    params.push(status);
  }
  params.push(limit);
  const rows=await env.DB.prepare(`SELECT * FROM bed_transfer_events
    WHERE ${where.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT ?`).bind(...params).all().catch(()=>({results:[]}));
  const transfers=(rows.results||[]).map(bedTransferEventView);
  return success({
    transfers,
    count:transfers.length,
    schema_ready:true,
    readonly:isReadonlyAdminRoleValue(user.role),
    production_cutover:"PRODUCTION_NO_GO"
  });
}
__name(handleOwnerBedTransfers,"handleOwnerBedTransfers");
async function handleOwnerCloudArrearsProjection(request,env,user){
  if(!canReadOwnerData(user))return forbidden();
  const url=new URL(request.url);
  const bed=cleanText(url.searchParams.get("bed")||"",80).replace(/^#/,"");
  const sessionId=cleanId(url.searchParams.get("session_id")||url.searchParams.get("sessionId")||"");
  const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||1000),1),2000);
  const projection=sessionId
    ? await updateCloudArrearsProjectionForSession(env,user,sessionId,{limit,bed})
    : bed
      ? await rebuildCloudArrearsForBed(env,user,bed,{limit})
      : await rebuildAllCloudArrears(env,user,{limit});
  return success({
    success:true,
    projection,
    open_items:projection.open_items||[],
    closed_items:projection.closed_items||[],
    source:"cloud_arrears_projection",
    materialized_from:"sessions.entries_json",
    readonly:true,
    production_cutover:"PRODUCTION_NO_GO"
  });
}
__name(handleOwnerCloudArrearsProjection,"handleOwnerCloudArrearsProjection");
function ownerCorrectionPreviewMoney(value){
  return Math.round((Number(String(value??0).replace(/,/g,""))||0)*100)/100;
}
__name(ownerCorrectionPreviewMoney,"ownerCorrectionPreviewMoney");
function ownerCorrectionPreviewSessionTotals(session={},events=[]){
  const totals={
    cash:ownerCorrectionPreviewMoney(session.cash_handover),
    bank:ownerCorrectionPreviewMoney(session.bank_transfer_total),
    gross:ownerCorrectionPreviewMoney(session.gross_received),
    rent_income:0,
    deposit_liability:0,
    arrears_repaid:0,
    arrears_open:0,
    expense:0,
    transfer_fee:0
  };
  for(const event of events||[]){
    const type=String(event?.event_type||entryAnchorEventType(entryAnchorType(event))).toLowerCase();
    const method=entryAnchorPaymentMethod(event?.payment_method||event?.pay_type);
    const amount=ownerCorrectionPreviewMoney(event?.paid_amount??event?.payment_amount??event?.deposit_amount??event?.refund_amount??event?.expense_amount??event?.fee_amount??event?.amount);
    if(type==="rent")totals.rent_income+=ownerCorrectionPreviewMoney(event?.paid_amount??event?.amount);
    else if(type==="arrears_payment")totals.arrears_repaid+=ownerCorrectionPreviewMoney(event?.payment_amount??event?.amount);
    else if(type==="deposit_in")totals.deposit_liability+=ownerCorrectionPreviewMoney(event?.deposit_amount??event?.amount);
    else if(type==="deposit_out")totals.deposit_liability-=ownerCorrectionPreviewMoney(event?.refund_amount??event?.actual_refund_amount??event?.amount);
    else if(type==="expense")totals.expense+=ownerCorrectionPreviewMoney(event?.expense_amount??event?.amount);
    else if(type==="bed_transfer"||type==="bed_transfer_fee")totals.transfer_fee+=ownerCorrectionPreviewMoney(event?.fee_amount??event?.amount);
    if(!totals.gross&&["rent","arrears_payment","deposit_in","bed_transfer","bed_transfer_fee"].includes(type))totals.gross+=amount;
    if(!ownerCorrectionPreviewMoney(session.cash_handover)&&method==="cash"&&["rent","arrears_payment","deposit_in","bed_transfer","bed_transfer_fee"].includes(type))totals.cash+=amount;
    if(!ownerCorrectionPreviewMoney(session.bank_transfer_total)&&method==="bank"&&["rent","arrears_payment","deposit_in","bed_transfer","bed_transfer_fee"].includes(type))totals.bank+=amount;
  }
  for(const key of Object.keys(totals))totals[key]=ownerCorrectionPreviewMoney(totals[key]);
  return totals;
}
__name(ownerCorrectionPreviewSessionTotals,"ownerCorrectionPreviewSessionTotals");
function ownerCorrectionPreviewNoWriteProof(extra={}){
  return {
    dry_run:true,
    write_endpoints_called:[],
    d1_write_count:0,
    session_write_attempted:false,
    transaction_write_attempted:false,
    correction_write_attempted:false,
    arrear_task_write_attempted:false,
    deposit_write_attempted:false,
    owner_history_write_attempted:false,
    real_apply_called:false,
    write_guard_mode:"route_level_no_write",
    proof_limitations:"D1 write count is reported by route contract; preview route does not call write functions.",
    ...extra
  };
}
__name(ownerCorrectionPreviewNoWriteProof,"ownerCorrectionPreviewNoWriteProof");
function ownerCorrectionApplyEnabled(env){
  return ["1","true","yes","on"].includes(String(env.OWNER_CORRECTION_APPLY_ENABLED||"").trim().toLowerCase());
}
__name(ownerCorrectionApplyEnabled,"ownerCorrectionApplyEnabled");
function ownerCorrectionDisabledResponse(){
  return json({
    ok:false,
    mode:"owner_correction_apply_disabled",
    code:"OWNER_CORRECTION_APPLY_DISABLED",
    error_code:"OWNER_CORRECTION_APPLY_DISABLED",
    message:"Owner correction apply is disabled in this environment.",
    no_write:true,
    production_write:false,
    production_cutover:"PRODUCTION_NO_GO",
    no_write_proof:ownerCorrectionPreviewNoWriteProof()
  },403);
}
__name(ownerCorrectionDisabledResponse,"ownerCorrectionDisabledResponse");
function ownerCorrectionTargetScopeConfig(env={}){
  return {
    OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED:env.OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED,
    OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID:env.OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID,
    OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR:env.OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR,
    OWNER_CORRECTION_ALLOWED_TYPE:env.OWNER_CORRECTION_ALLOWED_TYPE,
    OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS:env.OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS,
    OWNER_CORRECTION_EXPECTED_GROSS_DELTA:env.OWNER_CORRECTION_EXPECTED_GROSS_DELTA,
    OWNER_CORRECTION_EXPECTED_CASH_DELTA:env.OWNER_CORRECTION_EXPECTED_CASH_DELTA,
    OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS:env.OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS,
    OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH:env.OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH,
    OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA:env.OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA,
    OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME:env.OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME,
    OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID:env.OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID
  };
}
__name(ownerCorrectionTargetScopeConfig,"ownerCorrectionTargetScopeConfig");
function ownerCorrectionTargetScopeRequiredResponse(targetScope){
  return json({
    ok:false,
    mode:"owner_correction_target_scope_required",
    code:"OWNER_CORRECTION_TARGET_SCOPE_REQUIRED",
    error_code:"OWNER_CORRECTION_TARGET_SCOPE_REQUIRED",
    message:"Owner correction apply requires target-scoped authorization.",
    invalid_corrections:targetScope?.errors||[],
    no_write:true,
    production_write:false,
    production_cutover:"PRODUCTION_NO_GO",
    no_write_proof:ownerCorrectionPreviewNoWriteProof({write_guard_mode:"target_scoped_authorization_required"})
  },403);
}
__name(ownerCorrectionTargetScopeRequiredResponse,"ownerCorrectionTargetScopeRequiredResponse");
function ownerCorrectionTargetSessionHash(session={}){
  return hashCorrectionStablePayload({
    id:session.id||"",
    anchor_id:session.anchor_id||"",
    entries_count:session.entries_count||0,
    cash_handover:session.cash_handover||0,
    bank_transfer_total:session.bank_transfer_total||0,
    gross_received:session.gross_received||0,
    export_text:session.export_text||"",
    entries_json:session.entries_json||"",
    updated_at:session.updated_at||session.exported_at||session.created_at||""
  });
}
__name(ownerCorrectionTargetSessionHash,"ownerCorrectionTargetSessionHash");
function ownerCorrectionNormalizeBody(body={},targetAnchor=""){
  return {
    anchor_contract_version:"owner_correction_anchor_v1",
    correction_session_id:cleanText(body?.correction_session_id||body?.correctionSessionId||`CORR-PREVIEW-${targetAnchor}`,180),
    correction_type:cleanText(body?.correction_type||body?.correctionType||"",120),
    target_session_anchor:targetAnchor||cleanText(body?.target_session_anchor||body?.targetSessionAnchor||"",160),
    target_session_id:cleanText(body?.target_session_id||body?.targetSessionId||"",160),
    correction_reason:cleanText(body?.correction_reason||body?.correctionReason||"",500),
    evidence_summary:cleanText(body?.evidence_summary||body?.evidenceSummary||"",1000),
    no_hard_delete:true,
    original_events_immutable:true,
    allow_negative_totals_owner_override:body?.allow_negative_totals_owner_override===true,
    correction_events:Array.isArray(body?.correction_events)?body.correction_events:[]
  };
}
__name(ownerCorrectionNormalizeBody,"ownerCorrectionNormalizeBody");
function ownerCorrectionBuildPreviewForSession(session,body,user){
  const targetAnchor=cleanText(body?.target_session_anchor||body?.targetSessionAnchor||body?.target_session_id||"",160);
  const originalEvents=extractEmployeeEntryAnchorsFromSession(session);
  const correction=ownerCorrectionNormalizeBody(body,targetAnchor);
  const preview=buildOwnerCorrectionDryRunPreview({
    id:session.id||"",
    session_id:session.id||"",
    anchor:session.anchor_id||targetAnchor,
    totals:ownerCorrectionPreviewSessionTotals(session,originalEvents),
    events:originalEvents
  },correction);
  const targetSessionContentHash=ownerCorrectionTargetSessionHash(session);
  const previewHash=buildOwnerCorrectionPreviewHash(preview,correction,{
    target_session_content_hash:targetSessionContentHash,
    owner_identity:cleanText(user?.userid||"",120)
  });
  return {preview:{...preview,preview_hash:previewHash,target_session_content_hash:targetSessionContentHash},correction,originalEvents,targetSessionContentHash};
}
__name(ownerCorrectionBuildPreviewForSession,"ownerCorrectionBuildPreviewForSession");
async function handleOwnerCorrectionPreview(request,env,user){
  if(!canReadOwnerData(user))return forbidden();
  if(request.method!=="POST")return errorResponse("method_not_allowed",405,"METHOD_NOT_ALLOWED");
  let body;
  try{body=await request.json();}catch{return json({ok:false,mode:"owner_correction_dry_run_preview_only",no_write:true,error_code:"INVALID_JSON",message:"Request body must be valid JSON.",no_write_proof:ownerCorrectionPreviewNoWriteProof()},400);}
  const targetAnchor=cleanText(body?.target_session_anchor||body?.targetSessionAnchor||body?.target_session_id||"",160);
  if(!targetAnchor)return json({ok:false,mode:"owner_correction_dry_run_preview_only",no_write:true,error_code:"TARGET_SESSION_ANCHOR_REQUIRED",message:"target_session_anchor is required.",invalid_corrections:[{code:"CORRECTION_SESSION_FIELD_MISSING",field:"target_session_anchor"}],no_write_proof:ownerCorrectionPreviewNoWriteProof()},422);
  if(!await empTableExists(env,"sessions").catch(()=>false)){
    return json({ok:false,mode:"owner_correction_dry_run_preview_only",no_write:true,error_code:"SESSIONS_TABLE_NOT_READY",message:"sessions table is not available.",no_write_proof:ownerCorrectionPreviewNoWriteProof()},503);
  }
  const session=await env.DB.prepare("SELECT * FROM sessions WHERE corpid=? AND (anchor_id=? OR id=?) LIMIT 1").bind(user.corpid,targetAnchor,targetAnchor).first().catch(()=>null);
  if(!session){
    return json({ok:false,mode:"owner_correction_dry_run_preview_only",no_write:true,error_code:"TARGET_SESSION_NOT_FOUND",message:"Target session was not found.",target_session_anchor:targetAnchor,no_write_proof:ownerCorrectionPreviewNoWriteProof()},404);
  }
  const {preview}=ownerCorrectionBuildPreviewForSession(session,{...body,target_session_anchor:targetAnchor},user);
  return json({
    ...preview,
    target_session_anchor:session.anchor_id||preview.target_session_anchor,
    target_session_id:session.id||preview.target_session_id,
    readonly:true,
    production_cutover:"PRODUCTION_NO_GO",
    no_write_proof:{...ownerCorrectionPreviewNoWriteProof(),...(preview.no_write_proof||{})}
  },preview.ok?200:422);
}
__name(handleOwnerCorrectionPreview,"handleOwnerCorrectionPreview");
function ownerCorrectionExistingScanResult(rows=[],fingerprint="",idempotencyKey="",originalEventIds=[]){
  const originalSet=new Set(originalEventIds.filter(Boolean));
  for(const row of rows||[]){
    const parsed=parseOwnerCorrectionAnchorText(row.export_text||"");
    if(!parsed?.found||!parsed?.correction)continue;
    const correction=parsed.correction;
    const existingFingerprint=String(correction.correction_request_fingerprint||"");
    const existingKey=String(correction.idempotency_key||"");
    if(existingKey&&existingKey===idempotencyKey&&existingFingerprint===fingerprint){
      return {ok:true,idempotent:true,existing:row,correction};
    }
    if(existingKey&&existingKey===idempotencyKey&&existingFingerprint!==fingerprint){
      return {ok:false,error_code:"IDEMPOTENCY_CONFLICT",message:"Same idempotency_key was already used with a different correction request.",existing:row};
    }
    const correctedIds=(correction.correction_events||[]).map(event=>String(event.original_event_id||"")).filter(Boolean);
    if(correctedIds.some(id=>originalSet.has(id))){
      return {ok:false,error_code:"ORIGINAL_EVENT_ALREADY_CORRECTED",message:"One or more original_event_id values were already corrected by an active correction.",existing:row,corrected_original_event_ids:correctedIds.filter(id=>originalSet.has(id))};
    }
  }
  return {ok:true,idempotent:false};
}
__name(ownerCorrectionExistingScanResult,"ownerCorrectionExistingScanResult");
async function ownerCorrectionFetchExistingCorrectionSessions(env,user,targetAnchor){
  if(!await empTableExists(env,"sessions").catch(()=>false))return [];
  const rows=await env.DB.prepare(`SELECT id, anchor_id, export_text, source, created_at FROM sessions
    WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID'
      AND COALESCE(export_text,'') LIKE '%CORRECTION ANCHORS JSON%'
      AND (COALESCE(export_text,'') LIKE ? OR COALESCE(anchor_id,'') LIKE 'CORR-%')
    ORDER BY created_at DESC LIMIT 1000`).bind(user.corpid,`%${targetAnchor}%`).all().catch(()=>({results:[]}));
  return rows.results||[];
}
__name(ownerCorrectionFetchExistingCorrectionSessions,"ownerCorrectionFetchExistingCorrectionSessions");
async function ownerCorrectionFetchCorrectionSessionsByTarget(env,user,targetKeys=[]){
  const wanted=new Set((targetKeys||[]).map(key=>cleanText(key,180)).filter(Boolean));
  const byTarget=new Map();
  if(!wanted.size||!await empTableExists(env,"sessions").catch(()=>false))return byTarget;
  const rows=await env.DB.prepare(`SELECT id, anchor_id, export_text, source, created_at FROM sessions
    WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID'
      AND COALESCE(export_text,'') LIKE '%CORRECTION ANCHORS JSON%'
    ORDER BY created_at DESC LIMIT 1000`).bind(user.corpid).all().catch(()=>({results:[]}));
  for(const row of rows.results||[]){
    const parsed=parseOwnerCorrectionAnchorText(row.export_text||"");
    const correction=parsed?.correction||null;
    if(!parsed?.found||!correction)continue;
    for(const key of [correction.target_session_anchor,correction.target_session_id]){
      const target=cleanText(key,180);
      if(!target||!wanted.has(target))continue;
      const list=byTarget.get(target)||[];
      list.push(row);
      byTarget.set(target,list);
    }
  }
  return byTarget;
}
__name(ownerCorrectionFetchCorrectionSessionsByTarget,"ownerCorrectionFetchCorrectionSessionsByTarget");
async function ownerHistoryArchiveDetailRows(env,user,sessionRow={},includeArchiveRows=false){
  if(!sessionRow?.id)return {rows:[],source:"none"};
  const hasTransactions=await empTableExists(env,"transactions").catch(()=>false);
  const transactionRows=hasTransactions?(await env.DB.prepare(
      includeArchiveRows
        ? "SELECT * FROM transactions WHERE session_id=? AND corpid=? ORDER BY created_at ASC"
        : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
    ).bind(sessionRow.id,user.corpid).all()).results||[]:[];
  if(isEmployeeEntrySession(sessionRow)){
    const anchorRows=extractEmployeeEntryAnchorsFromSession(sessionRow);
    const exportRows=parseEmployeeEntryExportRows(sessionRow);
    const detailChoice=chooseOwnerEmployeeSessionDetailRows(sessionRow,transactionRows,anchorRows,exportRows);
    return {rows:detailChoice.rows,source:detailChoice.source};
  }
  return {rows:transactionRows,source:"transactions"};
}
__name(ownerHistoryArchiveDetailRows,"ownerHistoryArchiveDetailRows");
async function canonicalOwnerHistorySessionRowForList(env,user,sessionRow={}){
  try{
    const detail=await ownerHistoryArchiveDetailRows(env,user,sessionRow,true);
    const targetAnchor=cleanText(sessionRow?.anchor_id||sessionRow?.id||"",180);
    const correctionRows=targetAnchor?await ownerCorrectionFetchExistingCorrectionSessions(env,user,targetAnchor):[];
    const correctionFields=ownerHistoryDetailCorrectionFields(sessionRow,detail.rows,correctionRows);
    return canonicalOwnerHistorySessionRow(sessionRow,correctionFields);
  }catch{
    return canonicalOwnerHistorySessionRow(sessionRow,ownerHistoryDetailFailClosedCorrectionFields(sessionRow,[]));
  }
}
__name(canonicalOwnerHistorySessionRowForList,"canonicalOwnerHistorySessionRowForList");
async function canonicalOwnerHistorySessionRowsForList(env,user,rows=[]){
  return Promise.all((rows||[]).map(row=>canonicalOwnerHistorySessionRowForList(env,user,row)));
}
__name(canonicalOwnerHistorySessionRowsForList,"canonicalOwnerHistorySessionRowsForList");
function ownerHistoryTransferLineageRequestedBed(url){
  return cleanText(url?.searchParams?.get("requested_bed")||url?.searchParams?.get("bed")||"",160);
}
__name(ownerHistoryTransferLineageRequestedBed,"ownerHistoryTransferLineageRequestedBed");
function ownerHistoryTransferLineageAnchorRef(row={}){
  return cleanText(row.transfer_anchor_id||row.anchor_ref||row.anchor_id||row.event_id||row.entry_ref||row.entry_id||row.id||"",180);
}
__name(ownerHistoryTransferLineageAnchorRef,"ownerHistoryTransferLineageAnchorRef");
function ownerHistoryTransferLineageArchiveEntries(sessions=[],corpid=""){
  const entries=[];
  for(const session of sessions||[]){
    const archiveState=canonicalOwnerHistoryArchiveState(session);
    for(const anchor of extractEmployeeEntryAnchorsFromSession(session)){
      entries.push({
        ...anchor,
        corpid:cleanText(session.corpid||corpid,120),
        property_id:cleanText(session.property_id||anchor.property_id||"",120),
        session_ref:cleanText(session.id||"",160),
        entry_ref:cleanText(anchor.entry_id||anchor.event_id||anchor.id||"",180),
        anchor_ref:ownerHistoryTransferLineageAnchorRef(anchor),
        original_bed:cleanText(anchor.original_bed||anchor.bed||anchor.room||anchor.to_bed||"",160),
        canonical_accepted_at:cleanText(anchor.canonical_accepted_at||anchor.accepted_at||anchor.transfer_at||session.created_at||"",80),
        effective_status:archiveState==="active"?cleanText(anchor.effective_status||anchor.archive_state||anchor.status||"active",40):archiveState
      });
    }
    const parsed=parseOwnerCorrectionAnchorText(session.export_text||"");
    const correction=parsed?.found&&parsed?.ok&&parsed?.correction?parsed.correction:null;
    if(!correction)continue;
    for(const event of correction.correction_events||[]){
      const replacement=event.replacement_transfer_anchor||event.replacement_event||null;
      if(replacement&&typeof replacement==="object"){
        entries.push({
          ...replacement,
          corpid:cleanText(session.corpid||corpid,120),
          session_ref:cleanText(session.id||"",160),
          entry_ref:cleanText(replacement.entry_id||replacement.event_id||replacement.id||"",180),
          anchor_ref:ownerHistoryTransferLineageAnchorRef(replacement),
          replacement_for_transfer_anchor_id:cleanText(replacement.replacement_for_transfer_anchor_id||event.original_event_id||"",180),
          canonical_accepted_at:cleanText(replacement.canonical_accepted_at||replacement.accepted_at||session.created_at||"",80),
          effective_status:cleanText(event.status||correction.status||"",40)==="applied"?"corrected":"inactive"
        });
      }
      entries.push({
        ...event,
        corpid:cleanText(session.corpid||corpid,120),
        session_ref:cleanText(session.id||"",160),
        entry_ref:cleanText(event.correction_event_id||event.event_id||event.id||"",180),
        anchor_ref:cleanText(event.correction_event_id||event.event_id||event.id||session.anchor_id||session.id||"",180),
        event_type:cleanText(event.event_type||event.correction_action||"correction",80),
        target_transfer_anchor_id:cleanText(event.target_transfer_anchor_id||event.original_event_id||"",180),
        canonical_accepted_at:cleanText(event.canonical_accepted_at||event.accepted_at||session.created_at||"",80),
        effective_status:cleanText(event.status||correction.status||"",40)==="applied"?"active":"inactive"
      });
    }
  }
  return entries;
}
__name(ownerHistoryTransferLineageArchiveEntries,"ownerHistoryTransferLineageArchiveEntries");
async function ownerHistoryTransferLineageForRequest(env,user,url){
  const requestedBed=ownerHistoryTransferLineageRequestedBed(url);
  if(!requestedBed)return null;
  const requestedLineageId=cleanText(url.searchParams.get("transfer_lineage_id")||"",180);
  const rows=await env.DB.prepare("SELECT * FROM sessions WHERE corpid=? ORDER BY created_at ASC LIMIT 1000").bind(user.corpid).all();
  const archiveEntries=ownerHistoryTransferLineageArchiveEntries(rows.results||[],user.corpid);
  return projectOwnerHistoryTransferLineage({
    corpid:user.corpid,
    requested_bed:requestedBed,
    transfer_lineage_id:requestedLineageId,
    archive_entries:archiveEntries
  });
}
__name(ownerHistoryTransferLineageForRequest,"ownerHistoryTransferLineageForRequest");
function ownerHistoryDetailZeroCorrectionTotals(){
  return {
    cash_delta:0,
    bank_delta:0,
    gross_delta:0,
    rent_income_delta:0,
    deposit_liability_delta:0,
    arrears_repaid_delta:0,
    arrears_open_delta:0,
    expense_delta:0,
    transfer_fee_delta:0
  };
}
__name(ownerHistoryDetailZeroCorrectionTotals,"ownerHistoryDetailZeroCorrectionTotals");
function ownerHistoryDetailNormalizeTotals(totals={}){
  return {
    cash:ownerCorrectionPreviewMoney(totals.cash),
    bank:ownerCorrectionPreviewMoney(totals.bank),
    gross:ownerCorrectionPreviewMoney(totals.gross),
    rent_income:ownerCorrectionPreviewMoney(totals.rent_income),
    deposit_liability:ownerCorrectionPreviewMoney(totals.deposit_liability),
    arrears_repaid:ownerCorrectionPreviewMoney(totals.arrears_repaid),
    arrears_open:ownerCorrectionPreviewMoney(totals.arrears_open),
    expense:ownerCorrectionPreviewMoney(totals.expense),
    transfer_fee:ownerCorrectionPreviewMoney(totals.transfer_fee)
  };
}
__name(ownerHistoryDetailNormalizeTotals,"ownerHistoryDetailNormalizeTotals");
function ownerHistoryDetailNormalizeCorrectionTotals(totals={}){
  return {
    cash_delta:ownerCorrectionPreviewMoney(totals.cash_delta),
    bank_delta:ownerCorrectionPreviewMoney(totals.bank_delta),
    gross_delta:ownerCorrectionPreviewMoney(totals.gross_delta),
    rent_income_delta:ownerCorrectionPreviewMoney(totals.rent_income_delta),
    deposit_liability_delta:ownerCorrectionPreviewMoney(totals.deposit_liability_delta),
    arrears_repaid_delta:ownerCorrectionPreviewMoney(totals.arrears_repaid_delta),
    arrears_open_delta:ownerCorrectionPreviewMoney(totals.arrears_open_delta),
    expense_delta:ownerCorrectionPreviewMoney(totals.expense_delta),
    transfer_fee_delta:ownerCorrectionPreviewMoney(totals.transfer_fee_delta)
  };
}
__name(ownerHistoryDetailNormalizeCorrectionTotals,"ownerHistoryDetailNormalizeCorrectionTotals");
function ownerHistoryDetailDeltaToTotals(delta={}){
  const normalized=ownerHistoryDetailNormalizeCorrectionTotals(delta);
  return {
    cash:normalized.cash_delta,
    bank:normalized.bank_delta,
    gross:normalized.gross_delta,
    rent_income:normalized.rent_income_delta,
    deposit_liability:normalized.deposit_liability_delta,
    arrears_repaid:normalized.arrears_repaid_delta,
    arrears_open:normalized.arrears_open_delta,
    expense:normalized.expense_delta,
    transfer_fee:normalized.transfer_fee_delta
  };
}
__name(ownerHistoryDetailDeltaToTotals,"ownerHistoryDetailDeltaToTotals");
function ownerHistoryDetailAddTotals(left={},right={}){
  return ownerHistoryDetailNormalizeTotals({
    cash:ownerCorrectionPreviewMoney(left.cash)+ownerCorrectionPreviewMoney(right.cash),
    bank:ownerCorrectionPreviewMoney(left.bank)+ownerCorrectionPreviewMoney(right.bank),
    gross:ownerCorrectionPreviewMoney(left.gross)+ownerCorrectionPreviewMoney(right.gross),
    rent_income:ownerCorrectionPreviewMoney(left.rent_income)+ownerCorrectionPreviewMoney(right.rent_income),
    deposit_liability:ownerCorrectionPreviewMoney(left.deposit_liability)+ownerCorrectionPreviewMoney(right.deposit_liability),
    arrears_repaid:ownerCorrectionPreviewMoney(left.arrears_repaid)+ownerCorrectionPreviewMoney(right.arrears_repaid),
    arrears_open:ownerCorrectionPreviewMoney(left.arrears_open)+ownerCorrectionPreviewMoney(right.arrears_open),
    expense:ownerCorrectionPreviewMoney(left.expense)+ownerCorrectionPreviewMoney(right.expense),
    transfer_fee:ownerCorrectionPreviewMoney(left.transfer_fee)+ownerCorrectionPreviewMoney(right.transfer_fee)
  });
}
__name(ownerHistoryDetailAddTotals,"ownerHistoryDetailAddTotals");
function ownerHistoryDetailAddCorrectionDelta(left={},right={}){
  const a=ownerHistoryDetailNormalizeCorrectionTotals(left);
  const b=ownerHistoryDetailNormalizeCorrectionTotals(right);
  return ownerHistoryDetailNormalizeCorrectionTotals({
    cash_delta:a.cash_delta+b.cash_delta,
    bank_delta:a.bank_delta+b.bank_delta,
    gross_delta:a.gross_delta+b.gross_delta,
    rent_income_delta:a.rent_income_delta+b.rent_income_delta,
    deposit_liability_delta:a.deposit_liability_delta+b.deposit_liability_delta,
    arrears_repaid_delta:a.arrears_repaid_delta+b.arrears_repaid_delta,
    arrears_open_delta:a.arrears_open_delta+b.arrears_open_delta,
    expense_delta:a.expense_delta+b.expense_delta,
    transfer_fee_delta:a.transfer_fee_delta+b.transfer_fee_delta
  });
}
__name(ownerHistoryDetailAddCorrectionDelta,"ownerHistoryDetailAddCorrectionDelta");
function ownerHistoryDetailCorrectionTargetsMatch(correction={},target={}){
  const targetAnchor=cleanText(target?.anchor||"",180);
  const targetId=cleanText(target?.session_id||"",160);
  const correctionAnchor=cleanText(correction?.target_session_anchor||"",180);
  const correctionId=cleanText(correction?.target_session_id||"",160);
  if(correctionAnchor&&correctionAnchor!==targetAnchor)return false;
  if(correctionId&&correctionId!==targetId)return false;
  return Boolean(targetAnchor||targetId);
}
__name(ownerHistoryDetailCorrectionTargetsMatch,"ownerHistoryDetailCorrectionTargetsMatch");
function ownerHistoryDetailCorrectionEventInvalid(event={},index=0,eventIds=new Set(),usedIds=new Set(),correction={}){
  const originalId=cleanText(event?.original_event_id||"",180);
  if(cleanText(correction?.status||"",40).toLowerCase()!=="applied"){
    return {code:"CORRECTION_STATUS_NOT_APPLIED",message:"Correction status is not applied.",status:cleanText(correction?.status||"missing",40)};
  }
  if(cleanText(event?.status||"",40).toLowerCase()!=="applied"){
    return {code:"CORRECTION_EVENT_STATUS_NOT_APPLIED",message:"Correction event status is not applied.",event_index:index,original_event_id:originalId,status:cleanText(event?.status||"missing",40)};
  }
  if(!originalId||!eventIds.has(originalId)){
    return {code:"ORIGINAL_EVENT_ID_NOT_FOUND",message:"original_event_id was not found in target session.",event_index:index,original_event_id:originalId};
  }
  if(usedIds.has(originalId)){
    return {code:"DUPLICATE_CORRECTION_NOT_APPLIED",message:"Duplicate correction would double-apply the same original_event_id.",event_index:index,original_event_id:originalId};
  }
  if(!event?.financial_effect||typeof event.financial_effect!=="object"||Array.isArray(event.financial_effect)){
    return {code:"FINANCIAL_EFFECT_REQUIRED",message:"Correction event requires financial_effect.",event_index:index,original_event_id:originalId};
  }
  const normalized=ownerHistoryDetailNormalizeCorrectionTotals(event.financial_effect);
  const hasEffect=Object.values(normalized).some(value=>ownerCorrectionPreviewMoney(value)!==0);
  if(!hasEffect){
    return {code:"FINANCIAL_EFFECT_EMPTY",message:"Correction event financial_effect must contain a non-zero delta.",event_index:index,original_event_id:originalId};
  }
  return null;
}
__name(ownerHistoryDetailCorrectionEventInvalid,"ownerHistoryDetailCorrectionEventInvalid");
function ownerHistoryDetailSafeRawTotals(session={},rows=[]){
  const totals={
    cash:ownerCorrectionPreviewMoney(session.cash_handover||session.cash_receipts||0),
    bank:ownerCorrectionPreviewMoney(session.bank_transfer_total||session.bank_receipts||0),
    gross:ownerCorrectionPreviewMoney(session.gross_received||session.gross_income||0),
    rent_income:0,
    deposit_liability:0,
    arrears_repaid:0,
    arrears_open:0,
    expense:0,
    transfer_fee:0
  };
  const hasSessionCash=totals.cash>0;
  const hasSessionBank=totals.bank>0;
  for(const row of Array.isArray(rows)?rows:[]){
    const type=String(row?.event_type||row?.type||row?.cat||row?.reason_code||"").trim().toLowerCase();
    const method=String(row?.payment_method||row?.pay_type||row?.method||"").trim().toLowerCase();
    const amount=ownerCorrectionPreviewMoney(row?.paid_amount??row?.payment_amount??row?.deposit_amount??row?.refund_amount??row?.expense_amount??row?.fee_amount??row?.amount??row?.paid??0);
    let incomeLike=false;
    if(type==="r"||type==="rent"||type.includes("rent")||type.includes("收租")){
      totals.rent_income+=amount;
      incomeLike=true;
    }else if(type==="ap"||type==="arrears_payment"||type.includes("arrears")||type.includes("欠")){
      totals.arrears_repaid+=amount;
      incomeLike=true;
    }else if(type==="d"||type==="deposit_in"||type.includes("deposit_in")||type.includes("收押金")){
      totals.deposit_liability+=amount;
      incomeLike=true;
    }else if(type==="dr"||type==="deposit_out"||type.includes("deposit_out")||type.includes("退押金")){
      totals.deposit_liability-=amount;
    }else if(type==="e"||type==="expense"||type.includes("expense")||type.includes("支出")){
      totals.expense+=amount;
    }else if(type==="tf"||type==="bed_transfer"||type.includes("transfer")||type.includes("换床")){
      totals.transfer_fee+=amount;
      incomeLike=true;
    }
    if(incomeLike&&!hasSessionCash&&(method==="cash"||method==="c"||method.includes("现金")))totals.cash+=amount;
    if(incomeLike&&!hasSessionBank&&(method==="bank"||method==="b"||method.includes("银行")))totals.bank+=amount;
  }
  if(!totals.gross)totals.gross=ownerCorrectionPreviewMoney(totals.cash+totals.bank);
  return ownerHistoryDetailNormalizeTotals(totals);
}
__name(ownerHistoryDetailSafeRawTotals,"ownerHistoryDetailSafeRawTotals");
function ownerHistoryDetailFailClosedCorrectionFields(session={},rows=[],warnings=[]){
  const rawTotals=ownerHistoryDetailSafeRawTotals(session,rows);
  const summary=canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics(session,{
    correction_aware:true,
    correction_applied:false,
    raw_totals:rawTotals,
    correction_totals:ownerHistoryDetailZeroCorrectionTotals(),
    adjusted_totals:rawTotals,
    correction_events_count:0,
    invalid_corrections_count:0,
    warnings
  });
  return {
    correction_summary:summary,
    correction_audit:{
      raw_mode_available:true,
      adjusted_mode_available:true,
      audit_mode_available:true,
      original_events_visible:true,
      correction_events_visible:false,
      correction_sessions:[],
      correction_events:[],
      invalid_corrections:[],
      warnings
    }
  };
}
__name(ownerHistoryDetailFailClosedCorrectionFields,"ownerHistoryDetailFailClosedCorrectionFields");
function ownerHistoryDetailNoCorrectionFields(session={},rows=[]){
  const rawTotals=ownerHistoryDetailSafeRawTotals(session,rows);
  const summary=canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics(session,{
    correction_aware:true,
    correction_applied:false,
    raw_totals:rawTotals,
    correction_totals:ownerHistoryDetailZeroCorrectionTotals(),
    adjusted_totals:rawTotals,
    correction_events_count:0,
    invalid_corrections_count:0,
    warnings:[]
  });
  return {
    correction_summary:summary,
    correction_audit:{
      raw_mode_available:true,
      adjusted_mode_available:true,
      audit_mode_available:true,
      original_events_visible:true,
      correction_events_visible:false,
      correction_sessions:[],
      correction_events:[],
      invalid_corrections:[],
      warnings:[]
    }
  };
}
__name(ownerHistoryDetailNoCorrectionFields,"ownerHistoryDetailNoCorrectionFields");
function ownerHistoryDetailJsonSafeValue(value, seen=new WeakSet()){
  if(typeof value==="bigint")return value.toString();
  if(value instanceof Date)return value.toISOString();
  if(Array.isArray(value))return value.map(item=>ownerHistoryDetailJsonSafeValue(item,seen));
  if(value&&typeof value==="object"){
    if(seen.has(value))return "[Circular]";
    seen.add(value);
    const out={};
    for(const [key,child] of Object.entries(value)){
      if(typeof child==="undefined"||typeof child==="function"||typeof child==="symbol")continue;
      out[key]=ownerHistoryDetailJsonSafeValue(child,seen);
    }
    seen.delete(value);
    return out;
  }
  return value;
}
__name(ownerHistoryDetailJsonSafeValue,"ownerHistoryDetailJsonSafeValue");
function ownerHistoryDetailReferenceSymbolHint(error){
  const message=String(error?.message||"");
  let match=message.match(/^([A-Za-z_$][\w$]*) is not defined$/);
  if(match)return cleanText(match[1],120);
  match=message.match(/^Cannot access '([^']+)' before initialization$/);
  if(match)return cleanText(match[1],120);
  return "";
}
__name(ownerHistoryDetailReferenceSymbolHint,"ownerHistoryDetailReferenceSymbolHint");
function ownerHistoryDetailStageError(error,stage,component){
  const wrapped=error instanceof Error?error:new Error("correction direct reader failed");
  wrapped.safe_stage=cleanText(stage,80);
  wrapped.safe_component=cleanText(component,120);
  wrapped.safe_symbol_hint=ownerHistoryDetailReferenceSymbolHint(error);
  return wrapped;
}
__name(ownerHistoryDetailStageError,"ownerHistoryDetailStageError");
function ownerHistoryDetailDirectStage(stage,component,fn){
  try{
    return fn();
  }catch(error){
    throw ownerHistoryDetailStageError(error,stage,component);
  }
}
__name(ownerHistoryDetailDirectStage,"ownerHistoryDetailDirectStage");
function ownerHistoryDetailSafeWarning(error,code="CORRECTION_AWARE_DETAIL_FAILED_CLOSED"){
  return {
    code,
    message:"Correction-aware detail failed closed. Legacy detail rows were returned unchanged.",
    safe_message:cleanText(error?.name||error?.code||"correction add-on failed",120),
    safe_stage:cleanText(error?.safe_stage||"",80),
    safe_component:cleanText(error?.safe_component||"",120),
    safe_symbol_hint:cleanText(error?.safe_symbol_hint||ownerHistoryDetailReferenceSymbolHint(error)||"",120)
  };
}
__name(ownerHistoryDetailSafeWarning,"ownerHistoryDetailSafeWarning");
async function ownerHistoryDetailAdditiveResponse(env,user,sessionRow,rows=[],extraFields={}){
  let correctionFields;
  try{
    const targetAnchor=cleanText(sessionRow?.anchor_id||sessionRow?.id||"",180);
    const correctionRows=targetAnchor?await ownerCorrectionFetchExistingCorrectionSessions(env,user,targetAnchor).catch(error=>{
      throw Object.assign(new Error("correction lookup failed"),{safe_code:"CORRECTION_LOOKUP_FAILED_CLOSED",safe_stage:"discover_correction_sessions",safe_component:"ownerCorrectionFetchExistingCorrectionSessions",cause:error});
    }):[];
    correctionFields=ownerHistoryDetailCorrectionFields(sessionRow,rows,correctionRows);
  }catch(error){
    correctionFields=ownerHistoryDetailFailClosedCorrectionFields(sessionRow,rows,[ownerHistoryDetailSafeWarning(error,error?.safe_code||"CORRECTION_AWARE_DETAIL_FAILED_CLOSED")]);
  }
  const archiveFields=canonicalOwnerHistoryDetailGatewayFields(sessionRow,rows,correctionFields,"correction_aware_detail");
  try{
    return json({
      ...ok(rows),
      ...ownerHistoryDetailJsonSafeValue(correctionFields),
      ...ownerHistoryDetailJsonSafeValue(archiveFields),
      ...ownerHistoryDetailJsonSafeValue(extraFields)
    });
  }catch(error){
    const fallback=ownerHistoryDetailFailClosedCorrectionFields(sessionRow,rows,[ownerHistoryDetailSafeWarning(error,"CORRECTION_AWARE_RESPONSE_FAILED_CLOSED")]);
    const fallbackArchive=canonicalOwnerHistoryDetailGatewayFields(sessionRow,rows,fallback,"correction_aware_detail_failed_closed");
    return json({
      ...ok(rows),
      ...ownerHistoryDetailJsonSafeValue(fallback),
      ...ownerHistoryDetailJsonSafeValue(fallbackArchive),
      ...ownerHistoryDetailJsonSafeValue(extraFields)
    });
  }
}
__name(ownerHistoryDetailAdditiveResponse,"ownerHistoryDetailAdditiveResponse");
function ownerHistoryDetailCorrectionSessionView(row={}){
  return {
    session_id:cleanText(row?.id||"",160),
    anchor:cleanText(row?.anchor_id||"",180),
    date:cleanText(row?.date||row?.created_at||"",40).slice(0,10),
    employee:cleanText(row?.created_by||row?.operator_name||"owner",120),
    source:cleanText(row?.source||"owner_correction",80),
    export_text:String(row?.export_text||"")
  };
}
__name(ownerHistoryDetailCorrectionSessionView,"ownerHistoryDetailCorrectionSessionView");
function ownerHistoryDetailDirectCorrectionFields(session={},rows=[],correctionRows=[]){
  const target=ownerHistoryDetailDirectStage("derive_raw_totals","ownerHistoryDetailTargetSessionView",()=>ownerHistoryDetailTargetSessionView(session,rows));
  const rawTotals=ownerHistoryDetailDirectStage("derive_raw_totals","ownerHistoryDetailNormalizeTotals",()=>ownerHistoryDetailNormalizeTotals(target.totals));
  const eventIds=ownerHistoryDetailDirectStage("derive_raw_totals","targetEventIdSet",()=>new Set((target.events||[]).map(event=>cleanText(event?.event_id||event?.id||"",180)).filter(Boolean)));
  const usedIds=new Set();
  const correctionSessions=[];
  const correctionEvents=[];
  const invalidCorrections=[];
  let correctionTotals=ownerHistoryDetailZeroCorrectionTotals();
  for(const row of correctionRows||[]){
    const sessionView=ownerHistoryDetailDirectStage("load_correction_session_rows","ownerHistoryDetailCorrectionSessionView",()=>ownerHistoryDetailCorrectionSessionView(row));
    const hasCorrectionBlock=ownerHistoryDetailDirectStage("extract_correction_anchor_json","correctionAnchorBlockScan",()=>String(sessionView.export_text||"").includes("CORRECTION ANCHORS JSON"));
    if(!hasCorrectionBlock)continue;
    const parsed=ownerHistoryDetailDirectStage("parse_correction_anchor","parseOwnerCorrectionAnchorText",()=>parseOwnerCorrectionAnchorText(sessionView.export_text||""));
    if(!parsed?.found)continue;
    if(!parsed?.ok||!parsed?.correction){
      invalidCorrections.push(...(parsed?.errors||[]).map(error=>({
        ...error,
        correction_anchor_id:sessionView.anchor,
        source_session_id:sessionView.session_id
      })));
      correctionSessions.push(sessionView);
      continue;
    }
    const correction=parsed.correction;
    const targetMatched=ownerHistoryDetailDirectStage("validate_correction_anchor","ownerHistoryDetailCorrectionTargetsMatch",()=>ownerHistoryDetailCorrectionTargetsMatch(correction,target));
    if(!targetMatched){
      invalidCorrections.push({
        code:"TARGET_SESSION_NOT_FOUND",
        message:"Correction target session was not found.",
        target_session_anchor:cleanText(correction?.target_session_anchor||"",180),
        target_session_id:cleanText(correction?.target_session_id||"",160),
        correction_anchor_id:cleanText(correction?.correction_anchor_id||correction?.correction_session_id||sessionView.anchor,180)
      });
      correctionSessions.push(sessionView);
      continue;
    }
    const safeContract=ownerHistoryDetailDirectStage("validate_correction_anchor","correctionSafetyContract",()=>({
      no_hard_delete:correction.no_hard_delete===true,
      original_events_immutable:correction.original_events_immutable===true,
      events:Array.isArray(correction.correction_events)?correction.correction_events:[]
    }));
    if(!safeContract.no_hard_delete){
      invalidCorrections.push({code:"NO_HARD_DELETE_REQUIRED",message:"no_hard_delete must be true.",correction_anchor_id:cleanText(correction?.correction_anchor_id||sessionView.anchor,180)});
      correctionSessions.push(sessionView);
      continue;
    }
    if(!safeContract.original_events_immutable){
      invalidCorrections.push({code:"ORIGINAL_EVENTS_IMMUTABLE_REQUIRED",message:"original_events_immutable must be true.",correction_anchor_id:cleanText(correction?.correction_anchor_id||sessionView.anchor,180)});
      correctionSessions.push(sessionView);
      continue;
    }
    for(const [index,event] of safeContract.events.entries()){
      const invalid=ownerHistoryDetailDirectStage("link_correction_events","ownerHistoryDetailCorrectionEventInvalid",()=>ownerHistoryDetailCorrectionEventInvalid(event,index,eventIds,usedIds,correction));
      if(invalid){
        invalidCorrections.push({
          ...invalid,
          correction_anchor_id:cleanText(correction?.correction_anchor_id||sessionView.anchor,180),
          target_session_anchor:cleanText(correction?.target_session_anchor||"",180)
        });
        continue;
      }
      const originalId=cleanText(event?.original_event_id||"",180);
      usedIds.add(originalId);
      correctionTotals=ownerHistoryDetailDirectStage("calculate_correction_totals","ownerHistoryDetailAddCorrectionDelta",()=>ownerHistoryDetailAddCorrectionDelta(correctionTotals,event.financial_effect));
      correctionEvents.push({...event});
    }
    correctionSessions.push(sessionView);
  }
  const adjustedTotals=ownerHistoryDetailDirectStage("calculate_correction_totals","ownerHistoryDetailAddTotals",()=>ownerHistoryDetailAddTotals(rawTotals,ownerHistoryDetailDeltaToTotals(correctionTotals)));
  const correctionSummary=ownerHistoryDetailDirectStage("build_correction_summary","correctionSummary",()=>canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics(session,{
    correction_aware:true,
    correction_applied:correctionEvents.length>0,
    raw_totals:rawTotals,
    correction_totals:correctionTotals,
    adjusted_totals:adjustedTotals,
    correction_events_count:correctionEvents.length,
    correction_sessions_count:correctionSessions.length,
    invalid_corrections_count:invalidCorrections.length,
    warnings:[]
  }));
  const correctionAudit=ownerHistoryDetailDirectStage("build_correction_audit","correctionAudit",()=>({
    raw_mode_available:true,
    adjusted_mode_available:true,
    audit_mode_available:true,
    original_events_visible:true,
    correction_events_visible:correctionEvents.length>0,
    correction_sessions:correctionSessions,
    correction_events:correctionEvents,
    invalid_corrections:invalidCorrections,
    warnings:[]
  }));
  return ownerHistoryDetailDirectStage("serialize_response","correctionAwareDetailResponse",()=>({
    correction_summary:{
      ...correctionSummary
    },
    correction_audit:{
      ...correctionAudit
    }
  }));
}
__name(ownerHistoryDetailDirectCorrectionFields,"ownerHistoryDetailDirectCorrectionFields");
function ownerHistoryDetailTargetSessionView(session={},rows=[]){
  return {
    session_id:cleanText(session?.id||"",160),
    anchor:cleanText(session?.anchor_id||session?.anchorId||"",180),
    date:cleanText(session?.date||session?.created_at||"",40).slice(0,10),
    employee:cleanText(session?.operator_name||session?.created_by||session?.operator_id||"",120),
    totals:ownerHistoryDetailSafeRawTotals(session,rows),
    events:(Array.isArray(rows)?rows:[]).map((row,index)=>({
      event_id:cleanText(row?.event_id||row?.id||`detail-row-${index+1}`,180),
      id:cleanText(row?.id||row?.event_id||`detail-row-${index+1}`,180),
      ...row
    }))
  };
}
__name(ownerHistoryDetailTargetSessionView,"ownerHistoryDetailTargetSessionView");
function ownerHistoryDetailCorrectionFields(session={},rows=[],correctionRows=[]){
  if(!Array.isArray(correctionRows)||correctionRows.length===0){
    return ownerHistoryDetailNoCorrectionFields(session,rows);
  }
  try{
    return ownerHistoryDetailDirectCorrectionFields(session,rows,correctionRows);
  }catch(error){
    const warnings=[{code:"CORRECTION_DIRECT_READER_FAILED",message:"Correction direct reader failed closed. Legacy detail rows were returned unchanged.",safe_message:cleanText(error?.name||error?.code||"direct reader failed",120),safe_stage:cleanText(error?.safe_stage||"",80),safe_component:cleanText(error?.safe_component||"ownerHistoryDetailDirectCorrectionFields",120),safe_symbol_hint:cleanText(error?.safe_symbol_hint||ownerHistoryDetailReferenceSymbolHint(error)||"",120)}];
    return ownerHistoryDetailFailClosedCorrectionFields(session,rows,warnings);
  }
}
__name(ownerHistoryDetailCorrectionFields,"ownerHistoryDetailCorrectionFields");
async function handleOwnerCorrectionApply(request,env,user){
  if(!canWriteOwnerData(user))return forbidden();
  if(request.method!=="POST")return errorResponse("method_not_allowed",405,"METHOD_NOT_ALLOWED");
  let body;
  try{body=await request.json();}catch{return json({ok:false,mode:"owner_correction_apply",error_code:"INVALID_JSON",message:"Request body must be valid JSON.",no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",no_write_proof:ownerCorrectionPreviewNoWriteProof()},400);}
  if(!ownerCorrectionApplyEnabled(env))return ownerCorrectionDisabledResponse();
  const targetAnchor=cleanText(body?.target_session_anchor||body?.targetSessionAnchor||"",160);
  const targetSessionId=cleanText(body?.target_session_id||body?.targetSessionId||"",160);
  if(!targetAnchor||!targetSessionId){
    return json({ok:false,mode:"owner_correction_apply",error_code:"TARGET_SESSION_REQUIRED",message:"target_session_anchor and target_session_id are required.",no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",no_write_proof:ownerCorrectionPreviewNoWriteProof()},422);
  }
  if(!await empTableExists(env,"sessions").catch(()=>false)){
    return json({ok:false,mode:"owner_correction_apply",error_code:"SESSIONS_TABLE_NOT_READY",message:"sessions table is not available.",no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",no_write_proof:ownerCorrectionPreviewNoWriteProof()},503);
  }
  const session=await env.DB.prepare("SELECT * FROM sessions WHERE corpid=? AND anchor_id=? AND id=? LIMIT 1").bind(user.corpid,targetAnchor,targetSessionId).first().catch(()=>null);
  if(!session){
    return json({ok:false,mode:"owner_correction_apply",error_code:"TARGET_SESSION_NOT_FOUND",message:"Target session was not found.",target_session_anchor:targetAnchor,target_session_id:targetSessionId,no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",no_write_proof:ownerCorrectionPreviewNoWriteProof()},404);
  }
  const {preview,correction}=ownerCorrectionBuildPreviewForSession(session,body,user);
  const applyValidation=validateOwnerCorrectionApplyRequest(body,preview,{expected_preview_hash:preview.preview_hash});
  if(!applyValidation.ok){
    return json({ok:false,mode:"owner_correction_apply_validation_failed",error_code:"OWNER_CORRECTION_APPLY_VALIDATION_FAILED",message:"Owner correction apply validation failed.",invalid_corrections:applyValidation.errors,no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",preview,no_write_proof:ownerCorrectionPreviewNoWriteProof()},422);
  }
  const targetScope=validateOwnerCorrectionTargetScopedApplyAuthorization({
    request:body,
    preview,
    config:ownerCorrectionTargetScopeConfig(env),
    user
  });
  if(!targetScope.ok)return ownerCorrectionTargetScopeRequiredResponse(targetScope);
  const fingerprint=buildCorrectionRequestFingerprint({...correction,target_session_id:targetSessionId});
  const originalEventIds=(correction.correction_events||[]).map(event=>String(event.original_event_id||"")).filter(Boolean);
  const existingRows=await ownerCorrectionFetchExistingCorrectionSessions(env,user,targetAnchor);
  const existing=ownerCorrectionExistingScanResult(existingRows,fingerprint,cleanText(body.idempotency_key||"",180),originalEventIds);
  if(!existing.ok){
    return json({ok:false,mode:"owner_correction_apply_validation_failed",error_code:existing.error_code,message:existing.message,no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",no_write_proof:ownerCorrectionPreviewNoWriteProof(),existing_correction_anchor:existing.existing?.anchor_id||""},409);
  }
  if(existing.idempotent){
    return json({ok:true,mode:"owner_correction_apply_idempotent_replay",correction_session_id:existing.existing.id,correction_anchor_id:existing.existing.anchor_id,existing:true,no_write:true,production_write:false,production_cutover:"PRODUCTION_NO_GO",no_write_proof:ownerCorrectionPreviewNoWriteProof({idempotent_replay:true})},200);
  }
  const now=empNow();
  const built=buildOwnerCorrectionSessionAnchor({
    preview,
    correction:{...correction,target_session_id:targetSessionId},
    preview_hash:preview.preview_hash,
    idempotency_key:cleanText(body.idempotency_key||"",180),
    correction_request_fingerprint:fingerprint,
    created_by:cleanText(user.userid||"",120),
    created_by_role:cleanText(user.role||"",80),
    authorized_by:cleanText(user.userid||"",120),
    authorized_role:cleanText(user.role||"",80),
    target_employee_userid:cleanText(session.created_by||session.operator_id||"",120),
    target_business_date:cleanText(session.date||"",40),
    created_at:now
  });
  await empInsertDynamic(env,"sessions",{
    id:built.correction_session_id,
    corpid:user.corpid,
    anchor_id:built.correction_anchor_id,
    date:cleanText(session.date||now.slice(0,10),40),
    entries_count:built.payload.correction_events.length,
    created_by:user.userid,
    operator_id:user.userid,
    operator_name:user.userid,
    cash_handover:0,
    bank_transfer_total:0,
    bank_transfer_count:0,
    gross_received:0,
    handover_status:"CORRECTION_APPLIED",
    exported_at:now,
    export_text:built.export_text,
    source:"owner_correction"
  },EMP_SESSION_COLUMNS);
  return json({
    ok:true,
    mode:"owner_correction_apply",
    correction_session_id:built.correction_session_id,
    correction_anchor_id:built.correction_anchor_id,
    target_session_anchor:targetAnchor,
    target_session_id:targetSessionId,
    preview_hash:preview.preview_hash,
    correction_request_fingerprint:fingerprint,
    production_write_scope:"correction_anchor_only",
    original_session_mutated:false,
    transaction_write_attempted:false,
    arrear_task_write_attempted:false,
    deposit_write_attempted:false,
    production_cutover:"PRODUCTION_NO_GO"
  },201);
}
__name(handleOwnerCorrectionApply,"handleOwnerCorrectionApply");
async function handleEmployeeApi(request,env,user){
  const path=new URL(request.url).pathname;
  if(isReadonlyAdminRoleValue(user?.role)&&request.method!=="GET")return forbidden();
  const employeeDirectiveFollowup=path.match(/^\/api\/employee\/arrears\/directives\/([^/]+)\/followup$/);
  if(employeeDirectiveFollowup&&request.method==="POST")return handleEmployeeArrearsDirectiveFollowup(request,env,user,cleanId(employeeDirectiveFollowup[1]));
  if(path==="/api/employee/system/reminders"&&request.method==="GET")return handleEmployeeSystemReminders(request,env,user);
  if(path==="/api/employee/arrears/directives"&&request.method==="GET")return handleEmployeeArrearsDirectives(request,env,user);
  if(path==="/api/employee/migrate"&&request.method==="POST"){
    if(!requireManager(user))return forbidden();
    return handleEmployeeMigrate(request,env,user);
  }
  if(path==="/api/employee/lock/cards"&&request.method==="GET")return handleEmployeeLockCards(request,env,user);
  if(path==="/api/employee/bed-context"&&request.method==="GET")return handleEmployeeBedContext(request,env,user);
  if(path==="/api/employee/deposit"&&request.method==="GET")return handleEmployeeDeposit(request,env,user);
  if(path==="/api/employee/bed-transfers"&&request.method==="POST")return handleEmployeeBedTransferCreate(request,env,user);
  if(path==="/api/employee/entry/sync-state"&&request.method==="POST")return handleEmployeeEntrySyncState(request,env,user);
  if(path==="/api/employee/entry/validate"&&request.method==="POST")return handleEmployeeEntryValidate(request,env,user);
  if(path==="/api/employee/entry"&&request.method==="POST")return handleEmployeeEntry(request,env,user);
  if(path==="/api/arrear_tasks"&&request.method==="GET")return handleArrearTasks(request,env,user);
  if(path==="/api/arrear_tasks/directive"&&request.method==="POST")return handleArrearTaskDirective(request,env,user);
  if(path==="/api/arrear_tasks/update"&&request.method==="POST")return handleArrearTaskUpdate(request,env,user);
  return null;
}
__name(handleEmployeeApi,"handleEmployeeApi");
function allowStaffApi(path,method){
  if(path==="/api/me"&&method==="GET")return true;
  if(path==="/api/rent_config"&&method==="GET")return true;
  return false;
}
__name(allowStaffApi,"allowStaffApi");
function isPhase0RouteWiringEnabled(env){
  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
  const enabled=["1","true","yes","on"].includes(String(env.ENABLE_PHASE0_ROUTE_WIRING||"").trim().toLowerCase());
  return enabled&&["development","dev","local","test","staging"].includes(appEnv);
}
__name(isPhase0RouteWiringEnabled,"isPhase0RouteWiringEnabled");
async function phase0TableExists(env,table){
  try{
    const row=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(table).first();
    return !!row;
  }catch{
    return false;
  }
}
__name(phase0TableExists,"phase0TableExists");
async function phase0All(env,sql,params=[]){
  try{
    const {results}=await env.DB.prepare(sql).bind(...params).all();
    return results||[];
  }catch{
    return [];
  }
}
__name(phase0All,"phase0All");
async function phase0First(env,sql,params=[]){
  try{
    return await env.DB.prepare(sql).bind(...params).first();
  }catch{
    return null;
  }
}
__name(phase0First,"phase0First");
function phase0Limit(url,defaultLimit=100){
  const raw=Number(url.searchParams.get("limit")||defaultLimit);
  return Number.isFinite(raw)&&raw>0?Math.min(Math.floor(raw),500):defaultLimit;
}
__name(phase0Limit,"phase0Limit");
async function phase0Properties(env,user,url){
  if(await phase0TableExists(env,"properties")){
    const rows=await phase0All(env,"SELECT * FROM properties WHERE tenant_id=? LIMIT ?",[user.corpid,phase0Limit(url)]);
    return success({properties:rows});
  }
  return success({properties:[]});
}
__name(phase0Properties,"phase0Properties");
async function phase0Entries(env,user,url){
  const limit=phase0Limit(url);
  if(await phase0TableExists(env,"entries")){
    const rows=await phase0All(env,"SELECT * FROM entries WHERE tenant_id=? LIMIT ?",[user.corpid,limit]);
    return success({entries:rows});
  }
  if(await phase0TableExists(env,"transactions")){
    const rows=await phase0All(env,"SELECT * FROM transactions WHERE corpid=? AND COALESCE(voided_at,'')='' LIMIT ?",[user.corpid,limit]);
    return success({entries:rows});
  }
  return success({entries:[]});
}
__name(phase0Entries,"phase0Entries");
async function phase0Payments(env,user,url){
  const limit=phase0Limit(url);
  if(await phase0TableExists(env,"payments")){
    const rows=await phase0All(env,"SELECT * FROM payments WHERE tenant_id=? LIMIT ?",[user.corpid,limit]);
    return success({payments:rows});
  }
  if(await phase0TableExists(env,"transactions")){
    const rows=await phase0All(env,"SELECT id, cat, amount, pay_type, created_at FROM transactions WHERE corpid=? AND COALESCE(voided_at,'')='' LIMIT ?",[user.corpid,limit]);
    return success({payments:rows});
  }
  return success({payments:[]});
}
__name(phase0Payments,"phase0Payments");
async function phase0Receivables(env,user,url){
  const limit=phase0Limit(url);
  if(await phase0TableExists(env,"receivables")){
    const rows=await phase0All(env,"SELECT * FROM receivables WHERE tenant_id=? LIMIT ?",[user.corpid,limit]);
    return success({receivables:rows});
  }
  if(await phase0TableExists(env,"arrear_tasks")){
    const rows=await phase0All(env,"SELECT * FROM arrear_tasks WHERE corpid=? LIMIT ?",[user.corpid,limit]);
    return success({receivables:rows});
  }
  return success({receivables:[]});
}
__name(phase0Receivables,"phase0Receivables");
async function phase0DashboardTotals(env,user){
  const paymentRows=[];
  let receivablesRow={totalOutstanding:0,totalOverdue:0};
  let rowsChecked={payments:0,receivables:0};
  if(await phase0TableExists(env,"payments")){
    paymentRows.push(...await phase0All(env,"SELECT COALESCE(SUM(amount),0) AS total, method FROM payments WHERE tenant_id=? GROUP BY method",[user.corpid]));
    rowsChecked.payments=Number((await phase0First(env,"SELECT COUNT(*) AS count FROM payments WHERE tenant_id=?",[user.corpid]))?.count||0);
  }else if(await phase0TableExists(env,"transactions")){
    const cash=await phase0First(env,"SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE corpid=? AND cat='cash' AND COALESCE(voided_at,'')=''",[user.corpid]);
    const bank=await phase0First(env,"SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE corpid=? AND cat='bank' AND COALESCE(voided_at,'')=''",[user.corpid]);
    paymentRows.push({method:"CASH",total:Math.round(Number(cash?.total||0)*100)},{method:"BANK",total:Math.round(Number(bank?.total||0)*100)});
    rowsChecked.payments=Number((await phase0First(env,"SELECT COUNT(*) AS count FROM transactions WHERE corpid=?",[user.corpid]))?.count||0);
  }
  if(await phase0TableExists(env,"receivables")){
    receivablesRow=await phase0First(env,"SELECT COALESCE(SUM(outstanding_amount),0) AS totalOutstanding, COALESCE(SUM(CASE WHEN due_date < date('now') AND outstanding_amount > 0 THEN outstanding_amount ELSE 0 END),0) AS totalOverdue FROM receivables WHERE tenant_id=?",[user.corpid])||receivablesRow;
    rowsChecked.receivables=Number((await phase0First(env,"SELECT COUNT(*) AS count FROM receivables WHERE tenant_id=?",[user.corpid]))?.count||0);
  }else if(await phase0TableExists(env,"arrear_tasks")){
    const row=await phase0First(env,"SELECT COALESCE(SUM(arrear_amount-actual_received),0) AS totalOutstanding FROM arrear_tasks WHERE corpid=? AND COALESCE(close_status,'')=''",[user.corpid]);
    receivablesRow={totalOutstanding:Math.round(Number(row?.totalOutstanding||0)*100),totalOverdue:Math.round(Number(row?.totalOutstanding||0)*100)};
    rowsChecked.receivables=Number((await phase0First(env,"SELECT COUNT(*) AS count FROM arrear_tasks WHERE corpid=?",[user.corpid]))?.count||0);
  }
  return success(createDashboardTotalsPayload({paymentRows,receivablesRow,rowsChecked,user,computationId:crypto.randomUUID(),startedAt:Date.now()}));
}
__name(phase0DashboardTotals,"phase0DashboardTotals");
function ownerOverviewDateParts(value){
  return empDateParts(String(value||"").slice(0,10));
}
__name(ownerOverviewDateParts,"ownerOverviewDateParts");
function ownerOverviewDateFromParts(year,month,day){
  const dt=new Date(Date.UTC(year,month-1,1));
  const last=new Date(Date.UTC(year,month,0)).getUTCDate();
  dt.setUTCDate(Math.min(Math.max(1,Number(day)||1),last));
  return empFormatDate(dt);
}
__name(ownerOverviewDateFromParts,"ownerOverviewDateFromParts");
function ownerOverviewMonthRange(today,offsetMonths=0){
  const p=ownerOverviewDateParts(today);
  if(!p)return {start:today,end:today,label:"month"};
  const first=new Date(Date.UTC(p.y,p.mo-1,1));
  first.setUTCMonth(first.getUTCMonth()+offsetMonths);
  const year=first.getUTCFullYear();
  const month=first.getUTCMonth()+1;
  return {
    start:ownerOverviewDateFromParts(year,month,1),
    end:ownerOverviewDateFromParts(year,month,p.d),
    label:`${year}-${String(month).padStart(2,"0")}`
  };
}
__name(ownerOverviewMonthRange,"ownerOverviewMonthRange");
function ownerOverviewBillingPeriodRange(today,offsetPeriods=0){
  const p=ownerOverviewDateParts(today);
  if(!p)return {start:today,end:today,label:"billing_period"};
  let year=p.y;
  let month=p.mo;
  if(p.d<3){
    month-=1;
    if(month<1){
      month=12;
      year-=1;
    }
  }
  const start=new Date(Date.UTC(year,month-1,3));
  start.setUTCMonth(start.getUTCMonth()+offsetPeriods);
  const startYear=start.getUTCFullYear();
  const startMonth=start.getUTCMonth()+1;
  const nextStart=new Date(Date.UTC(startYear,startMonth,3));
  nextStart.setUTCDate(nextStart.getUTCDate()-1);
  return {
    start:empFormatDate(start),
    end:empFormatDate(nextStart),
    label:`${startYear}-${String(startMonth).padStart(2,"0")}-billing`
  };
}
__name(ownerOverviewBillingPeriodRange,"ownerOverviewBillingPeriodRange");
function ownerOverviewQuarterRange(today,offsetQuarters=0){
  const p=ownerOverviewDateParts(today);
  if(!p)return {start:today,end:today,label:"quarter"};
  const currentQuarter=Math.floor((p.mo-1)/3);
  const quarterStartMonth=currentQuarter*3+1;
  const start=new Date(Date.UTC(p.y,quarterStartMonth-1,1));
  start.setUTCMonth(start.getUTCMonth()+offsetQuarters*3);
  const year=start.getUTCFullYear();
  const month=start.getUTCMonth()+1;
  const elapsedDays=Math.max(0,Math.round((empDateMs(today)-empDateMs(ownerOverviewDateFromParts(p.y,quarterStartMonth,1)))/86400000));
  return {
    start:ownerOverviewDateFromParts(year,month,1),
    end:empAddDays(ownerOverviewDateFromParts(year,month,1),elapsedDays),
    label:`${year}-Q${Math.floor((month-1)/3)+1}`
  };
}
__name(ownerOverviewQuarterRange,"ownerOverviewQuarterRange");
function ownerOverviewSameMonthLastYearRange(today){
  const p=ownerOverviewDateParts(today);
  if(!p)return {start:today,end:today,label:"same_month_last_year"};
  return {
    start:ownerOverviewDateFromParts(p.y-1,p.mo,1),
    end:ownerOverviewDateFromParts(p.y-1,p.mo,p.d),
    label:`${p.y-1}-${String(p.mo).padStart(2,"0")}`
  };
}
__name(ownerOverviewSameMonthLastYearRange,"ownerOverviewSameMonthLastYearRange");
function ownerOverviewSameQuarterLastYearRange(today){
  const p=ownerOverviewDateParts(today);
  if(!p)return {start:today,end:today,label:"same_quarter_last_year"};
  const currentQuarter=Math.floor((p.mo-1)/3);
  const quarterStartMonth=currentQuarter*3+1;
  const currentStart=ownerOverviewDateFromParts(p.y,quarterStartMonth,1);
  const elapsedDays=Math.max(0,Math.round((empDateMs(today)-empDateMs(currentStart))/86400000));
  const start=ownerOverviewDateFromParts(p.y-1,quarterStartMonth,1);
  return {start,end:empAddDays(start,elapsedDays),label:`${p.y-1}-Q${currentQuarter+1}`};
}
__name(ownerOverviewSameQuarterLastYearRange,"ownerOverviewSameQuarterLastYearRange");
async function ownerOverviewFetchTransactions(env,user,range){
  const rows=[];
  if(await phase0TableExists(env,"transactions")){
    try{
      rows.push(...await phase0All(env,
        "SELECT id, session_id, cat, amount, type, tag, room, room_to, bed_from, bed_to, note, linked_task_id, arrear_handling, deposit_collection, deposit_amt, deposit_held, deposit_deduction, period_start, period_end, due_date, ts, created_at FROM transactions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' AND substr(COALESCE(ts,created_at,period_start,due_date,''),1,10) BETWEEN ? AND ? ORDER BY substr(COALESCE(ts,created_at,period_start,due_date,''),1,10) ASC LIMIT 5000",
        [user.corpid,range.start,range.end]
      ));
    }catch{}
  }
  const eventRows=await ownerOverviewFetchEntryEventTransactions(env,user,range).catch(()=>[]);
  const seen=new Set(rows.map(r=>cleanText(r?.id||"",120)).filter(Boolean));
  for(const row of eventRows){
    const id=cleanText(row?.id||"",120);
    if(id&&seen.has(id))continue;
    if(id)seen.add(id);
    rows.push(row);
  }
  return rows;
}
__name(ownerOverviewFetchTransactions,"ownerOverviewFetchTransactions");
async function ownerOverviewFetchSessionPeriodSummary(env,user,range){
  const summary={
    rows_checked:0,
    gross_received:0,
    cash_handover:0,
    bank_transfer_total:0,
    sessions:[],
    source_table:"sessions",
    rule:"owner_visible_sessions_summary"
  };
  if(!await phase0TableExists(env,"sessions"))return summary;
  const rows=await phase0All(env,
    "SELECT id, anchor_id, date, source, entries_count, cash_handover, bank_transfer_total, gross_received, handover_status, voided_at, created_at FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' AND substr(COALESCE(date,created_at,''),1,10) BETWEEN ? AND ? ORDER BY substr(COALESCE(date,created_at,''),1,10) ASC, created_at ASC LIMIT 500",
    [user.corpid,range.start,range.end]
  ).catch(()=>[]);
  summary.rows_checked=rows.length;
  for(const row of rows){
    const gross=ownerOverviewMoney(row?.gross_received);
    const cash=ownerOverviewMoney(row?.cash_handover);
    const bank=ownerOverviewMoney(row?.bank_transfer_total);
    summary.gross_received+=gross;
    summary.cash_handover+=cash;
    summary.bank_transfer_total+=bank;
    summary.sessions.push({
      date:cleanText(row?.date||"",20).slice(0,10),
      session_id:cleanText(row?.id||"",120),
      anchor:cleanText(row?.anchor_id||"",160),
      source:cleanText(row?.source||"",80),
      entries_count:Number(row?.entries_count||0),
      cash,
      bank,
      gross,
      included_reason:"owner_visible_session"
    });
  }
  summary.gross_received=ownerOverviewMoney(summary.gross_received);
  summary.cash_handover=ownerOverviewMoney(summary.cash_handover);
  summary.bank_transfer_total=ownerOverviewMoney(summary.bank_transfer_total);
  return summary;
}
__name(ownerOverviewFetchSessionPeriodSummary,"ownerOverviewFetchSessionPeriodSummary");
function ownerOverviewParseEntryEventPayload(raw){
  try{
    const parsed=JSON.parse(String(raw||"{}"));
    return parsed&&typeof parsed==="object"?parsed:{};
  }catch{
    return {};
  }
}
__name(ownerOverviewParseEntryEventPayload,"ownerOverviewParseEntryEventPayload");
async function ownerOverviewFetchEntryEventTransactions(env,user,range){
  if(!await phase0TableExists(env,"entry_events"))return [];
  const events=await phase0All(env,
    "SELECT event_id, ref_id, ref_type, event_type, field_name, new_value, operator_id, ts FROM entry_events WHERE corpid=? AND substr(COALESCE(ts,''),1,10) BETWEEN ? AND ? AND ref_type IN ('transaction','bed_transfer_event','handover_commit') ORDER BY substr(COALESCE(ts,''),1,10) ASC LIMIT 5000",
    [user.corpid,range.start,range.end]
  );
  return events.map((event)=>{
    const payload=ownerOverviewParseEntryEventPayload(event.new_value);
    if(event.ref_type==="bed_transfer_event"||payload.event_type==="bed_transfer"){
      const amount=Number(payload.amount??(Number(payload.amount_fils||0)/100));
      const payment=String(payload.payment_method||payload.pay_type||"none").toLowerCase();
      return {
        id:cleanText(payload.id||event.ref_id||event.event_id,120),
        session_id:cleanText(payload.session_id||"",120),
        cat:["cash","bank"].includes(payment)?payment:"none",
        amount:Number.isFinite(amount)?amount:0,
        type:"TF",
        tag:"transfer",
        room:cleanText(payload.from_bed||payload.room||"",40),
        room_to:cleanText(payload.to_bed||payload.room_to||"",40),
        bed_from:cleanText(payload.from_bed||payload.bed_from||"",40),
        bed_to:cleanText(payload.to_bed||payload.bed_to||"",40),
        note:cleanText(payload.reason||payload.note||payload.waiver_reason||"",500),
        ts:event.ts,
        created_at:event.ts,
        source_table:"entry_events"
      };
    }
    return {
      id:cleanText(payload.id||event.ref_id||event.event_id,120),
      session_id:cleanText(payload.session_id||"",120),
      cat:cleanText(payload.cat||(["B","bank"].includes(String(payload.pay_type||"").toUpperCase())?"bank":"cash"),20),
      amount:ownerOverviewMoney(payload.amount||payload.paid||0),
      type:cleanText(payload.type||payload.reason_code||"",20),
      tag:cleanText(payload.tag||"",20),
      room:cleanText(payload.room||payload.bed||"",40),
      room_to:cleanText(payload.room_to||payload.roomTo||"",40),
      bed_from:cleanText(payload.bed_from||"",40),
      bed_to:cleanText(payload.bed_to||"",40),
      note:cleanText(payload.note||payload.custom_reason||payload.reason||"",500),
      linked_task_id:cleanText(payload.linked_task_id||"",80),
      arrear_handling:cleanText(payload.arrear_handling||"",40),
      deposit_collection:payload.deposit_collection,
      deposit_amt:payload.deposit_amt,
      deposit_held:payload.deposit_held,
      deposit_deduction:payload.deposit_deduction,
      period_start:cleanText(payload.period_start||payload.original_period_start||"",20),
      period_end:cleanText(payload.period_end||payload.original_period_end||"",20),
      due_date:cleanText(payload.due_date||"",20),
      ts:event.ts,
      created_at:event.ts,
      source_table:"entry_events"
    };
  }).filter(row=>row.id&&Number.isFinite(Number(row.amount)));
}
__name(ownerOverviewFetchEntryEventTransactions,"ownerOverviewFetchEntryEventTransactions");
async function ownerOverviewFetchArrears(env,user){
  const projection=await rebuildAllCloudArrears(env,user,{limit:1000}).catch(()=>({open_items:[]}));
  const projectedRows=[...(projection.open_items||[])];
  const seenIds=new Set(projectedRows.map(row=>cleanText(row.task_id||row.arrears_ref||"",160)).filter(Boolean));
  const seenKeys=new Set(projectedRows.map(row=>[
    cleanText(row.bed||row.room||"",160),
    cleanText(row.entry_id||row.original_entry_id||row.source_event_id||"",120),
    empTaskRemaining(row).toFixed(2)
  ].join("|")));
  if(!await phase0TableExists(env,"arrear_tasks"))return projectedRows;
  let rows=[];
  try{
    rows=await phase0All(env,
      "SELECT task_id, customer_code, room_bed, room, bed_no, arrear_amount, actual_received, close_status, accounting_status, followup_status, directive_status, promise_date, promise_amount, promised_payment_date, promised_amount_fils, staff_note, followup_note, source_type, due_date, created_at, updated_at, userid FROM arrear_tasks WHERE corpid=? AND COALESCE(close_status,'')<>'closed' AND COALESCE(accounting_status,'')<>'voided' ORDER BY COALESCE(room_bed,room,bed_no,''), task_id LIMIT 1000",
      [user.corpid]
    );
  }catch{
    rows=await phase0All(env,
      "SELECT task_id, room AS room_bed, room, arrear_amount, actual_received, close_status, followup_status, promise_date, staff_note, created_at, updated_at, userid FROM arrear_tasks WHERE corpid=? AND COALESCE(close_status,'')<>'closed' ORDER BY COALESCE(room,''), task_id LIMIT 1000",
      [user.corpid]
    ).catch(()=>[]);
  }
  for(const row of rows||[]){
    const rowId=cleanText(row.task_id||row.source_ref||"",160);
    const key=[
      cleanText(row.bed||row.room_bed||row.room||row.bed_no||"",160),
      cleanText(row.entry_id||row.original_entry_id||"",120),
      empTaskRemaining(row).toFixed(2)
    ].join("|");
    if((rowId&&seenIds.has(rowId))||seenKeys.has(key))continue;
    projectedRows.push(row);
    if(rowId)seenIds.add(rowId);
    seenKeys.add(key);
  }
  return projectedRows;
}
__name(ownerOverviewFetchArrears,"ownerOverviewFetchArrears");
function ownerOverviewMoney(value){
  const n=Number(value||0);
  return Number.isFinite(n)?Math.round(n*100)/100:0;
}
__name(ownerOverviewMoney,"ownerOverviewMoney");
function ownerOverviewClassifyTransaction(row){
  const cat=String(row?.cat||"").toLowerCase();
  const type=String(row?.type||"").toUpperCase();
  const tag=String(row?.tag||"").toLowerCase();
  const note=String(row?.note||"").toLowerCase();
  const isDeposit=type==="DR"||Number(row?.deposit_collection||0)===1||Number(row?.deposit_amt||0)>0||Number(row?.deposit_held||0)>0;
  const isRefund=cat==="refund"||type==="CO"&&Number(row?.deposit_deduction||0)>0;
  const isExpense=cat==="expense";
  const isArrearsRecovery=!!row?.linked_task_id||["paid","recovered","partial"].includes(String(row?.arrear_handling||"").toLowerCase())||note.includes("arrear");
  const isReceived=cat==="cash"||cat==="bank";
  const isTransfer=tag==="transfer"||type==="TF"||type==="TFF"||!!row?.bed_from||!!row?.bed_to;
  const isBedTransferFee=isTransfer&&isReceived;
  return {
    isReceived,
    isDeposit,
    isRefund,
    isExpense,
    isArrearsRecovery,
    isBedTransferFee,
    isRent:isReceived&&!isDeposit&&!isArrearsRecovery&&!isBedTransferFee,
    isNewTenant:tag==="new"&&!isTransfer,
    isCheckout:type==="CO"&&!isTransfer,
    isTransfer
  };
}
__name(ownerOverviewClassifyTransaction,"ownerOverviewClassifyTransaction");
function ownerOverviewSummarizeTransactions(rows=[]){
  const out={
    rows_checked:rows.length,
    gross_received:0,
    rent_received:0,
    deposit_received:0,
    arrears_recovered:0,
    bed_transfer_fee:0,
    deposit_refund:0,
    expenses:0,
    net_cashflow:0,
    new_tenants:0,
    checkouts:0,
    bed_transfers:0,
    active_beds:new Set()
  };
  for(const row of rows){
    const amount=ownerOverviewMoney(row?.amount);
    const cls=ownerOverviewClassifyTransaction(row);
    if(cls.isReceived)out.gross_received+=amount;
    if(cls.isRent)out.rent_received+=amount;
    if(cls.isDeposit)out.deposit_received+=amount;
    if(cls.isArrearsRecovery)out.arrears_recovered+=amount;
    if(cls.isBedTransferFee)out.bed_transfer_fee+=amount;
    if(cls.isRefund)out.deposit_refund+=amount;
    if(cls.isExpense)out.expenses+=amount;
    if(cls.isNewTenant)out.new_tenants+=1;
    if(cls.isCheckout)out.checkouts+=1;
    if(cls.isTransfer)out.bed_transfers+=1;
    const bed=String(row?.room||row?.bed_to||row?.bed_from||"").trim();
    if(bed)out.active_beds.add(bed);
  }
  out.net_cashflow=ownerOverviewMoney(out.gross_received-out.deposit_refund-out.expenses);
  out.current_occupied_count=out.active_beds.size;
  delete out.active_beds;
  for(const key of Object.keys(out)){
    if(typeof out[key]==="number")out[key]=ownerOverviewMoney(out[key]);
  }
  return out;
}
__name(ownerOverviewSummarizeTransactions,"ownerOverviewSummarizeTransactions");
function canonicalFinanceProjectionZeroTotals(){
  return {
    cash_received:0,
    bank_received:0,
    gross_received:0,
    rent_income:0,
    deposit_received:0,
    deposit_refund:0,
    arrears_repaid:0,
    arrears_opened_amount:0,
    arrears_opened_count:0,
    expenses:0,
    bed_transfer_fee:0,
    cash_out:0,
    bank_out:0,
    net_cash:0
  };
}
__name(canonicalFinanceProjectionZeroTotals,"canonicalFinanceProjectionZeroTotals");
function canonicalFinanceProjectionSourceProof(){
  return {
    gateway:"canonical_finance_projection_gateway",
    source_layer:"L2 Finance Projection",
    allowed_sources:["canonical_event_archive","entries_json","correction_anchors","void_anchors","reversal_anchors","archive_effective_totals"],
    forbidden_truth_sources:["owner_display_text","employee_local_cache","preview_text","whatsapp_export_text","tenant_card_id","card_id","old_ttlock_ref","provider_phone","phone_99099","ttlock_provider_metadata"],
    deposit_current_balance_source:"TTLock / Access Snapshot D amount",
    deposit_event_role:"financial_movement_and_audit_evidence",
    owner_history_write_source:false
  };
}
__name(canonicalFinanceProjectionSourceProof,"canonicalFinanceProjectionSourceProof");
function canonicalFinanceProjectionRoundTotals(totals={}){
  const out={...totals};
  for(const key of Object.keys(out)){
    if(typeof out[key]==="number")out[key]=ownerOverviewMoney(out[key]);
  }
  return out;
}
__name(canonicalFinanceProjectionRoundTotals,"canonicalFinanceProjectionRoundTotals");
function canonicalFinanceProjectionPaymentMethod(anchor={}){
  const method=String(anchor?.payment_method||anchor?.pay_type||anchor?.method||anchor?.cat||"cash").trim().toLowerCase();
  if(method==="b"||method.includes("bank")||method.includes("transfer")||method.includes("银行"))return "bank";
  return "cash";
}
__name(canonicalFinanceProjectionPaymentMethod,"canonicalFinanceProjectionPaymentMethod");
function canonicalFinanceProjectionAmount(...values){
  for(const value of values){
    const n=ownerOverviewMoney(value);
    if(n>0)return n;
  }
  return 0;
}
__name(canonicalFinanceProjectionAmount,"canonicalFinanceProjectionAmount");
function canonicalFinanceProjectionEventType(anchor={}){
  return String(anchor?.event_type||entryAnchorEventType(entryAnchorType(anchor))).trim().toLowerCase();
}
__name(canonicalFinanceProjectionEventType,"canonicalFinanceProjectionEventType");
function canonicalFinanceProjectionAddInflow(totals,method,amount){
  const safeAmount=ownerOverviewMoney(amount);
  if(safeAmount<=0)return;
  if(method==="bank")totals.bank_received+=safeAmount;
  else totals.cash_received+=safeAmount;
  totals.gross_received+=safeAmount;
}
__name(canonicalFinanceProjectionAddInflow,"canonicalFinanceProjectionAddInflow");
function canonicalFinanceProjectionAddOutflow(totals,method,amount){
  const safeAmount=ownerOverviewMoney(amount);
  if(safeAmount<=0)return;
  if(method==="bank")totals.bank_out+=safeAmount;
  else totals.cash_out+=safeAmount;
}
__name(canonicalFinanceProjectionAddOutflow,"canonicalFinanceProjectionAddOutflow");
function canonicalFinanceProjectionApplyAnchor(totals,anchor={}){
  const type=canonicalFinanceProjectionEventType(anchor);
  const method=canonicalFinanceProjectionPaymentMethod(anchor);
  if(type==="rent"){
    const paid=canonicalFinanceProjectionAmount(anchor.paid_amount,anchor.payment_amount,anchor.amount,anchor.paid);
    const expected=canonicalFinanceProjectionAmount(anchor.expected_rent,anchor.expected_amount,anchor.period_due,anchor.due);
    const arrears=canonicalFinanceProjectionAmount(anchor.arrears_amount,anchor.short_paid_amount,anchor.remaining_arrears_before_payment,Math.max(0,expected-paid));
    canonicalFinanceProjectionAddInflow(totals,method,paid);
    totals.rent_income+=paid;
    if(arrears>0){
      totals.arrears_opened_amount+=arrears;
      totals.arrears_opened_count+=1;
    }
  }else if(type==="arrears_payment"){
    const amount=canonicalFinanceProjectionAmount(anchor.payment_amount,anchor.amount,anchor.paid_amount);
    canonicalFinanceProjectionAddInflow(totals,method,amount);
    totals.arrears_repaid+=amount;
  }else if(type==="deposit_in"){
    const amount=canonicalFinanceProjectionAmount(anchor.deposit_paid_amount,anchor.deposit_amount,anchor.amount,anchor.paid_amount);
    canonicalFinanceProjectionAddInflow(totals,method,amount);
    totals.deposit_received+=amount;
  }else if(type==="deposit_out"){
    const amount=canonicalFinanceProjectionAmount(anchor.actual_refund_amount,anchor.refund_amount,anchor.deposit_refund,anchor.amount);
    canonicalFinanceProjectionAddOutflow(totals,method,amount);
    totals.deposit_refund+=amount;
  }else if(type==="expense"){
    const amount=canonicalFinanceProjectionAmount(anchor.expense_amount,anchor.amount);
    canonicalFinanceProjectionAddOutflow(totals,method,amount);
    totals.expenses+=amount;
  }else if(type==="bed_transfer"||type==="bed_transfer_fee"){
    const feeStatus=String(anchor?.fee_status||anchor?.fee_choice||anchor?.fee_option||"").toLowerCase();
    const amount=canonicalFinanceProjectionAmount(anchor.fee_amount,anchor.amount);
    if(amount>0&&!feeStatus.includes("waiv")){
      canonicalFinanceProjectionAddInflow(totals,method,amount);
      totals.bed_transfer_fee+=amount;
    }
  }
}
__name(canonicalFinanceProjectionApplyAnchor,"canonicalFinanceProjectionApplyAnchor");
function canonicalFinanceProjectionApplyCorrectionEffectiveTotals(totals,summary={}){
  const effective=summary.archive_effective_totals||{};
  const depositLiability=ownerOverviewMoney(effective.deposit_liability);
  const depositRefund=Math.max(0,-depositLiability);
  const expense=ownerOverviewMoney(effective.expense);
  totals.cash_received+=ownerOverviewMoney(effective.cash);
  totals.bank_received+=ownerOverviewMoney(effective.bank);
  totals.gross_received+=ownerOverviewMoney(effective.gross);
  totals.rent_income+=ownerOverviewMoney(effective.rent_income);
  totals.deposit_received+=Math.max(0,depositLiability);
  totals.deposit_refund+=depositRefund;
  totals.arrears_repaid+=ownerOverviewMoney(effective.arrears_repaid);
  totals.arrears_opened_amount+=ownerOverviewMoney(effective.arrears_open);
  if(ownerOverviewMoney(effective.arrears_open)>0)totals.arrears_opened_count+=1;
  totals.expenses+=expense;
  totals.cash_out+=depositRefund+expense;
  totals.bed_transfer_fee+=ownerOverviewMoney(effective.transfer_fee);
}
__name(canonicalFinanceProjectionApplyCorrectionEffectiveTotals,"canonicalFinanceProjectionApplyCorrectionEffectiveTotals");
async function canonicalFinanceProjectionFetchSessions(env,user,range={},options={}){
  if(!await phase0TableExists(env,"sessions"))return [];
  const includeVoided=options.include_voided!==false;
  const columns=await empTableColumns(env,"sessions").catch(()=>new Set());
  const entriesExpr=columns.has("entries_json")?"entries_json":"'' AS entries_json";
  const exportExpr=columns.has("export_text")?"export_text":"'' AS export_text";
  const where=includeVoided
    ? "corpid=? AND substr(COALESCE(date,created_at,''),1,10) BETWEEN ? AND ?"
    : "corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' AND substr(COALESCE(date,created_at,''),1,10) BETWEEN ? AND ?";
  return phase0All(env,
    `SELECT id, anchor_id, date, source, entries_count, cash_handover, bank_transfer_total, gross_received, handover_status, voided_at, created_at, ${exportExpr}, ${entriesExpr} FROM sessions WHERE ${where} ORDER BY substr(COALESCE(date,created_at,''),1,10) ASC, created_at ASC LIMIT 1000`,
    [user.corpid,range.start,range.end]
  ).catch(()=>[]);
}
__name(canonicalFinanceProjectionFetchSessions,"canonicalFinanceProjectionFetchSessions");
async function canonicalFinanceProjectionBuild(env,user,range={},options={}){
  const sessions=await canonicalFinanceProjectionFetchSessions(env,user,range,options);
  const totals=canonicalFinanceProjectionZeroTotals();
  const excluded_records=[];
  const reconciliation_warnings=[];
  const session_details=[];
  const includeCorrections=options.include_corrections!==false;
  const correctionTargets=sessions.flatMap(session=>[
    cleanText(session?.anchor_id||"",180),
    cleanText(session?.id||"",180)
  ]).filter(Boolean);
  const correctionRowsByTarget=includeCorrections
    ? await ownerCorrectionFetchCorrectionSessionsByTarget(env,user,correctionTargets).catch(()=>new Map())
    : new Map();
  let active_session_count=0;
  let voided_session_count=0;
  let corrected_session_count=0;
  for(const session of sessions){
    const targetAnchor=cleanText(session?.anchor_id||session?.id||"",180);
    const targetId=cleanText(session?.id||"",180);
    const anchors=extractEmployeeEntryAnchorsFromSession(session);
    const detail=anchors.length
      ? {rows:anchors,source:"structured"}
      : await ownerHistoryArchiveDetailRows(env,user,session,true).catch(()=>({rows:[],source:"none"}));
    const correctionRows=includeCorrections?[
      ...(correctionRowsByTarget.get(targetAnchor)||[]),
      ...(targetId&&targetId!==targetAnchor?(correctionRowsByTarget.get(targetId)||[]):[])
    ]:[];
    const correctionFields=ownerHistoryDetailCorrectionFields(session,detail.rows,correctionRows);
    const summary=correctionFields.correction_summary||{};
    const archiveState=summary.archive_state||canonicalOwnerHistoryArchiveState(session,correctionFields);
    const activeForTotals=summary.active_for_totals!==false&&canonicalOwnerHistoryActiveForTotals(archiveState);
    if(archiveState==="voided"||archiveState==="deleted"||archiveState==="reversed")voided_session_count+=1;
    if(summary.correction_applied)corrected_session_count+=1;
    session_details.push({
      session_id:cleanText(session?.id||"",160),
      anchor:targetAnchor,
      date:cleanText(session?.date||session?.created_at||"",40).slice(0,10),
      archive_state:archiveState,
      active_for_totals:activeForTotals,
      raw_totals:summary.raw_totals||null,
      correction_totals:summary.correction_totals||null,
      corrected_totals:summary.corrected_totals||summary.adjusted_totals||null,
      archive_effective_totals:summary.archive_effective_totals||null,
      entries_json_anchor_count:anchors.length,
      source:detail.source
    });
    if(!activeForTotals){
      excluded_records.push({session_id:session.id,anchor:targetAnchor,archive_state:archiveState,reason:"excluded_from_active_finance_totals"});
      continue;
    }
    active_session_count+=1;
    if(summary.correction_applied){
      canonicalFinanceProjectionApplyCorrectionEffectiveTotals(totals,summary);
    }else if(anchors.length){
      for(const anchor of anchors)canonicalFinanceProjectionApplyAnchor(totals,anchor);
    }else{
      reconciliation_warnings.push({code:"CANONICAL_ANCHORS_MISSING",session_id:session.id,anchor:targetAnchor,message:"No entries_json anchors found; session summary used as legacy compatibility only."});
      totals.cash_received+=ownerOverviewMoney(session.cash_handover);
      totals.bank_received+=ownerOverviewMoney(session.bank_transfer_total);
      totals.gross_received+=ownerOverviewMoney(session.gross_received);
    }
  }
  const rounded=canonicalFinanceProjectionRoundTotals(totals);
  rounded.net_cash=ownerOverviewMoney(rounded.cash_received-rounded.cash_out);
  return {
    ...rounded,
    active_session_count,
    voided_session_count,
    corrected_session_count,
    source_proof:canonicalFinanceProjectionSourceProof(),
    excluded_records,
    reconciliation_warnings,
    sessions:session_details,
    range,
    readonly:true,
    production_cutover:"PRODUCTION_NO_GO"
  };
}
__name(canonicalFinanceProjectionBuild,"canonicalFinanceProjectionBuild");
function canonicalFinanceProjectionToOverviewSummary(projection={}){
  return {
    rows_checked:Number(projection.active_session_count||0)+Number(projection.voided_session_count||0),
    gross_received:ownerOverviewMoney(projection.gross_received),
    rent_received:ownerOverviewMoney(projection.rent_income),
    deposit_received:ownerOverviewMoney(projection.deposit_received),
    arrears_recovered:ownerOverviewMoney(projection.arrears_repaid),
    bed_transfer_fee:ownerOverviewMoney(projection.bed_transfer_fee),
    deposit_refund:ownerOverviewMoney(projection.deposit_refund),
    expenses:ownerOverviewMoney(projection.expenses),
    net_cashflow:ownerOverviewMoney(projection.net_cash),
    cash_received:ownerOverviewMoney(projection.cash_received),
    bank_received:ownerOverviewMoney(projection.bank_received),
    cash_handover:ownerOverviewMoney(projection.cash_received),
    bank_transfer_total:ownerOverviewMoney(projection.bank_received),
    arrears_opened_amount:ownerOverviewMoney(projection.arrears_opened_amount),
    arrears_opened_count:Number(projection.arrears_opened_count||0),
    active_session_count:Number(projection.active_session_count||0),
    voided_session_count:Number(projection.voided_session_count||0),
    corrected_session_count:Number(projection.corrected_session_count||0),
    source_proof:projection.source_proof,
    excluded_records:projection.excluded_records||[],
    reconciliation_warnings:projection.reconciliation_warnings||[],
    sessions:projection.sessions||[],
    source_table:"canonical_event_archive",
    rule:"canonical_finance_projection_gateway"
  };
}
__name(canonicalFinanceProjectionToOverviewSummary,"canonicalFinanceProjectionToOverviewSummary");
async function handleOwnerFinanceProjection(request,env,user){
  if(!canReadOwnerData(user))return forbidden();
  const url=new URL(request.url);
  const today=empTodayDubai();
  let range={start:url.searchParams.get("start")||"",end:url.searchParams.get("end")||""};
  if(!range.start||!range.end){
    const month=url.searchParams.get("month");
    if(month&&/^\d{4}-\d{2}$/.test(month)){
      range={start:`${month}-01`,end:empAddDays(ownerOverviewDateFromParts(Number(month.slice(0,4)),Number(month.slice(5,7))+1,1),-1)};
    }else{
      range=ownerOverviewBillingPeriodRange(today,0);
    }
  }
  const includeVoided=url.searchParams.get("include_voided")!=="0";
  const projection=await canonicalFinanceProjectionBuild(env,user,range,{include_voided:includeVoided,include_corrections:url.searchParams.get("include_corrections")!=="0"});
  return success(projection);
}
__name(handleOwnerFinanceProjection,"handleOwnerFinanceProjection");
function ownerOverviewDelta(current,comparison){
  const currentValue=ownerOverviewMoney(current);
  const comparisonValue=ownerOverviewMoney(comparison);
  const absolute_delta=ownerOverviewMoney(currentValue-comparisonValue);
  const percent_delta=comparisonValue===0?null:ownerOverviewMoney(absolute_delta/comparisonValue*100);
  const direction=comparisonValue===0?"no_data":absolute_delta>0?"up":absolute_delta<0?"down":"flat";
  const interpretation=comparisonValue===0?"no_data":direction==="up"?"improving":direction==="down"?"declining":"flat";
  return {current:currentValue,comparison:comparisonValue,absolute_delta,percent_delta,direction,interpretation};
}
__name(ownerOverviewDelta,"ownerOverviewDelta");
function ownerOverviewIsCloudArrearsRow(row){
  const source=String(row?.source_type||row?.source||"").toLowerCase();
  const type=String(row?.event_type||row?.original_type||row?.category||"").toLowerCase();
  const text=String(row?.arrears_note||row?.staff_note||row?.owner_note||row?.note||row?.raw_display_line||"").toLowerCase();
  const status=String(row?.status||row?.arrears_status||row?.accounting_status||"").toLowerCase();
  if(["settled","closed","waived","void","voided","cleared"].includes(status))return false;
  if(source.includes("ttlock")||source.includes("card_expired")||type.includes("ttlock"))return false;
  return [
    "existing_arrears_record",
    "historical_arrears",
    "system_arrears",
    "employee_entry_short_paid",
    "short_paid",
    "cloud_arrears"
  ].some(marker=>source.includes(marker)||type.includes(marker)||text.includes(marker.replaceAll("_"," ")))
    || /\b(balance|arrears|short paid|short_paid)\b/.test(text);
}
__name(ownerOverviewIsCloudArrearsRow,"ownerOverviewIsCloudArrearsRow");
function ownerOverviewParseLeftWithArrearsMeta(row){
  const text=[row?.staff_note,row?.owner_note,row?.arrear_reason,row?.note,row?.raw_display_line].map(v=>String(v||"")).join("\n");
  const match=text.match(/LEFT_WITH_ARREARS\s+({[\s\S]*?})(?:\n|$)/);
  if(!match)return {};
  try{return JSON.parse(match[1])||{};}catch{return {};}
}
__name(ownerOverviewParseLeftWithArrearsMeta,"ownerOverviewParseLeftWithArrearsMeta");
function ownerOverviewArrearsSummary(rows=[],today=empTodayDubai()){
  const summary={
    open_count:0,
    outstanding_amount:0,
    overdue_count:0,
    overdue_amount:0,
    broken_promise_count:0,
    needs_review_count:0,
    partial_payment_count:0,
    source_counts:{existing_arrears_record:0,ttlock_expired_unpaid:0,other:0},
    employee_followup:{assigned_count:0,followed_up_count:0,promise_count:0,unassigned_count:0},
    cloud_arrears_collection:{total_remaining:0,open_count:0,partial_count:0,details:[]},
    cloud_arrears_details:[]
  };
  for(const row of rows){
    const amount=ownerOverviewMoney(row?.arrear_amount??row?.remain??(Number(row?.amount_fils||0)/100));
    const received=ownerOverviewMoney(row?.actual_received);
    const remaining=Math.max(0,ownerOverviewMoney(amount-received));
    const source=String(row?.source_type||"existing_arrears_record").toLowerCase();
    const directive=String(row?.directive_status||"none").toLowerCase();
    const follow=String(row?.followup_status||"").toLowerCase();
    const promise=String(row?.promise_date||row?.promised_payment_date||"").slice(0,10);
    const due=String(row?.due_date||promise||"").slice(0,10);
    summary.open_count+=1;
    summary.outstanding_amount+=remaining;
    if(due&&due<today&&remaining>0){
      summary.overdue_count+=1;
      summary.overdue_amount+=remaining;
    }
    if(promise&&promise<today&&remaining>0)summary.broken_promise_count+=1;
    if(["needs_review","paid_reported"].includes(follow)||directive==="followed_up")summary.needs_review_count+=1;
    if(received>0&&remaining>0)summary.partial_payment_count+=1;
    if(source==="ttlock_expired_unpaid"||source==="ttlock_expired_card")summary.source_counts.ttlock_expired_unpaid+=1;
    else if(source==="existing_arrears_record"||source==="historical_arrears")summary.source_counts.existing_arrears_record+=1;
    else summary.source_counts.other+=1;
    if(["assigned","viewed","pending"].includes(directive))summary.employee_followup.assigned_count+=1;
    else if(["followed_up","promised"].includes(directive))summary.employee_followup.followed_up_count+=1;
    else summary.employee_followup.unassigned_count+=1;
    if(promise)summary.employee_followup.promise_count+=1;
    if(remaining>0&&ownerOverviewIsCloudArrearsRow(row)){
      const leftMeta=ownerOverviewParseLeftWithArrearsMeta(row);
      const detail={
        bed:cleanText(row?.room_bed||row?.bed_no||row?.bed||row?.room||"",40),
        customer_name:cleanText(row?.tenant_name||row?.customer_name||row?.card_name||row?.customer_code||"",120),
        arrears_ref:cleanText(row?.arrears_ref||row?.task_id||row?.id||row?.source_ref||"",160),
        original_date:cleanText(row?.original_date||row?.source_date||row?.date||row?.created_at||"",40).slice(0,10),
        original_amount:amount,
        already_paid:received,
        remaining_arrears:remaining,
        due_date:due,
        promise_date:promise,
        original_note:cleanText(row?.arrears_note||row?.staff_note||row?.owner_note||row?.note||row?.raw_display_line||"",300),
        status:received>0?"partial":"open",
        repayment_history:Array.isArray(row?.linked_repayment_events)?row.linked_repayment_events:[],
        left_with_arrears:!!(leftMeta.left_with_arrears||leftMeta.customer_left),
        customer_left:!!leftMeta.customer_left,
        former_customer_name:cleanText(leftMeta.former_customer_name||leftMeta.card_name||"",120),
        card_name:cleanText(leftMeta.card_name||leftMeta.former_customer_name||"",120),
        former_customer_phone:cleanText(leftMeta.former_customer_phone||leftMeta.whatsapp_phone||"",80),
        whatsapp_phone:cleanText(leftMeta.whatsapp_phone||leftMeta.former_customer_phone||"",80),
        contact_method:cleanText(leftMeta.contact_method||"",40),
        contact_note:cleanText(leftMeta.contact_note||"",300),
        belongings_held:!!leftMeta.belongings_held,
        belongings_note:cleanText(leftMeta.belongings_note||"",500),
        promised_payment_date:cleanText(leftMeta.promised_payment_date||"",40),
        promised_return_date:cleanText(leftMeta.promised_return_date||leftMeta.promise_return_date||"",40),
        promise_return_date:cleanText(leftMeta.promise_return_date||leftMeta.promised_return_date||"",40),
        left_date:cleanText(leftMeta.left_date||leftMeta.checkout_date||"",40),
        checkout_date:cleanText(leftMeta.checkout_date||leftMeta.left_date||"",40),
        confirmed_not_returning_date:cleanText(leftMeta.confirmed_not_returning_date||"",40),
        coverage_end_date:cleanText(leftMeta.coverage_end_date||leftMeta.card_end_date||"",40),
        card_end_date:cleanText(leftMeta.card_end_date||leftMeta.coverage_end_date||"",40),
        left_arrears_amount:ownerOverviewMoney(leftMeta.left_arrears_amount||leftMeta.arrears_amount||0),
        cloud_arrears_ref:cleanText(leftMeta.cloud_arrears_ref||row?.task_id||row?.arrears_ref||"",160),
        overdue_days:Number(leftMeta.overdue_days||0)||0,
        deposit_balance:ownerOverviewMoney(leftMeta.deposit_balance||0),
        left_status:cleanText(leftMeta.left_status||"",80),
        final_status:cleanText(leftMeta.final_status||"",80),
        review_date:cleanText(leftMeta.review_date||"",40),
        grace_days_after_promise:Number(leftMeta.grace_days_after_promise||0)||0
      };
      summary.cloud_arrears_collection.details.push(detail);
      summary.cloud_arrears_collection.total_remaining+=remaining;
      if(detail.status==="partial")summary.cloud_arrears_collection.partial_count+=1;
      else summary.cloud_arrears_collection.open_count+=1;
    }
  }
  summary.outstanding_amount=ownerOverviewMoney(summary.outstanding_amount);
  summary.overdue_amount=ownerOverviewMoney(summary.overdue_amount);
  summary.cloud_arrears_collection.total_remaining=ownerOverviewMoney(summary.cloud_arrears_collection.total_remaining);
  summary.cloud_arrears_details=summary.cloud_arrears_collection.details;
  return summary;
}
__name(ownerOverviewArrearsSummary,"ownerOverviewArrearsSummary");
async function ownerOverviewFetchBedTransferReviews(env,user){
  if(!await empTableExists(env,"bed_transfer_events").catch(()=>false))return [];
  const rows=await env.DB.prepare(`SELECT * FROM bed_transfer_events
    WHERE corp_id=? AND status IN ('recorded','pending_review')
    ORDER BY created_at DESC
    LIMIT 5`).bind(user.corpid).all().catch(()=>({results:[]}));
  return (rows.results||[]).map(bedTransferEventView);
}
__name(ownerOverviewFetchBedTransferReviews,"ownerOverviewFetchBedTransferReviews");
async function phase0OwnerOverviewComparativeSummary(env,user,url){
  const today=empTodayDubai();
  const currentMonth=ownerOverviewMonthRange(today,0);
  const currentBillingPeriod=ownerOverviewBillingPeriodRange(today,0);
  const lastMonth=ownerOverviewMonthRange(today,-1);
  const sameMonthLastYear=ownerOverviewSameMonthLastYearRange(today);
  const currentQuarter=ownerOverviewQuarterRange(today,0);
  const lastQuarter=ownerOverviewQuarterRange(today,-1);
  const sameQuarterLastYear=ownerOverviewSameQuarterLastYearRange(today);
  const safeRows=(promise)=>promise.catch(()=>[]);
  const safeFinanceProjection=(range)=>canonicalFinanceProjectionBuild(env,user,range,{include_voided:true,include_corrections:true}).catch(()=>null);
  const [
    monthRows,
    billingPeriodRows,
    billingPeriodSessionSummary,
    lastMonthRows,
    sameMonthLastYearRows,
    quarterRows,
    lastQuarterRows,
    sameQuarterLastYearRows,
    billingPeriodFinanceProjection,
    currentSot,
    bedTransferReviews
  ]=await Promise.all([
    safeRows(ownerOverviewFetchTransactions(env,user,currentMonth)),
    safeRows(ownerOverviewFetchTransactions(env,user,currentBillingPeriod)),
    ownerOverviewFetchSessionPeriodSummary(env,user,currentBillingPeriod).catch(()=>({rows_checked:0,gross_received:0,cash_handover:0,bank_transfer_total:0,sessions:[],source_table:"sessions",rule:"owner_visible_sessions_summary"})),
    safeRows(ownerOverviewFetchTransactions(env,user,lastMonth)),
    safeRows(ownerOverviewFetchTransactions(env,user,sameMonthLastYear)),
    safeRows(ownerOverviewFetchTransactions(env,user,currentQuarter)),
    safeRows(ownerOverviewFetchTransactions(env,user,lastQuarter)),
    safeRows(ownerOverviewFetchTransactions(env,user,sameQuarterLastYear)),
    safeFinanceProjection(currentBillingPeriod),
    resolveCurrentReceivablesSot(env,user,{limit:500,ttlockTimeoutMs:8000}).catch(()=>null),
    safeRows(ownerOverviewFetchBedTransferReviews(env,user))
  ]);
  const financeOrLegacy=(projection,rows)=>projection?canonicalFinanceProjectionToOverviewSummary(projection):ownerOverviewSummarizeTransactions(rows);
  const month=ownerOverviewSummarizeTransactions(monthRows);
  const billingPeriod=financeOrLegacy(billingPeriodFinanceProjection,billingPeriodRows);
  const currentPeriodReceived=billingPeriodFinanceProjection
    ? {...canonicalFinanceProjectionToOverviewSummary(billingPeriodFinanceProjection),range:currentBillingPeriod,rule:"canonical_finance_projection_gateway_billing_period_3_to_2"}
    : {...billingPeriodSessionSummary,range:currentBillingPeriod,rule:"billing_period_3_to_2_owner_visible_sessions"};
  const prevMonth=ownerOverviewSummarizeTransactions(lastMonthRows);
  const sameLastYear=ownerOverviewSummarizeTransactions(sameMonthLastYearRows);
  const quarter=ownerOverviewSummarizeTransactions(quarterRows);
  const prevQuarter=ownerOverviewSummarizeTransactions(lastQuarterRows);
  const sameQuarterLastYearSummary=ownerOverviewSummarizeTransactions(sameQuarterLastYearRows);
  const arrearRows=currentSot?.all_rows||[];
  const arrears=ownerOverviewArrearsSummary(arrearRows,today);
  const consoleSummary=currentSot?.summary||{};
  const consoleBreakdown=currentSot?.source_breakdown||{};
  if(currentSot){
    arrears.open_count=Number(consoleSummary.action_count??consoleSummary.total_count??arrears.open_count);
    arrears.outstanding_amount=ownerOverviewMoney(Number(consoleSummary.outstanding_amount_fils??consoleSummary.total_amount_fils??0)/100);
    arrears.source_counts.ttlock_expired_unpaid=Number(consoleSummary.ttlock_expired_unpaid_count??consoleBreakdown.ttlock_expired_unpaid_count??arrears.source_counts.ttlock_expired_unpaid);
    arrears.source_counts.existing_arrears_record=Number(consoleSummary.existing_arrears_count??consoleBreakdown.existing_arrears_count??arrears.source_counts.existing_arrears_record);
  }
  const noData=[];
  if(!month.rows_checked)noData.push("current_month_transactions");
  if(!currentPeriodReceived.rows_checked)noData.push("current_billing_period_finance_projection");
  if(!prevMonth.rows_checked)noData.push("last_month_transactions");
  if(!sameLastYear.rows_checked)noData.push("same_month_last_year_transactions");
  if(!arrearRows.length)noData.push("open_arrears");
  return success({
    generated_at:empNow(),
    production_cutover:"PRODUCTION_NO_GO",
    readonly:true,
    period:{today,current_billing_period:currentBillingPeriod,current_month:currentMonth,last_month:lastMonth,same_month_last_year:sameMonthLastYear,current_quarter:currentQuarter,last_quarter:lastQuarter,same_quarter_last_year:sameQuarterLastYear},
    current:{month,quarter,billing_period:billingPeriod},
    current_period_received:currentPeriodReceived,
    last_month:prevMonth,
    same_month_last_year:sameLastYear,
    quarter_to_date:quarter,
    comparisons:{
      last_month:{
        gross_received:ownerOverviewDelta(month.gross_received,prevMonth.gross_received),
        rent_received:ownerOverviewDelta(month.rent_received,prevMonth.rent_received),
        net_cashflow:ownerOverviewDelta(month.net_cashflow,prevMonth.net_cashflow),
        arrears_recovered:ownerOverviewDelta(month.arrears_recovered,prevMonth.arrears_recovered)
      },
      same_month_last_year:{
        gross_received:ownerOverviewDelta(month.gross_received,sameLastYear.gross_received),
        rent_received:ownerOverviewDelta(month.rent_received,sameLastYear.rent_received),
        net_cashflow:ownerOverviewDelta(month.net_cashflow,sameLastYear.net_cashflow),
        arrears_recovered:ownerOverviewDelta(month.arrears_recovered,sameLastYear.arrears_recovered)
      },
      last_quarter:{
        gross_received:ownerOverviewDelta(quarter.gross_received,prevQuarter.gross_received),
        net_cashflow:ownerOverviewDelta(quarter.net_cashflow,prevQuarter.net_cashflow)
      },
      same_quarter_last_year:{
        gross_received:ownerOverviewDelta(quarter.gross_received,sameQuarterLastYearSummary.gross_received),
        net_cashflow:ownerOverviewDelta(quarter.net_cashflow,sameQuarterLastYearSummary.net_cashflow)
      }
    },
    accounting_separation:{
      rent_received:month.rent_received,
      deposit_received:month.deposit_received,
      arrears_recovered:month.arrears_recovered,
      bed_transfer_fee:month.bed_transfer_fee,
      deposit_refund:month.deposit_refund,
      expenses:month.expenses,
      net_cashflow:month.net_cashflow
    },
    occupancy_flow:{
      new_tenants:month.new_tenants,
      checkouts:month.checkouts,
      bed_transfers:month.bed_transfers,
      current_occupied_count:month.current_occupied_count,
      transfer_rule:"bed transfers are not counted as new tenants or checkouts"
    },
    bed_transfer_review:{
      recorded_count:bedTransferReviews.length,
      records:bedTransferReviews,
      pending_review_count:0,
      pending_review:[]
    },
    arrears,
    current_receivables_sot:currentSot?{
      summary:currentSot.summary,
      source_breakdown:currentSot.source_breakdown,
      rows:(currentSot.all_rows||[]).slice(0,500),
      overdue:currentSot.overdue||[],
      due_today:currentSot.due_today||[],
      due_soon:currentSot.due_soon||[],
      source:currentSot.source,
      source_function:currentSot.source_function,
      generated_at:currentSot.generated_at
    }:null,
    risk_watch:{
      overdue_count:Number(consoleSummary.overdue_count??consoleBreakdown.overdue_count??arrears.overdue_count),
      due_today_count:Number(consoleSummary.due_today_count??consoleBreakdown.due_today_count??0),
      due_soon_count:Number(consoleSummary.due_soon_count??consoleBreakdown.due_soon_count??0),
      action_count:Number(consoleSummary.action_count??consoleBreakdown.action_count??arrears.open_count),
      outstanding_amount_fils:Number(consoleSummary.outstanding_amount_fils??consoleBreakdown.outstanding_amount_fils??0),
      overdue_amount:arrears.overdue_amount,
      broken_promise_count:arrears.broken_promise_count,
      partial_payment_count:arrears.partial_payment_count,
      needs_review_count:arrears.needs_review_count
    },
    data_quality:{
      rows_checked:{current_month:month.rows_checked,current_billing_period_transactions:billingPeriod.rows_checked,current_billing_period_sessions:currentPeriodReceived.rows_checked,last_month:prevMonth.rows_checked,same_month_last_year:sameLastYear.rows_checked,current_quarter:quarter.rows_checked,arrears:arrearRows.length},
      no_data:noData,
      warnings:noData.length?["Some comparison windows have no source rows; show no-data instead of fabricating trend."]:[]
    }
  });
}
__name(phase0OwnerOverviewComparativeSummary,"phase0OwnerOverviewComparativeSummary");
async function phase0Audit(env,user,url){
  const limit=phase0Limit(url);
  if(await phase0TableExists(env,"audit_logs")){
    const rows=await phase0All(env,"SELECT * FROM audit_logs WHERE corpid=? OR corpid IS NULL ORDER BY created_at DESC LIMIT ?",[user.corpid,limit]);
    return success({audit:rows,readonly:isReadonlyAdminRoleValue(user.role)});
  }
  return success({audit:[],readonly:isReadonlyAdminRoleValue(user.role)});
}
__name(phase0Audit,"phase0Audit");
async function handlePhase0ReadOnlyApi(request,env,user){
  if(!isPhase0RouteWiringEnabled(env))return null;
  const url=new URL(request.url);
  const path=url.pathname;
  const method=request.method;
  if(path==="/api/health"&&method==="GET")return success({status:"healthy",environment:env.APP_ENV||"",phase0RouteWiring:true});
  if(path==="/api/health/db"&&method==="GET")return success({status:env.DB?"connected":"missing",database:"D1"});
  if(path==="/api/metrics/errors"&&method==="GET")return success({errorRate:0,window:"local_phase0",readonly:true});
  if(path==="/api/entry/add"&&method==="POST"&&isReadonlyAdminRoleValue(user.role))return forbidden();
  if(method!=="GET")return null;
  if(path==="/api/properties")return phase0Properties(env,user,url);
  if(path==="/api/entries")return phase0Entries(env,user,url);
  if(path==="/api/payments")return phase0Payments(env,user,url);
  if(path==="/api/customers"){
    if(canReadOwnerData(user))return null;
    return success({customers:[],updatedBy:"",updatedAt:"",phase0RouteWiring:true});
  }
  if(path==="/api/dashboard")return success({status:"ok",phase0RouteWiring:true});
  if(path==="/api/dashboard/totals")return phase0DashboardTotals(env,user);
  if(path==="/api/receivables")return phase0Receivables(env,user,url);
  if(path==="/api/arrears"&&!canReadOwnerData(user))return success([]);
  if(path==="/api/history"&&!canReadOwnerData(user))return success([]);
  if(path.startsWith("/api/owner/")){
    if(!canReadOwnerData(user))return forbidden();
    if(path==="/api/owner/properties")return phase0Properties(env,user,url);
    if(path==="/api/owner/totals")return phase0DashboardTotals(env,user);
    if(path==="/api/owner/bed-transfers")return handleOwnerBedTransfers(request,env,user);
    if(path==="/api/owner/finance/projection")return handleOwnerFinanceProjection(request,env,user);
    if(path==="/api/owner/cloud-arrears/projection")return handleOwnerCloudArrearsProjection(request,env,user);
    if(path==="/api/owner/today-todos")return handleOwnerTodayTodos(request,env,user);
    if(path==="/api/owner/console-receivables-sot"||path==="/api/owner/current-receivables-sot"){
      const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||500),1),500);
      return success(await resolveConsoleReceivablesSot(env,user,{limit,ttlockTimeoutMs:8000}));
    }
    if(path==="/api/owner/overview/comparative-summary")return phase0OwnerOverviewComparativeSummary(env,user,url);
    if(path==="/api/owner/history")return phase0Entries(env,user,url);
    if(path==="/api/owner/arrears")return phase0Receivables(env,user,url);
    return success({status:"ok",scope:"owner",path});
  }
  if(path.startsWith("/api/admin/")){
    if(!isReadonlyAdminRoleValue(user.role))return forbidden();
    if(path==="/api/admin/audit")return phase0Audit(env,user,url);
    if(path==="/api/admin/totals")return phase0DashboardTotals(env,user);
    if(path==="/api/admin/history"||path==="/api/admin/entries")return phase0Entries(env,user,url);
    return success({status:"ok",scope:"admin",path,readonly:true});
  }
  return null;
}
__name(handlePhase0ReadOnlyApi,"handlePhase0ReadOnlyApi");
const HSC_ALLOWED_APP_ENVS = new Set(["development","dev","local","test","staging"]);
const HSC_EMPLOYEE_ROLES = new Set(["staff","employee"]);
const HSC_VOIDED_STATUSES = new Set(["VOID","VOIDED","DELETED","CANCELLED"]);
const HSC_CATEGORY_ALIASES = {
  R:"rent",RENT:"rent",RENT_INCOME:"rent",
  D:"deposit_in",DEPOSIT:"deposit_in",DEPOSIT_IN:"deposit_in",
  AP:"arrears",ARREARS:"arrears",ARREARS_PAYMENT:"arrears",
  TF:"bed_transfer_fee",BED_TRANSFER_FEE:"bed_transfer_fee",TRANSFER_FEE:"transfer_fee",
  DR:"deposit_refund",DEPOSIT_REFUND:"deposit_refund",
  E:"expense",EXPENSE:"expense"
};
const HSC_PAYMENT_ALIASES = {C:"cash",CASH:"cash",B:"bank",BANK:"bank",TRANSFER:"bank"};
const HSC_INCOME_CATEGORIES = new Set(["rent","deposit_in","arrears","transfer_fee","bed_transfer_fee"]);
const HSC_OUTFLOW_CATEGORIES = new Set(["deposit_refund","expense"]);
function hscIssue(code,message,extra={}){
  return {code,message,...extra};
}
__name(hscIssue,"hscIssue");
function hscError(code,message,status,extra={}){
  return json({...fail(errorCodeForStatus(status),message,code),success:false,domainCode:code,...extra},status);
}
__name(hscError,"hscError");
function hscEnvGate(env){
  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
  if(appEnv==="production")return {ok:false,status:404,code:"NOT_FOUND",message:"Endpoint not found."};
  if(!HSC_ALLOWED_APP_ENVS.has(appEnv))return {ok:false,status:403,code:"FEATURE_DISABLED",message:"Feature disabled for this environment."};
  const enabled=["1","true","yes","on"].includes(String(env.ENABLE_HANDOVER_ATOMIC_STAGING||"").trim().toLowerCase());
  if(!enabled)return {ok:false,status:403,code:"FEATURE_DISABLED",message:"Handover atomic staging endpoint is disabled."};
  return {ok:true,appEnv};
}
__name(hscEnvGate,"hscEnvGate");
function hscInputValue(row,keys){
  for(const key of keys){
    if(row?.[key]!==void 0&&row?.[key]!==null)return row[key];
  }
  return void 0;
}
__name(hscInputValue,"hscInputValue");
function hscRequiredText(value,field,errors,max=160){
  const text=cleanText(value||"",max);
  if(!text)errors.push(hscIssue("MISSING_REQUIRED_FIELD",`${field} is required.`,{field}));
  return text;
}
__name(hscRequiredText,"hscRequiredText");
function hscNormalizeAlias(value,aliases,field,rowId,errors){
  const key=String(value??"").trim().toUpperCase();
  const normalized=aliases[key];
  if(!normalized){
    errors.push(hscIssue(`INVALID_${field.toUpperCase()}`,`Unsupported ${field}.`,{field,rowId,value}));
    return "";
  }
  return normalized;
}
__name(hscNormalizeAlias,"hscNormalizeAlias");
function hscFilsToAedString(fils){
  let value=BigInt(fils);
  const negative=value<0n;
  if(negative)value=-value;
  const whole=value/100n;
  const cents=String(value%100n).padStart(2,"0");
  return `${negative?"-":""}${whole.toString()}.${cents}`;
}
__name(hscFilsToAedString,"hscFilsToAedString");
function hscFilsToSafeInteger(fils,field){
  const value=BigInt(fils);
  if(value>BigInt(Number.MAX_SAFE_INTEGER)||value<BigInt(Number.MIN_SAFE_INTEGER)){
    throw new Error(`${field} exceeds safe integer range.`);
  }
  return Number(value);
}
__name(hscFilsToSafeInteger,"hscFilsToSafeInteger");
function hscParseAedToFils(value,{field="amount",rowId="",allowNegative=false}={}){
  const warnings=[];
  const errors=[];
  if(value===null||value===void 0||String(value).trim()===""){
    errors.push(hscIssue("MISSING_AMOUNT",`${field} is required.`,{field,rowId,value}));
    return {ok:false,fils:null,aed:null,warnings,errors};
  }
  if(typeof value==="number"&&!Number.isFinite(value)){
    errors.push(hscIssue("INVALID_NUMBER_AMOUNT",`${field} is not finite.`,{field,rowId,value}));
    return {ok:false,fils:null,aed:null,warnings,errors};
  }
  if(typeof value==="number")warnings.push(hscIssue("LEGACY_NUMBER_AMOUNT","Legacy numeric money value converted.",{field,rowId,value}));
  else warnings.push(hscIssue("LEGACY_DECIMAL_AMOUNT","Legacy decimal money value converted.",{field,rowId,value}));
  const raw=String(value).trim().replace(/,/g,"");
  if(!/^-?\d+(?:\.\d{1,2})?$/.test(raw)){
    errors.push(hscIssue("INVALID_AMOUNT",`${field} must have at most 2 decimals.`,{field,rowId,value}));
    return {ok:false,fils:null,aed:null,warnings,errors};
  }
  const negative=raw.startsWith("-");
  if(negative&&!allowNegative){
    errors.push(hscIssue("NEGATIVE_AMOUNT_NOT_ALLOWED",`${field} cannot be negative.`,{field,rowId,value}));
    return {ok:false,fils:null,aed:null,warnings,errors};
  }
  const clean=negative?raw.slice(1):raw;
  const [whole,frac=""]=clean.split(".");
  let fils=BigInt(whole)*100n+BigInt(frac.padEnd(2,"0"));
  if(negative)fils=-fils;
  return {ok:true,fils,aed:hscFilsToAedString(fils),warnings,errors};
}
__name(hscParseAedToFils,"hscParseAedToFils");
function hscIsVoidedRow(row){
  if(!row||typeof row!=="object")return false;
  if(row.voided_at||row.session_voided_at||row.transaction_voided_at)return true;
  const status=String(row.status??row.session_status??row.transaction_status??"").trim().toUpperCase();
  return HSC_VOIDED_STATUSES.has(status);
}
__name(hscIsVoidedRow,"hscIsVoidedRow");
function hscNormalizeOneRow(row,index){
  const errors=[];
  const warnings=[];
  const rowId=String(hscInputValue(row,["client_entry_id","clientEntryId","id"])??`row-${index+1}`);
  const clientEntryId=hscRequiredText(hscInputValue(row,["client_entry_id","clientEntryId","id"]),"client_entry_id",errors,120);
  const rawType=hscInputValue(row,["event_type","eventType","type","category"]);
  const rawPayment=hscInputValue(row,["payment_method","paymentMethod","pay_type","pay","cat"]);
  const amountValue=hscInputValue(row,["amount","paid","amount_aed","amountAed"]);
  const category=hscNormalizeAlias(rawType,HSC_CATEGORY_ALIASES,"event_type",rowId,errors);
  const paymentMethod=hscNormalizeAlias(rawPayment,HSC_PAYMENT_ALIASES,"payment_method",rowId,errors);
  const money=hscParseAedToFils(amountValue,{field:"amount",rowId});
  warnings.push(...money.warnings);
  errors.push(...money.errors);
  if(hscIsVoidedRow(row))errors.push(hscIssue("VOIDED_ROW_REJECTED","Voided session or transaction row cannot be recommitted.",{rowId}));
  const normalized={
    ...row,
    id:rowId,
    client_entry_id:clientEntryId,
    category,
    event_type:String(rawType??""),
    payment_method:paymentMethod,
    pay_type:paymentMethod==="cash"?"C":"B",
    amount:amountValue===void 0||amountValue===null?"":String(amountValue).trim(),
    amountFils:money.ok?money.fils:null,
    amountAed:money.ok?money.aed:null,
    bed:cleanText(row?.bed??row?.room??"",80),
    tenant:cleanText(row?.tenant??row?.tenant_name??"",160)
  };
  return {ok:errors.length===0,rowId,normalized,errors,warnings};
}
__name(hscNormalizeOneRow,"hscNormalizeOneRow");
function hscClassifyRows(rows){
  const acceptedRows=[];
  const rejectedRows=[];
  const warnings=[];
  const errors=[];
  (Array.isArray(rows)?rows:[]).forEach((row,index)=>{
    const item=hscNormalizeOneRow(row,index);
    warnings.push(...item.warnings);
    if(item.ok)acceptedRows.push(item.normalized);
    else{
      errors.push(...item.errors);
      rejectedRows.push({rowId:item.rowId,errors:item.errors,warnings:item.warnings});
    }
  });
  return {acceptedRows,rejectedRows,warnings,errors};
}
__name(hscClassifyRows,"hscClassifyRows");
function hscCreateTotals(rows){
  const totals={
    cashTotalFils:0n,cashOutflowFils:0n,cashHandoverFils:0n,bankTransferTotalFils:0n,bankTransferOutFils:0n,
    bankTransferCount:0,grossReceivedFils:0n,rentReceivedFils:0n,depositReceivedFils:0n,arrearsPaidFils:0n,
    transferFeeFils:0n,refundFils:0n,expenseFils:0n,sessionTotalFils:0n,handoverTotalFils:0n,
    rowCount:rows.length,includedRowCount:0,excludedVoidedRowCount:0,warnings:[],errors:[]
  };
  for(const row of rows){
    const amount=BigInt(row.amountFils||0n);
    totals.includedRowCount+=1;
    if(row.category==="rent")totals.rentReceivedFils+=amount;
    if(row.category==="deposit_in")totals.depositReceivedFils+=amount;
    if(row.category==="arrears")totals.arrearsPaidFils+=amount;
    if(row.category==="transfer_fee"||row.category==="bed_transfer_fee")totals.transferFeeFils+=amount;
    if(row.category==="deposit_refund")totals.refundFils+=amount;
    if(row.category==="expense")totals.expenseFils+=amount;
    if(HSC_INCOME_CATEGORIES.has(row.category)){
      totals.grossReceivedFils+=amount;
      totals.sessionTotalFils+=amount;
      totals.handoverTotalFils+=amount;
      if(row.payment_method==="cash")totals.cashTotalFils+=amount;
      if(row.payment_method==="bank"){
        totals.bankTransferTotalFils+=amount;
        if(amount>0n)totals.bankTransferCount+=1;
      }
    }else if(HSC_OUTFLOW_CATEGORIES.has(row.category)){
      totals.sessionTotalFils-=amount;
      totals.handoverTotalFils-=amount;
      if(row.payment_method==="cash")totals.cashOutflowFils+=amount;
      if(row.payment_method==="bank")totals.bankTransferOutFils+=amount;
    }
  }
  totals.cashHandoverFils=totals.cashTotalFils-totals.cashOutflowFils;
  return totals;
}
__name(hscCreateTotals,"hscCreateTotals");
function hscFormatTotals(totals){
  return {
    cashHandoverFils:hscFilsToSafeInteger(totals.cashHandoverFils,"cashHandoverFils"),
    cashHandoverAed:hscFilsToAedString(totals.cashHandoverFils),
    bankTransferTotalFils:hscFilsToSafeInteger(totals.bankTransferTotalFils,"bankTransferTotalFils"),
    bankTransferTotalAed:hscFilsToAedString(totals.bankTransferTotalFils),
    grossReceivedFils:hscFilsToSafeInteger(totals.grossReceivedFils,"grossReceivedFils"),
    grossReceivedAed:hscFilsToAedString(totals.grossReceivedFils),
    sessionTotalFils:hscFilsToSafeInteger(totals.sessionTotalFils,"sessionTotalFils"),
    sessionTotalAed:hscFilsToAedString(totals.sessionTotalFils),
    rentReceivedFils:hscFilsToSafeInteger(totals.rentReceivedFils,"rentReceivedFils"),
    rentReceivedAed:hscFilsToAedString(totals.rentReceivedFils),
    depositReceivedFils:hscFilsToSafeInteger(totals.depositReceivedFils,"depositReceivedFils"),
    depositReceivedAed:hscFilsToAedString(totals.depositReceivedFils),
    arrearsPaidFils:hscFilsToSafeInteger(totals.arrearsPaidFils,"arrearsPaidFils"),
    arrearsPaidAed:hscFilsToAedString(totals.arrearsPaidFils),
    bankTransferCount:totals.bankTransferCount,
    rowCount:totals.rowCount,
    includedRowCount:totals.includedRowCount,
    warnings:totals.warnings,
    errors:totals.errors
  };
}
__name(hscFormatTotals,"hscFormatTotals");
function hscFrontendMoney(frontendTotals,keys,field,allowNegative=false){
  const value=keys.map((key)=>frontendTotals?.[key]).find((item)=>item!==void 0);
  if(value===void 0)return null;
  return hscParseAedToFils(value,{field,allowNegative});
}
__name(hscFrontendMoney,"hscFrontendMoney");
function hscCompareFrontendTotals(frontendTotals,backendTotals){
  const comparisons=[];
  const warnings=[];
  const errors=[];
  const items=[
    {field:"cash_handover",keys:["cash_handover","cashHandover","cashHandoverAed"],backendKey:"cashHandoverFils",allowNegative:true},
    {field:"bank_transfer_total",keys:["bank_transfer_total","bankTransferTotal","bankTransferAed"],backendKey:"bankTransferTotalFils"},
    {field:"gross_received",keys:["gross_received","grossReceived","grossReceivedAed"],backendKey:"grossReceivedFils"},
    {field:"session_total",keys:["session_total","sessionTotal","handover_total","handoverTotal"],backendKey:"sessionTotalFils"}
  ];
  for(const item of items){
    const parsed=hscFrontendMoney(frontendTotals,item.keys,item.field,item.allowNegative);
    if(!parsed)continue;
    warnings.push(...parsed.warnings);
    errors.push(...parsed.errors);
    if(!parsed.ok){
      comparisons.push({field:item.field,matches:false,error:true});
      continue;
    }
    const backendFils=BigInt(backendTotals[item.backendKey]||0n);
    const deltaFils=parsed.fils-backendFils;
    comparisons.push({field:item.field,submittedFils:hscFilsToSafeInteger(parsed.fils,item.field),backendFils:hscFilsToSafeInteger(backendFils,item.field),deltaFils:hscFilsToSafeInteger(deltaFils,item.field),submittedAed:hscFilsToAedString(parsed.fils),backendAed:hscFilsToAedString(backendFils),deltaAed:hscFilsToAedString(deltaFils),matches:deltaFils===0n});
  }
  const countValue=frontendTotals?.bank_transfer_count??frontendTotals?.bankTransferCount;
  if(countValue!==void 0){
    const submittedCount=Number(countValue);
    const backendCount=Number(backendTotals.bankTransferCount||0);
    comparisons.push({field:"bank_transfer_count",submittedCount,backendCount,deltaCount:submittedCount-backendCount,matches:submittedCount===backendCount});
  }
  return {matches:comparisons.every((item)=>item.matches)&&errors.length===0,comparisons,warnings,errors};
}
__name(hscCompareFrontendTotals,"hscCompareFrontendTotals");
function hscStableValue(value){
  if(typeof value==="bigint")return `${value.toString()}n`;
  if(Array.isArray(value))return value.map((item)=>hscStableValue(item));
  if(value&&typeof value==="object"){
    return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,hscStableValue(value[key])]));
  }
  return value;
}
__name(hscStableValue,"hscStableValue");
async function hscSha256(value){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash)).map((b)=>b.toString(16).padStart(2,"0")).join("");
}
__name(hscSha256,"hscSha256");
async function hscFingerprint(requestBody){
  const rows=Array.isArray(requestBody?.rows)?requestBody.rows:[];
  const payload={
    sessionId:requestBody.session_id??requestBody.sessionId??"",
    employeeId:requestBody.employee_id??requestBody.employeeId??"",
    propertyId:requestBody.property_id??requestBody.propertyId??"",
    rows:rows.map((row)=>({
      client_entry_id:hscInputValue(row,["client_entry_id","clientEntryId","id"]),
      event_type:hscInputValue(row,["event_type","eventType","type","category"]),
      payment_method:hscInputValue(row,["payment_method","paymentMethod","pay_type","pay","cat"]),
      amount:hscInputValue(row,["amount","paid","amount_aed","amountAed"]),
      bed:row?.bed??row?.room??"",
      tenant:row?.tenant??row?.tenant_name??"",
      voided_at:row?.voided_at??row?.session_voided_at??row?.transaction_voided_at??"",
      status:row?.status??row?.session_status??row?.transaction_status??""
    }))
  };
  return hscSha256(JSON.stringify(hscStableValue(payload)));
}
__name(hscFingerprint,"hscFingerprint");
function hscMaxDeltaFils(comparison){
  return Math.max(0,...(comparison.comparisons||[]).map((item)=>Math.abs(Number(item.deltaFils||item.deltaCount||0))));
}
__name(hscMaxDeltaFils,"hscMaxDeltaFils");
function hscHasError(errors,code){
  return (errors||[]).some((item)=>item.code===code);
}
__name(hscHasError,"hscHasError");
async function hscWriteAttemptAudit(env,user,{commitId="",propertyId="",sessionId="",employeeId="",status="",payload={}}){
  await audit(env,user,`handover.staging.${status.toLowerCase()}`,"handover_commits",{commit_id:commitId,property_id:propertyId,session_id:sessionId,employee_id:employeeId,...payload}).catch(()=>{});
  await env.DB.prepare(`INSERT INTO handover_audit_events
    (event_id, commit_id, company_id, property_id, employee_id, session_id, event_type, event_status, event_payload_json, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(),commitId,user.corpid||"",propertyId,employeeId,sessionId,"handover_commit_attempt",status,JSON.stringify(payload||{}),empNow(),user.userid||"").run().catch(()=>{});
}
__name(hscWriteAttemptAudit,"hscWriteAttemptAudit");
async function handleHandoverStagingCommit(request,env){
  const gate=hscEnvGate(env);
  if(!gate.ok)return hscError(gate.code,gate.message,gate.status);
  if(request.method!=="POST")return hscError("METHOD_NOT_ALLOWED","Method not allowed.",405);
  const auth=await requireAuth(request,env);
  if(auth.error)return unauthorized();
  const user=auth.payload;
  if(!HSC_EMPLOYEE_ROLES.has(String(user.role||"").toLowerCase()))return hscError("FORBIDDEN","Only employee/staff may submit staging handover commits.",403);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  if(!body||typeof body!=="object"||Array.isArray(body))return hscError("INVALID_REQUEST","Request body must be an object.",400);
  const errors=[];
  const sessionId=hscRequiredText(body.session_id??body.sessionId,"session_id",errors,120);
  const idempotencyKey=hscRequiredText(body.idempotency_key??body.idempotencyKey,"idempotency_key",errors,180);
  const bodyEmployeeId=hscRequiredText(body.employee_id??body.employeeId,"employee_id",errors,120).toLowerCase();
  const propertyId=hscRequiredText(body.property_id??body.propertyId,"property_id",errors,120);
  const submittedAt=hscRequiredText(body.submitted_at??body.submittedAt,"submitted_at",errors,80);
  const rows=Array.isArray(body.rows)?body.rows:[];
  if(!Array.isArray(body.rows)||!rows.length)errors.push(hscIssue("MISSING_ROWS","Handover rows are required.",{field:"rows"}));
  if(rows.length>500)errors.push(hscIssue("TOO_MANY_ROWS","Handover rows exceed limit 500.",{field:"rows",value:rows.length}));
  if(bodyEmployeeId&&bodyEmployeeId!==String(user.userid||"").toLowerCase())errors.push(hscIssue("EMPLOYEE_CONTEXT_MISMATCH","Authenticated employee does not match request employee.",{field:"employee_id",value:bodyEmployeeId}));
  if(!idempotencyKey)return hscError("MISSING_IDEMPOTENCY_KEY","idempotency_key is required.",400,{errors});
  const fingerprint=await hscFingerprint(body);
  const existingKey=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND idempotency_key=? LIMIT 1")
    .bind(user.corpid||"",propertyId,idempotencyKey).first().catch(()=>null);
    if(existingKey){
    if(existingKey.request_fingerprint===fingerprint){
      const commit=await env.DB.prepare("SELECT * FROM handover_commits WHERE commit_id=? LIMIT 1").bind(existingKey.commit_id||"").first().catch(()=>null);
      return success({success:true,status:"IDEMPOTENT_REPLAY",commit_id:existingKey.commit_id,idempotency_status:"IDEMPOTENT_REPLAY",backend_totals:commit?{cashHandoverFils:commit.backend_cash_handover_fils,bankTransferTotalFils:commit.backend_bank_transfer_fils,grossReceivedFils:commit.backend_gross_received_fils,sessionTotalFils:commit.backend_session_total_fils}:null});
    }
    return hscError("IDEMPOTENCY_CONFLICT","Same idempotency key was used with a different payload.",409);
  }
  const duplicateFingerprint=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND request_fingerprint=? LIMIT 1")
    .bind(user.corpid||"",propertyId,fingerprint).first().catch(()=>null);
  if(duplicateFingerprint)return hscError("DUPLICATE_HANDOVER_RISK","Same handover rows were submitted with a different idempotency key.",409,{existing_commit_id:duplicateFingerprint.commit_id||""});
  const duplicateSession=await env.DB.prepare("SELECT * FROM handover_commits WHERE company_id=? AND property_id=? AND session_id=? AND status='ACCEPTED' LIMIT 1")
    .bind(user.corpid||"",propertyId,sessionId).first().catch(()=>null);
  if(duplicateSession)return hscError("DUPLICATE_HANDOVER_RISK","Session already has an accepted staging handover commit.",409,{existing_commit_id:duplicateSession.commit_id||""});
  const classified=hscClassifyRows(rows);
  errors.push(...classified.errors);
  const totals=hscCreateTotals(classified.acceptedRows);
  errors.push(...totals.errors);
  const frontendTotals=body.frontend_totals??body.frontendTotals??body.client_totals??{};
  const comparison=hscCompareFrontendTotals(frontendTotals,totals);
  errors.push(...comparison.errors);
  let status="ACCEPTED";
  if(hscHasError(errors,"EMPLOYEE_CONTEXT_MISMATCH"))status="UNAUTHORIZED";
  else if(hscHasError(errors,"VOIDED_ROW_REJECTED"))status="VOIDED_REJECTED";
  else if(hscHasError(errors,"INVALID_AMOUNT")||hscHasError(errors,"MISSING_AMOUNT")||hscHasError(errors,"INVALID_NUMBER_AMOUNT"))status="INVALID_AMOUNT";
  else if(errors.length)status="REJECTED";
  else if(!comparison.matches)status="FRONTEND_TOTALS_MISMATCH";
  if(status==="UNAUTHORIZED")return hscError("UNAUTHORIZED_EMPLOYEE_SCOPE","Employee is outside allowed handover scope.",403,{errors});
  if(status==="VOIDED_REJECTED"||status==="INVALID_AMOUNT"||status==="FRONTEND_TOTALS_MISMATCH"||status==="REJECTED"){
    await hscWriteAttemptAudit(env,user,{propertyId,sessionId,employeeId:bodyEmployeeId,status,payload:{errors,comparison}});
    const code=status==="FRONTEND_TOTALS_MISMATCH"?"FRONTEND_TOTALS_MISMATCH":status;
    return hscError(code,"Staging handover commit rejected.",422,{errors,rejected_rows:classified.rejectedRows,frontend_total_comparison:comparison,backend_totals:hscFormatTotals(totals)});
  }
  const now=empNow();
  const commitId=empId("hsc");
  const backend=hscFormatTotals(totals);
  const frontendParsed={
    cash:hscFrontendMoney(frontendTotals,["cash_handover","cashHandover","cashHandoverAed"],"cash_handover",true),
    bank:hscFrontendMoney(frontendTotals,["bank_transfer_total","bankTransferTotal","bankTransferAed"],"bank_transfer_total"),
    gross:hscFrontendMoney(frontendTotals,["gross_received","grossReceived","grossReceivedAed"],"gross_received"),
    session:hscFrontendMoney(frontendTotals,["session_total","sessionTotal","handover_total","handoverTotal"],"session_total")
  };
  const statements=[
    env.DB.prepare(`INSERT INTO handover_commits (
      commit_id, company_id, property_id, employee_id, session_id, idempotency_key, request_fingerprint,
      status, submitted_at, accepted_at, committed_at,
      backend_cash_handover_fils, backend_bank_transfer_fils, backend_gross_received_fils, backend_session_total_fils,
      backend_deposit_fils, backend_rent_fils, backend_arrears_paid_fils,
      frontend_cash_handover_fils, frontend_bank_transfer_fils, frontend_gross_received_fils, frontend_session_total_fils,
      frontend_bank_transfer_count, delta_max_fils, delta_json, bank_transfer_count, accepted_row_count, rejected_row_count,
      decision_reason, audit_payload_json, created_at, created_by, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(commitId,user.corpid||"",propertyId,bodyEmployeeId,sessionId,idempotencyKey,fingerprint,"ACCEPTED",submittedAt,now,now,
        backend.cashHandoverFils,backend.bankTransferTotalFils,backend.grossReceivedFils,backend.sessionTotalFils,
        backend.depositReceivedFils,backend.rentReceivedFils,backend.arrearsPaidFils,
        frontendParsed.cash?.ok?hscFilsToSafeInteger(frontendParsed.cash.fils,"frontend_cash_handover_fils"):null,
        frontendParsed.bank?.ok?hscFilsToSafeInteger(frontendParsed.bank.fils,"frontend_bank_transfer_fils"):null,
        frontendParsed.gross?.ok?hscFilsToSafeInteger(frontendParsed.gross.fils,"frontend_gross_received_fils"):null,
        frontendParsed.session?.ok?hscFilsToSafeInteger(frontendParsed.session.fils,"frontend_session_total_fils"):null,
        Number(frontendTotals.bank_transfer_count??frontendTotals.bankTransferCount??0),
        hscMaxDeltaFils(comparison),JSON.stringify(comparison.comparisons||[]),backend.bankTransferCount,classified.acceptedRows.length,classified.rejectedRows.length,
        "accepted_by_staging_backend_recompute",JSON.stringify({warnings:[...classified.warnings,...comparison.warnings]}),now,user.userid||"",now,user.userid||""),
    env.DB.prepare(`INSERT INTO handover_idempotency_keys
      (key_id, company_id, property_id, employee_id, idempotency_key, request_fingerprint, commit_id, status, first_seen_at, last_seen_at, response_digest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(empId("idem"),user.corpid||"",propertyId,bodyEmployeeId,idempotencyKey,fingerprint,commitId,"ACCEPTED",now,now,await hscSha256(`${commitId}:${fingerprint}`)),
    env.DB.prepare(`INSERT INTO handover_audit_events
      (event_id, commit_id, company_id, property_id, employee_id, session_id, event_type, event_status, event_payload_json, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(empId("hae"),commitId,user.corpid||"",propertyId,bodyEmployeeId,sessionId,"handover_commit_accepted","ACCEPTED",JSON.stringify({backend_totals:backend}),now,user.userid||""),
    env.DB.prepare(`INSERT INTO entry_events
      (event_id, corpid, userid, ref_id, ref_type, event_type, field_name, old_value, new_value, operator_id, ts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(empId("evt"),user.corpid||"",user.userid||"",commitId,"handover_commit","handover_commit_accepted","*", "", JSON.stringify({session_id:sessionId,backend_totals:backend}), user.userid||"", now)
  ];
  classified.acceptedRows.forEach((row,index)=>{
    statements.push(env.DB.prepare(`INSERT INTO handover_commit_rows
      (row_id, commit_id, company_id, property_id, session_id, client_entry_id, row_index, row_status, event_type, payment_method, bed, tenant_label, amount_fils, normalized_payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(empId("hrow"),commitId,user.corpid||"",propertyId,sessionId,row.client_entry_id,index,"ACCEPTED",row.category,row.payment_method,row.bed,row.tenant,hscFilsToSafeInteger(row.amountFils,"row_amount_fils"),JSON.stringify({...row,amountFils:void 0}),now));
  });
  await env.DB.batch(statements);
  await audit(env,user,"handover.staging.accepted",commitId,{property_id:propertyId,session_id:sessionId,accepted_rows:classified.acceptedRows.length}).catch(()=>{});
  return success({success:true,status:"ACCEPTED",commit_id:commitId,idempotency_status:"NEW",accepted_rows:classified.acceptedRows.length,rejected_rows:classified.rejectedRows,backend_totals:backend,frontend_total_comparison:comparison,audit_events:["handover_commit_attempt","handover_commit_accepted"]},201);
}
__name(handleHandoverStagingCommit,"handleHandoverStagingCommit");
const EEA_ALLOWED_APP_ENVS = HSC_ALLOWED_APP_ENVS;
const EEA_EMPLOYEE_ROLES = HSC_EMPLOYEE_ROLES;
function eeaEnvGate(env){
  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
  if(appEnv==="production")return {ok:false,status:404,code:"NOT_FOUND",message:"Endpoint not found."};
  if(!EEA_ALLOWED_APP_ENVS.has(appEnv))return {ok:false,status:403,code:"FEATURE_DISABLED",message:"Feature disabled for this environment."};
  const enabled=["1","true","yes","on"].includes(String(env.ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING||"").trim().toLowerCase());
  if(!enabled)return {ok:false,status:403,code:"FEATURE_DISABLED",message:"Employee entry adapter staging endpoint is disabled."};
  return {ok:true,appEnv};
}
__name(eeaEnvGate,"eeaEnvGate");
function eeaLiveRouteGate(env){
  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
  const flagEnabled=["1","true","yes","on"].includes(String(env.ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE||"").trim().toLowerCase());
  if(!flagEnabled)return {enabled:false,appEnv,reason:"feature_flag_off"};
  if(!EEA_ALLOWED_APP_ENVS.has(appEnv))return {enabled:false,appEnv,reason:"environment_not_allowed"};
  return {enabled:true,appEnv,reason:"enabled"};
}
__name(eeaLiveRouteGate,"eeaLiveRouteGate");
function eeaLiveRouteSummary(draft,gate,extra={}){
  return {
    enabled:true,
    app_env:gate.appEnv,
    mode:draft.mode,
    status:draft.status,
    ok:Boolean(draft.ok),
    adapter_writes_database:false,
    legacy_write_continued:Boolean(extra.legacyWriteContinued),
    duplicate:Boolean(extra.duplicate),
    frontend_totals_authority:false,
    production_migration:false,
    remote_migration:false,
    production_deploy:false,
    transaction_fils_patch:draft.transactionPlan?.filsPatch||null,
    session_fils_patch:draft.sessionPlan?.filsPatch||null,
    deposit_ledger_fils_patch:draft.depositLedgerPlan?.filsPatch||null,
    arrear_task_fils_patch:draft.arrearTaskPlan?.filsPatch||null,
    warnings:(draft.warnings||[]).map((item)=>item.code||String(item)),
    errors:(draft.errors||[]).map((item)=>item.code||String(item)),
    audit_plan:(draft.auditPlan||[]).map((item)=>item.event_type||"")
  };
}
__name(eeaLiveRouteSummary,"eeaLiveRouteSummary");
async function eeaRecordLiveRoutePrevalidation(env,user,refId,draft,gate){
  const payload={
    route:"/api/employee/entry",
    app_env:gate.appEnv,
    adapter_status:draft.status,
    adapter_ok:Boolean(draft.ok),
    warning_codes:(draft.warnings||[]).map((item)=>item.code||String(item)),
    error_codes:(draft.errors||[]).map((item)=>item.code||String(item)),
    adapter_writes_database:false,
    legacy_write_pending:Boolean(draft.ok&&draft.status!=="SKIPPED_VOIDED"),
    frontend_totals_authority:false
  };
  await empEvent(env,user,{
    ref_id:refId,
    ref_type:"employee_entry_live_route_switch_rehearsal",
    event_type:"employee_entry_adapter_prevalidation",
    field_name:"adapter_status",
    old_value:"",
    new_value:JSON.stringify(payload),
    operator_id:user.userid||"",
    ts:empNow()
  });
  await audit(env,user,"employee.entry.adapter_prevalidation",refId,payload).catch(()=>{});
}
__name(eeaRecordLiveRoutePrevalidation,"eeaRecordLiveRoutePrevalidation");
function eeaBuildAdapterInput(body,user){
  const entry=body?.entry&&typeof body.entry==="object"&&!Array.isArray(body.entry)?body.entry:{};
  const session=body?.session&&typeof body.session==="object"&&!Array.isArray(body.session)?body.session:{};
  const resolved=body?.resolved&&typeof body.resolved==="object"&&!Array.isArray(body.resolved)?body.resolved:{};
  const ids=body?.ids&&typeof body.ids==="object"&&!Array.isArray(body.ids)?body.ids:{};
  const propertyId=cleanText(body?.property_id??body?.propertyId??resolved.propertyId??"",120);
  return {
    auth:{
      companyId:cleanText(user.corpid||"",120),
      corpid:cleanText(user.corpid||"",120),
      propertyId,
      operatorId:cleanText(user.userid||"",120),
      userid:cleanText(user.userid||"",120),
      userId:cleanText(user.userid||"",120)
    },
    body:{session,entry},
    resolved:{...resolved,propertyId:propertyId||cleanText(resolved.propertyId||"",120)},
    ids
  };
}
__name(eeaBuildAdapterInput,"eeaBuildAdapterInput");
async function handleEmployeeEntryAdapterStagingDraft(request,env){
  const gate=eeaEnvGate(env);
  if(!gate.ok)return hscError(gate.code,gate.message,gate.status);
  if(request.method!=="POST")return hscError("METHOD_NOT_ALLOWED","Method not allowed.",405);
  const auth=await requireAuth(request,env);
  if(auth.error)return unauthorized();
  const user=auth.payload;
  if(!EEA_EMPLOYEE_ROLES.has(String(user.role||"").toLowerCase()))return hscError("FORBIDDEN","Only employee/staff may use the employee entry adapter staging endpoint.",403);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  if(!body||typeof body!=="object"||Array.isArray(body))return hscError("INVALID_REQUEST","Request body must be an object.",400);
  const draft=createEmployeeEntryLiveWriteAdapterDraft(eeaBuildAdapterInput(body,user));
  const response={
    success: Boolean(draft.ok),
    endpoint:"/api/staging/employee-entry/adapter-draft",
    status:draft.status,
    adapter_draft:draft,
    audit_plan:draft.auditPlan||[],
    metadata:{
      ...(draft.metadata||{}),
      app_env:gate.appEnv,
      stagingOnly:true,
      writesDatabase:false,
      liveRouteChanged:false,
      legacyLiveTablesWritten:false,
      productionMigration:false,
      remoteMigration:false,
      productionDeploy:false
    }
  };
  if(draft.status==="SKIPPED_VOIDED")return success(response,200);
  if(draft.ok)return success(response,200);
  return errorResponse("Employee entry adapter draft rejected.",422,"EMPLOYEE_ENTRY_ADAPTER_REJECTED",{adapter_draft:response});
}
__name(handleEmployeeEntryAdapterStagingDraft,"handleEmployeeEntryAdapterStagingDraft");
// EMPLOYEE_API_PATCH_END

function redirectToRootEntry(request, portal = "") {
  const target = new URL("/", request.url);
  if (portal) target.searchParams.set("portal", portal);
  return Response.redirect(target, 302);
}
__name(redirectToRootEntry, "redirectToRootEntry");
function redirectToPath(request, pathname) {
  const target = new URL(request.url);
  target.pathname = pathname;
  target.search = "";
  return Response.redirect(target, 302);
}
__name(redirectToPath, "redirectToPath");
async function readRouteClaim(request, env) {
  const auth = await requireAuth(request, env);
  return auth.error ? null : auth.payload;
}
__name(readRouteClaim, "readRouteClaim");
async function fetchStaticAsset(request, env, pathname) {
  if (!env.ASSETS) return null;
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  assetUrl.search = "";
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: "GET",
    headers: {
      Accept: request.headers.get("Accept") || "text/html"
    }
  }));
  if (pathname === "/employee-v3" || pathname === "/employee-v3.html") {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("X-Employee-Asset-Version", HOMELINK_DIAGNOSTIC_ASSET_VERSION);
    headers.set("X-Employee-Asset-Commit", HOMELINK_DIAGNOSTIC_COMMIT_HASH);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
}
__name(fetchStaticAsset, "fetchStaticAsset");
async function handleAppEntryRoute(request, env, path, method) {
  if (method !== "GET") return null;
  // Compatibility-only paths are intercepted before static assets so legacy login UI cannot render.
  if (path === "/" || path === "/home") return fetchStaticAsset(request, env, "/portal");
  if (path === "/login" || path === "/unified-login.html") return redirectToRootEntry(request);
  if (path === "/employee-login" || path === "/staff-login" || path === "/employee.html") return redirectToRootEntry(request, "employee");
  if (path === "/employee/export") return redirectToPath(request, "/employee#arrears");
  if (path === "/owner-login") return redirectToRootEntry(request, "owner");
  if (path === "/admin-login") return redirectToRootEntry(request, "admin");
  if (path === "/employee-v3.html" || path === "/employee-v2.html") return redirectToPath(request, "/employee");
  if (path === "/index.html" || path === "/index-51.html" || path === "/owner.html") return redirectToPath(request, "/owner");
  if (path !== "/employee" && path !== "/owner" && path !== "/admin") return null;

  const claim = await readRouteClaim(request, env);
  if (!claim) return redirectToRootEntry(request);
  if (isStaffRoleValue(claim.role)) {
    return path === "/employee" ? fetchStaticAsset(request, env, "/employee-v3") : redirectToPath(request, "/employee");
  }
  if (isReadonlyAdminRoleValue(claim.role)) {
    return path === "/admin" ? fetchStaticAsset(request, env, "/index-51") : redirectToPath(request, "/admin");
  }
  if (canReadOwnerData(claim)) {
    return path === "/owner" ? fetchStaticAsset(request, env, "/index-51") : redirectToPath(request, "/owner");
  }
  return redirectToRootEntry(request);
}
__name(handleAppEntryRoute, "handleAppEntryRoute");

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (method === "OPTIONS") {
    return corsPreflightResponse(request, env);
  }
  if (path === "/favicon.ico" && method === "GET") {
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "public, max-age=86400" }
    });
  }
  const appEntryResponse = await handleAppEntryRoute(request, env, path, method);
  if (appEntryResponse) return appEntryResponse;
  const originError = enforceTrustedOrigin(request, env);
  if (originError) return originError;
  if (path === "/auth/login" && method === "POST") {
    return handleLogin(request, env);
  }
  if (path === "/auth/employee-login" && method === "POST") {
    return handleEmployeePinLogin(request, env);
  }
  if (path === "/auth/confirm-manager" && method === "POST") {
    const auth = await requireAuth(request, env);
    if (auth.error) return unauthorized();
    return handleConfirmManager(request, env);
  }
  if ((path === "/auth/logout" || path === "/api/logout") && method === "POST") {
    return handleLogout(request, env);
  }
  if (path === "/api/staging/handover/commit" && method === "POST") {
    return handleHandoverStagingCommit(request, env);
  }
  if (path === "/api/staging/employee-entry/adapter-draft" && method === "POST") {
    return handleEmployeeEntryAdapterStagingDraft(request, env);
  }
  if (path.startsWith("/api/")) {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return authFailureResponse(auth);
    }
    const user = auth.payload;
    if (path === "/api/owner/corrections/preview" && method === "POST") {
      return handleOwnerCorrectionPreview(request, env, user);
    }
    if (path === "/api/owner/corrections/apply" && method === "POST") {
      return handleOwnerCorrectionApply(request, env, user);
    }
    const employeeApiResponse = await handleEmployeeApi(request, env, user);
    if (employeeApiResponse) return employeeApiResponse;
    if (path === "/api/me") {
      const displayName = user.employee_name && user.employee_name !== user.role ? user.employee_name : user.userid;
      const data = {
        userid: user.userid,
        username: user.userid,
        employee_id: user.userid,
        display_name: displayName,
        employee_name: displayName,
        corpid: user.corpid,
        role: user.role,
        isManager: isManagerRoleValue(user.role),
        isReadonlyAdmin: isReadonlyAdminRoleValue(user.role),
        canWrite: canWriteOwnerData(user)
      };
      return json(ok(data));
    }
    const phase0ReadOnlyResponse = await handlePhase0ReadOnlyApi(request, env, user);
    if (phase0ReadOnlyResponse) return phase0ReadOnlyResponse;
    if (!canReadOwnerData(user) && !allowStaffApi(path, method)) {
      return forbidden();
    }
    if (path === "/api/security/revoke_sessions" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS active_sessions (
            sid TEXT PRIMARY KEY,
            corpid TEXT NOT NULL,
            userid TEXT NOT NULL,
            role TEXT NOT NULL,
            user_agent TEXT DEFAULT '',
            ip TEXT DEFAULT '',
            revoked INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now')),
            expires_at INTEGER NOT NULL
          )`
      ).run();
      await env.DB.prepare(
        "UPDATE active_sessions SET revoked=1 WHERE corpid=? AND sid<>?"
      ).bind(user.corpid, user.sid || "").run();
      await audit(env, user, "security.sessions.revoke_all", "active_sessions");
      return success({ success: true });
    }
    if (path === "/api/lock/cards" && method === "GET") {
      if (!canReadOwnerData(user)) return forbidden();
      try {
        const result = await loadLockCards(env);
        if (result.error) return errorResponse(result.error, result.status || 500, result.error);
        const purpose = new URL(request.url).searchParams.get("purpose") || "";
        if (canWriteOwnerData(user) && purpose !== "arrears_pool") await audit(env, user, "lock.cards.load", "", { locksCount: result.locksCount });
        return success(result);
      } catch (e) {
        return errorResponse("ttlock_failed", 502, e?.message || "ttlock_failed");
      }
    }
    if (path === "/api/wifi/accounts" && method === "GET") {
      if (!canReadOwnerData(user)) return forbidden();
      if (canWriteOwnerData(user)) {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS app_settings (
            corpid TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '{}',
            updated_by TEXT DEFAULT '',
            updated_at DATETIME DEFAULT (datetime('now')),
            PRIMARY KEY (corpid, key)
          )`
        ).run();
      }
      let row = null;
      try {
        row = await env.DB.prepare(
          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
        ).bind(user.corpid, "wifi_accounts").first();
      } catch {
        if (isReadonlyAdminRoleValue(user.role)) return success({ accounts: {}, updatedBy: "", updatedAt: "", readonly: true });
        throw new Error("wifi_accounts_table_missing");
      }
      let accounts = {};
      try {
        accounts = row?.value ? JSON.parse(row.value) : {};
      } catch {
        accounts = {};
      }
      if (hasPlainWifiPasswords(accounts) && canWriteOwnerData(user)) {
        const encrypted = await encryptWifiAccounts(accounts, env);
        await env.DB.prepare(
          `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
             VALUES (?, ?, ?, ?, datetime("now"))
             ON CONFLICT(corpid, key) DO UPDATE SET
               value=excluded.value,
               updated_by=excluded.updated_by,
               updated_at=datetime("now")`
        ).bind(user.corpid, "wifi_accounts", JSON.stringify(encrypted), user.userid).run();
        await audit(env, user, "wifi.accounts.migrate_encrypted", "wifi_accounts", { count: Object.keys(encrypted).length });
        accounts = encrypted;
      }
      accounts = await decryptWifiAccounts(accounts, env);
      return success({ accounts, updatedBy: row?.updated_by || "", updatedAt: row?.updated_at || "", readonly: isReadonlyAdminRoleValue(user.role) });
    }
    if (path === "/api/wifi/accounts" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      const body = await request.json();
      const raw = body?.accounts;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return badRequest("bad_request");
      const clean = {};
      for (const [bed, account] of Object.entries(raw)) {
        const key = cleanText(bed, 40);
        if (!key || !account || typeof account !== "object") continue;
        clean[key] = {
          bed: key,
          lockRoom: cleanText(account.lockRoom, 80),
          tenantName: cleanText(account.tenantName, 120),
          cardName: cleanText(account.cardName, 120),
          username: cleanText(account.username, 80),
          password: await encryptSecret(cleanText(account.password, 120), env),
          cardEnd: Number(account.cardEnd || 0),
          createdAt: Number(account.createdAt || Date.now()),
          manualCut: !!account.manualCut,
          archived: !!account.archived
        };
      }
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS app_settings (
            corpid TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '{}',
            updated_by TEXT DEFAULT '',
            updated_at DATETIME DEFAULT (datetime('now')),
            PRIMARY KEY (corpid, key)
          )`
      ).run();
      await env.DB.prepare(
        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
           VALUES (?, ?, ?, ?, datetime("now"))
           ON CONFLICT(corpid, key) DO UPDATE SET
             value=excluded.value,
             updated_by=excluded.updated_by,
             updated_at=datetime("now")`
      ).bind(user.corpid, "wifi_accounts", JSON.stringify(clean), user.userid).run();
      await audit(env, user, "wifi.accounts.save", "wifi_accounts", { count: Object.keys(clean).length });
      return success({ success: true, count: Object.keys(clean).length });
    }
    if ((path === "/api/arrears/followup/tasks" || path === "/api/boss/arrears/followup-tasks") && method === "GET") {
      return handleBossArrearsFollowupTasks(request, env, user);
    }
    if ((path === "/api/owner/current-receivables-sot" || path === "/api/owner/console-receivables-sot") && method === "GET") {
      if (!canReadOwnerData(user)) return forbidden();
      const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||500),1),500);
      return success(await resolveConsoleReceivablesSot(env,user,{limit,ttlockTimeoutMs:8000}));
    }
    if (path === "/api/boss/arrears/directives" && method === "POST") {
      return handleBossArrearsDirectives(request, env, user);
    }
    if (path === "/api/owner/bed-transfers" && method === "GET") {
      return handleOwnerBedTransfers(request, env, user);
    }
    if (path === "/api/owner/cloud-arrears/projection" && method === "GET") {
      return handleOwnerCloudArrearsProjection(request, env, user);
    }
    if (path === "/api/arrears" && method === "GET") {
      return handleBossArrears(request, env, user);
    }
    if (path === "/api/customers" && method === "GET") {
      if (canWriteOwnerData(user)) {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS app_settings (
            corpid TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '{}',
            updated_by TEXT DEFAULT '',
            updated_at DATETIME DEFAULT (datetime('now')),
            PRIMARY KEY (corpid, key)
          )`
        ).run();
      }
      let row = null;
      try {
        row = await env.DB.prepare(
          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
        ).bind(user.corpid, "client_credit").first();
      } catch {
        if (isReadonlyAdminRoleValue(user.role)) return success({ customers: [], updatedBy: "", updatedAt: "", readonly: true });
        throw new Error("client_credit_table_missing");
      }
      let customers = [];
      try {
        customers = row?.value ? JSON.parse(row.value) : [];
      } catch {
        customers = [];
      }
      if (!Array.isArray(customers)) customers = [];
      return success({
        customers: customers.map(sanitizeCustomer).filter(Boolean),
        updatedBy: row?.updated_by || "",
        updatedAt: row?.updated_at || ""
      });
    }
    if (path === "/api/customers" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      let body;
      try {
        body = await request.json();
      } catch {
        return badRequest("invalid_json");
      }
      const raw = body?.customers;
      if (!Array.isArray(raw) || raw.length > 2e3) return badRequest("bad_request");
      const customers = raw.map(sanitizeCustomer).filter(Boolean);
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS app_settings (
            corpid TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '{}',
            updated_by TEXT DEFAULT '',
            updated_at DATETIME DEFAULT (datetime('now')),
            PRIMARY KEY (corpid, key)
          )`
      ).run();
      await env.DB.prepare(
        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
           VALUES (?, ?, ?, ?, datetime("now"))
           ON CONFLICT(corpid, key) DO UPDATE SET
             value=excluded.value,
             updated_by=excluded.updated_by,
             updated_at=datetime("now")`
      ).bind(user.corpid, "client_credit", JSON.stringify(customers), user.userid).run();
      await audit(env, user, "customers.save", "client_credit", { count: customers.length });
      return success({ success: true, count: customers.length });
    }
    if (path === "/api/rent_config" && method === "GET") {
      if (canWriteOwnerData(user)) {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS app_settings (
            corpid TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '{}',
            updated_by TEXT DEFAULT '',
            updated_at DATETIME DEFAULT (datetime('now')),
            PRIMARY KEY (corpid, key)
          )`
        ).run();
      }
      let row = null;
      try {
        row = await env.DB.prepare(
          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
        ).bind(user.corpid, "rent_ref_room").first();
      } catch {
        if (isReadonlyAdminRoleValue(user.role)) return success({ config: {}, updatedBy: "", updatedAt: "", readonly: true });
        throw new Error("rent_config_table_missing");
      }
      let config = {};
      try {
        config = row?.value ? JSON.parse(row.value) : {};
      } catch {
        config = {};
      }
      return success({ config, updatedBy: row?.updated_by || "", updatedAt: row?.updated_at || "" });
    }
    if (path === "/api/rent_config" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS app_settings (
            corpid TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '{}',
            updated_by TEXT DEFAULT '',
            updated_at DATETIME DEFAULT (datetime('now')),
            PRIMARY KEY (corpid, key)
          )`
      ).run();
      const body = await request.json();
      const raw = body?.config;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return badRequest("bad_request");
      const clean = {};
      for (const [room, value] of Object.entries(raw)) {
        const key = String(room || "").trim();
        const num = Number(value);
        if (key && Number.isFinite(num) && num > 0 && num < 1e5) {
          clean[key] = Math.round(num * 100) / 100;
        }
      }
      await env.DB.prepare(
        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
           VALUES (?, ?, ?, ?, datetime("now"))
           ON CONFLICT(corpid, key) DO UPDATE SET
             value=excluded.value,
             updated_by=excluded.updated_by,
             updated_at=datetime("now")`
      ).bind(user.corpid, "rent_ref_room", JSON.stringify(clean), user.userid).run();
      await audit(env, user, "rent_config.update", "rent_ref_room", { count: Object.keys(clean).length });
      return success({ success: true, count: Object.keys(clean).length });
    }
    if (path === "/api/save_session" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      let body;
      try {
        body = await request.json();
      } catch {
        return badRequest("invalid_json");
      }
      if(saveSessionContainsBedTransfer(body))return bedTransferCanonicalPathRequiredResponse();
      await empEnsureSchema(env);
      const { session, arrears: sa } = body || {};
      if (!session || typeof session !== "object" || !Array.isArray(session.entries)) {
        return badRequest("bad_request");
      }
      const sessionId = cleanId(session.id);
      if (!sessionId || session.entries.length > MAX_SESSION_ENTRIES) {
        return badRequest("bad_request");
      }
      const entries = session.entries.map(sanitizeEntry).filter(Boolean);
      if (entries.length !== session.entries.length) {
        return badRequest("invalid_entries");
      }
      const entryIds = new Set(entries.map((e) => e.id));
      const arrears = Array.isArray(sa) ? sa.slice(0, MAX_SESSION_ENTRIES).map((a) => sanitizeArrear(a, sessionId, entryIds)).filter(Boolean) : [];
      const batch = [];
      const exportText = cleanText(session.export_text || session.exportText || session.raw_text || session.rawText || "", 20000);
      batch.push(env.DB.prepare(
        `INSERT OR REPLACE INTO sessions
           (id, corpid, anchor_id, date, entries_count, created_by, operator_id, operator_name, handover_status, exported_at, export_text, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), ?, ?)`
      ).bind(
        sessionId,
        user.corpid,
        cleanText(session.anchorId, 80),
        cleanDate(session.date),
        entries.length,
        user.userid,
        user.userid,
        cleanText(user.employee_name || user.userid, 120),
        "COMPLETED",
        exportText,
        "BOSS"
      ));
      for (const e of entries) {
        batch.push(env.DB.prepare(
          `INSERT OR REPLACE INTO transactions
             (id, corpid, userid, session_id, cat, room, amount,
              due, paid, deficit, tag, note, room_to,
              start_date, dep_due, dep_paid, dep_def,
              due_date, dep_date, pay_type, discount_reason, deposit_collection,
              src, operator_id, operator_name)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          e.id,
          user.corpid,
          user.userid,
          sessionId,
          e.cat,
          e.room,
          e.amount,
          e.due || 0,
          e.paid || 0,
          e.deficit || 0,
          e.tag || "Old",
          e.note || "",
          e.roomTo || "",
          e.startDate || "",
          e.depDue || 0,
          e.depPaid || 0,
          e.depDef || 0,
          e.dueDate || "",
          e.depDate || "",
          e.payType || "",
          e.discountReason || "",
          e.depositCollection ? 1 : 0,
          "BOSS",
          user.userid,
          cleanText(user.employee_name || user.userid, 120)
        ));
      }
      if (arrears.length) {
        for (const a of arrears) {
          batch.push(env.DB.prepare(
            `INSERT OR REPLACE INTO arrears
               (id, corpid, userid, room, note, remain,
                due_date, type, session_id, entry_id, cleared)
               VALUES (?,?,?,?,?,?,?,?,?,?,0)`
          ).bind(
            a.id,
            user.corpid,
            user.userid,
            a.room,
            a.note,
            a.remain,
            a.dueDate || "",
            a.type || "rent",
            sessionId,
            a.entryId || ""
          ));
        }
      }
      await env.DB.batch(batch);
      return success({ success: true, sessionId });
    }
    if (path === "/api/delete_session" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      const deleteStartedAt=Date.now();
      if(!await empTableExists(env,"sessions"))return errorResponse("history_schema_not_ready",503,"history_schema_not_ready");
      let body;
      try {
        body = await request.json();
      } catch {
        return badRequest("invalid_json");
      }
      const { id: rawId } = body || {};
      const id = cleanId(rawId);
      if (!id) return badRequest("bad_request");
      const voidReason = cleanText(body?.void_reason || body?.reason || "manager_void_session", 240);
      const voidSource = cleanText(body?.void_source || "api.delete_session", 80);
      const requestId = cleanText(body?.request_id || body?.idempotency_key || crypto.randomUUID(), 100);
      const existing = await env.DB.prepare(
        "SELECT id, anchor_id, voided_at FROM sessions WHERE id=? AND corpid=? LIMIT 1"
      ).bind(id, user.corpid).first();
      if (!existing) return errorResponse("not_found", 404, "not_found");
      const expectedAnchor=cleanText(body?.anchor||body?.anchor_id||"",120);
      if(expectedAnchor&&existing.anchor_id&&expectedAnchor!==existing.anchor_id)return badRequest("anchor_mismatch");
      const now=empNow();
      if (existing.voided_at) {
        await audit(env, user, "session.void.already_voided", id, { request_id: requestId });
        return success({ success: true, sessionId: id, voided: true, already_voided: true });
      }
      const batch = [
        env.DB.prepare(`UPDATE sessions
          SET voided_at=?,
              voided_by=?,
              void_reason=?,
              void_source=?,
              handover_status='VOID'
          WHERE id=? AND corpid=? AND COALESCE(voided_at,'')=''`).bind(
            now,
            user.userid,
            voidReason,
            voidSource,
            id,
            user.corpid
          )
      ];
      const hasTransactions = await empTableExists(env,"transactions");
      if (hasTransactions) {
        batch.push(
          env.DB.prepare(`UPDATE arrear_tasks
            SET close_status='VOID',
                close_reason='session_voided',
                followup_status='作废',
                voided_at=?,
                voided_by=?,
                void_reason=?,
                void_source=?,
                updated_by=?,
                updated_at=?
            WHERE corpid=?
              AND (
                entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)
                OR original_entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)
              )`).bind(now, user.userid, voidReason, voidSource, user.userid, now, user.corpid, id, user.corpid, id, user.corpid),
          env.DB.prepare(`UPDATE deposit_ledger
            SET voided_at=?,
                voided_by=?,
                void_reason=?,
                void_source=?
            WHERE corpid=?
              AND COALESCE(voided_at,'')=''
              AND entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)`).bind(now, user.userid, voidReason, voidSource, user.corpid, id, user.corpid),
          env.DB.prepare(`UPDATE transactions
            SET status='VOID',
                voided_at=?,
                voided_by=?,
                void_reason=?,
                void_source=?
            WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')=''`).bind(now, user.userid, voidReason, voidSource, id, user.corpid)
        );
      }
      if(await empTableExists(env,"arrears")){
        batch.push(
          env.DB.prepare(`UPDATE arrears
            SET voided_at=?,
                voided_by=?,
                void_reason=?,
                void_source=?
            WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')=''`).bind(now, user.userid, voidReason, voidSource, id, user.corpid)
        );
      }
      await env.DB.batch(batch);
      await empEvent(env,user,{
        ref_id:id,
        ref_type:"session",
        event_type:"session_void",
        field_name:"voided_at",
        old_value:"",
        new_value:JSON.stringify({voided_at:now,voided_by:user.userid,void_reason:voidReason,void_source:voidSource,request_id:requestId}),
        operator_id:user.userid,
        ts:now
      });
      await audit(env, user, "session.void", id, { request_id: requestId, reason: voidReason, source: voidSource });
      return success({ success: true, sessionId: id, anchor_id: existing.anchor_id||"", voided: true, voided_at: now, elapsed_ms: Date.now()-deleteStartedAt, affected_session_count: 1 });
    }
    if (path === "/api/clear_arrear" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      const { id: rawId } = await request.json();
      const id = cleanId(rawId);
      if (!id) return badRequest("bad_request");
      const changed=await empCloseArrearEverywhere(env,user,id,empNow());
      await audit(env, user, "arrear.clear", id, { changed });
      return success({ success: true, changed });
    }
    if (path === "/api/owner/overview/comparative-summary" && method === "GET") {
      if (!canReadOwnerData(user)) return forbidden();
      return phase0OwnerOverviewComparativeSummary(env,user,url);
    }
    if (path === "/api/owner/finance/projection" && method === "GET") {
      if (!canReadOwnerData(user)) return forbidden();
      return handleOwnerFinanceProjection(request, env, user);
    }
    if (path === "/api/owner/cloud-arrears/projection" && method === "GET") {
      return handleOwnerCloudArrearsProjection(request, env, user);
    }
    if (path === "/api/owner/today-todos" && method === "GET") {
      return handleOwnerTodayTodos(request, env, user);
    }
    if (path === "/api/owner/bed-status" && method === "GET") {
      return handleOwnerBedStatus(request, env, user);
    }
    if (path === "/api/history") {
      const requestedBed=ownerHistoryTransferLineageRequestedBed(url);
      if(requestedBed&&!canReadOwnerData(user))return forbidden();
      if(!await empTableExists(env,"sessions")){
        const data=[];
        const transferLineage=requestedBed?projectOwnerHistoryTransferLineage({corpid:user.corpid,requested_bed:requestedBed,archive_entries:[]}):null;
        return transferLineage?json({...ok(data),transfer_lineage:transferLineage}):success(data);
      }
      const includeVoided = url.searchParams.get("include_voided") === "1";
      const rawLimit = Number(url.searchParams.get("limit") || 0);
      const rawOffset = Number(url.searchParams.get("offset") || 0);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 30) : 30;
      const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
      const baseSql = includeVoided
        ? "SELECT * FROM sessions WHERE corpid=? ORDER BY created_at DESC"
        : "SELECT * FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' ORDER BY created_at DESC";
      if (limit) {
        const { results } = await env.DB.prepare(`${baseSql} LIMIT ? OFFSET ?`).bind(user.corpid, limit, offset).all();
        const data=await canonicalOwnerHistorySessionRowsForList(env,user,results||[]);
        const transferLineage=requestedBed?await ownerHistoryTransferLineageForRequest(env,user,url):null;
        return transferLineage?json({...ok(data),transfer_lineage:transferLineage}):success(data);
      }
      const { results } = await env.DB.prepare(
        baseSql
      ).bind(user.corpid).all();
      const data=await canonicalOwnerHistorySessionRowsForList(env,user,results||[]);
      const transferLineage=requestedBed?await ownerHistoryTransferLineageForRequest(env,user,url):null;
      return transferLineage?json({...ok(data),transfer_lineage:transferLineage}):success(data);
    }
    if (path === "/api/session_detail" && method === "GET") {
      const requestedBed=ownerHistoryTransferLineageRequestedBed(url);
      if(requestedBed&&!canReadOwnerData(user))return forbidden();
      const sid = cleanId(url.searchParams.get("id"));
      if (!sid) return badRequest("bad_request");
      const includeVoided = url.searchParams.get("include_voided") === "1";
      const includeCorrections = ["1","true","yes","on"].includes(String(url.searchParams.get("include_corrections")||"").trim().toLowerCase());
      const sessionRow=await env.DB.prepare("SELECT * FROM sessions WHERE id=? AND corpid=? LIMIT 1").bind(sid,user.corpid).first();
      const transferLineage=requestedBed?await ownerHistoryTransferLineageForRequest(env,user,url):null;
      const lineageFields=transferLineage?{transfer_lineage:transferLineage}:{};
      const hasTransactions=await empTableExists(env,"transactions");
      const results=hasTransactions?(await env.DB.prepare(
          includeVoided||includeCorrections
            ? "SELECT * FROM transactions WHERE session_id=? AND corpid=? ORDER BY created_at ASC"
            : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
        ).bind(sid, user.corpid).all()).results||[]:[];
      if(sessionRow&&isEmployeeEntrySession(sessionRow)){
        const anchorRows=extractEmployeeEntryAnchorsFromSession(sessionRow);
        const exportRows=parseEmployeeEntryExportRows(sessionRow);
        const detailChoice=chooseOwnerEmployeeSessionDetailRows(sessionRow,results,anchorRows,exportRows);
        if(detailChoice.rows.length){
          if(includeCorrections){
            return ownerHistoryDetailAdditiveResponse(env,user,sessionRow,detailChoice.rows,lineageFields);
          }
          return json({...ok(detailChoice.rows),...ownerHistoryDetailJsonSafeValue(canonicalOwnerHistoryDetailGatewayFields(sessionRow,detailChoice.rows,null,detailChoice.source)),...ownerHistoryDetailJsonSafeValue(lineageFields)});
        }
      }
      if(includeCorrections&&sessionRow){
        return ownerHistoryDetailAdditiveResponse(env,user,sessionRow,results,lineageFields);
      }
      return json({...ok(results),...ownerHistoryDetailJsonSafeValue(sessionRow?canonicalOwnerHistoryDetailGatewayFields(sessionRow,results,null,"transactions"): {archive_gateway:{ok:false,gateway:"canonical_owner_history_archive_gateway",archive_state:"missing",source_proof:{gateway:"canonical_owner_history_archive_gateway",source_layer:"L1 Canonical Event Archive"}}}),...ownerHistoryDetailJsonSafeValue(lineageFields)});
    }
    return errorResponse("not_found", 404, "not_found");
  }
  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }
  return new Response("Homelink Finance API is running. Use /auth/login for authentication.", {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
__name(handleRequest, "handleRequest");
var index_default = {
  async fetch(request, env, ctx) {
    const requestContext = createRequestContext(request);
    attachRequestContext(request, requestContext);
    try {
      requestContext.logger.info(
        { method: request.method, pathname: new URL(request.url).pathname },
        "Worker request started"
      );
      const response = await handleRequest(request, env, ctx, requestContext);
      const securedResponse = await withSecurityHeaders(response, request, env);
      applyRequestIdHeader(securedResponse, requestContext);
      requestContext.logger.info({ status: securedResponse.status }, "Worker request completed");
      return securedResponse;
    } catch (err) {
      requestContext.logger.error({ err }, "Unhandled exception");
      const errorResponse = json(
        fail(ErrorCodes.INTERNAL_SERVER, "Internal server error"),
        500,
        { "x-request-id": requestContext.requestId }
      );
      return await withSecurityHeaders(errorResponse, request, env);
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
