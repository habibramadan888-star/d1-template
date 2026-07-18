import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} missing`);
  const params = source.indexOf("(", start);
  let paramsDepth = 0;
  let open = -1;
  for (let index = params; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")" && --paramsDepth === 0) { open = source.indexOf("{", index); break; }
  }
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} unterminated`);
}

function response(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: name => headers[String(name).toLowerCase()] || "" },
    async json() {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

function directHarness(sequence) {
  const diagnostic = { contract_version: "employee-auth-attempt-v1", attempt_sequence: 0, attempts: [], transitions: [], concurrent_join_count: 0, active_attempt_id: "", latest_response_class: "", latest_worker_version: "", latest_asset_version: "" };
  let calls = 0;
  const context = vm.createContext({
    EMPLOYEE_AUTH_DIAGNOSTIC: diagnostic,
    EMPLOYEE_ASSET_DIAGNOSTIC: { frontend_asset_version: "qa-idempotent-finalization-v1", employee_asset_version: "qa-idempotent-finalization-v1" },
    state: { authState: { status: "AUTH_REHYDRATING", attempt: 0 } },
    apiFetch: async (_path, options) => {
      calls += 1;
      const next = sequence.shift();
      return typeof next === "function" ? next(options) : next;
    },
    unwrapStandardResponse: value => value?.code === 0 && value?.data ? value.data : value,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    Error,
    Object,
    String,
    Number,
    Promise,
  });
  vm.runInContext([
    functionBlock(employee, "employeeAuthDiagnosticTimestamp"),
    functionBlock(employee, "employeeAuthDiagnosticTrim"),
    functionBlock(employee, "employeeAuthDiagnosticBeginAttempt"),
    functionBlock(employee, "employeeAuthDiagnosticFinishAttempt"),
    functionBlock(employee, "employeeAuthError"),
    functionBlock(employee, "employeeAuthErrorIsTransient"),
    functionBlock(employee, "employeeAuthDelay"),
    functionBlock(employee, "fetchCurrentAuthUser"),
    functionBlock(employee, "employeeFetchCurrentAuthUserWithRetry"),
  ].join("\n"), context);
  return { context, diagnostic, get calls() { return calls; } };
}

test("503 timeout network and non-json responses recover to the newest successful 200", async () => {
  for (const first of [
    response(503, {}),
    () => Promise.reject(Object.assign(new Error("network"), { code: "ECONNRESET" })),
    response(200, new Error("not json"), { "content-type": "text/html" }),
  ]) {
    const h = directHarness([first, response(200, { code: 0, data: { userid: "staff-a", role: "staff" } }, { "content-type": "application/json", "x-homelink-worker-version": "worker-v", "x-homelink-asset-version": "qa-idempotent-finalization-v1" })]);
    const user = await vm.runInContext("employeeFetchCurrentAuthUserWithRetry", h.context)({ delays: [0, 0, 0], waiter: async () => {} });
    assert.equal(user.role, "staff");
    assert.equal(h.calls, 2);
    assert.equal(h.diagnostic.attempts.at(-1).response_class, "AUTHENTICATED");
  }
});

test("a non-string error code is bounded and cannot turn a transient failure into sign-out", async () => {
  const transient = Object.assign(new Error("transient"), { code: { category: "upstream" }, status: 503 });
  const h = directHarness([
    () => Promise.reject(transient),
    response(200, { code: 0, data: { userid: "staff-a", role: "staff" } }, { "content-type": "application/json", "x-homelink-worker-version": "worker-v", "x-homelink-asset-version": "qa-idempotent-finalization-v1" }),
  ]);
  const user = await vm.runInContext("employeeFetchCurrentAuthUserWithRetry", h.context)({ delays: [0, 0, 0], waiter: async () => {} });
  assert.equal(user.role, "staff");
  assert.equal(h.calls, 2);
  assert.equal(h.diagnostic.attempts[0].response_class, "NETWORK_ERROR");
});

test("AbortController timeout is bounded and classified without exposing response data", async () => {
  const h = directHarness([
    options => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true })),
  ]);
  const fetchCurrent = vm.runInContext("fetchCurrentAuthUser", h.context);
  await assert.rejects(fetchCurrent({ timeoutMs: 2 }), /me_timeout/);
  assert.equal(h.diagnostic.attempts[0].response_class, "TIMEOUT");
  assert.equal(h.diagnostic.attempts[0].abort_reason, "timeout");
  assert.equal(h.diagnostic.attempts[0].cookie_value_read, false);
});

test("asset and Worker version mismatch fails closed as a controlled diagnostic", async () => {
  const h = directHarness([
    response(200, { code: 0, data: { userid: "staff-a", role: "staff" } }, { "content-type": "application/json", "x-homelink-worker-version": "worker-new", "x-homelink-asset-version": "asset-other" }),
  ]);
  const fetchCurrent = vm.runInContext("fetchCurrentAuthUser", h.context);
  await assert.rejects(fetchCurrent(), /me_asset_worker_version_mismatch/);
  assert.equal(h.diagnostic.attempts[0].http_status, 200);
  assert.equal(h.diagnostic.attempts[0].worker_version, "worker-new");
  assert.equal(h.diagnostic.attempts[0].response_class, "ASSET_WORKER_VERSION_MISMATCH");
});

test("the diagnostic envelope is bounded and contains no cookie token or identity fields", async () => {
  const sequence = Array.from({ length: 14 }, () => response(401, {}));
  const h = directHarness(sequence);
  const fetchCurrent = vm.runInContext("fetchCurrentAuthUser", h.context);
  for (let index = 0; index < 14; index += 1) assert.equal(await fetchCurrent(), null);
  assert.equal(h.diagnostic.attempts.length, 12);
  const serialized = JSON.stringify(h.diagnostic);
  assert.doesNotMatch(serialized, /cookie_value\s*:/i);
  assert.doesNotMatch(serialized, /token|password|phone|employee_name|userid/i);
  assert.equal(h.diagnostic.attempts.every(row => row.cookie_value_read === false), true);
});

test("the runtime change is isolated from upload canonical Finance Owner and TTLock code", () => {
  const changedFunctions = [
    "employeeAuthDiagnosticTimestamp", "employeeAuthDiagnosticTrim", "employeeAuthDiagnosticBeginAttempt", "employeeAuthDiagnosticFinishAttempt", "employeeAuthDiagnosticTransition",
    "employeeAuthError", "fetchCurrentAuthUser", "employeeFetchCurrentAuthUserWithRetry", "employeeRenderAuthIdentityLabels", "setEmployeeAuthState", "applyEmployeeUser", "checkEmployeeSession",
  ];
  for (const name of changedFunctions) assert.match(employee, new RegExp(`function\\s+${name}\\s*\\(`));
  const authRegion = employee.slice(employee.indexOf("const EMPLOYEE_AUTH_STATES"), employee.indexOf("function employeeBedTransferWriteEnabled"));
  assert.doesNotMatch(authRegion, /commitSessionAndExport|employeeBuildAggregateValidationRequests|canonical_request_fingerprint|ttlock|finance|owner/i);
});
