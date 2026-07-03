import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("auth sessions use a fixed 72 hour TTL for JWT, cookie, and active session rows", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /var SESSION_TTL_SECONDS = 72 \* 60 \* 60/);
  assert.match(worker, /var DEFAULT_TTL_SECONDS = SESSION_TTL_SECONDS/);
  assert.match(worker, /function makeSessionCookie\(token, maxAge = SESSION_TTL_SECONDS\)/);
  assert.match(worker, /async function createSession\(request, env, user, ttlSeconds = SESSION_TTL_SECONDS\)/);
  assert.match(worker, /now \+ ttlSeconds/);
  assert.match(worker, /const employeeTtl=SESSION_TTL_SECONDS/);
});

test("session cookie is secure, httpOnly, SameSite=Lax, and cleared on logout or 401", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  const makeCookieStart = worker.indexOf("function makeSessionCookie");
  const makeCookieEnd = worker.indexOf("__name(makeSessionCookie", makeCookieStart);
  const makeCookie = worker.slice(makeCookieStart, makeCookieEnd);
  assert.match(makeCookie, /HttpOnly/);
  assert.match(makeCookie, /Secure/);
  assert.match(makeCookie, /SameSite=Lax/);
  assert.doesNotMatch(makeCookie, /SameSite=Strict/);

  const clearCookieStart = worker.indexOf("function clearSessionCookie");
  const clearCookieEnd = worker.indexOf("__name(clearSessionCookie", clearCookieStart);
  const clearCookie = worker.slice(clearCookieStart, clearCookieEnd);
  assert.match(clearCookie, /Max-Age=0/);
  assert.match(clearCookie, /HttpOnly/);
  assert.match(clearCookie, /Secure/);
  assert.match(clearCookie, /SameSite=Lax/);

  assert.match(worker, /status === 401 \? \{ "Set-Cookie": clearSessionCookie\(\) \} : \{\}/);
  assert.match(worker, /"Set-Cookie": clearSessionCookie\(\)/);
});

test("backend validates active session expiry and protected page routing uses server auth", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /WHERE sid=\? AND corpid=\? AND userid=\? AND role=\? AND revoked=0 AND expires_at>\? LIMIT 1/);
  assert.match(worker, /Math\.floor\(Date\.now\(\) \/ 1e3\)/);
  assert.match(worker, /async function readRouteClaim\(request, env\) \{\s*const auth = await requireAuth\(request, env\);/);
  assert.doesNotMatch(worker, /return await verifyJWT\(token, env\.JWT_SECRET\);/);
});

test("session remains device-cookie based and does not bind auth checks to IP", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const requireAuthStart = worker.indexOf("async function requireAuth");
  const requireAuthEnd = worker.indexOf("__name(requireAuth", requireAuthStart);
  const requireAuth = worker.slice(requireAuthStart, requireAuthEnd);

  assert.match(requireAuth, /getBearerToken\(request\) \|\| getCookie\(request\)/);
  assert.doesNotMatch(requireAuth, /clientIp\(request\)/);
  assert.doesNotMatch(requireAuth, /ip=\?/);
});
