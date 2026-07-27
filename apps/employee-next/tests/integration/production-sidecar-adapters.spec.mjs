import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");

async function loadRuntime(contents) {
  const bundle = await esbuild.build({
    bundle: true,
    format: "esm",
    platform: "node",
    stdin: {
      contents,
      loader: "ts",
      resolveDir: worktreeRoot,
      sourcefile: "production-sidecar-test-entry.ts",
    },
    target: "es2022",
    write: false,
  });
  return import(
    `data:text/javascript;base64,${
      Buffer.from(bundle.outputFiles[0].text).toString("base64")
    }`
  );
}

const runtime = await loadRuntime(`
  export {
    buildEmployeeNextSidecarRequest,
    createEmployeeNextSidecarAdapters,
    mapEmployeeNextServerSession,
  } from "./apps/employee-next/src/main.ts";
  export {
    createEmployeeSevenEventRegistry,
  } from "./apps/employee-next/src/events/index.ts";
`);

const session = Object.freeze({
  user: Object.freeze({
    employeeId: "employee-023",
    displayName: "Employee 023",
    role: "EMPLOYEE",
  }),
});
const sessionPath = `/${["api", "me"].join("/")}`;
const submitPath = `/${["api", "employee", "entry"].join("/")}`;

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
      cloudArrearsRef: "AR-SIDECAR-023",
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
      note: "Existing deposit snapshot confirmed",
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
      note: "Approved full deposit refund",
    },
    checkout: {
      bedLabel: "B-501",
      checkoutDate: "2026-07-26",
      checkoutMode: "normal",
      currentDepositSnapshotAed: 0,
      depositRefundAed: 0,
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
      expenseScope: "apartment",
      apartmentLabel: "SIDECAR-APARTMENT-023",
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
      transferReason: "Approved transfer",
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

function response(status, body) {
  return Object.freeze({
    status,
    async json() {
      return structuredClone(body);
    },
  });
}

function authEnvelope(role, code = 0) {
  return {
    code,
    message: code === 0 ? "ok" : "request failed",
    data: {
      userid: "employee-023",
      employee_id: "employee-023",
      display_name: "Employee 023",
      employee_name: "Employee 023",
      corpid: "homelink",
      role,
    },
  };
}

function adapterOptions(request) {
  return {
    requestPort: { request },
    sessionPath,
    submitPath,
  };
}

test("production session restore maps only explicit employee and staff roles", async () => {
  for (const [serverRole, localRole] of [
    ["employee", "EMPLOYEE"],
    ["staff", "STAFF"],
  ]) {
    const calls = [];
    const adapters = runtime.createEmployeeNextSidecarAdapters(
      adapterOptions(async (path, init) => {
        calls.push({ path, init });
        return response(200, {
          code: 0,
          data: {
            userid: "employee-023",
            employee_id: "employee-023",
            display_name: "Employee 023",
            corpid: "homelink",
            role: serverRole,
          },
        });
      }),
    );
    const restored = await adapters.restoreSession();
    assert.equal(restored.user.role, localRole);
    assert.equal(restored.user.employeeId, "employee-023");
    assert.equal(restored.user.userid, "employee-023");
    assert.equal(restored.user.corpid, "homelink");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, sessionPath);
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.credentials, "same-origin");
    assert.equal("body" in calls[0].init, false);
  }
});

test("production session restore rejects nonzero error code with valid-looking staff data", async () => {
  const adapters = runtime.createEmployeeNextSidecarAdapters(
    adapterOptions(async () => response(200, authEnvelope("staff", 40_101))),
  );
  await assert.rejects(
    adapters.restoreSession(),
    /SIDECAR_SESSION_RESTORE_FAILED/u,
  );
});

test("production session restore rejects nonzero error code with valid-looking employee data", async () => {
  const adapters = runtime.createEmployeeNextSidecarAdapters(
    adapterOptions(async () => response(200, authEnvelope("employee", 40_101))),
  );
  await assert.rejects(
    adapters.restoreSession(),
    /SIDECAR_SESSION_RESTORE_FAILED/u,
  );
});

test("production session restore requires the exact numeric zero success code", async () => {
  for (const envelope of [
    { data: authEnvelope("staff").data },
    authEnvelope("staff", "0"),
    authEnvelope("staff", null),
    authEnvelope("staff", false),
  ]) {
    const adapters = runtime.createEmployeeNextSidecarAdapters(
      adapterOptions(async () => response(200, envelope)),
    );
    await assert.rejects(
      adapters.restoreSession(),
      /SIDECAR_SESSION_RESTORE_FAILED/u,
    );
  }
});

test("production session restore rejects malformed data and missing roles", async () => {
  for (const envelope of [
    null,
    [],
    { code: 0, data: null },
    {
      code: 0,
      data: {
        userid: "employee-023",
        employee_id: "employee-023",
      },
    },
  ]) {
    const adapters = runtime.createEmployeeNextSidecarAdapters(
      adapterOptions(async () => response(200, envelope)),
    );
    await assert.rejects(
      adapters.restoreSession(),
      /SIDECAR_SESSION_RESTORE_FAILED/u,
    );
  }
});

test("production session restore fails closed for every non-employee role", async () => {
  for (const role of ["owner", "manager", "admin", "readonly_admin", "", "other"]) {
    const adapters = runtime.createEmployeeNextSidecarAdapters(
      adapterOptions(async () => response(200, {
        code: 0,
        data: {
          userid: "employee-023",
          employee_id: "employee-023",
          display_name: "Employee 023",
          corpid: "homelink",
          role,
        },
      })),
    );
    await assert.rejects(
      adapters.restoreSession(),
      /SIDECAR_SESSION_RESTORE_FAILED/u,
    );
  }
  assert.equal(runtime.mapEmployeeNextServerSession({
    code: 0,
    data: {
      userid: "one",
      employee_id: "two",
      corpid: "homelink",
      role: "staff",
    },
  }), undefined);
});

test("production request ports are explicit, same-origin and exact-path only", async () => {
  for (const path of [
    "https://example.invalid/entry",
    "//example.invalid/entry",
    "/employee/../entry",
    "/entry?next=1",
  ]) {
    assert.throws(
      () => runtime.createEmployeeNextSidecarAdapters({
        requestPort: { request: async () => response(200, {}) },
        sessionPath,
        submitPath: path,
      }),
      /SIDECAR_ADAPTER_INVALID_OPTIONS/u,
    );
  }

  let callCount = 0;
  const adapters = runtime.createEmployeeNextSidecarAdapters(
    adapterOptions(async (path, init) => {
      callCount += 1;
      assert.equal(path, submitPath);
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "same-origin");
      assert.equal(
        Object.keys(init.headers).some(
          (key) => key.toLowerCase() === "authorization",
        ),
        false,
      );
      return response(200, { code: 0, data: { accepted: true } });
    }),
  );
  await assert.rejects(
    adapters.transport.request({ method: "GET", path: sessionPath }),
    /SIDECAR_ADAPTER_REQUEST_REJECTED/u,
  );
  await assert.rejects(
    adapters.transport.request({ method: "POST", path: "/unknown" }),
    /SIDECAR_ADAPTER_REQUEST_REJECTED/u,
  );
  await assert.rejects(
    adapters.transport.request({
      method: "POST",
      path: submitPath,
      headers: { Authorization: "forbidden" },
    }),
    /SIDECAR_ADAPTER_REQUEST_REJECTED/u,
  );
  assert.equal(callCount, 0);
});

test("all seven real event contracts form exact single-path requests", () => {
  const registry = runtime.createEmployeeSevenEventRegistry();
  const drafts = validDrafts();
  const expectedTypes = [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "expense",
    "bed_transfer",
  ];
  const requests = registry.eventIds.map((eventId, index) => {
    const contract = registry.get(eventId);
    const validation = contract.validateDraft(drafts[eventId]);
    assert.equal(
      validation.some((issue) => issue.blocking),
      false,
      eventId,
    );
    const submission = contract.buildSubmission(drafts[eventId]);
    const request = runtime.buildEmployeeNextSidecarRequest(
      { session, eventId, submission },
      submitPath,
    );
    assert.equal(request.method, "POST", eventId);
    assert.equal(request.path, submitPath, eventId);
    assert.equal(request.body.entry.event_type, expectedTypes[index], eventId);
    assert.equal(request.body.session.entries.length, 1, eventId);
    assert.equal(
      request.body.session.entries[0].id,
      request.body.entry.id,
      eventId,
    );
    assert.equal(
      JSON.stringify(request).match(
        /provider|ttlock|card_?id|phone_?99099/giu,
      ),
      null,
      eventId,
    );
    return request;
  });
  assert.equal(requests.length, 7);
  assert.equal(new Set(requests.map((item) => item.path)).size, 1);
});

test("production request mapping is deterministic and immutable", () => {
  const registry = runtime.createEmployeeSevenEventRegistry();
  const draft = validDrafts().rent;
  const contract = registry.get("rent");
  const submission = contract.buildSubmission(draft);
  const before = structuredClone(submission);
  const first = runtime.buildEmployeeNextSidecarRequest(
    { session, eventId: "rent", submission },
    submitPath,
  );
  const second = runtime.buildEmployeeNextSidecarRequest(
    { session, eventId: "rent", submission },
    submitPath,
  );
  assert.deepEqual(first, second);
  assert.deepEqual(submission, before);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.body), true);
});

test("missing facts and unsupported payment modes fail before transport", () => {
  const registry = runtime.createEmployeeSevenEventRegistry();
  const drafts = validDrafts();

  const depositOut = registry.get("deposit-out").buildSubmission({
    ...drafts["deposit-out"],
    note: "",
  });
  assert.throws(
    () => runtime.buildEmployeeNextSidecarRequest(
      { session, eventId: "deposit-out", submission: depositOut },
      submitPath,
    ),
    /SIDECAR_ADAPTER_UNPROVEN_REFUND_REASON/u,
  );

  const checkout = registry.get("checkout").buildSubmission({
    ...drafts.checkout,
    currentDepositSnapshotAed: 500,
    depositRefundAed: 500,
  });
  assert.throws(
    () => runtime.buildEmployeeNextSidecarRequest(
      { session, eventId: "checkout", submission: checkout },
      submitPath,
    ),
    /SIDECAR_ADAPTER_UNPROVEN_REFUND_METHOD/u,
  );

  const rent = registry.get("rent").buildSubmission({
    ...drafts.rent,
    paymentMethod: "mixed",
    cashReceivedAed: 500,
    bankReceivedAed: 500,
  });
  assert.throws(
    () => runtime.buildEmployeeNextSidecarRequest(
      { session, eventId: "rent", submission: rent },
      submitPath,
    ),
    /SIDECAR_ADAPTER_UNSUPPORTED_PAYMENT/u,
  );
});

test("provider identity fields fail closed without unsafe error echo", () => {
  const registry = runtime.createEmployeeSevenEventRegistry();
  const submission = {
    ...registry.get("rent").buildSubmission(validDrafts().rent),
    providerCardId: "must-not-pass",
  };
  assert.throws(
    () => runtime.buildEmployeeNextSidecarRequest(
      { session, eventId: "rent", submission },
      submitPath,
    ),
    (error) => (
      error instanceof Error
      && error.message === "SIDECAR_ADAPTER_INVALID_SUBMISSION"
      && !error.message.includes("must-not-pass")
    ),
  );
});

test("business POST transport is invoked once and never retried", async () => {
  let callCount = 0;
  const adapters = runtime.createEmployeeNextSidecarAdapters(
    adapterOptions(async () => {
      callCount += 1;
      throw new Error("network-detail-must-not-escape");
    }),
  );
  await assert.rejects(
    adapters.transport.request({
      method: "POST",
      path: submitPath,
      body: { entry: { event_type: "rent" } },
    }),
    (error) => (
      error instanceof Error
      && error.message === "SIDECAR_ADAPTER_TRANSPORT_FAILED"
      && !error.message.includes("network-detail-must-not-escape")
    ),
  );
  assert.equal(callCount, 1);
});

test("production bootstrap contains no automatic submit or background channel", async () => {
  const mainSource = await readFile(resolve(employeeNextRoot, "src", "main.ts"), "utf8");
  const buildSource = await readFile(
    resolve(worktreeRoot, "scripts", "build-employee-next-sidecar.mjs"),
    "utf8",
  );
  assert.doesNotMatch(buildSource, /\.submit\s*\(/u);
  assert.doesNotMatch(buildSource, /\b(?:sendBeacon|setInterval|setTimeout)\b/u);
  assert.doesNotMatch(mainSource, /\b(?:sendBeacon|setInterval|setTimeout)\b/u);
  assert.equal(
    (buildSource.match(/globalThis\.fetch\s*\(/gu) ?? []).length,
    1,
  );
});
