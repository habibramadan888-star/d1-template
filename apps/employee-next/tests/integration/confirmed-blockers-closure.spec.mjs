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

const bundle = await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "node",
  stdin: {
    contents: `
      export {
        buildEmployeeNextSidecarRequest,
        createEmployeeNextEntryContextPort,
        startEmployeeNextSidecarRoute,
      } from "./apps/employee-next/src/main.ts";
      export {
        createEmployeeSevenEventRegistry,
      } from "./apps/employee-next/src/events/index.ts";
    `,
    loader: "ts",
    resolveDir: worktreeRoot,
    sourcefile: "confirmed-blockers-closure-test-entry.ts",
  },
  target: "es2022",
  write: false,
});
const runtime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
  }`
);

const authSession = Object.freeze({
  user: Object.freeze({
    employeeId: "employee-context-test",
    displayName: "Employee Context Test",
    role: "STAFF",
    userid: "employee-context-test",
    corpid: "homelink",
  }),
});
const paths = Object.freeze({
  rentConfig: "/readonly/rent-config",
  arrears: "/readonly/arrears",
  deposit: "/readonly/deposit",
  bedContext: "/readonly/bed-context",
});

function response(body, status = 200) {
  return Object.freeze({
    status,
    async json() {
      return structuredClone(body);
    },
  });
}

function success(data) {
  return { code: 0, success: true, data };
}

function arrearsPayload(rows = []) {
  return {
    success: true,
    ok: true,
    readonly: true,
    no_write: true,
    source: "canonical_arrears_gateway",
    gateway: "canonical_arrears_gateway",
    tasks: rows.map((row, index) => ({
      task_id: `arrears-${index + 1}`,
      remaining_arrears: row,
    })),
    total_count: rows.length,
    total_remaining: rows.reduce((sum, amount) => sum + amount, 0),
  };
}

function depositPayload() {
  return success({
    deposit_required_total: 500,
    deposit_recorded_amount: 200,
    readonly: true,
    no_write: true,
  });
}

function bedPayload(bed, vacant) {
  return success({
    gateway: "canonical_bed_context_gateway",
    bed,
    readonly: true,
    no_write: true,
    occupancy_gateway: {
      physical_bed_status: vacant ? "vacant" : "not_marked_vacant",
      deposit_recorded_amount: vacant ? 0 : 200,
      current_rent_coverage_start: "2026-07-01",
      current_rent_coverage_end: "2026-07-31",
    },
    access_snapshot_context: {
      status: "ready",
      parse_status: "parsed",
      candidate_count: 1,
      ambiguous: false,
      conflict: false,
      stale: false,
      parsed_vacancy_marker: vacant,
      parsed_deposit_amount: vacant ? 0 : 200,
      parsed_checkin_mmdd: "0701",
    },
  });
}

test("six event contexts use authenticated GET gateways and fail closed", async () => {
  const productionBuild = await readFile(
    resolve(worktreeRoot, "scripts", "build-employee-next-sidecar.mjs"),
    "utf8",
  );
  assert.match(
    productionBuild,
    /startEmployeeNextSidecarRoute\(root,\s*adapters,\s*\{\s*entryContexts:\s*adapters\.entryContexts/u,
  );
  const calls = [];
  const port = {
    async request(path, init) {
      calls.push({ path, init });
      if (path === paths.rentConfig) {
        return response(success({ config: { "145": 1300 } }));
      }
      if (path.startsWith(paths.arrears)) {
        return response(arrearsPayload([75]));
      }
      if (path.startsWith(paths.deposit)) {
        return response(depositPayload());
      }
      if (path.includes("bed=144")) {
        return response(bedPayload("144", false));
      }
      if (path.includes("bed=122")) {
        return response(bedPayload("122", true));
      }
      return response({ success: false, ok: false }, 200);
    },
  };
  const contexts = runtime.createEmployeeNextEntryContextPort(
    port,
    () => authSession,
    paths,
  );
  const cases = [
    ["rent", { bedLabel: "145" }, ["amountDueAed"]],
    [
      "arrears-payment",
      { bedLabel: "145" },
      ["cloudArrearsRef", "remainingArrearsAed"],
    ],
    [
      "deposit-in",
      { bedLabel: "145" },
      ["depositRequiredTotalAed", "currentDepositSnapshotAed"],
    ],
    [
      "deposit-out",
      { bedLabel: "145" },
      [
        "currentDepositSnapshotAed",
        "openArrears",
        "openArrearsTotalAed",
        "openArrearsSnapshotComplete",
        "openArrearsSummary",
      ],
    ],
    [
      "checkout",
      { bedLabel: "145" },
      [
        "currentDepositSnapshotAed",
        "outstandingArrearsSnapshotAed",
        "cloudArrearsRef",
      ],
    ],
    [
      "bed-transfer",
      { fromBed: "144", toBed: "122" },
      [
        "companyScope",
        "sourceAccessSnapshot",
        "targetAccessSnapshot",
        "cloudArrearsRef",
        "carriedArrearsAmountAed",
      ],
    ],
  ];
  for (const [eventId, draft, fields] of cases) {
    await contexts.refresh(eventId, draft);
    const snapshot = contexts.read(eventId, draft);
    assert.equal(snapshot.ready, true, eventId);
    for (const field of fields) {
      assert.equal(Object.hasOwn(snapshot.values, field), true, `${eventId}:${field}`);
    }
  }
  await contexts.refresh("rent", { bedLabel: "\u0000" });
  assert.equal(
    contexts.read("rent", { bedLabel: "\u0000" }).ready,
    false,
  );
  const beforeRetry = calls.length;
  await contexts.refresh("rent", { bedLabel: "145" }, true);
  assert.equal(calls.length, beforeRetry + 1);
  assert.equal(calls.every((call) => call.init.method === "GET"), true);
  assert.equal(calls.some((call) => call.init.method === "POST"), false);
});

test("Deposit Out loads every Canonical open arrears item and rejects partial snapshots", async () => {
  let partial = false;
  const calls = [];
  const contexts = runtime.createEmployeeNextEntryContextPort(
    {
      async request(path, init) {
        calls.push({ path, init });
        if (path.startsWith(paths.deposit)) {
          return response(depositPayload());
        }
        if (path.startsWith(paths.arrears)) {
          const payload = arrearsPayload([25, 75]);
          return response(partial
            ? { ...payload, total_count: 3 }
            : payload);
        }
        return response({ success: false }, 500);
      },
    },
    () => authSession,
    paths,
  );
  const draft = { bedLabel: "145" };
  await contexts.refresh("deposit-out", draft);
  const ready = contexts.read("deposit-out", draft);
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.values.openArrears, [
    { cloudArrearsRef: "arrears-1", remainingArrearsAed: 25 },
    { cloudArrearsRef: "arrears-2", remainingArrearsAed: 75 },
  ]);
  assert.equal(ready.values.openArrearsTotalAed, 100);
  assert.equal(ready.values.openArrearsSnapshotComplete, true);
  assert.match(ready.values.openArrearsSummary, /arrears-1.*25\.00/u);
  assert.match(ready.values.openArrearsSummary, /arrears-2.*75\.00/u);
  assert.equal(calls.every((call) => call.init.method === "GET"), true);
  assert.equal(calls.every(
    (call) => call.init.credentials === "same-origin",
  ), true);

  partial = true;
  await contexts.refresh("deposit-out", draft, true);
  assert.equal(contexts.read("deposit-out", draft).ready, false);
});

test("Deposit Out fails closed when the Canonical arrears gateway is unavailable", async () => {
  for (const arrearsResponse of [
    response({ success: false, ok: false }, 500),
    response({ success: false, ok: false }, 401),
    response({
      success: true,
      ok: true,
      source: "canonical_arrears_gateway",
      gateway: "canonical_arrears_gateway",
      readonly: true,
      no_write: true,
      tasks: "not-an-array",
      total_count: 0,
      total_remaining: 0,
    }),
  ]) {
    const contexts = runtime.createEmployeeNextEntryContextPort(
      {
        async request(path) {
          return path.startsWith(paths.deposit)
            ? response(depositPayload())
            : arrearsResponse;
        },
      },
      () => authSession,
      paths,
    );
    const draft = { bedLabel: "145" };
    await contexts.refresh("deposit-out", draft);
    assert.equal(contexts.read("deposit-out", draft).ready, false);
  }
});

test("stale context response cannot overwrite the latest bed selection", async () => {
  const pending = [];
  const contexts = runtime.createEmployeeNextEntryContextPort(
    {
      request(path, init) {
        return new Promise((resolveRequest) => {
          pending.push({ path, init, resolveRequest });
        });
      },
    },
    () => authSession,
    paths,
  );
  const first = contexts.refresh("rent", { bedLabel: "145" });
  const second = contexts.refresh("rent", { bedLabel: "146" });
  pending[1].resolveRequest(response(success({ config: { "146": 1400 } })));
  await second;
  pending[0].resolveRequest(response(success({ config: { "145": 1300 } })));
  await first;
  assert.equal(contexts.read("rent", { bedLabel: "146" }).ready, true);
  assert.equal(
    contexts.read("rent", { bedLabel: "146" }).values.amountDueAed,
    1400,
  );
  assert.equal(contexts.read("rent", { bedLabel: "145" }).ready, false);
  assert.equal(pending.every((call) => call.init.method === "GET"), true);
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.textContent = "";
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.disabled = false;
  }
  append(...children) {
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children = [...children];
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }
}

function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const result = find(child, predicate);
    if (result !== undefined) return result;
  }
  return undefined;
}

function visibleText(root) {
  return [
    root.textContent,
    ...root.children.flatMap((child) => visibleText(child)),
  ].join("\n");
}

function storagePort() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function validationFixture() {
  const validationCalls = [];
  const businessCalls = [];
  const adapter = {
    submitPath: "/unit/employee/entry",
    async restoreSession() {
      return authSession;
    },
    async restoreBedTransferCapability() {
      return {
        validateEnabled: true,
        writeEnabled: true,
        canonicalWritePath: "/unit/employee/entry",
      };
    },
    buildApiRequest(context) {
      return {
        method: "POST",
        path: "/unit/employee/entry",
        body: {
          entry_identity: "builder-entry",
          entry: {
            id: "builder-entry",
            event_type: context.eventId,
            submission: context.submission,
          },
          session: {
            id: "builder-session",
            session_id: "builder-session",
            entries: [],
          },
        },
      };
    },
    async validateSessionRequest(request) {
      validationCalls.push(structuredClone(request));
      const count = request.body.validation_requests.length;
      return {
        status: 200,
        body: success({
          ok: true,
          no_write: true,
          write_attempted: false,
          formal_write_count: 0,
          validation_result_count: count,
          passed_result_count: count,
          failed_result_count: 0,
          validation_results: request.body.validation_requests.map(() => ({
            ok: true,
            no_write: true,
            write_attempted: false,
          })),
        }),
      };
    },
    async checkSyncState(session) {
      return {
        status: "CLOUD_MISSING",
        sessionId: session.session_id,
        entries: session.entries.map((entry) => ({
          entryId: entry.entry_id,
          status: "CLOUD_MISSING",
        })),
      };
    },
    transport: {
      async request(request) {
        businessCalls.push(request);
        throw new Error("BUSINESS_WRITE_FORBIDDEN_IN_TEST");
      },
    },
  };
  return { adapter, validationCalls, businessCalls };
}

test("all seven events expose Add, Preview and Validate; upload needs current PASS", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    for (const eventType of [
      "rent",
      "arrears-payment",
      "deposit-in",
      "deposit-out",
      "checkout",
      "expense",
      "bed-transfer",
    ]) {
      const root = new FakeElement("main");
      const fixture = validationFixture();
      const sidecar = runtime.startEmployeeNextSidecarRoute(
        root,
        fixture.adapter,
        { draftStorage: storagePort(), confirmSessionUpload: () => false },
      );
      await sidecar.sessionRestore;
      const eventButton = find(
        root,
        (element) => element.dataset.eventId === eventType,
      );
      eventButton.listeners.get("click")();
      assert.ok(find(
        root,
        (element) => element.dataset.action === "add-to-session",
      ), `${eventType}: Add to Session`);
      await sidecar.addToSession({
        sessionId: `session-${eventType}`,
        entry: {
          entry_id: `entry-${eventType}`,
          event_type: eventType,
          payload: { marker: eventType },
          cash_amount_aed: 0,
          bank_amount_aed: 0,
        },
      });
      assert.ok(find(
        root,
        (element) => element.dataset.payloadPreview === "employee-entry",
      ), `${eventType}: Payload Preview`);
      assert.ok(find(
        root,
        (element) => element.dataset.action === "validate-session",
      ), `${eventType}: Validate`);
      assert.equal(
        find(root, (element) => element.dataset.action === "upload-session"),
        undefined,
        `${eventType}: blocked before validation`,
      );
      assert.equal(await sidecar.validateSession(), true, eventType);
      const call = fixture.validationCalls[0];
      assert.equal(call.path, "/unit/employee/entry/validate");
      for (const field of ["dry_run", "validate_only", "no_write"]) {
        assert.equal(call.body[field], true, `${eventType}:${field}`);
      }
      assert.equal(call.body.source, "employee_entry");
      assert.equal(call.body.validation_requests.length, 1);
      assert.equal(fixture.businessCalls.length, 0);
      const preview = JSON.parse(
        find(
          root,
          (element) => element.dataset.payloadPreview === "employee-entry",
        ).textContent,
      );
      const pendingEntry = preview.aggregate_write === true
        ? preview.session.entries[0]
        : preview.entry;
      assert.deepEqual(
        call.body.validation_requests[0].entry,
        pendingEntry,
        `${eventType}: preview/validate payload`,
      );
      assert.doesNotMatch(visibleText(root), /Upload Session/u);
      assert.equal(
        sidecar.getSessionValidationState().status,
        "VALIDATED_VALIDATE_ONLY",
      );
      const editable = eventType === "deposit-out"
        ? find(
          root,
          (element) =>
            element.dataset.fieldInput === "arrearsNonRepaymentReason"
            && element.disabled !== true,
        )
        : find(
          root,
          (element) =>
            typeof element.dataset.fieldInput === "string"
            && element.disabled !== true,
        );
      editable.value = "changed";
      editable.listeners.get("input")();
      assert.equal(sidecar.getSessionValidationState().status, "NOT_VALIDATED");
      assert.doesNotMatch(visibleText(root), /Upload Session/u);
    }
  } finally {
    globalThis.document = previousDocument;
  }
});

test("Expense public adapter uses the shared exact AED payment vector guard", async () => {
  const mainSource = await readFile(
    resolve(employeeNextRoot, "src", "main.ts"),
    "utf8",
  );
  const expenseSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "expense", "index.ts"),
    "utf8",
  );
  assert.match(
    mainSource,
    /import\s*\{\s*employeeExpenseAedToFils,\s*\}\s*from "\.\/events\/expense"/u,
  );
  assert.doesNotMatch(mainSource, /Number\.isInteger\(value \* 100\)/u);
  assert.doesNotMatch(expenseSource, /Number\.isSafeInteger/u);
  assert.doesNotMatch(expenseSource, /1e-9/u);
  const contract = runtime.createEmployeeSevenEventRegistry().get("expense");
  const draft = {
    targetRoom: "TEST-ROOM",
    expenseAmountAed: 50,
    paymentMethod: "cash",
    cashPaidAed: 50,
    bankPaidAed: 0,
    expenseDescription: "Vector contract test",
  };
  const cash = contract.buildSubmission(draft);
  const context = (submission) => ({
    session: authSession,
    eventId: "expense",
    submission,
  });
  for (const amount of [
    "0.01",
    "0.10",
    "0.29",
    "1",
    "1.20",
    "10.05",
    "999999.99",
    "100000000000000",
    "100000000000000.25",
  ]) {
    for (const method of ["cash", "bank"]) {
      const submission = contract.buildSubmission({
        ...draft,
        expenseAmountAed: amount,
        paymentMethod: method,
        cashPaidAed: method === "cash" ? amount : 0,
        bankPaidAed: method === "bank" ? amount : 0,
      });
      assert.doesNotThrow(() =>
        runtime.buildEmployeeNextSidecarRequest(
          context(submission),
          "/unit/employee/entry",
        )
      );
      assert.doesNotThrow(() => JSON.stringify(submission));
    }
  }
  for (const amount of ["0.001", "0.299", "1e2", "2.9e-1", "1abc"]) {
    assert.ok(
      contract.validateDraft({
        ...draft,
        expenseAmountAed: amount,
        cashPaidAed: amount,
      }).some((issue) => issue.code === "EXPENSE_AMOUNT_INVALID"),
      amount,
    );
  }
  const invalid = [
    { method: "cash", cashPaidAed: 49, bankPaidAed: 0, legs: [{ method: "cash", amountAed: 49 }] },
    { method: "bank", cashPaidAed: 50, bankPaidAed: 50, legs: [{ method: "bank", amountAed: 50 }] },
    { method: "bank", cashPaidAed: 1, bankPaidAed: 49, legs: [{ method: "bank", amountAed: 49 }] },
    { method: "cash", cashPaidAed: 50, bankPaidAed: 1, legs: [{ method: "cash", amountAed: 50 }] },
    { method: "cash", cashPaidAed: -1, bankPaidAed: 51, legs: [{ method: "cash", amountAed: -1 }] },
    { method: "cash", cashPaidAed: Number.NaN, bankPaidAed: 0, legs: [{ method: "cash", amountAed: Number.NaN }] },
    { method: "cash", cashPaidAed: Number.POSITIVE_INFINITY, bankPaidAed: 0, legs: [{ method: "cash", amountAed: Number.POSITIVE_INFINITY }] },
    { method: "cash", cashPaidAed: 50.001, bankPaidAed: 0, legs: [{ method: "cash", amountAed: 50.001 }] },
  ];
  for (const payment of invalid) {
    assert.throws(() =>
      runtime.buildEmployeeNextSidecarRequest(
        context({ ...structuredClone(cash), payment }),
        "/unit/employee/entry",
      ),
      /SIDECAR_ADAPTER_EXPENSE_PAYMENT_VECTOR_INVALID/u,
    );
  }
  for (const expenseAmountAed of ["0.001", "0.299", "1e2", "2.9e-1", "1abc"]) {
    assert.throws(() =>
      runtime.buildEmployeeNextSidecarRequest(
        context({
          ...structuredClone(cash),
          expenseAmountAed,
        }),
        "/unit/employee/entry",
      ),
      /SIDECAR_ADAPTER_EXPENSE_PAYMENT_VECTOR_INVALID/u,
    );
  }
  assert.throws(() =>
    runtime.buildEmployeeNextSidecarRequest(
      context({
        ...structuredClone(cash),
        payment: {
          method: "mixed",
          cashPaidAed: 25,
          bankPaidAed: 25,
          legs: [
            { method: "cash", amountAed: 25 },
            { method: "bank", amountAed: 25 },
          ],
        },
      }),
      "/unit/employee/entry",
    ),
    /SIDECAR_ADAPTER_UNSUPPORTED_PAYMENT/u,
  );
});
