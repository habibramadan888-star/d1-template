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
    mapEmployeeNextBedTransferCapability,
    mapEmployeeNextCloudSyncState,
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
const capabilitiesPath = `/${["api", "capabilities"].join("/")}`;

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
      targetRoom: "SIDECAR-APARTMENT-023",
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
    capabilitiesPath,
  };
}

test("production capability decoder accepts only the exact server-controlled write contract", () => {
  const enabled = runtime.mapEmployeeNextBedTransferCapability({
    code: 0,
    success: true,
    data: {
      bed_transfer_validate_enabled: true,
      bed_transfer_write_enabled: true,
      canonical_write_path: submitPath,
      production_cutover: "PRODUCTION_NO_GO",
    },
  });
  assert.deepEqual(enabled, {
    validateEnabled: true,
    writeEnabled: true,
    canonicalWritePath: submitPath,
  });
  for (const body of [
    { code: 0, success: true, data: {} },
    { code: 0, success: true, data: {
      bed_transfer_validate_enabled: true,
      bed_transfer_write_enabled: "true",
      canonical_write_path: submitPath,
    } },
    { code: 1001, success: false, data: {
      bed_transfer_validate_enabled: true,
      bed_transfer_write_enabled: true,
      canonical_write_path: submitPath,
    } },
    { code: 40101, success: false, data: {
      bed_transfer_validate_enabled: true,
      bed_transfer_write_enabled: true,
      canonical_write_path: submitPath,
    } },
  ]) {
    assert.equal(runtime.mapEmployeeNextBedTransferCapability(body), undefined);
  }
});

test("capability adapter refetches after a pre-auth 401 and never persists an override", async () => {
  const calls = [];
  const responses = [
    response(401, { code: 1001, success: false }),
    response(200, {
      code: 0,
      success: true,
      data: {
        bed_transfer_validate_enabled: true,
        bed_transfer_write_enabled: true,
        canonical_write_path: submitPath,
        production_cutover: "PRODUCTION_NO_GO",
      },
    }),
  ];
  const adapters = runtime.createEmployeeNextSidecarAdapters(
    adapterOptions(async (path, init) => {
      calls.push({ path, init });
      return responses.shift();
    }),
  );
  assert.deepEqual(await adapters.restoreBedTransferCapability(), {
    validateEnabled: false,
    writeEnabled: false,
    canonicalWritePath: "",
  });
  assert.deepEqual(await adapters.restoreBedTransferCapability(), {
    validateEnabled: true,
    writeEnabled: true,
    canonicalWritePath: submitPath,
  });
  assert.deepEqual(calls.map((call) => call.path), [
    capabilitiesPath,
    capabilitiesPath,
  ]);
  assert.ok(calls.every((call) => call.init.method === "GET"));
});

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

test("explicit top-level auth failures take precedence over stale nested identities", async () => {
  const staleStaff = authEnvelope("staff").data;
  const cases = [
    {
      name: "success=false with stale staff data",
      status: 200,
      body: { code: 0, success: false, data: staleStaff },
    },
    {
      name: "success=false with stale nested user role",
      status: 200,
      body: {
        code: 0,
        success: false,
        data: { user: staleStaff },
      },
    },
    {
      name: "top-level error string with stale staff data",
      status: 200,
      body: {
        code: 0,
        error: "unauthenticated",
        data: staleStaff,
      },
    },
    {
      name: "top-level error object with stale nested user",
      status: 200,
      body: {
        code: 0,
        error: { code: 40_101 },
        data: { user: staleStaff },
      },
    },
    {
      name: "success=true cannot override top-level error",
      status: 200,
      body: {
        code: 0,
        success: true,
        error: "session expired",
        data: staleStaff,
      },
    },
  ];

  for (const fixture of cases) {
    const adapters = runtime.createEmployeeNextSidecarAdapters(
      adapterOptions(async () => response(fixture.status, fixture.body)),
    );
    await assert.rejects(
      adapters.restoreSession(),
      /SIDECAR_SESSION_RESTORE_FAILED/u,
      fixture.name,
    );
    assert.equal(
      runtime.mapEmployeeNextServerSession(fixture.body),
      undefined,
      fixture.name,
    );
  }
});

test("empty top-level error signals preserve existing valid session compatibility", async () => {
  for (const envelope of [
    { ...authEnvelope("employee"), error: null },
    { ...authEnvelope("staff"), error: "" },
    { ...authEnvelope("staff"), error: "   " },
  ]) {
    const adapters = runtime.createEmployeeNextSidecarAdapters(
      adapterOptions(async () => response(200, envelope)),
    );
    const restored = await adapters.restoreSession();
    assert.match(restored.user.role, /^(?:EMPLOYEE|STAFF)$/u);
  }
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
    /SIDECAR_FORMAL_UPLOAD_DISABLED/u,
  );
  await assert.rejects(
    adapters.transport.request({ method: "POST", path: "/unknown" }),
    /SIDECAR_FORMAL_UPLOAD_DISABLED/u,
  );
  await assert.rejects(
    adapters.transport.request({
      method: "POST",
      path: submitPath,
      headers: { Authorization: "forbidden" },
    }),
    /SIDECAR_FORMAL_UPLOAD_DISABLED/u,
  );
  assert.equal(callCount, 0);
});

test("canonical sync-state adapter uses the exact read-only POST and fails closed", async () => {
  const calls = [];
  const localSession = {
    session_id: "employee-next-local-session",
    entries: [{
      entry_id: "employee-next-local-entry",
      event_type: "expense",
      payload: { marker: "local-only" },
      cash_amount_aed: 0,
      bank_amount_aed: 0,
    }],
  };
  const canonicalEnvelope = {
    code: 0,
    success: true,
    data: {
      gateway: "canonical_sync_state_gateway",
      cloud_authoritative: true,
      production_write: false,
      no_write: true,
      session_id: localSession.session_id,
      cloud_session: {
        id: localSession.session_id,
        anchor_id: "EMP-SESSION-ANCHOR",
      },
      entries: [{
        local_event_id: "employee-next-local-entry",
        sync_status: "SYNCED",
        matched: true,
        cloud_match: true,
      }],
    },
  };
  const adapters = runtime.createEmployeeNextSidecarAdapters(
    adapterOptions(async (path, init) => {
      calls.push({ path, init });
      return response(200, canonicalEnvelope);
    }),
  );
  assert.deepEqual(await adapters.checkSyncState(localSession), {
    status: "SYNCED",
    sessionId: localSession.session_id,
    anchorId: "EMP-SESSION-ANCHOR",
    entries: [{
      entryId: "employee-next-local-entry",
      status: "SYNCED",
    }],
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, `${submitPath}/sync-state`);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(
    Object.keys(calls[0].init.headers).some(
      (key) => key.toLowerCase() === "authorization",
    ),
    false,
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    session_id: localSession.session_id,
    entries: [{
      id: "employee-next-local-entry",
      entry_id: "employee-next-local-entry",
      event_id: "employee-next-local-entry",
      event_type: "expense",
    }],
  });

  for (const body of [
    {
      ...canonicalEnvelope,
      data: {
        ...canonicalEnvelope.data,
        cloud_session: undefined,
      },
    },
    {
      ...canonicalEnvelope,
      data: {
        ...canonicalEnvelope.data,
        entries: [{
          ...canonicalEnvelope.data.entries[0],
          matched: false,
        }],
      },
    },
    {
      ...canonicalEnvelope,
      data: {
        ...canonicalEnvelope.data,
        production_write: true,
      },
    },
  ]) {
    assert.equal(
      runtime.mapEmployeeNextCloudSyncState(body, localSession),
      undefined,
    );
  }
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

test("business POST transport is rejected before the request port", async () => {
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
      && error.message === "SIDECAR_FORMAL_UPLOAD_DISABLED"
      && !error.message.includes("network-detail-must-not-escape")
    ),
  );
  assert.equal(callCount, 0);
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
