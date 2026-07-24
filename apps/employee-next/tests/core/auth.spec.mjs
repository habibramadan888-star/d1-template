import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const authPath = resolve(employeeNextRoot, "src", "core", "auth.ts");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");

const authSource = await readFile(authPath, "utf8");
const bundledAuth = await esbuild.build({
  bundle: true,
  entryPoints: [authPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const authModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledAuth.outputFiles[0].text).toString("base64")
  }`
);

function validSession(role = "STAFF") {
  return {
    user: {
      employeeId: "employee-test",
      displayName: "Test Employee",
      role,
    },
  };
}

function transportWith(overrides = {}) {
  return {
    async login() {
      return validSession();
    },
    async restore() {
      return validSession();
    },
    async logout() {},
    ...overrides,
  };
}

function assertNoCredentialMaterial(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(
    serialized,
    /credential|identifier|secret|password|pin/i,
  );
}

test("auth runtime success contract", async () => {
  assert.deepEqual(authModule.EMPLOYEE_AUTH_STATUSES, [
    "SIGNED_OUT",
    "RESTORING",
    "AUTHENTICATING",
    "AUTHENTICATED",
    "ERROR",
  ]);
  assert.deepEqual(authModule.EMPLOYEE_AUTH_ROLES, ["EMPLOYEE", "STAFF"]);
  assert.equal(Object.isFrozen(authModule.EMPLOYEE_AUTH_STATUSES), true);
  assert.equal(Object.isFrozen(authModule.EMPLOYEE_AUTH_ROLES), true);

  for (const status of authModule.EMPLOYEE_AUTH_STATUSES) {
    assert.equal(authModule.isEmployeeAuthStatus(status), true);
  }
  for (const invalid of ["authenticated", " AUTHENTICATED", "", "UNKNOWN", 1]) {
    assert.equal(authModule.isEmployeeAuthStatus(invalid), false);
  }
  for (const role of authModule.EMPLOYEE_AUTH_ROLES) {
    assert.equal(authModule.isEmployeeAuthRole(role), true);
  }
  for (
    const invalid of [
      "OWNER",
      "MANAGER",
      "ADMIN",
      "READONLY_ADMIN",
      "employee",
      "staff",
      "",
      undefined,
    ]
  ) {
    assert.equal(authModule.isEmployeeAuthRole(invalid), false);
  }

  assert.equal(authModule.isEmployeeAuthSession(validSession()), true);
  assert.equal(
    authModule.isEmployeeAuthSession({
      user: { employeeId: "", displayName: "", role: "STAFF" },
    }),
    false,
  );
  assert.equal(
    authModule.isEmployeeAuthSession({
      user: { displayName: "", role: "STAFF" },
    }),
    false,
  );
  assert.equal(
    authModule.isEmployeeAuthSession({
      user: { employeeId: "e", displayName: 1, role: "STAFF" },
    }),
    false,
  );
  assert.equal(authModule.isEmployeeAuthSession(validSession("OWNER")), false);

  const calls = { login: 0, restore: 0, logout: 0 };
  let releaseLogin;
  let releaseRestore;
  const session = validSession();
  const transport = transportWith({
    login() {
      calls.login += 1;
      return new Promise((resolvePromise) => {
        releaseLogin = () => resolvePromise(session);
      });
    },
    restore() {
      calls.restore += 1;
      return new Promise((resolvePromise) => {
        releaseRestore = () => resolvePromise(session);
      });
    },
    async logout() {
      calls.logout += 1;
    },
  });
  const controller = authModule.createEmployeeAuthController(transport);
  assert.deepEqual(calls, { login: 0, restore: 0, logout: 0 });
  assert.deepEqual(controller.getState(), { status: "SIGNED_OUT" });
  assert.equal(Object.isFrozen(controller.getState()), true);

  const credentials = Object.freeze({
    identifier: "employee-id",
    secret: "test-only-secret",
  });
  const loginPromise = controller.login(credentials);
  assert.deepEqual(controller.getState(), { status: "AUTHENTICATING" });
  releaseLogin();
  const authenticated = await loginPromise;
  assert.equal(authenticated.status, "AUTHENTICATED");
  assert.equal(authenticated.session.user.employeeId, "employee-test");
  assert.equal(Object.isFrozen(authenticated), true);
  assert.equal(Object.isFrozen(authenticated.session), true);
  assert.equal(Object.isFrozen(authenticated.session.user), true);
  assertNoCredentialMaterial(authenticated);
  assert.equal(Object.isFrozen(session), false);
  assert.equal(Object.isFrozen(session.user), false);
  assert.equal(Object.isFrozen(transport), false);
  assert.equal(Object.isFrozen(credentials), true);

  const restorePromise = controller.restore();
  assert.deepEqual(controller.getState(), { status: "RESTORING" });
  releaseRestore();
  assert.equal((await restorePromise).status, "AUTHENTICATED");

  const logoutState = await controller.logout();
  assert.deepEqual(logoutState, { status: "SIGNED_OUT" });
  assert.equal(calls.logout, 1);

  const signedOutController = authModule.createEmployeeAuthController(
    transportWith({ async restore() { return undefined; } }),
  );
  assert.deepEqual(await signedOutController.restore(), {
    status: "SIGNED_OUT",
  });
  assert.deepEqual(await signedOutController.logout(), {
    status: "SIGNED_OUT",
  });

  const first = authModule.createEmployeeAuthController(transportWith());
  const second = authModule.createEmployeeAuthController(transportWith());
  await first.login({ identifier: "one", secret: "one-secret" });
  assert.equal(first.getState().status, "AUTHENTICATED");
  assert.equal(second.getState().status, "SIGNED_OUT");
  assertNoCredentialMaterial(first.getState());

  assert.deepEqual(Object.keys(authModule).sort(), [
    "EMPLOYEE_AUTH_ROLES",
    "EMPLOYEE_AUTH_STATUSES",
    "createEmployeeAuthController",
    "isEmployeeAuthRole",
    "isEmployeeAuthSession",
    "isEmployeeAuthStatus",
  ]);
});

test("auth runtime fail-closed contract", async () => {
  for (
    const invalid of [
      null,
      1,
      {},
      { restore() {}, logout() {} },
      { login() {}, logout() {} },
      { login() {}, restore() {} },
      { login: 1, restore() {}, logout() {} },
    ]
  ) {
    assert.throws(
      () => authModule.createEmployeeAuthController(invalid),
      { message: "EMPLOYEE_AUTH_INVALID_TRANSPORT" },
    );
  }

  let loginCalls = 0;
  const invalidCredentialsController = authModule.createEmployeeAuthController(
    transportWith({
      async login() {
        loginCalls += 1;
        return validSession();
      },
    }),
  );
  for (
    const credentials of [
      { identifier: "", secret: "secret" },
      { identifier: "employee", secret: "" },
    ]
  ) {
    assert.deepEqual(await invalidCredentialsController.login(credentials), {
      status: "ERROR",
      errorCode: "EMPLOYEE_AUTH_INVALID_CREDENTIALS",
    });
    assert.equal(loginCalls, 0);
  }

  const loginRejected = authModule.createEmployeeAuthController(
    transportWith({
      async login() {
        throw new Error("transport detail");
      },
    }),
  );
  assert.deepEqual(
    await loginRejected.login({ identifier: "employee", secret: "secret" }),
    { status: "ERROR", errorCode: "EMPLOYEE_AUTH_LOGIN_FAILED" },
  );
  assertNoCredentialMaterial(loginRejected.getState());

  for (const invalidSession of [{}, { user: null }, validSession("OWNER")]) {
    const controller = authModule.createEmployeeAuthController(
      transportWith({ async login() { return invalidSession; } }),
    );
    assert.deepEqual(
      await controller.login({ identifier: "employee", secret: "secret" }),
      { status: "ERROR", errorCode: "EMPLOYEE_AUTH_INVALID_SESSION" },
    );
  }

  const restoreRejected = authModule.createEmployeeAuthController(
    transportWith({
      async restore() {
        throw new Error("transport detail");
      },
    }),
  );
  assert.deepEqual(await restoreRejected.restore(), {
    status: "ERROR",
    errorCode: "EMPLOYEE_AUTH_RESTORE_FAILED",
  });

  const restoreInvalid = authModule.createEmployeeAuthController(
    transportWith({ async restore() { return validSession("ADMIN"); } }),
  );
  assert.deepEqual(await restoreInvalid.restore(), {
    status: "ERROR",
    errorCode: "EMPLOYEE_AUTH_INVALID_SESSION",
  });

  const logoutRejected = authModule.createEmployeeAuthController(
    transportWith({
      async logout() {
        throw new Error("transport detail");
      },
    }),
  );
  await logoutRejected.login({ identifier: "employee", secret: "secret" });
  assert.deepEqual(await logoutRejected.logout(), {
    status: "ERROR",
    errorCode: "EMPLOYEE_AUTH_LOGOUT_FAILED",
  });
  assert.equal("session" in logoutRejected.getState(), false);

  for (const role of ["OWNER", "MANAGER", "ADMIN", "READONLY_ADMIN"]) {
    const controller = authModule.createEmployeeAuthController(
      transportWith({ async login() { return validSession(role); } }),
    );
    const result = await controller.login({
      identifier: "employee",
      secret: "secret",
    });
    assert.deepEqual(result, {
      status: "ERROR",
      errorCode: "EMPLOYEE_AUTH_INVALID_SESSION",
    });
    assertNoCredentialMaterial(result);
  }
});

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(source) {
  const authFile = "/virtual/auth.ts";
  const fixtureFile = "/virtual/fixture.ts";
  const options = {
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
  };
  const virtualFiles = new Map([
    [authFile, authSource],
    [fixtureFile, source],
  ]);
  const host = ts.createCompilerHost(options, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalReadFile = host.readFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  host.fileExists = (path) => (
    virtualFiles.has(normalizeVirtualPath(path)) || originalFileExists(path)
  );
  host.readFile = (path) => (
    virtualFiles.get(normalizeVirtualPath(path)) ?? originalReadFile(path)
  );
  host.getSourceFile = (path, languageVersion, onError, shouldCreate) => {
    const normalized = normalizeVirtualPath(path);
    const virtualSource = virtualFiles.get(normalized);
    if (virtualSource !== undefined) {
      return ts.createSourceFile(
        normalized,
        virtualSource,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    return originalGetSourceFile(
      path,
      languageVersion,
      onError,
      shouldCreate,
    );
  };
  host.resolveModuleNames = (moduleNames) => moduleNames.map(
    (moduleName) => (
      moduleName === "./auth.ts"
        ? {
            extension: ts.Extension.Ts,
            isExternalLibraryImport: false,
            resolvedFileName: authFile,
          }
        : undefined
    ),
  );
  const program = ts.createProgram([authFile, fixtureFile], options, host);
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile
    ),
  );
}

test("auth TypeScript semantic fixtures", () => {
  const modulePath = "./auth.ts";
  const positive = `
    import {
      createEmployeeAuthController,
      type EmployeeAuthController,
      type EmployeeAuthSession,
      type EmployeeAuthState,
      type EmployeeAuthTransport,
    } from ${JSON.stringify(modulePath)};
    const session: EmployeeAuthSession = {
      user: { employeeId: "e", displayName: "", role: "EMPLOYEE" },
    };
    const transport: EmployeeAuthTransport = {
      async login() { return session; },
      async restore() { return session; },
      async logout() {},
    };
    const controller: EmployeeAuthController =
      createEmployeeAuthController(transport);
    const state: EmployeeAuthState = controller.getState();
    if (state.status === "AUTHENTICATED") {
      const employeeId: string = state.session.user.employeeId;
      void employeeId;
    }
  `;
  assert.deepEqual(semanticDiagnosticsFor(positive), []);

  const negativeFixtures = [
    [`const s: import(${JSON.stringify(modulePath)}).EmployeeAuthSession = { user: { employeeId: "e", displayName: "", role: "OWNER" } };`, /OWNER/u],
    [`const s: import(${JSON.stringify(modulePath)}).EmployeeAuthSession = { user: { employeeId: "e", displayName: "", role: "staff" } };`, /staff/u],
    [`const t: import(${JSON.stringify(modulePath)}).EmployeeAuthTransport = { async restore() { return undefined; }, async logout() {} };`, /login/u],
    [`const t: import(${JSON.stringify(modulePath)}).EmployeeAuthTransport = { login() { return { user: { employeeId: "e", displayName: "", role: "STAFF" } }; }, async restore() { return undefined; }, async logout() {} };`, /Promise/u],
    [`const c: import(${JSON.stringify(modulePath)}).EmployeeLoginCredentials = { identifier: "e" };`, /secret/u],
    [`import { EMPLOYEE_AUTH_STATUSES } from ${JSON.stringify(modulePath)}; EMPLOYEE_AUTH_STATUSES[0] = "ERROR";`, /read.?only/iu],
    [`import { EMPLOYEE_AUTH_ROLES } from ${JSON.stringify(modulePath)}; EMPLOYEE_AUTH_ROLES[0] = "STAFF";`, /read.?only/iu],
    [`declare const s: import(${JSON.stringify(modulePath)}).EmployeeAuthState; const id = s.session.user.employeeId;`, /session/u],
    [`const s: import(${JSON.stringify(modulePath)}).EmployeeAuthStatus = "UNKNOWN";`, /UNKNOWN/u],
    [`const raw = { user: { employeeId: "e", displayName: "", role: "STAFF" } }; const s: import(${JSON.stringify(modulePath)}).EmployeeAuthSession = raw;`, /role/u],
  ];
  for (const [source, expected] of negativeFixtures) {
    const diagnostics = semanticDiagnosticsFor(source);
    assert.ok(diagnostics.length > 0, source);
    const messages = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ).join("\n");
    assert.match(messages, expected, source);
  }
});

test("auth source boundary excludes business rules and side effects", () => {
  assert.doesNotMatch(authSource, /^\s*import\b/mu);
  assert.doesNotMatch(
    authSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document|window|setTimeout|setInterval)\b/u,
  );
  assert.doesNotMatch(authSource, /\/api\/|https?:|employee-v3/u);
  assert.doesNotMatch(
    authSource,
    /\b(?:rent|arrears|deposit|checkout|expense|bedTransfer|from_bed|to_bed|ttlock|canonical|finance|correction|reversal)\b/iu,
  );
  assert.doesNotMatch(authSource, /\bany\b/u);
  assert.doesNotMatch(authSource, /^let\b|^var\b/mu);
  assert.doesNotMatch(authSource, /\bdefaultController\b|\bsingleton\b/u);
  assert.doesNotMatch(authSource, /Object\.freeze\((?:credentials|transport|session)\)/u);
});
