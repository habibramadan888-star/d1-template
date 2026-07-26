import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const submitFlowPath = resolve(employeeNextRoot, "src", "submit-flow.ts");
const eventsIndexPath = resolve(employeeNextRoot, "src", "events", "index.ts");
const eventRegistryPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "event-registry.ts",
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
const submitFlowSource = await readFile(submitFlowPath, "utf8");

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

const flowRuntime = await loadRuntime(submitFlowPath);
const eventsRuntime = await loadRuntime(eventsIndexPath);
const registryRuntime = await loadRuntime(eventRegistryPath);

const expectedEventIds = Object.freeze([
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
]);
const expectedErrorCodes = Object.freeze([
  "INVALID_API_CLIENT",
  "INVALID_REGISTRY",
  "INVALID_REQUEST",
  "UNKNOWN_EVENT",
  "INVALID_REQUEST_BUILDER",
  "SUBMIT_ENTRY_FAILED",
  "SUBMIT_IN_PROGRESS",
  "UNSAFE_ERROR_ECHO",
]);
const session = {
  user: {
    employeeId: "LOCAL-019",
    displayName: "Local Staff",
    role: "STAFF",
  },
};

function validDrafts() {
  return {
    rent: {
      bedLabel: "A-101",
      amountDueAed: 1_000,
      amountReceivedAed: 1_000,
      paymentMethod: "cash",
      cashReceivedAed: 1_000,
      bankReceivedAed: 0,
      shortPaymentMode: "none",
      promiseDate: "",
      note: "",
    },
    "arrears-payment": {
      bedLabel: "B-201",
      cloudArrearsRef: "AR-LOCAL-019",
      remainingArrearsAed: 250,
      amountReceivedAed: 250,
      paymentMethod: "cash",
      cashReceivedAed: 250,
      bankReceivedAed: 0,
      repaymentDate: "2026-07-26",
      note: "",
    },
    "deposit-in": {
      bedLabel: "B-301",
      depositAmountAed: 500,
      paymentMethod: "cash",
      cashReceivedAed: 500,
      bankReceivedAed: 0,
      depositReceivedDate: "2026-07-26",
      currentDepositSnapshotAed: null,
      note: "",
    },
    "deposit-out": {
      bedLabel: "B-401",
      currentDepositSnapshotAed: 500,
      refundAmountAed: 500,
      refundMethod: "cash",
      cashRefundedAed: 500,
      bankRefundedAed: 0,
      refundDate: "2026-07-26",
      differenceReason: "",
      note: "",
    },
    checkout: {
      bedLabel: "B-501",
      checkoutDate: "2026-07-26",
      checkoutMode: "normal",
      currentDepositSnapshotAed: 500,
      depositRefundAed: 500,
      depositDifferenceReason: "",
      outstandingArrearsSnapshotAed: 0,
      cloudArrearsRef: "",
      formerCustomerName: "",
      formerCustomerPhone: "",
      contactMethod: "",
      contactNote: "",
      belongingsHeld: false,
      belongingsNote: "",
      promisedPaymentDate: "",
      promisedReturnDate: "",
      finalNote: "",
    },
    expense: {
      expenseDate: "2026-07-26",
      expenseCategory: "maintenance",
      expenseAmountAed: 125,
      paymentMethod: "cash",
      cashPaidAed: 125,
      bankPaidAed: 0,
      expenseScope: "general",
      apartmentLabel: "",
      bedLabel: "",
      vendorName: "Local vendor",
      paidBy: "",
      expenseDescription: "Repair supplies",
      receiptAvailable: false,
      receiptNote: "",
      finalNote: "",
    },
    "bed-transfer": {
      fromBed: "144",
      toBed: "122",
      transferDate: "2026-07-26",
      transferReason: "Local flow",
      companyScope: "homelink",
      sourceAccessSnapshot: {
        bedLabel: "144",
        companyScope: "homelink",
        snapshotAvailable: true,
        snapshotStale: false,
        snapshotAmbiguous: false,
        physicalBedStatus: "occupied",
        physicalBedStatusSource: "access_snapshot_no_E",
        parsedVacancyMarker: false,
        depositSnapshotAed: 500,
        depositSource: "access_snapshot_D",
        depositAmbiguous: false,
        firstStayMmdd: "0715",
        firstStayMmddConfirmed: true,
        rentCoverageStart: "2026-07-15",
        rentCoverageEnd: "2026-08-14",
        openArrears: [],
      },
      targetAccessSnapshot: {
        bedLabel: "122",
        companyScope: "homelink",
        snapshotAvailable: true,
        snapshotStale: false,
        snapshotAmbiguous: false,
        physicalBedStatus: "vacant",
        physicalBedStatusSource: "access_snapshot_E_marker",
        parsedVacancyMarker: true,
        depositSnapshotAed: null,
        depositSource: "unknown",
        depositAmbiguous: false,
        firstStayMmdd: "",
        firstStayMmddConfirmed: false,
        rentCoverageStart: "",
        rentCoverageEnd: "",
        openArrears: [],
      },
      arrearsCarryoverAccepted: false,
      cloudArrearsRef: "",
      carriedArrearsAmountAed: null,
      transferFeeMode: "paid",
      transferFeeAmountAed: 50,
      transferFeePaymentMethod: "cash",
      transferFeeDueDate: "",
      transferFeeWaiverReason: "",
      bedPriceDifferenceMode: "none",
      bedPriceDifferenceAmountAed: 0,
      bedPriceDifferencePaymentMethod: "none",
      bedPriceDifferenceDueDate: "",
      bedPriceDifferenceReason: "",
      finalNote: "",
    },
  };
}

function successApiClient(observations = undefined, response = undefined) {
  return {
    async request(request) {
      observations?.push(request);
      return {
        ok: true,
        response: response ?? { status: 200, body: { accepted: true } },
      };
    },
  };
}

function makeRequest(eventId = "rent", overrides = {}) {
  return {
    session,
    eventId,
    draft: validDrafts()[eventId] ?? validDrafts().rent,
    buildApiRequest(context) {
      return {
        method: "POST",
        path: "/unit-test-submit-flow",
        body: context.submission,
      };
    },
    ...overrides,
  };
}

function stubContract(eventId, overrides = {}) {
  return Object.freeze({
    eventId,
    displayName: `Local ${eventId}`,
    createInitialDraft() {
      return {};
    },
    validateDraft() {
      return [];
    },
    buildSubmission(draft) {
      return { eventId, draft };
    },
    ...overrides,
  });
}

function stubRegistry(overrides = {}) {
  const contracts = expectedEventIds.map((eventId) => (
    eventId === "rent"
      ? stubContract(eventId, overrides)
      : stubContract(eventId)
  ));
  return registryRuntime.createEmployeeEventRegistry(contracts);
}

function assertSafeFailure(result, expectedCode) {
  assert.deepEqual(
    Object.keys(result).sort(),
    result.eventId === undefined
      ? ["errorCode", "ok"]
      : ["errorCode", "eventId", "ok"],
  );
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, expectedCode);
  assert.ok(Object.isFrozen(result));
  assert.doesNotMatch(
    JSON.stringify(result),
    /secret-value|customer-value|header-value|payload-value|raw-value/u,
  );
}

function diagnosticText(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function semanticDiagnosticsFor(fixtureSource) {
  const fixtureFile = resolve(employeeNextRoot, "tests", "virtual-019-fixture.ts");
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
        && moduleName === "../src/submit-flow.ts"
      ) {
        return {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: submitFlowPath,
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
    [submitFlowPath, fixtureFile],
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

test("submit-flow runtime success covers all seven real event contracts", async () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };
  const apiRequests = [];
  const contexts = [];
  const mutableResponse = { status: 200, body: { accepted: true } };
  const controller = flowRuntime.createEmployeeSubmitFlowController({
    apiClient: successApiClient(apiRequests, mutableResponse),
  });

  check(() => assert.deepEqual(Object.keys(flowRuntime).sort(), [
    "EMPLOYEE_SUBMIT_FLOW_ERROR_CODES",
    "createEmployeeSubmitFlowController",
    "isEmployeeSubmitFlowRequest",
  ]));
  check(() => assert.deepEqual(
    flowRuntime.EMPLOYEE_SUBMIT_FLOW_ERROR_CODES,
    expectedErrorCodes,
  ));
  check(() => assert.equal(
    Object.isFrozen(flowRuntime.EMPLOYEE_SUBMIT_FLOW_ERROR_CODES),
    true,
  ));
  check(() => assert.equal(Object.isFrozen(controller), true));
  check(() => assert.deepEqual(controller.getState(), { status: "IDLE" }));
  check(() => assert.deepEqual(controller.getEventIds(), expectedEventIds));
  check(() => assert.equal(Object.isFrozen(controller.getEventIds()), true));

  const requestSnapshots = [];
  const results = [];
  for (const eventId of expectedEventIds) {
    const request = makeRequest(eventId, {
      buildApiRequest(context) {
        contexts.push(context);
        assert.equal(Object.isFrozen(context), true);
        assert.equal(Object.isFrozen(context.session), true);
        assert.equal(Object.isFrozen(context.session.user), true);
        assert.equal(Object.isFrozen(context.submission), true);
        return {
          method: "POST",
          path: "/unit-test-submit-flow",
          body: context.submission,
        };
      },
    });
    requestSnapshots.push(structuredClone({
      session: request.session,
      eventId: request.eventId,
      draft: request.draft,
    }));
    assert.equal(flowRuntime.isEmployeeSubmitFlowRequest(request), true);
    const result = await controller.submit(request);
    assert.equal(result.ok, true, eventId);
    assert.equal(result.eventId, eventId);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.response), true);
    results.push(result);
    successCases += 1;
  }

  check(() => assert.equal(apiRequests.length, 7));
  check(() => assert.equal(contexts.length, 7));
  check(() => assert.deepEqual(
    expectedEventIds.map((eventId, index) => ({
      session: session,
      eventId,
      draft: validDrafts()[eventId],
    })),
    requestSnapshots,
  ));
  mutableResponse.body.accepted = false;
  check(() => assert.equal(results[0].response.body.accepted, true));
  const repeated = await controller.submit(makeRequest("rent"));
  check(() => assert.equal(repeated.ok, true));

  const secondController = flowRuntime.createEmployeeSubmitFlowController({
    apiClient: successApiClient(),
  });
  check(() => assert.notEqual(controller, secondController));
  check(() => assert.notEqual(
    controller.getEventIds(),
    secondController.getEventIds(),
  ));
  check(() => assert.deepEqual(secondController.getState(), { status: "IDLE" }));
  check(() => assert.equal(results.every((result) => Object.isFrozen(result)), true));
  check(() => assert.equal(Object.isFrozen(controller.getState()), true));

  const order = [];
  const orderController = flowRuntime.createEmployeeSubmitFlowController({
    apiClient: {
      async request() {
        order.push("apiClient.request");
        return { ok: true, response: { status: 200 } };
      },
    },
    registry: stubRegistry({
      validateDraft() {
        order.push("validateDraft");
        return [];
      },
      buildSubmission() {
        order.push("buildSubmission");
        return { accepted: true };
      },
    }),
  });
  const orderResult = await orderController.submit(makeRequest("rent", {
    buildApiRequest() {
      order.push("buildApiRequest");
      return { method: "POST", path: "/unit-test-submit-flow" };
    },
  }));
  check(() => assert.equal(orderResult.ok, true));
  check(() => assert.deepEqual(order, [
    "validateDraft",
    "buildSubmission",
    "buildApiRequest",
    "apiClient.request",
  ]));
  assert.equal(successCases, 26);
});

test("submit-flow runtime fails closed without unsafe echoes", async () => {
  const validRegistry = eventsRuntime.createEmployeeSevenEventRegistry();
  const firstSix = validRegistry.contracts.slice(0, 6);
  const missingRegistry = Object.freeze({
    eventIds: Object.freeze(expectedEventIds.slice(0, 6)),
    contracts: Object.freeze(firstSix),
    get(value) {
      return firstSix.find(({ eventId }) => eventId === value);
    },
  });
  const duplicateContracts = [
    ...validRegistry.contracts.slice(0, 6),
    validRegistry.contracts[0],
  ];
  const duplicateRegistry = Object.freeze({
    eventIds: Object.freeze([...expectedEventIds.slice(0, 6), "rent"]),
    contracts: Object.freeze(duplicateContracts),
    get(value) {
      return duplicateContracts.find(({ eventId }) => eventId === value);
    },
  });
  const validationIssue = Object.freeze({
    code: "LOCAL_VALIDATION_BLOCK",
    message: "Local validation blocked",
    severity: "ERROR",
  });

  const cases = [
    {
      controller: flowRuntime.createEmployeeSubmitFlowController({
        apiClient: {},
      }),
      request: makeRequest(),
      expected: "INVALID_API_CLIENT",
    },
    {
      controller: flowRuntime.createEmployeeSubmitFlowController({
        apiClient: successApiClient(),
        registry: {},
      }),
      request: makeRequest(),
      expected: "INVALID_REGISTRY",
    },
    {
      controller: flowRuntime.createEmployeeSubmitFlowController({
        apiClient: successApiClient(),
        registry: missingRegistry,
      }),
      request: makeRequest(),
      expected: "INVALID_REGISTRY",
    },
    {
      controller: flowRuntime.createEmployeeSubmitFlowController({
        apiClient: successApiClient(),
        registry: duplicateRegistry,
      }),
      request: makeRequest(),
      expected: "INVALID_REGISTRY",
    },
    { request: null, expected: "INVALID_REQUEST" },
    {
      request: {
        eventId: "rent",
        draft: validDrafts().rent,
        buildApiRequest() {
          return { method: "POST", path: "/unit-test-submit-flow" };
        },
      },
      expected: "INVALID_REQUEST",
    },
    {
      request: makeRequest("rent", { session: { user: {} } }),
      expected: "INVALID_REQUEST",
    },
    {
      request: {
        session,
        draft: validDrafts().rent,
        buildApiRequest() {
          return { method: "POST", path: "/unit-test-submit-flow" };
        },
      },
      expected: "INVALID_REQUEST",
    },
    { request: makeRequest("unknown"), expected: "UNKNOWN_EVENT" },
    { request: makeRequest("bed_transfer"), expected: "UNKNOWN_EVENT" },
    { request: makeRequest("rent "), expected: "UNKNOWN_EVENT" },
    { request: makeRequest("rent", { draft: null }), expected: "INVALID_REQUEST" },
    { request: makeRequest("rent", { draft: [] }), expected: "INVALID_REQUEST" },
    {
      request: { ...makeRequest(), extra: "payload-value" },
      expected: "INVALID_REQUEST",
    },
    {
      request: makeRequest("rent", { buildApiRequest: undefined }),
      expected: "INVALID_REQUEST_BUILDER",
    },
    {
      request: makeRequest("rent", {
        buildApiRequest() {
          throw new Error("raw-value");
        },
      }),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      request: makeRequest("rent", {
        buildApiRequest() {
          return { method: "GET", path: "/unit-test-submit-flow" };
        },
      }),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      request: makeRequest("rent", {
        buildApiRequest() {
          return { method: "POST", path: "https://invalid.local" };
        },
      }),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      request: makeRequest("rent", {
        buildApiRequest() {
          return { method: "POST", path: "//invalid-local" };
        },
      }),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      registry: stubRegistry({
        validateDraft() {
          return [validationIssue];
        },
      }),
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      registry: stubRegistry({
        validateDraft() {
          throw new Error("raw-value");
        },
      }),
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      registry: stubRegistry({
        buildSubmission() {
          throw new Error("raw-value");
        },
      }),
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      registry: stubRegistry({
        buildSubmission() {
          return { unsafe: 1n };
        },
      }),
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      apiClient: {
        async request() {
          throw new Error("raw-value");
        },
      },
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      apiClient: {
        request() {
          return Promise.reject(new Error("raw-value"));
        },
      },
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      apiClient: {
        async request() {
          return { ok: false, errorCode: "TRANSPORT_FAILED" };
        },
      },
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      apiClient: {
        async request() {
          return { ok: true, response: null };
        },
      },
      request: makeRequest(),
      expected: "SUBMIT_ENTRY_FAILED",
    },
    {
      apiClient: {
        async request() {
          return {
            ok: false,
            errorCode: "TRANSPORT_FAILED",
            body: { detail: "raw-value" },
          };
        },
      },
      request: makeRequest(),
      expected: "UNSAFE_ERROR_ECHO",
    },
  ];

  let failClosedCases = 0;
  for (const scenario of cases) {
    const controller = scenario.controller
      ?? flowRuntime.createEmployeeSubmitFlowController({
        apiClient: scenario.apiClient ?? successApiClient(),
        ...(scenario.registry === undefined
          ? {}
          : { registry: scenario.registry }),
      });
    const result = await controller.submit(scenario.request);
    assertSafeFailure(result, scenario.expected);
    assert.equal(Object.isFrozen(controller.getState()), true);
    failClosedCases += 1;
  }

  let release;
  const pending = new Promise((resolvePending) => {
    release = resolvePending;
  });
  const concurrentController = flowRuntime.createEmployeeSubmitFlowController({
    apiClient: {
      async request() {
        return pending;
      },
    },
  });
  const first = concurrentController.submit(makeRequest());
  const second = await concurrentController.submit(makeRequest());
  assertSafeFailure(second, "SUBMIT_IN_PROGRESS");
  release({ ok: true, response: { status: 200 } });
  assert.equal((await first).ok, true);
  failClosedCases += 1;

  assert.equal(failClosedCases, 29);
});

test("submit-flow TypeScript semantic fixtures", () => {
  const shared = `
    import {
      EMPLOYEE_SUBMIT_FLOW_ERROR_CODES,
      createEmployeeSubmitFlowController,
    } from "../src/submit-flow.ts";
    import type {
      EmployeeSubmitFlowController,
      EmployeeSubmitFlowErrorCode,
      EmployeeSubmitFlowRequest,
      EmployeeSubmitFlowRequestBuilder,
      EmployeeSubmitFlowResult,
    } from "../src/submit-flow.ts";
    const session = {
      user: { employeeId: "E-1", displayName: "Local", role: "STAFF" as const },
    };
    const apiClient = {
      async request() {
        return { ok: false as const, errorCode: "TRANSPORT_FAILED" as const };
      },
    };
    const builder: EmployeeSubmitFlowRequestBuilder = () => ({
      method: "POST",
      path: "/local",
    });
  `;
  const positives = [
    `${shared} const value: EmployeeSubmitFlowController =
      createEmployeeSubmitFlowController({ apiClient }); void value;`,
    `${shared} const value: Promise<EmployeeSubmitFlowResult> =
      createEmployeeSubmitFlowController({ apiClient }).submit({
        session, eventId: "rent", draft: {}, buildApiRequest: builder,
      }); void value;`,
    `${shared} const value: EmployeeSubmitFlowRequestBuilder = builder;
      void value;`,
    `${shared} const value: EmployeeSubmitFlowRequest = {
      session, eventId: "rent", draft: {}, buildApiRequest: builder,
    }; void value;`,
    `${shared} const value: readonly string[] =
      createEmployeeSubmitFlowController({ apiClient }).getEventIds();
      void value;`,
    `${shared} const value: readonly EmployeeSubmitFlowErrorCode[] =
      EMPLOYEE_SUBMIT_FLOW_ERROR_CODES; void value;`,
    `${shared} declare const result: EmployeeSubmitFlowResult;
      if (result.ok) { const status: number = result.response.status; void status; }`,
    `${shared} declare const result: EmployeeSubmitFlowResult;
      if (!result.ok) { const code: EmployeeSubmitFlowErrorCode =
        result.errorCode; void code; }`,
  ];
  positives.forEach((source, index) => {
    assertSemanticPass(source, `positive fixture ${index + 1}`);
  });

  const negatives = [
    [2741, "session", `${shared} const value: EmployeeSubmitFlowRequest = {
      eventId: "rent", draft: {}, buildApiRequest: builder,
    }; void value;`],
    [2741, "eventId", `${shared} const value: EmployeeSubmitFlowRequest = {
      session, draft: {}, buildApiRequest: builder,
    }; void value;`],
    [2741, "draft", `${shared} const value: EmployeeSubmitFlowRequest = {
      session, eventId: "rent", buildApiRequest: builder,
    }; void value;`],
    [2741, "buildApiRequest", `${shared} const value: EmployeeSubmitFlowRequest = {
      session, eventId: "rent", draft: {},
    }; void value;`],
    [2322, "not assignable", `${shared}
      const value: EmployeeSubmitFlowRequestBuilder = () => ({
        method: "PATCH", path: "/local",
      }); void value;`],
    [2741, "request", `${shared}
      import type { EmployeeApiClient } from "../src/core/api-client.ts";
      const value: EmployeeApiClient = {}; void value;`],
    [2739, "eventIds", `${shared}
      import type { EmployeeEventRegistry } from "../src/core/event-registry.ts";
      const value: EmployeeEventRegistry = { get() { return undefined; } };
      void value;`],
    [2339, "push", `${shared}
      createEmployeeSubmitFlowController({ apiClient }).getEventIds().push("rent");`],
    [2540, "read-only property", `${shared}
      EMPLOYEE_SUBMIT_FLOW_ERROR_CODES[0] = "INVALID_REQUEST";`],
    [2339, "response", `${shared} declare const result: EmployeeSubmitFlowResult;
      const value = result.response; void value;`],
    [2339, "errorCode", `${shared} declare const result: EmployeeSubmitFlowResult;
      const value = result.errorCode; void value;`],
    [2322, "not assignable", `${shared}
      const value: EmployeeSubmitFlowErrorCode = "OTHER"; void value;`],
    [2741, "request", `${shared}
      import type { EmployeeApiClient } from "../src/core/api-client.ts";
      const value: EmployeeApiClient =
        createEmployeeSubmitFlowController({ apiClient }); void value;`],
    [2322, "not assignable", `${shared}
      import type { EmployeeSubmitEntryController } from "../src/core/submit-entry.ts";
      const value: EmployeeSubmitEntryController =
        createEmployeeSubmitFlowController({ apiClient }); void value;`],
  ];
  negatives.forEach(([code, text, source], index) => {
    assertSemanticReject(source, code, text, `negative fixture ${index + 1}`);
  });
});

test("submit-flow source boundary stays local and injected", () => {
  const imports = [
    ...submitFlowSource.matchAll(/from\s+["']([^"']+)["']/gu),
  ].map((match) => match[1]);
  assert.deepEqual([...new Set(imports)].sort(), [
    "./core/api-client",
    "./core/auth",
    "./core/event-contract",
    "./core/event-registry",
    "./core/submit-entry",
    "./events",
  ].sort());
  assert.match(submitFlowSource, /\bcreateEmployeeSevenEventRegistry\(\)/u);
  assert.match(
    submitFlowSource,
    /\bcreateEmployeeSubmitEntryController\(/u,
  );
  assert.doesNotMatch(
    submitFlowSource,
    /\.\/events\/(?:rent|arrears-payment|deposit-in|deposit-out|checkout|expense|bed-transfer)/u,
  );
  assert.doesNotMatch(
    submitFlowSource,
    /draft-store|\.\.?\/ui|\.\/main|worker|owner|finance|canonical|ttlock|cloud\s*arrears/iu,
  );
  assert.doesNotMatch(
    submitFlowSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|window|document|localStorage|sessionStorage|indexedDB|cookie|setTimeout|setInterval|process\.env)\b/u,
  );
  assert.doesNotMatch(
    submitFlowSource,
    /\/api\/|https?:|event_type|authorization|headers\s*:|token|idempotency|provider|card[_ ]?id|ttlock[_ ]?id|whatsapp/iu,
  );
  assert.doesNotMatch(
    submitFlowSource,
    /\bvar\b|defaultController|defaultRegistry|new\s+(?:Map|Set)\b|\.(?:add|remove|replace|set|clear|register)\s*\(/u,
  );
});
