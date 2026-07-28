import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const sourceRoot = resolve(employeeNextRoot, "src");
const routePath = resolve(sourceRoot, "route.ts");
const rentPath = resolve(sourceRoot, "events", "rent", "index.ts");
const depositInPath = resolve(sourceRoot, "events", "deposit-in", "index.ts");
const expensePath = resolve(sourceRoot, "events", "expense", "index.ts");
const mainPath = resolve(sourceRoot, "main.ts");
const indexPath = resolve(employeeNextRoot, "index.html");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");

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

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path));
    } else {
      files.push(path);
    }
  }
  return files.sort();
}

const routeRuntime = await loadRuntime(routePath);
const rentRuntime = await loadRuntime(rentPath);
const depositInRuntime = await loadRuntime(depositInPath);
const expenseRuntime = await loadRuntime(expensePath);
const expectedEventIds = Object.freeze([
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
]);
const session = Object.freeze({
  user: Object.freeze({
    employeeId: "LOCAL-EMPLOYEE-021",
    displayName: "Local Employee",
    role: "STAFF",
  }),
});

function validDrafts() {
  return {
    rent: {
      bedLabel: "A-101",
      rentPeriodStart: "2026-07-01",
      rentPeriodEnd: "2026-08-01",
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
      cloudArrearsRef: "AR-LOCAL-021",
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
      depositRequiredTotalAed: 1_000,
      currentDepositSnapshotAed: 100,
      note: "Existing synthetic deposit snapshot confirmed",
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
      openArrears: [],
      openArrearsTotalAed: 0,
      openArrearsSnapshotComplete: true,
      openArrearsSummary: "No open arrears.",
      arrearsNonRepaymentReason: "",
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
      targetRoom: "LOCAL-APARTMENT-021",
      expenseAmountAed: 125,
      paymentMethod: "cash",
      cashPaidAed: 125,
      bankPaidAed: 0,
      expenseDescription: "Repair supplies",
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

function requestBuilder() {
  return (context) => ({
    method: "POST",
    path: "/unit-test-local-isolation",
    body: {
      eventId: context.eventId,
      submission: context.submission,
    },
  });
}

function options(overrides = {}) {
  return {
    transport: {
      async request() {
        return { status: 200, body: { accepted: true } };
      },
    },
    render: { render() {} },
    buildApiRequest: requestBuilder(),
    ...overrides,
  };
}

function assertSafeFailure(result, expectedCode) {
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, expectedCode);
  assert.deepEqual(Object.keys(result).sort(), ["errorCode", "ok", "view"]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.view), true);
  assert.doesNotMatch(
    JSON.stringify(result),
    /token|authorization|cookie|password|secret|bearer|workers\.dev|habibramadan888|stack trace/iu,
  );
}

test("local-isolation bootstrap requires explicit injected ports and session", async () => {
  assert.deepEqual(Object.keys(routeRuntime).sort(), [
    "EMPLOYEE_NEXT_ROUTE_ERROR_CODES",
    "createEmployeeNextRouteController",
    "isEmployeeNextRouteOptions",
  ]);

  for (const [value, code] of [
    [undefined, "INVALID_OPTIONS"],
    [{}, "INVALID_RENDER_PORT"],
    [{ render: { render() {} } }, "INVALID_API_TRANSPORT"],
  ]) {
    const controller = routeRuntime.createEmployeeNextRouteController(value);
    assertSafeFailure(controller.selectEvent("rent"), code);
  }

  const rendered = [];
  const requests = [];
  const controller = routeRuntime.createEmployeeNextRouteController(options({
    render: { render(view) { rendered.push(view); } },
    transport: {
      async request(request) {
        requests.push(request);
        return { status: 200, body: { accepted: true } };
      },
    },
  }));
  assert.deepEqual(controller.getEventIds(), expectedEventIds);
  assertSafeFailure(await controller.submit(), "ROUTE_NOT_READY");
  assert.equal(controller.setSession(session).ok, true);
  assert.equal((await controller.render()).ok, true);
  assert.equal(rendered.length, 1);
  assert.equal(requests.length, 0);
  assert.equal(Object.isFrozen(controller), true);
});

test("local-isolation seven-event flow uses only injected local POST transport", async () => {
  const requests = [];
  const mutableDrafts = validDrafts();
  const controller = routeRuntime.createEmployeeNextRouteController(options({
    transport: {
      async request(request) {
        requests.push(request);
        return { status: 200, body: { accepted: true } };
      },
    },
  }));
  assert.equal(controller.setSession(session).ok, true);

  for (const eventId of expectedEventIds) {
    assert.equal(controller.selectEvent(eventId).ok, true);
    const draft = mutableDrafts[eventId];
    const before = structuredClone(draft);
    assert.equal(controller.setDraft(draft).ok, true);
    const result = await controller.submit();
    assert.equal(result.ok, true, eventId);
    assert.equal(result.view.state.status, "SYNCED", eventId);
    assert.equal(result.view.state.eventId, eventId);
    assert.deepEqual(draft, before, `${eventId}: input mutated`);
    assert.equal(Object.isFrozen(result.view), true);
    assert.equal(Object.isFrozen(result.view.shell), true);
  }

  assert.equal(requests.length, 7);
  assert.deepEqual(requests.map((request) => request.body.eventId), expectedEventIds);
  for (const request of requests) {
    assert.equal(request.method, "POST");
    assert.equal(request.path, "/unit-test-local-isolation");
    assert.equal(Object.isFrozen(request), true);
  }
});

test("local-isolation failures stay closed, isolated and safely summarized", async () => {
  for (const value of ["unknown", "bed_transfer", "rent "]) {
    const controller = routeRuntime.createEmployeeNextRouteController(options());
    assertSafeFailure(
      controller.selectEvent(value),
      "INVALID_EVENT_SELECTION",
    );
  }

  for (const value of [null, {}, { user: { role: "OWNER" } }]) {
    const controller = routeRuntime.createEmployeeNextRouteController(options());
    assertSafeFailure(controller.setSession(value), "INVALID_AUTH_SESSION");
  }

  const invalidTransport = routeRuntime.createEmployeeNextRouteController(
    options({ transport: { request: "not-a-function" } }),
  );
  assertSafeFailure(invalidTransport.selectEvent("rent"), "INVALID_API_TRANSPORT");

  for (const render of [
    { render() { throw new Error("private-value"); } },
    { render() { return Promise.reject(new Error("private-value")); } },
  ]) {
    const controller = routeRuntime.createEmployeeNextRouteController(
      options({ render }),
    );
    assertSafeFailure(await controller.render(), "RENDER_FAILED");
  }

  const echoController = routeRuntime.createEmployeeNextRouteController(
    options({ render: { render() { return "private-value"; } } }),
  );
  assertSafeFailure(await echoController.render(), "UNSAFE_ERROR_ECHO");

  const validationCases = [
    {
      eventId: "rent",
      contract: rentRuntime.createEmployeeRentEventContract(),
      draft: { ...validDrafts().rent, rentPeriodStart: "" },
      expectedValidationCode: "RENT_PERIOD_START_REQUIRED",
    },
    {
      eventId: "deposit-in",
      contract: depositInRuntime.createEmployeeDepositInEventContract(),
      draft: { ...validDrafts()["deposit-in"], depositRequiredTotalAed: null },
      expectedValidationCode: "DEPOSIT_IN_REQUIRED_TOTAL_REQUIRED",
    },
    {
      eventId: "deposit-in",
      contract: depositInRuntime.createEmployeeDepositInEventContract(),
      draft: {
        ...validDrafts()["deposit-in"],
        depositRequiredTotalAed: 550,
      },
      expectedValidationCode: "DEPOSIT_IN_OVERPAYMENT_UNSUPPORTED",
    },
    {
      eventId: "expense",
      contract: expenseRuntime.createEmployeeExpenseEventContract(),
      draft: { ...validDrafts().expense, expenseScope: "general" },
      expectedValidationCode: "EXPENSE_PROVIDER_IDENTITY_FORBIDDEN",
    },
    {
      eventId: "expense",
      contract: expenseRuntime.createEmployeeExpenseEventContract(),
      draft: {
        ...validDrafts().expense,
        paymentMethod: "mixed",
        cashPaidAed: 50,
        bankPaidAed: 75,
      },
      expectedValidationCode: "EXPENSE_PAYMENT_METHOD_INVALID",
    },
  ];
  for (const validationCase of validationCases) {
    const requests = [];
    const controller = routeRuntime.createEmployeeNextRouteController(options({
      transport: {
        async request(request) {
          requests.push(request);
          return { status: 200, body: { accepted: true } };
        },
      },
    }));
    assert.ok(
      validationCase.contract
        .validateDraft(validationCase.draft)
        .some(({ code }) => code === validationCase.expectedValidationCode),
      validationCase.expectedValidationCode,
    );
    assert.equal(controller.selectEvent(validationCase.eventId).ok, true);
    assert.equal(controller.setSession(session).ok, true);
    assert.equal(controller.setDraft(validationCase.draft).ok, true);
    assertSafeFailure(await controller.submit(), "SUBMIT_FLOW_FAILED");
    assert.equal(requests.length, 0, validationCase.expectedValidationCode);
  }

  const failedSubmit = routeRuntime.createEmployeeNextRouteController(options({
    transport: { request() { throw new Error("private-value"); } },
  }));
  failedSubmit.selectEvent("rent");
  failedSubmit.setSession(session);
  const mutableDraft = validDrafts().rent;
  failedSubmit.setDraft(mutableDraft);
  mutableDraft.note = "changed-after-snapshot";
  assertSafeFailure(await failedSubmit.submit(), "SUBMIT_FLOW_FAILED");

  let release;
  const waiting = new Promise((resolvePromise) => { release = resolvePromise; });
  const concurrent = routeRuntime.createEmployeeNextRouteController(options({
    transport: {
      async request() {
        await waiting;
        return { status: 200, body: { accepted: true } };
      },
    },
  }));
  concurrent.selectEvent("rent");
  concurrent.setSession(session);
  concurrent.setDraft(validDrafts().rent);
  const first = concurrent.submit();
  assertSafeFailure(await concurrent.submit(), "SUBMIT_FLOW_FAILED");
  release();
  assert.equal((await first).ok, true);

  const firstController = routeRuntime.createEmployeeNextRouteController(options());
  const secondController = routeRuntime.createEmployeeNextRouteController(options());
  firstController.selectEvent("rent");
  secondController.selectEvent("expense");
  assert.equal(firstController.getView().shell.selectedEventId, "rent");
  assert.equal(secondController.getView().shell.selectedEventId, "expense");
  assert.notEqual(firstController.getView(), secondController.getView());
});

test("local-isolation static boundary contains no real adapter capability", async () => {
  const sourceFiles = (await listFiles(sourceRoot)).filter(
    (path) => path.endsWith(".ts"),
  );
  const sources = await Promise.all(
    sourceFiles.map(async (path) => [path, await readFile(path, "utf8")]),
  );
  const indexSource = await readFile(indexPath, "utf8");
  const testSource = await readFile(fileURLToPath(import.meta.url), "utf8");
  const bundle = await esbuild.build({
    bundle: true,
    entryPoints: [mainPath],
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  const bundleSource = bundle.outputFiles.map((file) => file.text).join("\n");

  const realEndpoint = /https?:\/\/|workers\.dev|\/api\//iu;
  const realWrite = /\b(?:TTLock|Cloud Arrears|Finance|Owner|Canonical)\b.{0,40}\b(?:write|mutat|create|update|delete|post)\b/iu;
  const credentialMaterial = /Bearer\s+[A-Za-z0-9._-]+|Authorization\s*[:=]\s*["'][^"']+|(?:token|password|secret)\s*[:=]\s*["'][^"']+["']/iu;
  const directCapability = /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|setTimeout|setInterval)\b/u;

  for (const [path, source] of sources) {
    assert.doesNotMatch(source, realEndpoint, path);
    assert.doesNotMatch(source, realWrite, path);
    assert.doesNotMatch(source, credentialMaterial, path);
    if (path !== mainPath) {
      assert.doesNotMatch(source, directCapability, path);
    }
  }
  assert.doesNotMatch(indexSource, realEndpoint);
  assert.doesNotMatch(indexSource, realWrite);
  assert.doesNotMatch(bundleSource, realEndpoint);
  assert.doesNotMatch(bundleSource, realWrite);
  assert.doesNotMatch(bundleSource, credentialMaterial);
  assert.match(testSource, /\/unit-test-local-isolation/u);
  assert.match(testSource, /const realEndpoint =/u);
  assert.match(testSource, /const realWrite =/u);
  assert.match(testSource, /const credentialMaterial =/u);
});
