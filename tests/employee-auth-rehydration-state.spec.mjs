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

function element(text = "") {
  const classes = new Set();
  return {
    textContent: text,
    innerHTML: "",
    hidden: false,
    disabled: false,
    dataset: {},
    value: "",
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, force) => force === undefined ? (classes.has(name) ? (classes.delete(name), false) : (classes.add(name), true)) : (force ? classes.add(name) : classes.delete(name), force),
      contains: name => classes.has(name),
    },
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; },
  };
}

function harness() {
  const elements = Object.fromEntries([
    "employeeAuthState", "employeeAuthStateMessage", "btnRetryEmployeeSession", "employeeIdentityName", "employeeIdentityRole", "employeeUserName", "employeeUserRole", "employeeUserMeta", "workspaceSessionCount", "employeeSessionStatusBar", "sessionClock", "sessionMeta", "sessionKpis", "sessionPreview", "loginEmployeeId", "loginOverlay", "loginPin",
  ].map(id => [id, element()]));
  const controls = [element(), element()];
  const workspaceSwitch = element();
  const scopedDrafts = new Map([
    ["staff-a", [{ id: "ENTRY-A", amount: 700 }]],
    ["staff-b", [{ id: "ENTRY-B", amount: 900 }]],
  ]);
  const localValues = new Map([["empv3:lastEmployeeId", "staff-a"]]);
  const state = { user: null, drafts: [], authState: { status: "AUTH_REHYDRATING", attempt: 0, lastError: "", confirmedUserId: "" } };
  const EMPLOYEE_AUTH_DIAGNOSTIC = { contract_version: "employee-auth-attempt-v1", attempt_sequence: 0, attempts: [], transitions: [], concurrent_join_count: 0, active_attempt_id: "", latest_response_class: "", latest_worker_version: "", latest_asset_version: "" };
  let redirects = 0;
  let statusMessage = "";
  let fetchSequence = [];
  let fetchCalls = 0;
  let syncFormCalls = 0;
  const context = vm.createContext({
    state,
    EMPLOYEE_AUTH_STATES: Object.freeze({ REHYDRATING: "AUTH_REHYDRATING", AUTHENTICATED: "AUTHENTICATED", REQUIRED: "AUTH_REQUIRED", TRANSIENT_ERROR: "AUTH_TRANSIENT_ERROR" }),
    EMPLOYEE_AUTH_RETRY_DELAYS_MS: Object.freeze([0, 0, 0]),
    EMPLOYEE_AUTH_DIAGNOSTIC,
    employeeAuthCheckPromise: null,
    document: {
      body: element(),
      querySelectorAll: () => controls,
      querySelector: selector => selector === ".employee-workspace-switch" ? workspaceSwitch : null,
    },
    $: id => elements[id] || null,
    esc: value => String(value ?? ""),
    localStorage: {
      getItem: key => localValues.get(key) ?? null,
      removeItem: key => localValues.delete(key),
    },
    console: { warn() {}, error() {} },
    location: { replace() {} },
    isEmployeeAuthRole: role => ["staff", "employee"].includes(String(role || "").toLowerCase()),
    isOwnerAuthRole: role => ["owner", "manager", "admin"].includes(String(role || "").toLowerCase()),
    applyEmployeeUser(user) { state.user = user; state.drafts = structuredClone(scopedDrafts.get(user.userid) || []); },
    async employeeLoadQaAcceptanceRun() {},
    syncForm() { syncFormCalls += 1; },
    refreshSessionViews() {
      elements.workspaceSessionCount.textContent = `Current Session (${state.drafts.length})`;
      elements.employeeIdentityName.textContent = state.user?.userid || "";
    },
    redirectToUnifiedLogin() { redirects += 1; },
    showStatus(message) { statusMessage = message; },
    setTimeout,
    clearTimeout,
    Promise,
    Object,
    Set,
    String,
    Number,
    Error,
  });
  const source = [
    functionBlock(employee, "employeeAuthError"),
    functionBlock(employee, "employeeAuthDiagnosticTimestamp"),
    functionBlock(employee, "employeeAuthDiagnosticTrim"),
    functionBlock(employee, "employeeAuthDiagnosticBeginAttempt"),
    functionBlock(employee, "employeeAuthDiagnosticFinishAttempt"),
    functionBlock(employee, "employeeAuthDiagnosticTransition"),
    functionBlock(employee, "employeeAuthErrorIsTransient"),
    functionBlock(employee, "employeeAuthDelay"),
    functionBlock(employee, "employeeFetchCurrentAuthUserWithRetry"),
    functionBlock(employee, "employeeSetAuthInteractionLocked"),
    functionBlock(employee, "employeeRenderAuthWorkspacePlaceholder"),
    functionBlock(employee, "employeeRenderAuthIdentityLabels"),
    functionBlock(employee, "setEmployeeAuthState"),
    functionBlock(employee, "checkEmployeeSession"),
  ].join("\n");
  vm.runInContext(source, context);
  context.fetchCurrentAuthUser = async () => {
    fetchCalls += 1;
    const next = fetchSequence.shift();
    if (next && typeof next === "object" && typeof next.message === "string" && "status" in next) throw next;
    return next;
  };
  return {
    context, state, elements, controls, scopedDrafts, EMPLOYEE_AUTH_DIAGNOSTIC,
    setSequence: values => { fetchSequence = [...values]; fetchCalls = 0; },
    check: options => vm.runInContext("checkEmployeeSession", context)(options),
    authError: (code, status) => vm.runInContext("employeeAuthError", context)(code, status),
    get fetchCalls() { return fetchCalls; },
    get syncFormCalls() { return syncFormCalls; },
    get redirects() { return redirects; },
    get statusMessage() { return statusMessage; },
  };
}

test("initial 200 restores the verified employee draft without exposing last-user data first", async () => {
  const h = harness();
  assert.equal(h.elements.employeeIdentityName.textContent, "");
  h.setSequence([{ userid: "staff-a", role: "staff", corpid: "HL-QA" }]);
  const result = await h.check();
  assert.equal(result.status, "AUTHENTICATED");
  assert.equal(h.state.drafts.length, 1);
  assert.equal(h.state.drafts[0].id, "ENTRY-A");
  assert.equal(h.elements.workspaceSessionCount.textContent, "Current Session (1)");
  assert.equal(h.elements.employeeAuthState.hidden, true);
  assert.equal(h.elements.employeeIdentityRole.textContent, "STAFF / 员工");
  assert.equal(h.elements.employeeUserRole.textContent, "ACCOUNT / 账户");
  assert.equal(h.syncFormCalls, 1);
  assert.equal(h.redirects, 0);
});

test("one transient 503 retries to 200 without rendering signed-out or a false zero", async () => {
  const h = harness();
  h.setSequence([h.authError("me_failed_503", 503), { userid: "staff-a", role: "staff" }]);
  const result = await h.check();
  assert.equal(result.status, "AUTHENTICATED");
  assert.equal(h.fetchCalls, 2);
  assert.equal(h.state.drafts.length, 1);
  assert.doesNotMatch(h.elements.employeeIdentityName.textContent, /Not signed in/i);
  assert.notEqual(h.elements.workspaceSessionCount.textContent, "Current Session (0)");
  assert.equal(h.redirects, 0);
});

test("three transient failures preserve a safe restoring view and Retry recovers the same draft", async () => {
  const h = harness();
  h.setSequence([1, 2, 3].map(() => h.authError("me_failed_503", 503)));
  const failed = await h.check();
  assert.equal(failed.status, "AUTH_TRANSIENT_ERROR");
  assert.equal(h.fetchCalls, 3);
  assert.equal(h.state.drafts.length, 0);
  assert.equal(h.elements.btnRetryEmployeeSession.hidden, false);
  assert.match(h.elements.workspaceSessionCount.textContent, /unavailable/i);
  assert.doesNotMatch(h.elements.sessionPreview.innerHTML, /No Records|尚无记录/i);
  assert.equal(h.redirects, 0);
  h.setSequence([{ userid: "staff-a", role: "staff" }]);
  const recovered = await h.check({ force: true });
  assert.equal(recovered.status, "AUTHENTICATED");
  assert.equal(h.state.drafts.length, 1);
  assert.equal(h.state.drafts[0].id, "ENTRY-A");
});

test("an authenticated workspace survives 503 timeout network and non-json failures", async () => {
  const h = harness();
  h.setSequence([{ userid: "staff-a", role: "staff" }]);
  await h.check();
  for (const failure of [
    h.authError("me_failed_503", 503),
    h.authError("me_timeout", 0),
    h.authError("me_network_error", 0),
    h.authError("me_non_json_response", 200),
  ]) {
    h.setSequence([failure, failure, failure]);
    const result = await h.check({ force: true });
    assert.equal(result.status, "AUTH_TRANSIENT_ERROR");
    assert.equal(h.state.user.userid, "staff-a");
    assert.equal(h.state.drafts.length, 1);
    assert.equal(h.state.drafts[0].id, "ENTRY-A");
    assert.equal(h.elements.workspaceSessionCount.textContent, "Current Session (1)");
    assert.equal(h.elements.employeeIdentityRole.textContent, "STAFF / 员工");
    assert.equal(h.redirects, 0);
  }
});

test("only a real 401 redirects and the same verified user restores its untouched draft", async () => {
  const h = harness();
  h.setSequence([null]);
  const required = await h.check();
  assert.equal(required.status, "AUTH_REQUIRED");
  assert.equal(h.redirects, 1);
  h.setSequence([{ userid: "staff-a", role: "staff" }]);
  const restored = await h.check();
  assert.equal(restored.status, "AUTHENTICATED");
  assert.equal(h.state.drafts.length, 1);
  assert.equal(h.state.drafts[0].id, "ENTRY-A");
});

test("verified identities remain isolated across repeated refreshes and independent tabs", async () => {
  const first = harness();
  for (let index = 0; index < 10; index += 1) {
    first.setSequence([{ userid: "staff-a", role: "staff" }]);
    await first.check({ force: true });
    assert.equal(first.state.drafts[0].id, "ENTRY-A");
  }
  first.setSequence([{ userid: "staff-b", role: "staff" }]);
  await first.check({ force: true });
  assert.deepEqual(first.state.drafts.map(row => row.id), ["ENTRY-B"]);

  const second = harness();
  second.setSequence([{ userid: "staff-a", role: "staff" }]);
  await second.check();
  assert.deepEqual(second.state.drafts.map(row => row.id), ["ENTRY-A"]);
  assert.deepEqual(first.state.drafts.map(row => row.id), ["ENTRY-B"]);
});

test("concurrent auth checks join one request and cannot overwrite the accepted result", async () => {
  const h = harness();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  h.setSequence([pending]);
  h.context.fetchCurrentAuthUser = async () => {
    const next = await pending;
    return next;
  };
  const first = h.check();
  const second = h.check({ force: true });
  assert.equal(h.EMPLOYEE_AUTH_DIAGNOSTIC.concurrent_join_count, 1);
  release({ userid: "staff-a", role: "staff" });
  const [left, right] = await Promise.all([first, second]);
  assert.equal(left.status, "AUTHENTICATED");
  assert.equal(right.status, "AUTHENTICATED");
  assert.equal(h.state.drafts[0].id, "ENTRY-A");
  assert.equal(h.elements.employeeIdentityRole.textContent, "STAFF / 员工");
});

test("bounded attempts expose sanitized diagnostic timing without cookie values", async () => {
  const h = harness();
  h.setSequence([h.authError("me_timeout", 0), h.authError("me_network_error", 0), { userid: "staff-a", role: "staff" }]);
  const result = await h.check();
  assert.equal(result.status, "AUTHENTICATED");
  assert.equal(h.EMPLOYEE_AUTH_DIAGNOSTIC.attempts.length, 3);
  assert.deepEqual(h.EMPLOYEE_AUTH_DIAGNOSTIC.attempts.map(row => row.response_class), ["TRANSIENT_ERROR", "TRANSIENT_ERROR", "AUTHENTICATED"]);
  assert.equal(h.EMPLOYEE_AUTH_DIAGNOSTIC.attempts.every(row => row.credentials_include === true), true);
  assert.equal(h.EMPLOYEE_AUTH_DIAGNOSTIC.attempts.every(row => row.cookie_value_read === false), true);
  assert.equal(h.EMPLOYEE_AUTH_DIAGNOSTIC.transitions.at(-1).status, "AUTHENTICATED");
});

test("the authenticated label is never left at the restoring copy after successful rehydration", async () => {
  const h = harness();
  h.elements.employeeIdentityRole.textContent = "正在恢复登录";
  h.elements.employeeUserRole.textContent = "正在恢复登录";
  h.setSequence([{ userid: "staff-a", role: "staff" }]);
  await h.check();
  assert.equal(h.elements.employeeIdentityRole.textContent, "STAFF / 员工");
  assert.equal(h.elements.employeeUserRole.textContent, "ACCOUNT / 账户");
  assert.doesNotMatch(h.elements.employeeIdentityRole.textContent + h.elements.employeeUserRole.textContent, /正在恢复登录/);
});

test("the auth recovery path never saves clears uploads or changes seven-event dispatch", () => {
  const auth = functionBlock(employee, "checkEmployeeSession");
  assert.doesNotMatch(auth, /saveDrafts|employeeRemoveActiveDraftStorage|commitSessionAndExport|clear|removeItem\(['"]empv3:drafts/);
  assert.match(employee, /data-type="R"/);
  assert.match(employee, /data-type="AP"/);
  assert.match(employee, /data-type="D"/);
  assert.match(employee, /data-type="DR"/);
  assert.match(employee, /data-type="CO"/);
  assert.match(employee, /data-type="E"/);
  assert.match(employee, /data-type="TF"/);
});
