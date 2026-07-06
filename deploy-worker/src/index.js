var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

import { createEmployeeEntryLiveWriteAdapterDraft } from "../../modules/worker/employee-entry-live-write-adapter.mjs";
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
async function empReconcileArrearTask(env,user,taskId,operatorId,now){
  const cleanTaskId=cleanId(taskId);
  if(!cleanTaskId)return null;
  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
    WHERE task_id=? AND corpid=? AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`)
    .bind(cleanTaskId,user.corpid).first();
  if(!task)return null;
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
async function empEnsureOpenArrearTaskForPayment(env,user,taskId,operatorId,now){
  const cleanTaskId=cleanId(taskId);
  if(!cleanTaskId)return null;
  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
    WHERE task_id=? AND corpid=? LIMIT 1`).bind(cleanTaskId,user.corpid).first();
  if(existing){
    return empCloseStatusIsOpen(existing.close_status)&&empTaskRemaining(existing)>0?existing:null;
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
  const cid=cleanText(url.searchParams.get("cid"),80);
  if(!cid)return badRequest("cid_required");
  const balance=await empDepositBalance(env,user.corpid,cid);
  return success({success:true,tenant_card_id:cid,balance});
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
async function handleEmployeeEntry(request,env,user){
  const timingEnabled=request.headers.get("X-Employee-Entry-Timing")==="1";
  const timing={started_at:Date.now(),d1_write_ms:0,total_ms:0};
  if(!await empTableExists(env,"sessions")||!await empTableExists(env,"transactions"))return errorResponse("employee_entry_schema_not_ready",503,"employee_entry_schema_not_ready");
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const entry=body?.entry||{};
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
    const feePaid=cleanText(entry.fee_paid,5);
    if(!["Y","N"].includes(feePaid))return badRequest("transfer_fee_choice_required");
    if(feePaid==="N"){
      const waiverReason=cleanText(entry.fee_waiver_reason||entry.custom_reason||entry.note,240);
      if(!waiverReason)return badRequest("bed_transfer_waiver_reason_required");
      amount=0;
      due=0;
      paid=0;
    }else{
      amount=50;
      due=50;
      paid=50;
    }
    periodDue=0;
    listPrice=0;
  }else if(type==="TFF"){
    periodDue=50;
    due=50;
    listPrice=0;
  }else if(type==="AP"){
    const taskId=cleanId(entry.linked_task_id);
    if(!taskId)return badRequest("linked_task_required");
    apTaskForPayment=await empEnsureOpenArrearTaskForPayment(env,user,taskId,authOperatorId,now);
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
  if(type==="DR"&&tenantCardId&&amount>depositBalance+0.01)return badRequest("deposit_insufficient");
  if(type==="CO"&&depositDeduction>depositBalance+0.01)return badRequest("deposit_deduction_exceeds_balance");
  const d1WriteStart=Date.now();
  const sessionAnchorEntries=Array.isArray(session.entries)?session.entries.map(row=>normalizeEntryAnchor(row)):[];
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
    fee_paid:cleanText(entry.fee_paid,5),fee_waiver_reason:cleanText(entry.fee_waiver_reason,240),
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
    const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(paid),0) AS total_paid FROM transactions
      WHERE corpid=? AND room=? AND period_start=? AND period_end=? AND COALESCE(status,'ACTIVE')='ACTIVE'
        AND COALESCE(type, reason_code, 'R')='R'`).bind(user.corpid,room,periodStart,periodEnd).first();
    const totalPaid=Number(paidRow?.total_paid||0);
    const remain=Math.max(0,periodDue-totalPaid);
    const existing=await env.DB.prepare(`SELECT task_id FROM arrear_tasks
      WHERE corpid=? AND bed=? AND original_period_start=? AND original_period_end=?
        AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`).bind(user.corpid,room,periodStart,periodEnd).first();
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
        arrearTask={task_id:existing.task_id,arrear_amount:remain,total_paid:totalPaid,period_due:periodDue,updated:true};
      }else{
        const taskId=empId("task");
        await empInsertDynamic(env,"arrear_tasks",{
          task_id:taskId,corpid:user.corpid,userid:user.userid,entry_id:entryId,original_entry_id:entryId,bed:room,
          tenant_name:tenantName,tenant_card_id:tenantCardId,arrear_amount:remain,arrear_reason:cleanText(entry.reason_code||"SHORT_PAID",80),
          created_at:now,created_by:authOperatorId,followup_status:"待跟进",
          promise_date:arrearPromiseDate,promise_amount:remain,staff_note:arrearReasonDetail,
          original_period_start:periodStart,original_period_end:periodEnd,updated_by:authOperatorId,updated_at:now
        },EMP_TASK_COLUMNS);
        arrearTask={task_id:taskId,arrear_amount:remain,total_paid:totalPaid,period_due:periodDue};
      }
    }else if(existing?.task_id){
      await env.DB.prepare("UPDATE arrear_tasks SET close_status='PAID', followup_status='已结清', actual_received=?, updated_by=?, updated_at=? WHERE task_id=? AND corpid=?")
        .bind(totalPaid,authOperatorId,now,existing.task_id,user.corpid).run();
      arrearTask={task_id:existing.task_id,closed:true,total_paid:totalPaid,period_due:periodDue};
    }
  }
  if(type==="AP"){
    const taskId=cleanId(entry.linked_task_id);
    if(taskId&&apTaskForPayment)arrearTask=await empReconcileArrearTask(env,user,taskId,authOperatorId,now);
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
  timing.d1_write_ms=Date.now()-d1WriteStart;
  timing.total_ms=Date.now()-timing.started_at;
  return success({
    success:true,
    entry_id:entryId,
    session_id:sessionId,
    inserted,
    timing:timingEnabled?timing:void 0,
    arrear_task:arrearTask,
    deposit_ledger:depositLedger,
    ...(liveRouteAdapterDraft?{adapter_live_route_rehearsal:eeaLiveRouteSummary(liveRouteAdapterDraft,liveRouteGate,{legacyWriteContinued:true})}: {})
  });
}
__name(handleEmployeeEntry,"handleEmployeeEntry");
const entryAnchorContract={
  R:["event_type","bed","expected_rent","paid_amount","payment_method","rent_period_start","rent_period_end","arrears_amount","arrears_due_date","arrears_note","short_paid","raw_display_line","operator","created_at","ttlock_context"],
  AP:["event_type","bed","arrears_ref","original_arrears_id","original_arrears_amount","already_paid_amount","payment_amount","remaining_arrears","settlement_status","payment_method","note","operator","created_at"],
  D:["event_type","bed","deposit_amount","payment_method","linked_tenant","note","operator","created_at"],
  DR:["event_type","bed","refund_amount","payment_method","refund_reason","checkout_ref","note","operator","created_at"],
  CO:["event_type","bed","checkout_date","deposit_refund","outstanding_arrears","final_note","ttlock_context","operator","created_at"],
  E:["event_type","expense_amount","expense_category","target_bed","reason","note","payment_method","operator","created_at"],
  TF:["event_type","from_bed","to_bed","transfer_date","fee_amount","fee_status","waiver_reason","transfer_reason","old_tenant_context","old_ttlock_context","note","operator","created_at"]
};
function entryAnchorType(row){
  const raw=String(row?.type||"").trim().toUpperCase();
  if(entryAnchorContract[raw])return raw;
  const event=String(row?.event_type||"").trim().toLowerCase();
  return {rent:"R",arrears_payment:"AP",deposit_in:"D",deposit_out:"DR",checkout:"CO",expense:"E",bed_transfer:"TF",bed_transfer_fee:"TFF"}[event]||raw;
}
__name(entryAnchorType,"entryAnchorType");
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
  if(type==="DR")return `${row.room||row.bed} deposit_out ${entryAnchorMoney(row.refund_amount||row.amount).toFixed(2)} ${row.payment_method||""} reason ${row.refund_reason||row.reason||"-"} note ${row.note||"-"}`.trim();
  if(type==="CO")return `${row.room||row.bed} checkout ${row.checkout_date||"-"} deposit_refund ${entryAnchorMoney(row.deposit_refund||row.deposit_amt||0).toFixed(2)} outstanding ${entryAnchorMoney(row.outstanding_arrears||0).toFixed(2)} note ${row.final_note||row.note||"-"}`.trim();
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
    const remaining=entryAnchorMoney(anchor.remaining_arrears||Math.max(0,original-already-payment));
    const ref=anchor.arrears_ref||anchor.original_arrears_id||anchor.linked_task_id||"";
    Object.assign(anchor,{bed:anchor.bed||anchor.room,arrears_ref:ref,original_arrears_id:ref,original_arrears_amount:original,already_paid_amount:already,payment_amount:payment,remaining_arrears:remaining,settlement_status:anchor.settlement_status||(remaining<=0?"settled":"partial")});
  }else if(type==="TF"){
    Object.assign(anchor,{from_bed:anchor.from_bed||anchor.bed_from||anchor.room||"",to_bed:anchor.to_bed||anchor.bed_to||anchor.room_to||"",transfer_date:anchor.transfer_date||anchor.date||"",fee_amount:entryAnchorMoney(anchor.fee_amount||anchor.amount),fee_status:anchor.fee_status||"paid",waiver_reason:anchor.waiver_reason||anchor.fee_waiver_reason||"",transfer_reason:anchor.transfer_reason||anchor.reason_code||"",old_tenant_context:anchor.old_tenant_context||"",old_ttlock_context:anchor.old_ttlock_context||"",note:anchor.note||""});
  }else if(type==="D"){
    Object.assign(anchor,{bed:anchor.bed||anchor.room||"",deposit_amount:entryAnchorMoney(anchor.deposit_amount||anchor.amount),linked_tenant:anchor.linked_tenant||anchor.tenant_card_id||anchor.tenant_name||"",note:anchor.note||""});
  }else if(type==="DR"){
    Object.assign(anchor,{bed:anchor.bed||anchor.room||"",refund_amount:entryAnchorMoney(anchor.refund_amount||anchor.amount),refund_reason:anchor.refund_reason||anchor.ded_reason||anchor.ded_note||anchor.reason||anchor.note||"",checkout_ref:anchor.checkout_ref||anchor.checkout_date||"",note:anchor.note||""});
  }else if(type==="CO"){
    Object.assign(anchor,{bed:anchor.bed||anchor.room||"",checkout_date:anchor.checkout_date||"",deposit_refund:entryAnchorMoney(anchor.deposit_refund||anchor.deposit_amt||anchor.deposit_deduction||0),outstanding_arrears:entryAnchorMoney(anchor.outstanding_arrears||anchor.carry_over_arrears||anchor.deficit||0),final_note:anchor.final_note||anchor.note||anchor.ded_note||""});
  }else if(type==="E"){
    Object.assign(anchor,{expense_amount:entryAnchorMoney(anchor.expense_amount||anchor.amount),expense_category:anchor.expense_category||anchor.reason_code||"",target_bed:anchor.target_bed||anchor.room||"",reason:anchor.reason||anchor.expense_desc||anchor.custom_reason||"",note:anchor.note||anchor.expense_desc||""});
  }
  anchor.ttlock_context=anchor.ttlock_context||anchor.old_ttlock_context||"";
  anchor.raw_display_line=anchor.raw_display_line||renderEntryAnchorForOwner(anchor);
  anchor.anchor_contract_version="employee_entry_anchor_v1";
  const validation=validateEntryAnchor(anchor);
  anchor.validation_status=validation.ok?"valid":"missing_required_fields";
  anchor.validation_missing_fields=validation.missing;
  return anchor;
}
__name(normalizeEntryAnchor,"normalizeEntryAnchor");
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
    if(sec){section=sec[1].toUpperCase();continue;}
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
  return {
    id:cleanId(t?.task_id)||empId("arrear-view"),
    task_id:cleanText(t?.task_id||"",100),
    source:cleanText(t?.source||"arrear_tasks",40),
    source_type:/ttlock/i.test(String(t?.source_type||t?.source||""))?"ttlock_expired_unpaid":"existing_arrears_record",
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
  try{
    const live=await empWithTimeout(loadLockCards(env),opts.timeoutMs||8000,"ttlock_api");
    if(!live?.error)return {...live,data_source:"live_api",fallback:false};
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
  const tasks=await empListMergedArrearTasks(env,user);
  return success({success:true,tasks});
}
__name(handleArrearTasks,"handleArrearTasks");
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
async function bedTransferActiveTenantSnapshot(env,user,fromBed){
  const snapshot={
    customer_id:"",
    customer_code:"",
    customer_display_name:"",
    original_checkin_date:"",
    original_rent_period_start:"",
    original_rent_period_end:"",
    old_ttlock_ref:""
  };
  if(await empTableExists(env,"transactions").catch(()=>false)){
    const tx=await env.DB.prepare(`SELECT * FROM transactions
      WHERE corpid=? AND (room=? OR bed_from=? OR room_to=?)
        AND COALESCE(voided_at,'')=''
        AND COALESCE(status,'ACTIVE')<>'VOID'
      ORDER BY CASE WHEN COALESCE(tenant_card_id,'')<>'' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 1`).bind(user.corpid,fromBed,fromBed,fromBed).first().catch(()=>null);
    if(tx){
      snapshot.customer_id=cleanText(tx.tenant_card_id||"",80);
      snapshot.customer_code=cleanText(tx.tenant_card_id||"",80);
      snapshot.customer_display_name=cleanText(tx.tenant_name||tx.operator_name||"",120);
      snapshot.original_checkin_date=cleanDate(tx.start_date||tx.period_start||"");
      snapshot.original_rent_period_start=cleanDate(tx.period_start||"");
      snapshot.original_rent_period_end=cleanDate(tx.period_end||"");
      snapshot.old_ttlock_ref=cleanText(tx.tenant_card_id||"",80);
    }
  }
  if(await empTableExists(env,"arrear_tasks").catch(()=>false)){
    const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
      WHERE corpid=? AND bed=?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1`).bind(user.corpid,fromBed).first().catch(()=>null);
    if(task){
      snapshot.customer_id=snapshot.customer_id||cleanText(task.tenant_card_id||"",80);
      snapshot.customer_code=snapshot.customer_code||cleanText(task.tenant_card_id||"",80);
      snapshot.customer_display_name=snapshot.customer_display_name||cleanText(task.tenant_name||"",120);
      snapshot.original_rent_period_start=snapshot.original_rent_period_start||cleanDate(task.original_period_start||"");
      snapshot.original_rent_period_end=snapshot.original_rent_period_end||cleanDate(task.original_period_end||"");
      snapshot.old_ttlock_ref=snapshot.old_ttlock_ref||cleanText(task.tenant_card_id||"",80);
    }
  }
  return snapshot;
}
__name(bedTransferActiveTenantSnapshot,"bedTransferActiveTenantSnapshot");
async function bedTransferOpenArrearsAed(env,user,fromBed){
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
async function bedTransferEventSnapshot(env,user,fromBed,toBed,body){
  const tenant=await bedTransferActiveTenantSnapshot(env,user,fromBed);
  const oldRef=cleanText(body?.old_ttlock_ref||body?.old_lock_ref||tenant.old_ttlock_ref||"",80);
  const currentRent=await empRentForBed(env,user.corpid,fromBed).catch(()=>0);
  const newRent=await empRentForBed(env,user.corpid,toBed).catch(()=>0);
  const depositAed=oldRef?await empDepositBalance(env,user.corpid,oldRef).catch(()=>0):0;
  const arrearsAed=await bedTransferOpenArrearsAed(env,user,fromBed).catch(()=>0);
  return {
    ...tenant,
    old_ttlock_ref:oldRef,
    old_lock_valid_from:cleanDate(body?.old_lock_valid_from||tenant.original_rent_period_start||""),
    old_lock_valid_until:cleanDate(body?.old_lock_valid_until||tenant.original_rent_period_end||""),
    original_deposit_amount_fils:bedTransferAedToFils(depositAed),
    current_rent_amount_fils:bedTransferAedToFils(currentRent),
    new_bed_rent_amount_fils:bedTransferAedToFils(newRent),
    rent_difference_fils:bedTransferAedToFils(newRent-currentRent),
    carry_over_arrears_fils:bedTransferAedToFils(arrearsAed)
  };
}
__name(bedTransferEventSnapshot,"bedTransferEventSnapshot");
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
async function handleEmployeeBedTransferCreate(request,env,user){
  if(!isStaffRoleValue(user?.role))return forbidden();
  const tableState=await bedTransferRequiredTablesReady(env);
  if(!tableState.ready)return errorResponse("bed_transfer_schema_missing",503,void 0,{missing_tables:tableState.missing});
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const fromBed=bedTransferCleanBed(body?.from_bed||body?.bed_from||body?.fromBed||body?.room);
  const toBed=bedTransferCleanBed(body?.to_bed||body?.bed_to||body?.toBed||body?.room_to);
  const transferDate=empCleanIsoDate(body?.transfer_date||body?.transferDate||"");
  const reason=cleanText(body?.reason||body?.transfer_reason||body?.transferReason||"customer_request",120);
  const waiverReason=cleanText(body?.waiver_reason||body?.fee_waiver_reason||body?.waiverReason||"",240);
  const note=cleanText(body?.note||body?.remark||body?.transfer_note||reason||waiverReason||"bed_transfer",500);
  const idempotencyKey=cleanText(body?.idempotency_key||body?.idempotencyKey||request.headers.get("Idempotency-Key")||"",160);
  if(!fromBed)return badRequest("from_bed_required");
  if(!toBed)return badRequest("to_bed_required");
  if(fromBed===toBed)return badRequest("from_bed_must_differ_from_to_bed");
  if(!transferDate)return badRequest("transfer_date_required");
  if(!idempotencyKey)return badRequest("idempotency_key_required");
  const rawFeeInput=cleanText(body?.fee_status||body?.feeStatus||body?.fee_mode||body?.feeMode||"",20).toLowerCase();
  const rawFeeMode=rawFeeInput==="paid"?"charged":rawFeeInput;
  const rawAmountFils=Number(body?.amount_fils ?? body?.transfer_fee_fils ?? NaN);
  const legacyFeeAed=Number(String(body?.transfer_fee ?? body?.transfer_fee_aed ?? "").replace(/,/g,""));
  const legacyFeeFils=Number.isFinite(legacyFeeAed)?bedTransferAedToFils(legacyFeeAed):NaN;
  const inferredAmountFils=Number.isFinite(rawAmountFils)?rawAmountFils:(Number.isFinite(legacyFeeFils)?legacyFeeFils:5000);
  const feeMode=rawFeeMode||((inferredAmountFils===0)?"waived":"charged");
  if(!["charged","waived"].includes(feeMode))return badRequest("bed_transfer_fee_mode_invalid");
  if(feeMode==="waived"&&!waiverReason)return badRequest("bed_transfer_waiver_reason_required");
  const feeStatus=feeMode==="waived"?"waived":"paid";
  const rawPaymentMethod=cleanText(body?.payment_method||body?.paymentMethod||body?.pay_type||body?.payType||"",20).toLowerCase();
  const paymentMethod=feeStatus==="waived"?"none":({c:"cash",cash:"cash",b:"bank",bank:"bank"}[rawPaymentMethod]||rawPaymentMethod);
  if(feeStatus==="paid"&&!["cash","bank","other"].includes(paymentMethod))return badRequest("payment_method_required");
  const amountFils=feeMode==="waived"?0:5000;
  const category="bed_transfer_fee";
  const reviewFlags=Array.isArray(body?.review_flags)
    ? body.review_flags.map((x)=>cleanText(x,80)).filter(Boolean).slice(0,12)
    : [];
  const requestPayload={corp_id:user.corpid,actor:user.userid,from_bed:fromBed,to_bed:toBed,transfer_date:transferDate,fee_status:feeStatus,fee_mode:feeMode,payment_method:paymentMethod,amount_fils:amountFils,waiver_reason:waiverReason,reason,note,category,review_flags:reviewFlags};
  const requestHash=await bedTransferRequestHash(requestPayload);
  const idemOptions={
    scope:`${user.corpid}:bed_transfer_events`,
    action:"employee.bed_transfer.create",
    idempotencyKey,
    actorUserId:user.userid,
    actorRole:user.role,
    requestHash,
    resourceType:"bed_transfer_event"
  };
  const replay=await arrearsDirectiveIdempotencyReplay(env,idemOptions).catch((err)=>{throw err;});
  if(replay)return replay;
  const now=empNow();
  const id=empId("bt");
  const transferId=cleanText(body?.transfer_id||`bt-${now.slice(0,10).replaceAll("-","")}-${fromBed}-${toBed}-${crypto.randomUUID().slice(0,8)}`,100);
  const auditId=empId("audit");
  const traceId=empId("trace");
  const entryEventId=traceId;
  const snapshot=await bedTransferEventSnapshot(env,user,fromBed,toBed,body);
  const eventValues={
    id,
    transfer_id:transferId,
    corp_id:user.corpid,
    tenant_scope:user.corpid,
    from_bed:fromBed,
    to_bed:toBed,
    transfer_date:transferDate,
    effective_date:transferDate,
    customer_id:snapshot.customer_id,
    customer_code:snapshot.customer_code,
    customer_display_name:snapshot.customer_display_name,
    original_checkin_date:snapshot.original_checkin_date,
    original_rent_period_start:snapshot.original_rent_period_start,
    original_rent_period_end:snapshot.original_rent_period_end,
    original_deposit_amount_fils:snapshot.original_deposit_amount_fils,
    current_rent_amount_fils:snapshot.current_rent_amount_fils,
    new_bed_rent_amount_fils:snapshot.new_bed_rent_amount_fils,
    rent_difference_fils:snapshot.rent_difference_fils,
    transfer_fee_fils:amountFils,
    amount_fils:amountFils,
    fee_mode:feeMode,
    fee_status:feeStatus,
    payment_method:paymentMethod,
    waiver_reason:waiverReason,
    category,
    review_flags:JSON.stringify(reviewFlags),
    carry_over_arrears_fils:snapshot.carry_over_arrears_fils,
    old_ttlock_ref:snapshot.old_ttlock_ref,
    new_ttlock_ref:"",
    old_lock_valid_from:snapshot.old_lock_valid_from,
    old_lock_valid_until:snapshot.old_lock_valid_until,
    new_lock_valid_from:"",
    new_lock_valid_until:"",
    reason,
    note,
    operator_employee:user.userid,
    status:"recorded",
    audit_id:auditId,
    trace_id:traceId,
    entry_event_id:entryEventId,
    qa_tag:cleanText(body?.qa_tag||"",120),
    created_at:now,
    updated_at:now
  };
  const sessionEntry={
    id:entryEventId,
    cloud_entry_id:entryEventId,
    transfer_id:transferId,
    entry_event_id:entryEventId,
    type:"TF",
    event_type:"bed_transfer",
    category,
    room:fromBed,
    roomTo:toBed,
    bed_from:fromBed,
    bed_to:toBed,
    tenant_name:snapshot.customer_display_name,
    tenant_card_id:snapshot.customer_code,
    amount:bedTransferFilsToAed(amountFils),
    amount_fils:amountFils,
    due:bedTransferFilsToAed(amountFils),
    paid:bedTransferFilsToAed(amountFils),
    pay_type:paymentMethod==="bank"?"B":(paymentMethod==="cash"?"C":""),
    payment_method:paymentMethod,
    fee_status:feeStatus,
    fee_mode:feeMode,
    fee_paid:feeStatus==="waived"?"N":"Y",
    fee_waiver_reason:waiverReason,
    waiver_reason:waiverReason,
    transfer_date:transferDate,
    transfer_reason:reason,
    reason,
    note,
    remark:note,
    review_flags:reviewFlags,
    operator_id:user.userid,
    operator_name:user.employee_name||user.userid,
    sync_status:"SYNCED",
    status:"RECORDED",
    created_at:now,
    ts:now
  };
  const responseData={
    success:true,
    transfer_id:transferId,
    status:"recorded",
    from_bed:fromBed,
    to_bed:toBed,
    transfer_date:transferDate,
    review_required:false,
    audit_id:authSafeId(auditId),
    trace_id:authSafeId(traceId),
    deposit_carried_fils:eventValues.original_deposit_amount_fils,
    carry_over_arrears_fils:eventValues.carry_over_arrears_fils,
    old_ttlock_ref:eventValues.old_ttlock_ref,
    amount_fils:amountFils,
    amount_aed:bedTransferFilsToAed(amountFils),
    event_type:"bed_transfer",
    fee_status:feeStatus,
    fee_mode:feeMode,
    payment_method:paymentMethod,
    waiver_reason:waiverReason,
    category,
    review_flags:reviewFlags,
    entry_event_id:authSafeId(entryEventId),
    session_entry:sessionEntry,
    message:feeMode==="waived"?"Bed transfer recorded. Fee waived / 换床记录已保存，费用已豁免。":"Bed transfer recorded. Fee: 50 AED / 换床记录已保存，已记录 50 AED 换床费。",
    idempotency_status:"NEW"
  };
  const responseBody=ok(responseData);
  const bedTransferColumns=await empTableColumns(env,"bed_transfer_events").catch(()=>new Set(BED_TRANSFER_EVENT_COLUMNS));
  const insertColumns=BED_TRANSFER_EVENT_COLUMNS.filter((key)=>bedTransferColumns.has(key));
  if(!insertColumns.length)return errorResponse("bed_transfer_schema_missing",503,void 0,{missing_columns:["bed_transfer_events"]});
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO entry_events
      (event_id, corpid, userid, ref_id, ref_type, event_type, field_name, old_value, new_value, operator_id, ts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(entryEventId,user.corpid,user.userid,transferId,"bed_transfer_event","bed_transfer","bed_transfer_fee","",JSON.stringify({status:"recorded",event_type:"bed_transfer",category,amount_fils:amountFils,fee_status:feeStatus,fee_mode:feeMode,payment_method:paymentMethod,waiver_reason:waiverReason,review_flags:reviewFlags,from_bed:fromBed,to_bed:toBed,transfer_date:transferDate,reason,note,session_entry:sessionEntry}),user.userid,now),
    env.DB.prepare(`INSERT INTO bed_transfer_events (${insertColumns.join(",")})
      VALUES (${insertColumns.map(()=>"?").join(",")})`)
      .bind(...insertColumns.map((key)=>eventValues[key]))
  ]);
  await audit(env,user,"employee.bed_transfer.create",transferId,{from_bed:fromBed,to_bed:toBed,status:"recorded",category,amount_fils:amountFils,fee_status:feeStatus,fee_mode:feeMode,payment_method:paymentMethod,waiver_reason:waiverReason,review_flags:reviewFlags,audit_id:auditId,trace_id:traceId,entry_event_id:entryEventId}).catch(()=>{});
  await arrearsDirectiveRecordIdempotency(env,{...idemOptions,resourceId:transferId,status:"RECORDED"},responseBody);
  return json(responseBody,201);
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
  if(path==="/api/employee/deposit"&&request.method==="GET")return handleEmployeeDeposit(request,env,user);
  if(path==="/api/employee/bed-transfers"&&request.method==="POST")return handleEmployeeBedTransferCreate(request,env,user);
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
  if(!await phase0TableExists(env,"arrear_tasks"))return [];
  try{
    return phase0All(env,
      "SELECT task_id, customer_code, room_bed, room, bed_no, arrear_amount, actual_received, close_status, accounting_status, followup_status, directive_status, promise_date, promise_amount, promised_payment_date, promised_amount_fils, staff_note, followup_note, source_type, due_date, created_at, updated_at, userid FROM arrear_tasks WHERE corpid=? AND COALESCE(close_status,'')<>'closed' AND COALESCE(accounting_status,'')<>'voided' ORDER BY COALESCE(room_bed,room,bed_no,''), task_id LIMIT 1000",
      [user.corpid]
    );
  }catch{
    return phase0All(env,
      "SELECT task_id, room AS room_bed, room, arrear_amount, actual_received, close_status, followup_status, promise_date, staff_note, created_at, updated_at, userid FROM arrear_tasks WHERE corpid=? AND COALESCE(close_status,'')<>'closed' ORDER BY COALESCE(room,''), task_id LIMIT 1000",
      [user.corpid]
    ).catch(()=>[]);
  }
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
        repayment_history:Array.isArray(row?.linked_repayment_events)?row.linked_repayment_events:[]
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
  const [
    monthRows,
    billingPeriodRows,
    lastMonthRows,
    sameMonthLastYearRows,
    quarterRows,
    lastQuarterRows,
    sameQuarterLastYearRows,
    currentSot,
    bedTransferReviews
  ]=await Promise.all([
    safeRows(ownerOverviewFetchTransactions(env,user,currentMonth)),
    safeRows(ownerOverviewFetchTransactions(env,user,currentBillingPeriod)),
    safeRows(ownerOverviewFetchTransactions(env,user,lastMonth)),
    safeRows(ownerOverviewFetchTransactions(env,user,sameMonthLastYear)),
    safeRows(ownerOverviewFetchTransactions(env,user,currentQuarter)),
    safeRows(ownerOverviewFetchTransactions(env,user,lastQuarter)),
    safeRows(ownerOverviewFetchTransactions(env,user,sameQuarterLastYear)),
    resolveCurrentReceivablesSot(env,user,{limit:500,ttlockTimeoutMs:8000}).catch(()=>null),
    safeRows(ownerOverviewFetchBedTransferReviews(env,user))
  ]);
  const month=ownerOverviewSummarizeTransactions(monthRows);
  const billingPeriod=ownerOverviewSummarizeTransactions(billingPeriodRows);
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
  if(!monthRows.length)noData.push("current_month_transactions");
  if(!billingPeriodRows.length)noData.push("current_billing_period_transactions");
  if(!lastMonthRows.length)noData.push("last_month_transactions");
  if(!sameMonthLastYearRows.length)noData.push("same_month_last_year_transactions");
  if(!arrearRows.length)noData.push("open_arrears");
  return success({
    generated_at:empNow(),
    production_cutover:"PRODUCTION_NO_GO",
    readonly:true,
    period:{today,current_billing_period:currentBillingPeriod,current_month:currentMonth,last_month:lastMonth,same_month_last_year:sameMonthLastYear,current_quarter:currentQuarter,last_quarter:lastQuarter,same_quarter_last_year:sameQuarterLastYear},
    current:{month,quarter,billing_period:billingPeriod},
    current_period_received:{...billingPeriod,range:currentBillingPeriod,rule:"billing_period_3_to_2"},
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
      rows_checked:{current_month:month.rows_checked,current_billing_period:billingPeriod.rows_checked,last_month:prevMonth.rows_checked,same_month_last_year:sameLastYear.rows_checked,current_quarter:quarter.rows_checked,arrears:arrearRows.length},
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
  return env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: "GET",
    headers: {
      Accept: request.headers.get("Accept") || "text/html"
    }
  }));
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
      await empEnsureSchema(env);
      let body;
      try {
        body = await request.json();
      } catch {
        return badRequest("invalid_json");
      }
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
    if (path === "/api/history") {
      if(!await empTableExists(env,"sessions"))return success([]);
      const includeVoided = url.searchParams.get("include_voided") === "1";
      const rawLimit = Number(url.searchParams.get("limit") || 0);
      const rawOffset = Number(url.searchParams.get("offset") || 0);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 0;
      const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
      const baseSql = includeVoided
        ? "SELECT * FROM sessions WHERE corpid=? ORDER BY created_at DESC"
        : "SELECT * FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' ORDER BY created_at DESC";
      if (limit) {
        const { results } = await env.DB.prepare(`${baseSql} LIMIT ? OFFSET ?`).bind(user.corpid, limit, offset).all();
        return success(results);
      }
      const { results } = await env.DB.prepare(
        baseSql
      ).bind(user.corpid).all();
      return success(results);
    }
    if (path === "/api/session_detail" && method === "GET") {
      const sid = cleanId(url.searchParams.get("id"));
      if (!sid) return badRequest("bad_request");
      if(!await empTableExists(env,"transactions"))return success([]);
      const includeVoided = url.searchParams.get("include_voided") === "1";
      const sessionRow=await env.DB.prepare("SELECT * FROM sessions WHERE id=? AND corpid=? LIMIT 1").bind(sid,user.corpid).first();
      const { results } = await env.DB.prepare(
        includeVoided
          ? "SELECT * FROM transactions WHERE session_id=? AND corpid=? ORDER BY created_at ASC"
          : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
      ).bind(sid, user.corpid).all();
      if(sessionRow&&isEmployeeEntrySession(sessionRow)){
        const anchorRows=extractEmployeeEntryAnchorsFromSession(sessionRow);
        if(anchorRows.length)return success(anchorRows);
        const exportRows=parseEmployeeEntryExportRows(sessionRow);
        if(exportRows.length)return success(exportRows);
      }
      return success(results);
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
