import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const routePath = resolve(employeeNextRoot, "src", "route.ts");
const mainPath = resolve(employeeNextRoot, "src", "main.ts");
const indexPath = resolve(employeeNextRoot, "index.html");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const routeSource = await readFile(routePath, "utf8");
const mainSource = await readFile(mainPath, "utf8");
const indexSource = await readFile(indexPath, "utf8");

async function loadRuntime(entryPoint) {
  const bundle = await esbuild.build({
    bundle: true,
    entryPoints: [entryPoint],
    format: "esm",
    platform: "node",
    target: "es2022",
    write: false,
  });
  return import(
    `data:text/javascript;base64,${
      Buffer.from(bundle.outputFiles[0].text).toString("base64")
    }`
  );
}

const routeRuntime = await loadRuntime(routePath);

const expectedEventIds = [
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
];

const expectedErrorCodes = [
  "INVALID_OPTIONS",
  "INVALID_RENDER_PORT",
  "INVALID_API_TRANSPORT",
  "INVALID_AUTH_SESSION",
  "INVALID_EVENT_SELECTION",
  "INVALID_DRAFT_INPUT",
  "ROUTE_NOT_READY",
  "SUBMIT_FLOW_FAILED",
  "RENDER_FAILED",
  "UNSAFE_ERROR_ECHO",
];

const session = Object.freeze({
  user: Object.freeze({
    employeeId: "LOCAL-EMPLOYEE",
    displayName: "Local Employee",
    role: "STAFF",
  }),
});

function validRentDraft(overrides = {}) {
  return {
    bedLabel: "A-101",
    amountDueAed: 1_000,
    amountReceivedAed: 1_000,
    paymentMethod: "cash",
    cashReceivedAed: 1_000,
    bankReceivedAed: 0,
    shortPaymentMode: "none",
    promiseDate: "",
    note: "",
    ...overrides,
  };
}

function successTransport(requests = [], response = {
  status: 200,
  body: { accepted: true },
}) {
  return Object.freeze({
    async request(request) {
      requests.push(request);
      return response;
    },
  });
}

function successRender(views = []) {
  return Object.freeze({
    render(view) {
      views.push(view);
    },
  });
}

function requestBuilder(overrides = {}) {
  return (context) => ({
    method: "POST",
    path: "/unit-test-route-submit",
    body: {
      eventId: context.eventId,
      submission: context.submission,
    },
    ...overrides,
  });
}

function makeOptions(overrides = {}) {
  return {
    transport: successTransport(),
    render: successRender(),
    buildApiRequest: requestBuilder(),
    ...overrides,
  };
}

function readyController(overrides = {}) {
  const controller = routeRuntime.createEmployeeNextRouteController(
    makeOptions(overrides),
  );
  controller.selectEvent("rent");
  controller.setSession(session);
  controller.setDraft(validRentDraft());
  return controller;
}

function assertSafeFailure(result, expectedCode) {
  assert.deepEqual(
    Object.keys(result).sort(),
    ["errorCode", "ok", "view"],
  );
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, expectedCode);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.view), true);
  assert.doesNotMatch(
    JSON.stringify(result),
    /secret-value|customer-value|header-value|payload-value|raw-value/u,
  );
}

function diagnosticText(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function semanticDiagnosticsFor(fixtureSource) {
  const fixtureFile = resolve(employeeNextRoot, "tests", "virtual-020-fixture.ts");
  const normalizedFixture = fixtureFile.replaceAll("\\", "/");
  const options = {
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(options, true);
  const defaultFileExists = host.fileExists.bind(host);
  const defaultReadFile = host.readFile.bind(host);
  const defaultGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => (
    fileName.replaceAll("\\", "/") === normalizedFixture
    || defaultFileExists(fileName)
  );
  host.readFile = (fileName) => (
    fileName.replaceAll("\\", "/") === normalizedFixture
      ? fixtureSource
      : defaultReadFile(fileName)
  );
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (fileName.replaceAll("\\", "/") === normalizedFixture) {
      return ts.createSourceFile(
        fixtureFile,
        fixtureSource,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    return defaultGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreate,
    );
  };
  host.resolveModuleNames = (moduleNames, containingFile) => (
    moduleNames.map((moduleName) => {
      if (
        containingFile.replaceAll("\\", "/") === normalizedFixture
        && moduleName === "../src/route.ts"
      ) {
        return {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: routePath,
        };
      }
      return ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        host,
      ).resolvedModule;
    })
  );
  const program = ts.createProgram(
    [routePath, fixtureFile],
    options,
    host,
  );
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      diagnostic.file?.fileName.replaceAll("\\", "/") === normalizedFixture
    ),
  );
}

function assertSemanticPass(source, label) {
  const diagnostics = semanticDiagnosticsFor(source);
  assert.deepEqual(
    diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnosticText(diagnostic),
    })),
    [],
    label,
  );
}

function assertSemanticReject(source, expectedCode, expectedText, label) {
  const diagnostics = semanticDiagnosticsFor(source);
  assert.ok(diagnostics.length > 0, `${label}: expected a TypeScript error`);
  assert.ok(
    diagnostics.some(
      (diagnostic) => (
        diagnostic.code === expectedCode
        && diagnosticText(diagnostic).includes(expectedText)
      ),
    ),
    `${label}: ${JSON.stringify(diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnosticText(diagnostic),
    })))}`,
  );
}

test("route-build runtime success composes the local route", async () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };
  const requests = [];
  const views = [];
  const mutableResponse = { status: 200, body: { accepted: true } };
  const options = {
    transport: successTransport(requests, mutableResponse),
    render: successRender(views),
    buildApiRequest: requestBuilder(),
  };
  const controller = routeRuntime.createEmployeeNextRouteController(options);

  check(() => assert.deepEqual(Object.keys(routeRuntime).sort(), [
    "EMPLOYEE_NEXT_ROUTE_ERROR_CODES",
    "createEmployeeNextRouteController",
    "isEmployeeNextRouteOptions",
  ]));
  check(() => assert.deepEqual(
    routeRuntime.EMPLOYEE_NEXT_ROUTE_ERROR_CODES,
    expectedErrorCodes,
  ));
  check(() => assert.equal(
    Object.isFrozen(routeRuntime.EMPLOYEE_NEXT_ROUTE_ERROR_CODES),
    true,
  ));
  check(() => assert.equal(
    routeRuntime.isEmployeeNextRouteOptions(options),
    true,
  ));
  check(() => assert.deepEqual(controller.getEventIds(), expectedEventIds));
  check(() => assert.equal(Object.isFrozen(controller.getEventIds()), true));
  check(() => assert.equal(Object.isFrozen(controller.getView()), true));
  check(() => assert.equal(controller.getView().shell.eventOptions.length, 7));

  for (const eventId of expectedEventIds) {
    const selection = controller.selectEvent(eventId);
    check(() => assert.equal(selection.ok, true));
  }

  controller.selectEvent("rent");
  const mutableSession = {
    user: {
      employeeId: "LOCAL-EMPLOYEE",
      displayName: "Local Employee",
      role: "STAFF",
    },
  };
  check(() => assert.equal(controller.setSession(mutableSession).ok, true));
  mutableSession.user.displayName = "Changed";
  check(() => assert.equal(
    controller.getView().shell.auth.displayName,
    "Local Employee",
  ));

  const mutableDraft = validRentDraft();
  check(() => assert.equal(controller.setDraft(mutableDraft).ok, true));
  mutableDraft.bedLabel = "Changed";
  check(() => assert.equal(controller.getState().status, "READY"));

  const renderResult = await controller.render();
  check(() => assert.equal(renderResult.ok, true));
  check(() => assert.equal(Object.isFrozen(views[0]), true));

  const submitResult = await controller.submit();
  check(() => assert.equal(submitResult.ok, true));
  check(() => assert.equal(requests.length, 1));
  check(() => assert.equal(requests[0].method, "POST"));
  check(() => assert.equal(requests[0].path, "/unit-test-route-submit"));
  check(() => assert.equal(Object.isFrozen(requests[0]), true));
  check(() => assert.equal(Object.isFrozen(submitResult.response), true));
  mutableResponse.body.accepted = false;
  check(() => assert.equal(submitResult.response.body.accepted, true));
  check(() => assert.equal(controller.getState().status, "SYNCED"));

  const second = routeRuntime.createEmployeeNextRouteController(makeOptions());
  second.selectEvent("expense");
  check(() => assert.equal(
    controller.getView().shell.selectedEventId,
    "rent",
  ));
  check(() => assert.equal(
    second.getView().shell.selectedEventId,
    "expense",
  ));

  assert.match(indexSource, /id="employee-next-root"/u);
  assert.match(indexSource, /data-route="\/employee-next"/u);
  assert.match(indexSource, /type="module" src="\.\/src\/main\.ts"/u);
  successCases += 3;

  const mainBundle = await esbuild.build({
    bundle: true,
    entryPoints: [mainPath],
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  check(() => assert.ok(mainBundle.outputFiles[0].contents.byteLength > 0));
  await import(
    `data:text/javascript;base64,${
      Buffer.from(mainBundle.outputFiles[0].text).toString("base64")
    }`
  );
  check(() => assert.equal(typeof document, "undefined"));

  assert.equal(successCases, 36);
});

test("route-build runtime fails closed without unsafe echoes", async () => {
  let failClosedCases = 0;
  const checkFailure = (result, expectedCode) => {
    assertSafeFailure(result, expectedCode);
    failClosedCases += 1;
  };

  for (const [options, expected] of [
    [null, "INVALID_OPTIONS"],
    [[], "INVALID_OPTIONS"],
    [{}, "INVALID_RENDER_PORT"],
    [{ render: {}, transport: successTransport(), buildApiRequest: requestBuilder() }, "INVALID_RENDER_PORT"],
    [{ render: successRender(), transport: {}, buildApiRequest: requestBuilder() }, "INVALID_API_TRANSPORT"],
    [{ render: successRender(), transport: successTransport() }, "INVALID_OPTIONS"],
    [{ ...makeOptions(), extra: true }, "INVALID_OPTIONS"],
  ]) {
    const controller = routeRuntime.createEmployeeNextRouteController(options);
    checkFailure(controller.selectEvent("rent"), expected);
  }

  for (const value of ["unknown", "bed_transfer", "rent "]) {
    const controller = routeRuntime.createEmployeeNextRouteController(
      makeOptions(),
    );
    checkFailure(
      controller.selectEvent(value),
      "INVALID_EVENT_SELECTION",
    );
  }

  for (const value of [
    null,
    {},
    { user: {} },
    {
      user: {
        employeeId: "LOCAL",
        displayName: "Local",
        role: "OWNER",
      },
    },
  ]) {
    const controller = routeRuntime.createEmployeeNextRouteController(
      makeOptions(),
    );
    checkFailure(
      controller.setSession(value),
      "INVALID_AUTH_SESSION",
    );
  }

  const noSelection = routeRuntime.createEmployeeNextRouteController(
    makeOptions(),
  );
  checkFailure(noSelection.setDraft({}), "ROUTE_NOT_READY");

  const invalidDrafts = [
    null,
    [],
    () => undefined,
    { value: 1n },
  ];
  for (const value of invalidDrafts) {
    const controller = routeRuntime.createEmployeeNextRouteController(
      makeOptions(),
    );
    controller.selectEvent("rent");
    checkFailure(controller.setDraft(value), "INVALID_DRAFT_INPUT");
  }
  const cyclic = {};
  cyclic.self = cyclic;
  const cyclicController = routeRuntime.createEmployeeNextRouteController(
    makeOptions(),
  );
  cyclicController.selectEvent("rent");
  checkFailure(cyclicController.setDraft(cyclic), "INVALID_DRAFT_INPUT");

  const submitBeforeEvent = routeRuntime.createEmployeeNextRouteController(
    makeOptions(),
  );
  checkFailure(await submitBeforeEvent.submit(), "ROUTE_NOT_READY");
  const submitBeforeSession = routeRuntime.createEmployeeNextRouteController(
    makeOptions(),
  );
  submitBeforeSession.selectEvent("rent");
  submitBeforeSession.setDraft(validRentDraft());
  checkFailure(await submitBeforeSession.submit(), "ROUTE_NOT_READY");
  const submitBeforeDraft = routeRuntime.createEmployeeNextRouteController(
    makeOptions(),
  );
  submitBeforeDraft.selectEvent("rent");
  submitBeforeDraft.setSession(session);
  checkFailure(await submitBeforeDraft.submit(), "ROUTE_NOT_READY");

  for (const render of [
    { render() { throw new Error("raw-value"); } },
    { render() { return Promise.reject(new Error("raw-value")); } },
  ]) {
    const controller = routeRuntime.createEmployeeNextRouteController(
      makeOptions({ render }),
    );
    checkFailure(await controller.render(), "RENDER_FAILED");
  }
  const echoController = routeRuntime.createEmployeeNextRouteController(
    makeOptions({ render: { render() { return "raw-value"; } } }),
  );
  checkFailure(await echoController.render(), "UNSAFE_ERROR_ECHO");

  for (const transport of [
    { request() { throw new Error("raw-value"); } },
    { request() { return Promise.reject(new Error("raw-value")); } },
    { async request() { return null; } },
    { async request() { return { status: 500, body: { detail: "raw-value" } }; } },
  ]) {
    const controller = readyController({ transport });
    checkFailure(await controller.submit(), "SUBMIT_FLOW_FAILED");
  }

  for (const buildApiRequest of [
    () => ({ method: "GET", path: "/unit-test-route-submit" }),
    () => ({ method: "POST", path: "https://invalid.local" }),
    () => ({ method: "POST", path: "//invalid-local" }),
    () => ({ method: "POST", path: "/api/employee-entry" }),
  ]) {
    const controller = readyController({ buildApiRequest });
    checkFailure(await controller.submit(), "SUBMIT_FLOW_FAILED");
  }

  let release;
  const pending = new Promise((resolvePending) => {
    release = resolvePending;
  });
  const concurrent = readyController({
    transport: {
      async request() {
        return pending;
      },
    },
  });
  const first = concurrent.submit();
  checkFailure(await concurrent.submit(), "SUBMIT_FLOW_FAILED");
  release({ status: 200 });
  assert.equal((await first).ok, true);

  const sensitiveController = routeRuntime.createEmployeeNextRouteController(
    makeOptions({
      buildApiRequest() {
        throw new Error("secret-value");
      },
    }),
  );
  sensitiveController.selectEvent("rent");
  sensitiveController.setSession(session);
  sensitiveController.setDraft(validRentDraft({ note: "customer-value" }));
  checkFailure(await sensitiveController.submit(), "SUBMIT_FLOW_FAILED");

  assert.equal(failClosedCases, 36);
});

test("route-build TypeScript semantic fixtures", () => {
  const shared = `
    import {
      EMPLOYEE_NEXT_ROUTE_ERROR_CODES,
      createEmployeeNextRouteController,
    } from "../src/route.ts";
    import type {
      EmployeeNextRouteController,
      EmployeeNextRouteErrorCode,
      EmployeeNextRouteOptions,
      EmployeeNextRouteRenderPort,
      EmployeeNextRouteResult,
      EmployeeNextRouteTransport,
    } from "../src/route.ts";
    const transport: EmployeeNextRouteTransport = {
      async request() { return { status: 200 }; },
    };
    const render: EmployeeNextRouteRenderPort = {
      render() {},
    };
    const options: EmployeeNextRouteOptions = {
      transport,
      render,
      buildApiRequest: () => ({
        method: "POST",
        path: "/unit-test-route-submit",
      }),
    };
  `;
  const positives = [
    `${shared} const value: EmployeeNextRouteController =
      createEmployeeNextRouteController(options); void value;`,
    `${shared} const value: EmployeeNextRouteOptions = options; void value;`,
    `${shared} const value: EmployeeNextRouteRenderPort = render; void value;`,
    `${shared} const value: EmployeeNextRouteTransport = transport; void value;`,
    `${shared} const value: readonly string[] =
      createEmployeeNextRouteController(options).getEventIds(); void value;`,
    `${shared} const value: readonly EmployeeNextRouteErrorCode[] =
      EMPLOYEE_NEXT_ROUTE_ERROR_CODES; void value;`,
    `${shared} declare const result: EmployeeNextRouteResult;
      if (result.ok) { const view = result.view; void view; }`,
    `${shared} declare const result: EmployeeNextRouteResult;
      if (!result.ok) { const code: EmployeeNextRouteErrorCode =
        result.errorCode; void code; }`,
  ];
  positives.forEach((source, index) => {
    assertSemanticPass(source, `positive fixture ${index + 1}`);
  });

  const negatives = [
    [2741, "render", `${shared}
      const value: EmployeeNextRouteOptions = {
        transport, buildApiRequest: options.buildApiRequest,
      }; void value;`],
    [2741, "transport", `${shared}
      const value: EmployeeNextRouteOptions = {
        render, buildApiRequest: options.buildApiRequest,
      }; void value;`],
    [2741, "render", `${shared}
      const value: EmployeeNextRouteRenderPort = {}; void value;`],
    [2741, "request", `${shared}
      const value: EmployeeNextRouteTransport = {}; void value;`],
    [2322, "not assignable", `${shared}
      const value: EmployeeNextRouteOptions = {
        ...options,
        buildApiRequest: () => ({
          method: "PATCH", path: "/unit-test-route-submit",
        }),
      }; void value;`],
    [2322, "not assignable", `${shared}
      const value: EmployeeNextRouteOptions = {
        ...options,
        buildApiRequest: () => ({ method: "POST" }),
      }; void value;`],
    [2339, "push", `${shared}
      createEmployeeNextRouteController(options).getEventIds().push("rent");`],
    [2540, "read-only property", `${shared}
      EMPLOYEE_NEXT_ROUTE_ERROR_CODES[0] = "INVALID_OPTIONS";`],
    [2339, "response", `${shared} declare const result: EmployeeNextRouteResult;
      const value = result.response; void value;`],
    [2339, "errorCode", `${shared} declare const result: EmployeeNextRouteResult;
      const value = result.errorCode; void value;`],
    [2322, "not assignable", `${shared}
      const value: EmployeeNextRouteErrorCode = "OTHER"; void value;`],
    [2540, "read-only property", `${shared}
      createEmployeeNextRouteController(options).getView().state = {
        status: "READY", sessionReady: false, draftReady: false,
      };`],
    [2322, "missing", `${shared}
      const value: Promise<EmployeeNextRouteResult> =
        createEmployeeNextRouteController(options).setDraft({});
      void value;`],
    [2741, "request", `${shared}
      import type { EmployeeApiClient } from "../src/core/api-client.ts";
      const value: EmployeeApiClient =
        createEmployeeNextRouteController(options); void value;`],
  ];
  negatives.forEach(([code, text, source], index) => {
    assertSemanticReject(source, code, text, `negative fixture ${index + 1}`);
  });
});

test("route-build source boundary stays isolated", () => {
  const imports = [
    ...routeSource.matchAll(/from\s+["']([^"']+)["']/gu),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(imports)].sort(), [
    "./core/api-client",
    "./core/auth",
    "./core/event-contract",
    "./events",
    "./submit-flow",
    "./ui/shell",
  ].sort());
  assert.match(routeSource, /\bcreateEmployeeSevenEventRegistry\(\)/u);
  assert.match(routeSource, /\bcreateEmployeeSubmitFlowController\(/u);
  assert.match(routeSource, /\bcreateEmployeeUiShellController\(/u);
  assert.match(routeSource, /\bcreateEmployeeApiClient\(/u);
  assert.match(routeSource, /\bisEmployeeApiRequest\(/u);
  assert.match(routeSource, /\bisEmployeeAuthSession\(/u);
  assert.doesNotMatch(
    routeSource,
    /\.\/events\/(?:rent|arrears-payment|deposit-in|deposit-out|checkout|expense|bed-transfer)/u,
  );
  assert.doesNotMatch(
    routeSource,
    /\b(?:createInitialDraft|validateDraft|buildSubmission)\s*\(/u,
  );
  assert.doesNotMatch(
    routeSource,
    /\b(?:document|window|fetch|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u,
  );
  assert.doesNotMatch(
    routeSource,
    /\b(?:https?:|cloudflare|production|staging|authorization|cookie|password|secret)\b/iu,
  );
  assert.doesNotMatch(
    routeSource,
    /(?:employee-v3|deploy-worker|owner|finance|canonical|ttlock|cloud arrears)/iu,
  );
  assert.doesNotMatch(
    routeSource,
    /^(?:let|var)\s+/gmu,
  );
  assert.match(mainSource, /from "\.\/route"/u);
  assert.doesNotMatch(
    mainSource,
    /\b(?:fetch|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u,
  );
  assert.doesNotMatch(
    mainSource,
    /\b(?:https?:|cloudflare|production|staging|authorization|cookie|password|secret)\b/iu,
  );
});
