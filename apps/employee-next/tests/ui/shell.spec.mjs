import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, posix, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const shellPath = resolve(employeeNextRoot, "src", "ui", "shell.ts");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const shellSource = await readFile(shellPath, "utf8");

const bundledShell = await esbuild.build({
  bundle: true,
  entryPoints: [shellPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const shellModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledShell.outputFiles[0].text).toString("base64")
  }`
);

const eventIds = [
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
];

function registryFixture(overrides = {}) {
  let contractMethodCalls = 0;
  const contracts = eventIds.map((eventId, index) => ({
    eventId,
    displayName: `Event ${index + 1}`,
    createInitialDraft() {
      contractMethodCalls += 1;
      throw new Error("contract method must not run");
    },
    validateDraft() {
      contractMethodCalls += 1;
      throw new Error("contract method must not run");
    },
    buildSubmission() {
      contractMethodCalls += 1;
      throw new Error("contract method must not run");
    },
  }));
  const registry = {
    eventIds: [...eventIds],
    contracts,
    get(value) {
      return contracts.find((contract) => contract.eventId === value);
    },
    ...overrides,
  };
  return {
    registry,
    get contractMethodCalls() {
      return contractMethodCalls;
    },
  };
}

function renderFixture(handler = () => undefined) {
  const views = [];
  return {
    views,
    render(view) {
      views.push(view);
      return handler(view);
    },
  };
}

function authenticatedState(overrides = {}) {
  return {
    status: "AUTHENTICATED",
    session: {
      user: {
        employeeId: "employee-unit",
        displayName: "Employee Unit",
        role: "STAFF",
        ...overrides,
      },
    },
  };
}

test("ui-shell runtime success contract", async () => {
  assert.deepEqual(Object.keys(shellModule).sort(), [
    "EMPLOYEE_UI_SHELL_ERROR_CODES",
    "EMPLOYEE_UI_SHELL_STATUSES",
    "createEmployeeUiShellController",
    "isEmployeeUiShellStatus",
    "isEmployeeUiShellViewModel",
  ]);
  assert.deepEqual(shellModule.EMPLOYEE_UI_SHELL_STATUSES, [
    "READY",
    "RENDERING",
    "ERROR",
  ]);
  assert.equal(Object.isFrozen(shellModule.EMPLOYEE_UI_SHELL_STATUSES), true);
  assert.deepEqual(shellModule.EMPLOYEE_UI_SHELL_ERROR_CODES, [
    "INVALID_REGISTRY",
    "INVALID_RENDER_PORT",
    "INVALID_AUTH_STATE",
    "INVALID_SUBMIT_STATE",
    "INVALID_EVENT_SELECTION",
    "RENDER_FAILED",
    "UNSAFE_ERROR_ECHO",
  ]);
  assert.equal(Object.isFrozen(shellModule.EMPLOYEE_UI_SHELL_ERROR_CODES), true);
  for (const status of shellModule.EMPLOYEE_UI_SHELL_STATUSES) {
    assert.equal(shellModule.isEmployeeUiShellStatus(status), true);
  }
  assert.equal(shellModule.isEmployeeUiShellStatus("UNKNOWN"), false);

  const fixture = registryFixture();
  const renderPort = renderFixture();
  const options = { registry: fixture.registry, render: renderPort };
  const controller = shellModule.createEmployeeUiShellController(options);
  assert.equal(Object.isFrozen(controller), true);
  const initial = controller.getView();
  assert.equal(initial.status, "READY");
  assert.equal(initial.eventOptions.length, 7);
  assert.deepEqual(
    initial.eventOptions.map((option) => option.eventId),
    eventIds,
  );
  assert.deepEqual(
    initial.eventOptions.map((option) => option.displayName),
    eventIds.map((unused, index) => `Event ${index + 1}`),
  );
  assert.equal(initial.canSubmit, false);
  assert.equal(initial.selectedEventId, undefined);
  assert.equal(initial.auth.status, "SIGNED_OUT");
  assert.equal(initial.submit.status, "IDLE");
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Object.isFrozen(initial.eventOptions), true);
  assert.equal(
    initial.eventOptions.every((option) => Object.isFrozen(option)),
    true,
  );
  assert.equal(shellModule.isEmployeeUiShellViewModel(initial), true);
  assert.equal(renderPort.views.length, 0);

  for (const eventId of eventIds) {
    const selected = controller.selectEvent(eventId);
    assert.equal(selected.ok, true);
    assert.equal(Object.isFrozen(selected), true);
    assert.equal(selected.view.selectedEventId, eventId);
    assert.equal(
      selected.view.eventOptions.filter((option) => option.selected).length,
      1,
    );
    assert.equal(
      selected.view.eventOptions.find((option) => option.selected).eventId,
      eventId,
    );
  }

  const authInput = authenticatedState();
  const authResult = controller.setAuthState(authInput);
  assert.equal(authResult.ok, true);
  assert.deepEqual(authResult.view.auth, {
    status: "AUTHENTICATED",
    employeeId: "employee-unit",
    displayName: "Employee Unit",
    role: "STAFF",
  });
  assert.equal(authResult.view.canSubmit, true);
  assert.doesNotMatch(
    JSON.stringify(authResult.view.auth),
    /secret|token|authorization|cookie/iu,
  );

  for (
    const status of ["VALIDATING", "BUILDING_REQUEST", "SUBMITTING"]
  ) {
    const progress = controller.setSubmitState({
      status,
      eventId: "bed-transfer",
    });
    assert.equal(progress.ok, true);
    assert.equal(progress.view.canSubmit, false);
  }
  const synced = controller.setSubmitState({
    status: "SYNCED",
    eventId: "bed-transfer",
  });
  assert.equal(synced.ok, true);
  assert.equal(synced.view.canSubmit, true);
  assert.deepEqual(synced.view.submit, {
    status: "SYNCED",
    eventId: "bed-transfer",
  });
  assert.doesNotMatch(
    JSON.stringify(synced.view.submit),
    /request|response|draft|submission|headers|body/iu,
  );

  const renderResult = await controller.render();
  assert.equal(renderResult.ok, true);
  assert.equal(renderResult.view.status, "READY");
  assert.equal(Object.isFrozen(renderResult), true);
  assert.equal(renderPort.views.length, 1);
  assert.equal(renderPort.views[0].status, "RENDERING");
  assert.equal(Object.isFrozen(renderPort.views[0]), true);
  assert.equal(Object.isFrozen(renderPort.views[0].eventOptions), true);
  assert.equal(fixture.contractMethodCalls, 0);

  authInput.session.user.displayName = "caller-change";
  fixture.registry.eventIds.reverse();
  fixture.registry.contracts[0].displayName = "caller-change";
  assert.equal(controller.getView().auth.displayName, "Employee Unit");
  assert.deepEqual(
    controller.getView().eventOptions.map((option) => option.eventId),
    eventIds,
  );
  assert.equal(controller.getView().eventOptions[0].displayName, "Event 1");

  const otherFixture = registryFixture();
  const otherController = shellModule.createEmployeeUiShellController({
    registry: otherFixture.registry,
    render: renderFixture(),
    initialSelectedEventId: "expense",
    initialAuthState: authenticatedState({ role: "EMPLOYEE" }),
    initialSubmitState: { status: "IDLE" },
  });
  assert.equal(otherController.getView().selectedEventId, "expense");
  assert.equal(otherController.getView().canSubmit, true);
  assert.equal(controller.getView().selectedEventId, "bed-transfer");
  assert.equal(options.registry, fixture.registry);
});

test("ui-shell runtime fail-closed contract", async () => {
  const validRegistry = registryFixture().registry;
  const validRender = renderFixture();
  const factoryFailures = [
    [null, "INVALID_REGISTRY"],
    [{}, "INVALID_REGISTRY"],
    [{ registry: null, render: validRender }, "INVALID_REGISTRY"],
    [
      { registry: { contracts: [], get() {} }, render: validRender },
      "INVALID_REGISTRY",
    ],
    [
      { registry: { eventIds, get() {} }, render: validRender },
      "INVALID_REGISTRY",
    ],
    [
      { registry: { eventIds, contracts: [] }, render: validRender },
      "INVALID_REGISTRY",
    ],
    [
      {
        registry: registryFixture({
          eventIds: [...eventIds].reverse(),
        }).registry,
        render: validRender,
      },
      "INVALID_REGISTRY",
    ],
    [
      {
        registry: registryFixture({
          eventIds: [...eventIds.slice(0, 6), "unknown"],
        }).registry,
        render: validRender,
      },
      "INVALID_REGISTRY",
    ],
    [
      {
        registry: registryFixture({
          eventIds: [...eventIds.slice(0, 6), "expense"],
        }).registry,
        render: validRender,
      },
      "INVALID_REGISTRY",
    ],
    [{ registry: validRegistry, render: null }, "INVALID_RENDER_PORT"],
    [{ registry: validRegistry, render: {} }, "INVALID_RENDER_PORT"],
    [
      {
        registry: validRegistry,
        render: validRender,
        initialSelectedEventId: "unknown",
      },
      "INVALID_EVENT_SELECTION",
    ],
    [
      {
        registry: validRegistry,
        render: validRender,
        initialAuthState: { status: "UNKNOWN" },
      },
      "INVALID_AUTH_STATE",
    ],
    [
      {
        registry: validRegistry,
        render: validRender,
        initialAuthState: authenticatedState({ role: "OWNER" }),
      },
      "INVALID_AUTH_STATE",
    ],
    [
      {
        registry: validRegistry,
        render: validRender,
        initialSubmitState: { status: "UNKNOWN" },
      },
      "INVALID_SUBMIT_STATE",
    ],
  ];
  for (const [options, errorCode] of factoryFailures) {
    assert.throws(
      () => shellModule.createEmployeeUiShellController(options),
      { message: errorCode },
    );
  }

  const missingGetRegistry = registryFixture({
    get(value) {
      if (value === "rent") {
        return undefined;
      }
      return this.contracts.find((contract) => contract.eventId === value);
    },
  }).registry;
  assert.throws(
    () => shellModule.createEmployeeUiShellController({
      registry: missingGetRegistry,
      render: validRender,
      initialSelectedEventId: "rent",
    }),
    { message: "INVALID_REGISTRY" },
  );

  const controller = shellModule.createEmployeeUiShellController({
    registry: validRegistry,
    render: validRender,
  });
  for (const value of ["unknown", "RENT", "arrears_payment", " rent"]) {
    const result = controller.selectEvent(value);
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "INVALID_EVENT_SELECTION");
    assert.equal(result.view.status, "ERROR");
    assert.equal(result.view.errorCode, "INVALID_EVENT_SELECTION");
    assert.equal(Object.isFrozen(result), true);
  }

  for (
    const value of [
      null,
      { status: "UNKNOWN" },
      authenticatedState({ role: "OWNER" }),
      { status: "AUTHENTICATED" },
    ]
  ) {
    const result = controller.setAuthState(value);
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "INVALID_AUTH_STATE");
    assert.equal(result.view.status, "ERROR");
  }

  for (
    const value of [
      null,
      { status: "UNKNOWN" },
      { status: "SUBMITTING" },
      { status: "ERROR", errorCode: "UNKNOWN" },
    ]
  ) {
    const result = controller.setSubmitState(value);
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "INVALID_SUBMIT_STATE");
    assert.equal(result.view.status, "ERROR");
  }

  for (
    const failingRender of [
      {
        render() {
          throw new Error("private render token");
        },
      },
      {
        async render() {
          throw new Error("private rejected secret");
        },
      },
    ]
  ) {
    const failingController = shellModule.createEmployeeUiShellController({
      registry: validRegistry,
      render: failingRender,
    });
    const result = await failingController.render();
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "RENDER_FAILED");
    assert.equal(result.view.status, "ERROR");
    assert.doesNotMatch(
      JSON.stringify(result),
      /private render token|private rejected secret/u,
    );
  }

  const unsafeController = shellModule.createEmployeeUiShellController({
    registry: validRegistry,
    render: {
      render() {
        return {
          token: "private-token",
          responseBody: "private-response",
        };
      },
    },
  });
  const unsafeResult = await unsafeController.render();
  assert.equal(unsafeResult.ok, false);
  assert.equal(unsafeResult.errorCode, "UNSAFE_ERROR_ECHO");
  assert.doesNotMatch(
    JSON.stringify(unsafeResult),
    /private-token|private-response/u,
  );
  assert.equal(validRender.views.length, 0);
});

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

async function coreSources() {
  const coreDirectory = resolve(employeeNextRoot, "src", "core");
  const names = (await readdir(coreDirectory)).filter((name) =>
    name.endsWith(".ts")
  );
  const sources = new Map();
  for (const name of names) {
    sources.set(
      `/virtual/core/${name}`,
      await readFile(resolve(coreDirectory, name), "utf8"),
    );
  }
  sources.set("/virtual/ui/shell.ts", shellSource);
  return sources;
}

const virtualSourceFiles = await coreSources();

function semanticDiagnosticsFor(source) {
  const fixtureFile = "/virtual/ui/fixture.ts";
  const virtualFiles = new Map(virtualSourceFiles);
  virtualFiles.set(fixtureFile, source);
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
    virtualFiles.has(normalizeVirtualPath(fileName))
    || defaultFileExists(fileName)
  );
  host.readFile = (fileName) => (
    virtualFiles.get(normalizeVirtualPath(fileName))
    ?? defaultReadFile(fileName)
  );
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const normalized = normalizeVirtualPath(fileName);
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
    return defaultGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreate,
    );
  };
  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      const resolved = posix.resolve(
        posix.dirname(normalizeVirtualPath(containingFile)),
        moduleName,
      );
      const sourceName = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      return virtualFiles.has(sourceName)
        ? {
            extension: ts.Extension.Ts,
            isExternalLibraryImport: false,
            resolvedFileName: sourceName,
          }
        : undefined;
    });
  const program = ts.createProgram([...virtualFiles.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile
    ),
  );
}

test("ui-shell TypeScript semantic fixtures", () => {
  const imports = `
    import {
      createEmployeeUiShellController,
      type EmployeeUiShellController,
      type EmployeeUiShellControllerOptions,
      type EmployeeUiShellEventOption,
      type EmployeeUiShellRenderPort,
      type EmployeeUiShellResult,
      type EmployeeUiShellStatus,
      type EmployeeUiShellViewModel,
    } from "./shell.ts";
    import type { EmployeeEventRegistry } from "../core/event-registry.ts";
  `;
  const positives = [
    `${imports} const value: EmployeeUiShellStatus = "READY"; void value;`,
    `${imports} const value: EmployeeUiShellEventOption = { eventId: "rent", displayName: "Rent", selected: false }; void value;`,
    `${imports} const value: EmployeeUiShellViewModel = { status: "READY", eventOptions: [], auth: { status: "SIGNED_OUT" }, submit: { status: "IDLE" }, canSubmit: false }; void value;`,
    `${imports} const value: EmployeeUiShellRenderPort = { render() {} }; void value;`,
    `${imports} declare const options: EmployeeUiShellControllerOptions; const value: EmployeeUiShellController = createEmployeeUiShellController(options); void value;`,
    `${imports} declare const controller: EmployeeUiShellController; const value: Promise<EmployeeUiShellResult> = controller.render(); void value;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeUiShellStatus = "UNKNOWN";`, /UNKNOWN/u],
    [`${imports} const value: EmployeeUiShellEventOption = { displayName: "Rent", selected: false };`, /eventId/u],
    [`${imports} declare const id: string; const value: EmployeeUiShellEventOption = { eventId: id, displayName: "Rent", selected: false };`, /string/u],
    [`${imports} const value: EmployeeUiShellViewModel = { status: "READY", auth: { status: "SIGNED_OUT" }, submit: { status: "IDLE" }, canSubmit: false };`, /eventOptions/u],
    [`${imports} const value: EmployeeUiShellViewModel = { status: "READY", eventOptions: [], auth: { status: "SIGNED_OUT", secret: "x" }, submit: { status: "IDLE" }, canSubmit: false };`, /secret/u],
    [`${imports} const value: EmployeeUiShellViewModel = { status: "READY", eventOptions: [], auth: { status: "SIGNED_OUT" }, submit: { status: "IDLE", request: {} }, canSubmit: false };`, /request/u],
    [`${imports} const value: EmployeeUiShellRenderPort = {};`, /render/u],
    [`${imports} const value: EmployeeUiShellRenderPort = { render(value: string) {} };`, /string/u],
    [`${imports} declare const render: EmployeeUiShellRenderPort; const value: EmployeeUiShellControllerOptions = { render };`, /registry/u],
    [`${imports} declare const registry: EmployeeEventRegistry; const value: EmployeeUiShellControllerOptions = { registry };`, /render/u],
    [`${imports} declare const result: EmployeeUiShellResult; const view = result.ok ? result.errorCode : result.view;`, /errorCode/u],
    [`${imports} declare const value: string; const status: EmployeeUiShellStatus = value;`, /string/u],
  ];
  for (const [source, expected] of negatives) {
    const diagnostics = semanticDiagnosticsFor(source);
    assert.ok(diagnostics.length > 0, source);
    const text = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ).join("\n");
    assert.match(text, expected, source);
  }
});

test("ui-shell source boundary excludes integrations and business rules", () => {
  assert.match(shellSource, /from "\.\.\/core\/auth"/u);
  assert.match(shellSource, /from "\.\.\/core\/event-contract"/u);
  assert.match(shellSource, /from "\.\.\/core\/event-registry"/u);
  assert.match(shellSource, /from "\.\.\/core\/submit-entry"/u);
  assert.doesNotMatch(
    shellSource,
    /core\/(?:api-client|draft-store)|\.\.\/events\/|\.\/(?:event-selector|event-form-host|draft-list|sync-status)|\.\.\/main/u,
  );
  assert.doesNotMatch(
    shellSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document|window|navigator|cookieStore|setTimeout|setInterval)\b/u,
  );
  assert.doesNotMatch(shellSource, /\/api\/|https?:|workers\.dev|cloudflare/u);
  assert.doesNotMatch(
    shellSource,
    /\b(?:rent_amount|paid_amount|cash|bank|remaining_arrears|arrears_ref|deposit_in|deposit_out|checkout|refund|expense_category|receipt|bed_transfer|from_bed|to_bed|tenant_card|ttlock|finance|owner|canonical|stay_action)\b/iu,
  );
  assert.doesNotMatch(
    shellSource,
    /\.(?:createInitialDraft|validateDraft|buildSubmission|submit|request)\s*\(/u,
  );
  assert.doesNotMatch(shellSource, /\bany\b/u);
  assert.doesNotMatch(shellSource, /^var\b/mu);
  assert.doesNotMatch(shellSource, /\bdefaultController\b|\bsingleton\b/u);
});
