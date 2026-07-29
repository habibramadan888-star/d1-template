import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const submitEntryPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "submit-entry.ts",
);
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const submitEntrySource = await readFile(submitEntryPath, "utf8");

const bundledSubmitEntry = await esbuild.build({
  bundle: true,
  entryPoints: [submitEntryPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const submitEntryModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledSubmitEntry.outputFiles[0].text).toString("base64")
  }`
);

function employeeSession(overrides = {}) {
  return {
    user: {
      employeeId: "employee-unit",
      displayName: "Employee Unit",
      role: "STAFF",
      ...overrides,
    },
  };
}

function eventContract(overrides = {}) {
  return {
    eventId: "rent",
    displayName: "Unit Event",
    createInitialDraft() {
      return { value: 0 };
    },
    validateDraft() {
      return [];
    },
    buildSubmission(draft) {
      return { value: draft.value };
    },
    ...overrides,
  };
}

function apiClientWith(handler) {
  const requests = [];
  return {
    requests,
    async request(request) {
      requests.push(request);
      return handler(request);
    },
  };
}

function submitRequest(overrides = {}) {
  return {
    session: employeeSession(),
    contract: eventContract(),
    draft: { value: 7 },
    buildApiRequest(context) {
      return {
        method: "POST",
        path: "/unit-test-submit",
        body: {
          eventId: context.eventId,
          submission: context.submission,
        },
      };
    },
    ...overrides,
  };
}

test("submit-entry runtime success contract", async () => {
  assert.deepEqual(Object.keys(submitEntryModule).sort(), [
    "EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES",
    "EMPLOYEE_SUBMIT_ENTRY_STATUSES",
    "createEmployeeSubmitEntryController",
    "isEmployeeSubmitEntryRequest",
    "isEmployeeSubmitEntryStatus",
  ]);
  assert.deepEqual(submitEntryModule.EMPLOYEE_SUBMIT_ENTRY_STATUSES, [
    "IDLE",
    "VALIDATING",
    "BUILDING_REQUEST",
    "SUBMITTING",
    "SYNCED",
    "ERROR",
  ]);
  assert.equal(
    Object.isFrozen(submitEntryModule.EMPLOYEE_SUBMIT_ENTRY_STATUSES),
    true,
  );
  assert.deepEqual(submitEntryModule.EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES, [
    "INVALID_API_CLIENT",
    "INVALID_AUTH_SESSION",
    "INVALID_EVENT_CONTRACT",
    "INVALID_DRAFT",
    "INVALID_REQUEST_BUILDER",
    "VALIDATION_BLOCKED",
    "BUILD_SUBMISSION_FAILED",
    "INVALID_SUBMISSION",
    "REQUEST_BUILD_FAILED",
    "INVALID_API_REQUEST",
    "API_REQUEST_FAILED",
    "INVALID_API_RESULT",
    "SUBMIT_IN_PROGRESS",
    "UNSAFE_ERROR_ECHO",
  ]);
  assert.equal(
    Object.isFrozen(submitEntryModule.EMPLOYEE_SUBMIT_ENTRY_ERROR_CODES),
    true,
  );
  for (const status of submitEntryModule.EMPLOYEE_SUBMIT_ENTRY_STATUSES) {
    assert.equal(submitEntryModule.isEmployeeSubmitEntryStatus(status), true);
  }
  assert.equal(submitEntryModule.isEmployeeSubmitEntryStatus("UNKNOWN"), false);

  const order = [];
  const mutableResponse = {
    status: 201,
    headers: { "x-result": "original" },
    body: { accepted: true },
  };
  const apiClient = apiClientWith(() => {
    order.push("apiClient.request");
    return { ok: true, response: mutableResponse };
  });
  const session = employeeSession();
  const draft = { value: 7, nested: { marker: "original" } };
  let validationSnapshot;
  let submissionSnapshot;
  let contextSnapshot;
  const contract = eventContract({
    validateDraft(value) {
      order.push("validateDraft");
      validationSnapshot = value;
      return [{
        code: "UNIT_WARNING",
        message: "warning only",
        severity: "WARNING",
      }];
    },
    buildSubmission(value) {
      order.push("buildSubmission");
      submissionSnapshot = value;
      return { value: value.value, nested: value.nested };
    },
  });
  const request = submitRequest({
    session,
    contract,
    draft,
    buildApiRequest(context) {
      order.push("buildApiRequest");
      contextSnapshot = context;
      return {
        method: "POST",
        path: "/unit-test-submit",
        headers: { "x-unit": "original" },
        body: { submission: context.submission },
      };
    },
  });
  assert.equal(submitEntryModule.isEmployeeSubmitEntryRequest(request), true);

  const controller = submitEntryModule.createEmployeeSubmitEntryController(
    apiClient,
  );
  assert.equal(Object.isFrozen(controller), true);
  assert.deepEqual(controller.getState(), { status: "IDLE" });
  assert.equal(Object.isFrozen(controller.getState()), true);

  const result = await controller.submit(request);
  assert.deepEqual(order, [
    "validateDraft",
    "buildSubmission",
    "buildApiRequest",
    "apiClient.request",
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.eventId, "rent");
  assert.equal(result.response.status, 201);
  assert.deepEqual(controller.getState(), {
    status: "SYNCED",
    eventId: "rent",
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.response), true);
  assert.equal(Object.isFrozen(result.response.headers), true);
  assert.equal(Object.isFrozen(result.response.body), true);
  assert.equal(Object.isFrozen(validationSnapshot), true);
  assert.equal(Object.isFrozen(validationSnapshot.nested), true);
  assert.equal(Object.isFrozen(submissionSnapshot), true);
  assert.equal(Object.isFrozen(contextSnapshot), true);
  assert.equal(Object.isFrozen(contextSnapshot.session), true);
  assert.equal(Object.isFrozen(contextSnapshot.session.user), true);
  assert.equal(Object.isFrozen(contextSnapshot.submission), true);
  assert.equal(Object.isFrozen(apiClient.requests[0]), true);
  assert.equal(Object.isFrozen(apiClient.requests[0].headers), true);
  assert.equal(Object.isFrozen(apiClient.requests[0].body), true);
  assert.deepEqual(draft, {
    value: 7,
    nested: { marker: "original" },
  });
  assert.deepEqual(session, employeeSession());

  draft.value = 99;
  draft.nested.marker = "caller-change";
  session.user.displayName = "caller-change";
  mutableResponse.headers["x-result"] = "transport-change";
  mutableResponse.body.accepted = false;
  assert.equal(validationSnapshot.value, 7);
  assert.equal(validationSnapshot.nested.marker, "original");
  assert.equal(contextSnapshot.session.user.displayName, "Employee Unit");
  assert.equal(result.response.headers["x-result"], "original");
  assert.equal(result.response.body.accepted, true);

  const second = await controller.submit(submitRequest());
  assert.equal(second.ok, true);
  assert.equal(apiClient.requests.length, 2);

  const otherClient = apiClientWith(() => ({
    ok: true,
    response: { status: 204 },
  }));
  const otherController = submitEntryModule.createEmployeeSubmitEntryController(
    otherClient,
  );
  assert.deepEqual(otherController.getState(), { status: "IDLE" });
  await otherController.submit(submitRequest({
    contract: eventContract({ eventId: "expense" }),
  }));
  assert.deepEqual(otherController.getState(), {
    status: "SYNCED",
    eventId: "expense",
  });
  assert.deepEqual(controller.getState(), {
    status: "SYNCED",
    eventId: "rent",
  });
});

test("submit-entry runtime fail-closed contract", async () => {
  const validClient = apiClientWith(() => ({
    ok: true,
    response: { status: 200 },
  }));
  const invalidRequestCases = [
    [null, "INVALID_AUTH_SESSION"],
    [{}, "INVALID_AUTH_SESSION"],
    [submitRequest({ session: null }), "INVALID_AUTH_SESSION"],
    [
      submitRequest({
        session: employeeSession({ role: "OWNER" }),
      }),
      "INVALID_AUTH_SESSION",
    ],
    [submitRequest({ contract: null }), "INVALID_EVENT_CONTRACT"],
    [
      submitRequest({
        contract: eventContract({ eventId: "unknown" }),
      }),
      "INVALID_EVENT_CONTRACT",
    ],
    [
      submitRequest({
        contract: eventContract({ displayName: " " }),
      }),
      "INVALID_EVENT_CONTRACT",
    ],
    [
      submitRequest({
        contract: eventContract({ buildSubmission: undefined }),
      }),
      "INVALID_EVENT_CONTRACT",
    ],
    [submitRequest({ draft: null }), "INVALID_DRAFT"],
    [submitRequest({ draft: [] }), "INVALID_DRAFT"],
    [submitRequest({ draft: new Date() }), "INVALID_DRAFT"],
    [submitRequest({ buildApiRequest: undefined }), "INVALID_REQUEST_BUILDER"],
    [
      { ...submitRequest(), unexpected: true },
      "INVALID_EVENT_CONTRACT",
    ],
  ];
  for (const [request, errorCode] of invalidRequestCases) {
    const controller = submitEntryModule.createEmployeeSubmitEntryController(
      validClient,
    );
    assert.deepEqual(await controller.submit(request), { ok: false, errorCode });
    assert.deepEqual(controller.getState(), {
      status: "ERROR",
      errorCode,
    });
  }

  const invalidClientController =
    submitEntryModule.createEmployeeSubmitEntryController({});
  assert.deepEqual(
    await invalidClientController.submit(submitRequest()),
    { ok: false, errorCode: "INVALID_API_CLIENT" },
  );

  const validationThrow = submitEntryModule.createEmployeeSubmitEntryController(
    validClient,
  );
  assert.deepEqual(
    await validationThrow.submit(submitRequest({
      contract: eventContract({
        validateDraft() {
          throw new Error("private validation detail");
        },
      }),
    })),
    { ok: false, errorCode: "VALIDATION_BLOCKED", eventId: "rent" },
  );

  const invalidIssues = submitEntryModule.createEmployeeSubmitEntryController(
    validClient,
  );
  assert.deepEqual(
    await invalidIssues.submit(submitRequest({
      contract: eventContract({ validateDraft: () => ({}) }),
    })),
    { ok: false, errorCode: "INVALID_EVENT_CONTRACT", eventId: "rent" },
  );

  let blockedBuildCalls = 0;
  const blocked = submitEntryModule.createEmployeeSubmitEntryController(
    validClient,
  );
  assert.deepEqual(
    await blocked.submit(submitRequest({
      contract: eventContract({
        validateDraft: () => [{
          code: "BLOCKED",
          message: "blocked",
          severity: "ERROR",
        }],
        buildSubmission() {
          blockedBuildCalls += 1;
          return {};
        },
      }),
      buildApiRequest() {
        blockedBuildCalls += 1;
        return { method: "POST", path: "/unit-test-submit" };
      },
    })),
    { ok: false, errorCode: "VALIDATION_BLOCKED", eventId: "rent" },
  );
  assert.equal(blockedBuildCalls, 0);

  const buildThrow = submitEntryModule.createEmployeeSubmitEntryController(
    validClient,
  );
  assert.deepEqual(
    await buildThrow.submit(submitRequest({
      contract: eventContract({
        buildSubmission() {
          throw new Error("private build detail");
        },
      }),
    })),
    { ok: false, errorCode: "BUILD_SUBMISSION_FAILED", eventId: "rent" },
  );

  const circular = {};
  circular.self = circular;
  for (const submission of [null, [], () => undefined, new Date(), circular]) {
    const controller = submitEntryModule.createEmployeeSubmitEntryController(
      validClient,
    );
    assert.deepEqual(
      await controller.submit(submitRequest({
        contract: eventContract({ buildSubmission: () => submission }),
      })),
      { ok: false, errorCode: "INVALID_SUBMISSION", eventId: "rent" },
    );
  }

  const requestThrow = submitEntryModule.createEmployeeSubmitEntryController(
    validClient,
  );
  assert.deepEqual(
    await requestThrow.submit(submitRequest({
      buildApiRequest() {
        throw new Error("private request detail");
      },
    })),
    { ok: false, errorCode: "REQUEST_BUILD_FAILED", eventId: "rent" },
  );

  for (
    const builtRequest of [
      {},
      { method: "GET", path: "/unit-test-submit" },
      { method: "POST", path: "https://invalid.example" },
      { method: "POST", path: "//invalid" },
    ]
  ) {
    const controller = submitEntryModule.createEmployeeSubmitEntryController(
      validClient,
    );
    assert.deepEqual(
      await controller.submit(submitRequest({
        buildApiRequest: () => builtRequest,
      })),
      { ok: false, errorCode: "INVALID_API_REQUEST", eventId: "rent" },
    );
  }

  for (
    const failingClient of [
      {
        request() {
          throw new Error("private synchronous detail");
        },
      },
      {
        async request() {
          throw new Error("private rejected detail");
        },
      },
    ]
  ) {
    const controller = submitEntryModule.createEmployeeSubmitEntryController(
      failingClient,
    );
    assert.deepEqual(
      await controller.submit(submitRequest()),
      { ok: false, errorCode: "API_REQUEST_FAILED", eventId: "rent" },
    );
  }

  const apiFailure = submitEntryModule.createEmployeeSubmitEntryController({
    async request() {
      return { ok: false, errorCode: "HTTP_ERROR_STATUS" };
    },
  });
  assert.deepEqual(
    await apiFailure.submit(submitRequest()),
    { ok: false, errorCode: "API_REQUEST_FAILED", eventId: "rent" },
  );

  for (const apiResult of [undefined, {}, { ok: true }, { ok: "yes" }]) {
    const controller = submitEntryModule.createEmployeeSubmitEntryController({
      async request() {
        return apiResult;
      },
    });
    assert.deepEqual(
      await controller.submit(submitRequest()),
      { ok: false, errorCode: "INVALID_API_RESULT", eventId: "rent" },
    );
  }

  const unsafeEcho = submitEntryModule.createEmployeeSubmitEntryController({
    async request() {
      return {
        ok: false,
        errorCode: "HTTP_ERROR_STATUS",
        responseBody: { token: "response-token" },
        requestHeaders: { authorization: "secret-header" },
      };
    },
  });
  const unsafeResult = await unsafeEcho.submit(submitRequest({
    session: employeeSession({ displayName: "private-session-token" }),
    draft: { value: "private-draft-secret" },
  }));
  assert.deepEqual(unsafeResult, {
    ok: false,
    errorCode: "UNSAFE_ERROR_ECHO",
    eventId: "rent",
  });
  assert.doesNotMatch(
    JSON.stringify({ result: unsafeResult, state: unsafeEcho.getState() }),
    /response-token|secret-header|private-session-token|private-draft-secret/u,
  );

  let releaseRequest;
  let firstRequestCount = 0;
  const concurrentClient = {
    request() {
      firstRequestCount += 1;
      return new Promise((resolvePromise) => {
        releaseRequest = resolvePromise;
      });
    },
  };
  const concurrent = submitEntryModule.createEmployeeSubmitEntryController(
    concurrentClient,
  );
  const first = concurrent.submit(submitRequest());
  const second = await concurrent.submit(submitRequest());
  assert.deepEqual(second, {
    ok: false,
    errorCode: "SUBMIT_IN_PROGRESS",
  });
  assert.equal(firstRequestCount, 1);
  assert.deepEqual(concurrent.getState(), {
    status: "SUBMITTING",
    eventId: "rent",
  });
  releaseRequest({ ok: true, response: { status: 200 } });
  assert.equal((await first).ok, true);
  assert.equal(firstRequestCount, 1);
  assert.equal(validClient.requests.length, 0);
});

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(source) {
  const sourcePaths = [
    "auth.ts",
    "api-client.ts",
    "event-contract.ts",
    "submit-entry.ts",
  ];
  const virtualFiles = new Map();
  for (const name of sourcePaths) {
    const path = resolve(employeeNextRoot, "src", "core", name);
    virtualFiles.set(
      `/virtual/${name}`,
      name === "submit-entry.ts"
        ? submitEntrySource
        : requireFromRepository("node:fs").readFileSync(path, "utf8"),
    );
  }
  const fixtureFile = "/virtual/fixture.ts";
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
  host.resolveModuleNames = (moduleNames) => moduleNames.map((moduleName) => {
    const normalized = moduleName.replace(/^\.\//u, "");
    const sourceName = normalized.endsWith(".ts")
      ? normalized
      : `${normalized}.ts`;
    return virtualFiles.has(`/virtual/${sourceName}`)
      ? {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: `/virtual/${sourceName}`,
        }
      : undefined;
  });
  const program = ts.createProgram(
    [...virtualFiles.keys()],
    options,
    host,
  );
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile
    ),
  );
}

test("submit-entry TypeScript semantic fixtures", () => {
  const imports = `
    import {
      createEmployeeSubmitEntryController,
      type EmployeeSubmitEntryController,
      type EmployeeSubmitEntryRequest,
      type EmployeeSubmitEntryRequestBuilder,
      type EmployeeSubmitEntryResult,
      type EmployeeSubmitEntryStatus,
    } from "./submit-entry.ts";
    import type { EmployeeApiClient } from "./api-client.ts";
    import type { EmployeeEventContract } from "./event-contract.ts";
  `;
  const contract = `
    const contract: EmployeeEventContract<{ value: number }, { value: number }> = {
      eventId: "rent",
      displayName: "Unit",
      createInitialDraft: () => ({ value: 0 }),
      validateDraft: () => [],
      buildSubmission: (draft) => ({ value: draft.value }),
    };
  `;
  const request = `
    const request: EmployeeSubmitEntryRequest<{ value: number }, { value: number }> = {
      session: { user: { employeeId: "e", displayName: "E", role: "STAFF" } },
      contract,
      draft: { value: 1 },
      buildApiRequest: (context) => ({
        method: "POST",
        path: "/unit-test-submit",
        body: context.submission,
      }),
    };
  `;
  const positives = [
    `${imports} const value: EmployeeSubmitEntryStatus = "SYNCED"; void value;`,
    `${imports} const value: EmployeeSubmitEntryRequestBuilder<{ value: number }> = (context) => ({ method: "POST", path: "/unit-test-submit", body: context.submission }); void value;`,
    `${imports} ${contract} ${request} void request;`,
    `${imports} declare const client: EmployeeApiClient; const value: EmployeeSubmitEntryController = createEmployeeSubmitEntryController(client); void value;`,
    `${imports} ${contract} ${request} declare const client: EmployeeApiClient; const value: Promise<EmployeeSubmitEntryResult> = createEmployeeSubmitEntryController(client).submit(request); void value;`,
    `${imports} ${contract} void contract;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeSubmitEntryStatus = "UNKNOWN";`, /UNKNOWN/u],
    [`${imports} ${contract} const value: EmployeeSubmitEntryRequest<{ value: number }, { value: number }> = { contract, draft: { value: 1 }, buildApiRequest: () => ({ method: "POST", path: "/unit-test-submit" }) };`, /session/u],
    [`${imports} ${contract} const value: EmployeeSubmitEntryRequest<{ value: number }, { value: number }> = { session: { user: { employeeId: "e", displayName: "E", role: "OWNER" } }, contract, draft: { value: 1 }, buildApiRequest: () => ({ method: "POST", path: "/unit-test-submit" }) };`, /EmployeeAuthRole|not assignable/u],
    [`${imports} const contract: EmployeeEventContract<{ value: number }, { value: number }> = { eventId: "rent", displayName: "Unit", createInitialDraft: () => ({ value: 0 }), validateDraft: () => [] };`, /buildSubmission/u],
    [`${imports} const contract: EmployeeEventContract<{ value: number }, { value: number }> = { eventId: "rent", displayName: "Unit", createInitialDraft: () => ({ value: 0 }), validateDraft: async () => [], buildSubmission: (draft) => ({ value: draft.value }) };`, /Promise/u],
    [`${imports} ${contract} const value: EmployeeSubmitEntryRequest<{ value: number }, { value: number }> = { session: { user: { employeeId: "e", displayName: "E", role: "STAFF" } }, contract, draft: null, buildApiRequest: () => ({ method: "POST", path: "/unit-test-submit" }) };`, /null/u],
    [`${imports} const value: EmployeeSubmitEntryRequestBuilder = () => ({});`, /EmployeeApiRequest/u],
    [`${imports} const value: EmployeeSubmitEntryRequestBuilder = () => ({ method: "GET", path: "/unit-test-submit" }); const post: "POST" = value({} as never).method;`, /GET/u],
    [`${imports} const value: EmployeeApiClient = {};`, /request/u],
    [`${imports} const value: EmployeeApiClient = { request() { return { ok: true, response: { status: 200 } }; } };`, /Promise/u],
    [`${imports} declare const result: EmployeeSubmitEntryResult; const response = result.response;`, /response/u],
    [`${imports} declare const value: string; const status: EmployeeSubmitEntryStatus = value;`, /string/u],
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

test("submit-entry source boundary excludes integrations and business rules", () => {
  assert.match(submitEntrySource, /from "\.\/auth"/u);
  assert.match(submitEntrySource, /from "\.\/api-client"/u);
  assert.match(submitEntrySource, /from "\.\/event-contract"/u);
  assert.doesNotMatch(
    submitEntrySource,
    /from "\.\/(?:draft-store|event-registry)"|from "\.\.\/(?:events|ui)\//u,
  );
  assert.doesNotMatch(
    submitEntrySource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document|window|navigator|cookieStore|setTimeout|setInterval)\b/u,
  );
  assert.doesNotMatch(
    submitEntrySource,
    /\/api\/|https?:|workers\.dev|cloudflare/u,
  );
  assert.doesNotMatch(
    submitEntrySource,
    /\b(?:rent_amount|paid_amount|cash|bank|remaining_arrears|arrears_ref|deposit_in|deposit_out|checkout|refund|expense_category|receipt|bed_transfer|from_bed|to_bed|tenant_card|ttlock|finance|owner|canonical|stay_action)\b/iu,
  );
  assert.doesNotMatch(submitEntrySource, /\bany\b/u);
  assert.doesNotMatch(submitEntrySource, /^var\b/mu);
  assert.doesNotMatch(
    submitEntrySource,
    /\bdefaultController\b|\bsingleton\b/u,
  );
});
