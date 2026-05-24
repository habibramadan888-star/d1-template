var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

import { createEmployeeEntryLiveWriteAdapterDraft } from "../../modules/worker/employee-entry-live-write-adapter.mjs";

// src/lib/jwt.js
var ALGO = { name: "HMAC", hash: "SHA-256" };
var DEFAULT_TTL_SECONDS = 8 * 60 * 60;
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
  if (!["manager", "staff"].includes(payload.role) || !payload.corpid) {
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
function makeSessionCookie(token, maxAge = 8 * 60 * 60) {
  return [
    `${SESSION_COOKIE}=${token}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict"
  ].join("; ");
}
__name(makeSessionCookie, "makeSessionCookie");
function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
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
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}
__name(json, "json");
function unauthorized(message = "unauthenticated") {
  return json({ error: message }, 401);
}
__name(unauthorized, "unauthorized");
function forbidden(message = "forbidden") {
  return json({ error: message }, 403);
}
__name(forbidden, "forbidden");
function badRequest(message = "bad_request") {
  return json({ error: message }, 400);
}
__name(badRequest, "badRequest");
function tooManyRequests(message = "too_many_attempts") {
  return json({ error: message }, 429);
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
async function createSession(request, env, user, ttlSeconds = 8 * 60 * 60) {
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
  const token = getCookie(request);
  if (!token) return;
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET, { skipSession: true });
    if (!payload.sid || !env.DB) return;
    await ensureSessionTable(env);
    await env.DB.prepare(
      "UPDATE active_sessions SET revoked=1 WHERE sid=? AND corpid=?"
    ).bind(payload.sid, payload.corpid || "").run();
  } catch {
  }
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
      hash: String(u.hash || u.passwordHash || "").trim()
    })).filter((u) => u.userid && ["manager", "staff"].includes(u.role) && u.hash);
  } catch {
    return [];
  }
}
__name(parseUserAccounts, "parseUserAccounts");
async function resolveRole(password, env) {
  const salt = env.PW_SALT;
  for (const account of parseUserAccounts(env)) {
    if (await verifyPassword(password, account.hash, salt)) {
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
  const employeeTtl=30*60;
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
  await revokeSession(request, env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Set-Cookie": clearSessionCookie()
    }
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
  return user.role === "manager";
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
    console.warn("[audit]", action, e?.message || e);
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
  "tenant_card_id","original_entry_id","original_period_start","original_period_end","created_by","write_off_authorized","write_off_reason","write_off_at",
  "voided_at","voided_by","void_reason","void_source"
];
const EMP_SESSION_COLUMNS = [
  "id","corpid","anchor_id","date","entries_count","created_by","created_at",
  "operator_id","operator_name","cash_handover","bank_transfer_total","bank_transfer_count",
  "gross_received","handover_status","exported_at","export_text","source",
  "voided_at","voided_by","void_reason","void_source"
];
const EMP_EVENT_COLUMNS = [
  "event_id","corpid","userid","ref_id","ref_type","event_type","field_name","old_value","new_value","operator_id","ts"
];
const EMP_DEPOSIT_COLUMNS = [
  "ledger_id","corpid","userid","tenant_card_id","tenant_name","bed","entry_id","type","amount","delta",
  "balance_after","note","operator_id","ts","voided_at","voided_by","void_reason","void_source"
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
  await empAddColumn(env,"arrear_tasks","write_off_authorized","TEXT");
  await empAddColumn(env,"arrear_tasks","write_off_reason","TEXT");
  await empAddColumn(env,"arrear_tasks","write_off_at","TEXT");
  await empAddVoidColumns(env,"arrear_tasks");
  await empAddVoidColumns(env,"deposit_ledger");
  if(await empTableExists(env,"arrears")){
    await empAddVoidColumns(env,"arrears");
  }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_cid_period ON transactions(corpid, tenant_card_id, period_start, period_end)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end)").run().catch(()=>{});
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
async function handleEmployeeDeposit(request,env,user){
  await empEnsureSchema(env);
  const url=new URL(request.url);
  const cid=cleanText(url.searchParams.get("cid"),80);
  if(!cid)return badRequest("cid_required");
  const balance=await empDepositBalance(env,user.corpid,cid);
  return json({success:true,tenant_card_id:cid,balance});
}
__name(handleEmployeeDeposit,"handleEmployeeDeposit");
async function handleEmployeeMigrate(request,env,user){
  if(!requireManager(user))return forbidden();
  await empEnsureSchema(env);
  await audit(env,user,"employee.schema.migrate","employee").catch(()=>{});
  return json({success:true,migrated:true});
}
__name(handleEmployeeMigrate,"handleEmployeeMigrate");
async function handleEmployeeLockCards(request,env,user){
  const result=await loadLockCards(env);
  if(result.error)return json({error:result.error},result.status||500);
  await audit(env,user,"employee.lock.cards.load","",{locksCount:result.locksCount}).catch(()=>{});
  return json(result);
}
__name(handleEmployeeLockCards,"handleEmployeeLockCards");
async function handleEmployeeEntry(request,env,user){
  await empEnsureSchema(env);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const entry=body?.entry||{};
  const session=body?.session||{};
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
    return json({success:true,entry_id:entryId,session_id:existingTx.session_id||sessionId,duplicate:true,arrear_task:arrearTask});
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
  await empInsertDynamic(env,"sessions",{
    id:sessionId,
    corpid:user.corpid,
    anchor_id:cleanText(session.anchorId||session.anchor_id||("EMP-"+now.slice(0,10).replaceAll("-","")),80),
    date:cleanDate(session.date||now),
    entries_count:Array.isArray(session.entries)?session.entries.length:1,
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
    export_text:cleanText(session.export_text||"",20000),
    source:"EMP"
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
  return json({success:true,entry_id:entryId,session_id:sessionId,inserted,arrear_task:arrearTask,deposit_ledger:depositLedger});
}
__name(handleEmployeeEntry,"handleEmployeeEntry");
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
    tenant_card_id:"",original_entry_id:cleanText(a?.entry_id||"",80),original_period_start:"",original_period_end:cleanDate(a?.due_date||"")
  };
}
__name(empLegacyArrearToTask,"empLegacyArrearToTask");
function empTaskToBossArrear(t){
  const reason=cleanText(t?.arrear_reason||"",500);
  const remain=empTaskRemaining(t);
  const dueDate=cleanDate(t?.promise_date||t?.original_period_end||String(t?.created_at||"").slice(0,10));
  const type=/deposit|\u62bc\u91d1/i.test(reason)?"deposit":"rent";
  return {
    id:cleanId(t?.task_id)||empId("arrear-view"),
    task_id:cleanText(t?.task_id||"",100),
    source:cleanText(t?.source||"arrear_tasks",40),
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
    actual_received:cleanMoney(t?.actual_received||0),
    created_at:cleanText(t?.created_at||"",40),
    updated_at:cleanText(t?.updated_at||"",40)
  };
}
__name(empTaskToBossArrear,"empTaskToBossArrear");
async function empListMergedArrearTasks(env,user){
  await empEnsureSchema(env);
  const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC").bind(user.corpid).all();
  const tasks=(taskRows.results||[]).filter(t=>empCloseStatusIsOpen(t.close_status)&&empTaskRemaining(t)>0);
  const seenIds=new Set(tasks.map(t=>cleanText(t.task_id,100)).filter(Boolean));
  const seenKeys=new Set(tasks.map(t=>[
    cleanText(t.bed||"",160),
    cleanText(t.entry_id||t.original_entry_id||"",80),
    empTaskRemaining(t).toFixed(2)
  ].join("|")));
  if(await empTableExists(env,"arrears")){
    const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC").bind(user.corpid).all();
    for(const row of legacy.results||[]){
      const mapped=empLegacyArrearToTask(row);
      const mappedId=cleanText(mapped.task_id,100);
      const mappedKey=[
        cleanText(mapped.bed||"",160),
        cleanText(mapped.entry_id||mapped.original_entry_id||"",80),
        empTaskRemaining(mapped).toFixed(2)
      ].join("|");
      if((mappedId&&seenIds.has(mappedId))||seenKeys.has(mappedKey))continue;
      if(empTaskRemaining(mapped)>0){
        tasks.push(mapped);
        if(mappedId)seenIds.add(mappedId);
        seenKeys.add(mappedKey);
      }
    }
  }
  tasks.sort((a,b)=>String(b.updated_at||b.created_at||"").localeCompare(String(a.updated_at||a.created_at||"")));
  return tasks;
}
__name(empListMergedArrearTasks,"empListMergedArrearTasks");
async function handleBossArrears(request,env,user){
  const tasks=await empListMergedArrearTasks(env,user);
  return json(tasks.map(empTaskToBossArrear).filter(a=>a.remain>0));
}
__name(handleBossArrears,"handleBossArrears");
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
  return json({success:true,tasks});
}
__name(handleArrearTasks,"handleArrearTasks");
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
  const patchPromise=cleanDate(patch.promise_date||"");
  const patchNote=cleanText(patch.staff_note||"",500);
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
      original_period_end:cleanDate(patch.original_period_end||""),created_by:actor,updated_by:actor,updated_at:now
    };
    await empInsertDynamic(env,"arrear_tasks",{
      ...insertedTask
    },EMP_TASK_COLUMNS);
    await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"create",field_name:"*",new_value:JSON.stringify(insertedTask),operator_id:actor,ts:now});
    await audit(env,user,"employee.arrear_task.create",taskId,{status:insertedTask.followup_status}).catch(()=>{});
    return json({success:true,created:true});
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
  }else{
    const staffAllowed=new Set(["followup_status","promise_date","promise_amount","staff_note"]);
    const illegal=Object.keys(patch).filter(k=>!staffAllowed.has(k));
    if(illegal.length)return badRequest("staff_field_not_allowed");
    if(patch.followup_status!==void 0)updateValues.followup_status=patchStatus||"待跟进";
    if(patch.promise_date!==void 0)updateValues.promise_date=patchPromise;
    if(patch.promise_amount!==void 0){
      const remain=Math.max(0,Number(old.arrear_amount||0)-Number(old.actual_received||0));
      const requested=cleanMoney(patch.promise_amount||0);
      updateValues.promise_amount=remain>0?Math.min(requested,remain):requested;
    }
    if(patch.staff_note!==void 0)updateValues.staff_note=patchNote;
    if(Object.keys(updateValues).length)updateValues.last_followup_at=now;
  }
  if(!Object.keys(updateValues).length)return badRequest("no_update_fields");
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
  await audit(env,user,"employee.arrear_task.update",taskId,{status:patch.followup_status||""}).catch(()=>{});
  return json({success:true});
}
__name(handleArrearTaskUpdate,"handleArrearTaskUpdate");
async function handleEmployeeApi(request,env,user){
  const path=new URL(request.url).pathname;
  if(path==="/api/employee/migrate"&&request.method==="POST"){
    if(!requireManager(user))return forbidden();
    return handleEmployeeMigrate(request,env,user);
  }
  if(path==="/api/employee/lock/cards"&&request.method==="GET")return handleEmployeeLockCards(request,env,user);
  if(path==="/api/employee/deposit"&&request.method==="GET")return handleEmployeeDeposit(request,env,user);
  if(path==="/api/employee/entry"&&request.method==="POST")return handleEmployeeEntry(request,env,user);
  if(path==="/api/arrear_tasks"&&request.method==="GET")return handleArrearTasks(request,env,user);
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
const HSC_ALLOWED_APP_ENVS = new Set(["development","dev","local","test","staging"]);
const HSC_EMPLOYEE_ROLES = new Set(["staff","employee"]);
const HSC_VOIDED_STATUSES = new Set(["VOID","VOIDED","DELETED","CANCELLED"]);
const HSC_CATEGORY_ALIASES = {
  R:"rent",RENT:"rent",RENT_INCOME:"rent",
  D:"deposit_in",DEPOSIT:"deposit_in",DEPOSIT_IN:"deposit_in",
  AP:"arrears",ARREARS:"arrears",ARREARS_PAYMENT:"arrears",
  TF:"transfer_fee",TRANSFER_FEE:"transfer_fee",
  DR:"deposit_refund",DEPOSIT_REFUND:"deposit_refund",
  E:"expense",EXPENSE:"expense"
};
const HSC_PAYMENT_ALIASES = {C:"cash",CASH:"cash",B:"bank",BANK:"bank",TRANSFER:"bank"};
const HSC_INCOME_CATEGORIES = new Set(["rent","deposit_in","arrears","transfer_fee"]);
const HSC_OUTFLOW_CATEGORIES = new Set(["deposit_refund","expense"]);
function hscIssue(code,message,extra={}){
  return {code,message,...extra};
}
__name(hscIssue,"hscIssue");
function hscError(code,message,status,extra={}){
  return json({success:false,code,error:code,message,...extra},status);
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
    if(row.category==="transfer_fee")totals.transferFeeFils+=amount;
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
      return json({success:true,status:"IDEMPOTENT_REPLAY",commit_id:existingKey.commit_id,idempotency_status:"IDEMPOTENT_REPLAY",backend_totals:commit?{cashHandoverFils:commit.backend_cash_handover_fils,bankTransferTotalFils:commit.backend_bank_transfer_fils,grossReceivedFils:commit.backend_gross_received_fils,sessionTotalFils:commit.backend_session_total_fils}:null});
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
  return json({success:true,status:"ACCEPTED",commit_id:commitId,idempotency_status:"NEW",accepted_rows:classified.acceptedRows.length,rejected_rows:classified.rejectedRows,backend_totals:backend,frontend_total_comparison:comparison,audit_events:["handover_commit_attempt","handover_commit_accepted"]},201);
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
  if(draft.status==="SKIPPED_VOIDED")return json(response,200);
  return json(response,draft.ok?200:422);
}
__name(handleEmployeeEntryAdapterStagingDraft,"handleEmployeeEntryAdapterStagingDraft");
// EMPLOYEE_API_PATCH_END

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
  if (path === "/auth/logout" && method === "POST") {
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
      if (auth.status === 401) return unauthorized();
      if (auth.status === 403) return forbidden();
      return unauthorized();
    }
    const user = auth.payload;
    const employeeApiResponse = await handleEmployeeApi(request, env, user);
    if (employeeApiResponse) return employeeApiResponse;
    if (path === "/api/me") {
      return json({
        userid: user.userid,
        employee_name: user.employee_name || user.userid,
        corpid: user.corpid,
        role: user.role,
        isManager: user.role === "manager"
      });
    }
    if (user.role !== "manager" && !allowStaffApi(path, method)) {
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
      return json({ success: true });
    }
    if (path === "/api/lock/cards" && method === "GET") {
      if (!requireManager(user)) return forbidden();
      try {
        const result = await loadLockCards(env);
        if (result.error) return json({ error: result.error }, result.status || 500);
        await audit(env, user, "lock.cards.load", "", { locksCount: result.locksCount });
        return json(result);
      } catch (e) {
        return json({ error: e?.message || "ttlock_failed" }, 502);
      }
    }
    if (path === "/api/wifi/accounts" && method === "GET") {
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
      const row = await env.DB.prepare(
        "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
      ).bind(user.corpid, "wifi_accounts").first();
      let accounts = {};
      try {
        accounts = row?.value ? JSON.parse(row.value) : {};
      } catch {
        accounts = {};
      }
      if (hasPlainWifiPasswords(accounts)) {
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
      return json({ accounts, updatedBy: row?.updated_by || "", updatedAt: row?.updated_at || "" });
    }
    if (path === "/api/wifi/accounts" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      const body = await request.json();
      const raw = body?.accounts;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return json({ error: "bad_request" }, 400);
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
      return json({ success: true, count: Object.keys(clean).length });
    }
    if (path === "/api/arrears" && method === "GET") {
      return handleBossArrears(request, env, user);
    }
    if (path === "/api/customers" && method === "GET") {
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
      const row = await env.DB.prepare(
        "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
      ).bind(user.corpid, "client_credit").first();
      let customers = [];
      try {
        customers = row?.value ? JSON.parse(row.value) : [];
      } catch {
        customers = [];
      }
      if (!Array.isArray(customers)) customers = [];
      return json({
        customers: customers.map(sanitizeCustomer).filter(Boolean),
        updatedBy: row?.updated_by || "",
        updatedAt: row?.updated_at || ""
      });
    }
    if (path === "/api/customers" && method === "POST") {
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
      return json({ success: true, count: customers.length });
    }
    if (path === "/api/rent_config" && method === "GET") {
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
      const row = await env.DB.prepare(
        "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
      ).bind(user.corpid, "rent_ref_room").first();
      let config = {};
      try {
        config = row?.value ? JSON.parse(row.value) : {};
      } catch {
        config = {};
      }
      return json({ config, updatedBy: row?.updated_by || "", updatedAt: row?.updated_at || "" });
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
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return json({ error: "bad_request" }, 400);
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
      return json({ success: true, count: Object.keys(clean).length });
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
      batch.push(env.DB.prepare(
        `INSERT OR REPLACE INTO sessions
           (id, corpid, anchor_id, date, entries_count, created_by, operator_id, operator_name, handover_status, exported_at, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), ?)`
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
      return json({ success: true, sessionId });
    }
    if (path === "/api/delete_session" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      await empEnsureSchema(env);
      let body;
      try {
        body = await request.json();
      } catch {
        return badRequest("invalid_json");
      }
      const { id: rawId } = body || {};
      const id = cleanId(rawId);
      if (!id) return json({ error: "bad_request" }, 400);
      const voidReason = cleanText(body?.void_reason || body?.reason || "manager_void_session", 240);
      const voidSource = cleanText(body?.void_source || "api.delete_session", 80);
      const requestId = cleanText(body?.request_id || body?.idempotency_key || crypto.randomUUID(), 100);
      const existing = await env.DB.prepare(
        "SELECT id, voided_at FROM sessions WHERE id=? AND corpid=? LIMIT 1"
      ).bind(id, user.corpid).first();
      if (!existing) return json({ error: "not_found" }, 404);
      const now=empNow();
      if (existing.voided_at) {
        await audit(env, user, "session.void.already_voided", id, { request_id: requestId });
        return json({ success: true, sessionId: id, voided: true, already_voided: true });
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
      return json({ success: true, sessionId: id, voided: true, voided_at: now });
    }
    if (path === "/api/clear_arrear" && method === "POST") {
      if (!requireManager(user)) return forbidden();
      const { id: rawId } = await request.json();
      const id = cleanId(rawId);
      if (!id) return json({ error: "bad_request" }, 400);
      const changed=await empCloseArrearEverywhere(env,user,id,empNow());
      await audit(env, user, "arrear.clear", id, { changed });
      return json({ success: true, changed });
    }
    if (path === "/api/history") {
      await empEnsureSchema(env);
      const includeVoided = url.searchParams.get("include_voided") === "1";
      const { results } = await env.DB.prepare(
        includeVoided
          ? "SELECT * FROM sessions WHERE corpid=? ORDER BY created_at DESC"
          : "SELECT * FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' ORDER BY created_at DESC"
      ).bind(user.corpid).all();
      return json(results);
    }
    if (path === "/api/session_detail" && method === "GET") {
      await empEnsureSchema(env);
      const sid = cleanId(url.searchParams.get("id"));
      if (!sid) return json({ error: "bad_request" }, 400);
      if(!await empTableExists(env,"transactions"))return json([]);
      const includeVoided = url.searchParams.get("include_voided") === "1";
      const { results } = await env.DB.prepare(
        includeVoided
          ? "SELECT * FROM transactions WHERE session_id=? AND corpid=? ORDER BY created_at ASC"
          : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
      ).bind(sid, user.corpid).all();
      return json(results);
    }
    return json({ error: "not_found" }, 404);
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
    const response = await handleRequest(request, env, ctx);
    return await withSecurityHeaders(response, request, env);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
