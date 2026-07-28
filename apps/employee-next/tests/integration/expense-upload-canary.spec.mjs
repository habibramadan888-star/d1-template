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
        startEmployeeNextSidecarRoute,
      } from "./apps/employee-next/src/main.ts";
      export {
        createEmployeeSevenEventRegistry,
      } from "./apps/employee-next/src/events/index.ts";
    `,
    loader: "ts",
    resolveDir: worktreeRoot,
    sourcefile: "expense-upload-canary-test-entry.ts",
  },
  target: "es2022",
  write: false,
});
const runtime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
  }`
);

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

function visibleText(element) {
  return [
    element.textContent,
    ...element.children.flatMap((child) => visibleText(child)),
  ].join("\n");
}

function storagePort(initial = new Map()) {
  const values = new Map(initial);
  return {
    values,
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

function staff(role = "STAFF") {
  return {
    user: {
      employeeId: "expense-canary-staff",
      displayName: "Expense Canary Staff",
      role,
      userid: "expense-canary-staff",
      corpid: "homelink",
    },
  };
}

function expenseSubmission() {
  return runtime.createEmployeeSevenEventRegistry()
    .get("expense")
    .buildSubmission({
      expenseDate: "2026-07-27",
      expenseCategory: "maintenance",
      expenseAmountAed: 50,
      paymentMethod: "cash",
      cashPaidAed: 50,
      bankPaidAed: 0,
      expenseScope: "apartment",
      apartmentLabel: "Apartment Test Fixture",
      bedLabel: "",
      vendorName: "Fixture Vendor",
      paidBy: "",
      expenseDescription: "Fixture maintenance",
      receiptAvailable: false,
      receiptNote: "",
      finalNote: "",
    });
}

function entry(eventType = "expense", id = "local-expense-entry") {
  return {
    entry_id: id,
    event_type: eventType,
    payload: eventType === "expense"
      ? expenseSubmission()
      : { marker: "non-expense" },
    cash_amount_aed: 0,
    bank_amount_aed: 0,
  };
}

function adapters(options = {}) {
  const calls = [];
  const syncCalls = [];
  const validationCalls = [];
  let accepted = false;
  const value = {
    calls,
    syncCalls,
    validationCalls,
    submitPath: "/api/employee/entry",
    async restoreSession() {
      if (options.restoreError) {
        throw new Error("AUTH_FAILED");
      }
      return options.session ?? staff();
    },
    async restoreBedTransferCapability() {
      return options.capability ?? {
        validateEnabled: false,
        writeEnabled: false,
        canonicalWritePath: "",
      };
    },
    async validateSessionRequest(request) {
      validationCalls.push(structuredClone(request));
      const count = request.body.validation_requests.length;
      return {
        status: 200,
        body: {
          code: 0,
          success: true,
          data: {
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
          },
        },
      };
    },
    buildApiRequest(context) {
      return {
        method: "POST",
        path: "/api/employee/entry",
        body: {
          entry_identity: "cloud-expense-entry",
          entry: {
            event_type: context.eventId,
            submission: context.submission,
          },
          session: {
            session_id: "cloud-expense-session",
          },
        },
      };
    },
    async checkSyncState(session) {
      syncCalls.push(structuredClone(session));
      if (options.syncStateError) {
        throw new Error("SYNC_STATE_FAILED");
      }
      if (options.syncState) {
        return options.syncState(session);
      }
      const status = accepted ? "SYNCED" : "CLOUD_MISSING";
      return {
        status,
        sessionId: session.session_id,
        ...(accepted ? { anchorId: "cloud-session-anchor" } : {}),
        entries: session.entries.map((draft) => ({
          entryId: draft.entry_id,
          status,
        })),
      };
    },
    transport: {
      async request(request) {
        calls.push(request);
        if (options.request) {
          const result = await options.request(request);
          if (
            result?.status >= 200
            && result?.status <= 299
            && result?.body?.success === true
            && result?.body?.ok === true
            && (
              (
                result.body.aggregate_write === true
                && result.body.committed === true
                && result.body.requested_entry_count
                  === result.body.persisted_entry_count
                && result.body.requested_entry_count
                  === result.body.canonical_anchor_count
              )
              || result.body.canonical_entry?.event_type === "bed_transfer"
            )
          ) {
            accepted = true;
          }
          return result;
        }
        const entries = request.body.session.entries;
        accepted = true;
        return {
          status: 201,
          body: {
            success: true,
            ok: true,
            aggregate_write: true,
            committed: true,
            session_id: request.body.session.session_id,
            requested_entry_count: entries.length,
            persisted_entry_count: entries.length,
            canonical_anchor_count: entries.length,
            transaction_count: entries.length,
            entry_results: entries.map((entry) => ({
              success: true,
              ok: true,
              entry_id: entry.id,
            })),
          },
        };
      },
    },
  };
  return value;
}

async function start(options = {}) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  const root = new FakeElement("main");
  const storage = options.storage ?? storagePort();
  const adapter = adapters(options);
  const sidecar = runtime.startEmployeeNextSidecarRoute(root, adapter, {
    draftStorage: storage,
    confirmExpenseUpload: options.confirmExpenseUpload ?? (() => true),
  });
  await sidecar.sessionRestore;
  return {
    adapter,
    root,
    sidecar,
    storage,
    restoreDocument() {
      globalThis.document = previousDocument;
    },
  };
}

async function validateCurrent(fixture) {
  assert.equal(await fixture.sidecar.validateSession(), true);
  assert.equal(
    fixture.sidecar.getSessionValidationState().status,
    "VALIDATED",
  );
}

test("session upload stays hidden without exact employee/staff and accepts ordinary sessions", async () => {
  for (const options of [
    { restoreError: true },
    { session: staff("OWNER") },
    { session: staff("") },
    { session: staff("UNKNOWN") },
  ]) {
    const fixture = await start(options);
    try {
      assert.doesNotMatch(visibleText(fixture.root), /Upload Session/u);
      assert.equal(await fixture.sidecar.uploadExpense(), false);
      assert.equal(fixture.adapter.calls.length, 0);
    } finally {
      fixture.restoreDocument();
    }
  }

  const empty = await start();
  try {
    assert.doesNotMatch(visibleText(empty.root), /Upload Session/u);
    assert.equal(await empty.sidecar.uploadExpense(), false);
  } finally {
    empty.restoreDocument();
  }

  const nonExpense = await start();
  try {
    await nonExpense.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry("rent"),
    });
    assert.doesNotMatch(visibleText(nonExpense.root), /Upload Session/u);
    await validateCurrent(nonExpense);
    assert.match(visibleText(nonExpense.root), /Upload Session/u);
  } finally {
    nonExpense.restoreDocument();
  }

  const multiple = await start();
  try {
    await multiple.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry("expense", "expense-one"),
    });
    await multiple.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry("expense", "expense-two"),
    });
    await validateCurrent(multiple);
    assert.match(visibleText(multiple.root), /Upload Session/u);
  } finally {
    multiple.restoreDocument();
  }

  const employee = await start({ session: staff("EMPLOYEE") });
  try {
    await employee.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry(),
    });
    await validateCurrent(employee);
    assert.match(visibleText(employee.root), /Upload Session/u);
  } finally {
    employee.restoreDocument();
  }
});

test("explicit confirmation is required and cancellation preserves the local draft", async () => {
  const fixture = await start({ confirmExpenseUpload: () => false });
  try {
    await fixture.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry(),
    });
    await validateCurrent(fixture);
    const before = JSON.stringify([...fixture.storage.values]);
    assert.match(visibleText(fixture.root), /Upload Session/u);
    assert.equal(await fixture.sidecar.uploadExpense(), false);
    assert.equal(fixture.adapter.calls.length, 0);
    assert.equal(JSON.stringify([...fixture.storage.values]), before);
    assert.equal(fixture.sidecar.drafts.getView().entryCount, 1);
  } finally {
    fixture.restoreDocument();
  }
});

test("one confirmed Expense produces exactly one POST and only explicit success becomes SYNCED", async () => {
  const fixture = await start();
  try {
    await fixture.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry(),
    });
    await validateCurrent(fixture);
    const before = fixture.sidecar.drafts.getSession();
    assert.equal(await fixture.sidecar.uploadExpense(), true);
    assert.equal(fixture.adapter.calls.length, 1);
    assert.equal(fixture.adapter.calls[0].method, "POST");
    assert.equal(fixture.adapter.calls[0].path, "/api/employee/entry");
    assert.equal(fixture.adapter.calls[0].body.aggregate_write, true);
    assert.equal(fixture.adapter.calls[0].body.session.entries.length, 1);
    assert.equal(fixture.adapter.calls[0].body.session.entries[0].event_type, "expense");
    assert.deepEqual(fixture.sidecar.getExpenseUploadState(), {
      status: "SYNCED",
      sessionId: "local-session",
      anchorId: "cloud-session-anchor",
      entries: [{
        entryId: "local-expense-entry",
        status: "SYNCED",
      }],
    });
    assert.match(visibleText(fixture.root), /Employee Sync State: SYNCED/u);
    assert.doesNotMatch(visibleText(fixture.root), /Upload Session/u);
    assert.deepEqual(
      fixture.sidecar.drafts.getSession().entries,
      before.entries,
    );
    assert.equal(
      fixture.sidecar.drafts.getSession().anchor_id,
      "cloud-session-anchor",
    );
    assert.equal(fixture.sidecar.drafts.getView().entryCount, 1);
  } finally {
    fixture.restoreDocument();
  }
});

test("rapid double invocation produces one POST", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const fixture = await start({
    request: async () => {
      await pending;
      return {
        status: 200,
        body: {
          success: true,
          ok: true,
          aggregate_write: true,
          committed: true,
          session_id: "local-session",
          requested_entry_count: 1,
          persisted_entry_count: 1,
          canonical_anchor_count: 1,
          transaction_count: 1,
          entry_results: [{
            success: true,
            ok: true,
            entry_id: "local-expense-entry",
          }],
        },
      };
    },
  });
  try {
    await fixture.sidecar.addToSession({
      sessionId: "local-session",
      entry: entry(),
    });
    await validateCurrent(fixture);
    const first = fixture.sidecar.uploadExpense();
    await Promise.resolve();
    const second = fixture.sidecar.uploadExpense();
    assert.equal(await second, false);
    release();
    assert.equal(await first, true);
    assert.equal(fixture.adapter.calls.length, 1);
  } finally {
    fixture.restoreDocument();
  }
});

test("ordinary mixed session sends one aggregate POST with every stable identity", async () => {
  const fixture = await start();
  try {
    await fixture.sidecar.addToSession({
      sessionId: "mixed-session",
      entry: entry("rent", "rent-one"),
    });
    await fixture.sidecar.addToSession({
      sessionId: "mixed-session",
      entry: entry("expense", "expense-one"),
    });
    await validateCurrent(fixture);
    assert.equal(await fixture.sidecar.uploadSession(), true);
    assert.equal(fixture.adapter.calls.length, 1);
    const body = fixture.adapter.calls[0].body;
    assert.equal(body.aggregate_write, true);
    assert.equal(body.session.entries_count, 2);
    assert.deepEqual(
      body.session.entries.map((row) => [row.id, row.event_type]),
      [["rent-one", "rent"], ["expense-one", "expense"]],
    );
    assert.deepEqual(fixture.sidecar.getSessionUploadState(), {
      status: "SYNCED",
      sessionId: "mixed-session",
      anchorId: "cloud-session-anchor",
      entries: [
        { entryId: "rent-one", status: "SYNCED" },
        { entryId: "expense-one", status: "SYNCED" },
      ],
    });
  } finally {
    fixture.restoreDocument();
  }
});

test("auth restoration rehydrates the saved session from canonical sync state", async () => {
  const storage = storagePort();
  const writer = await start({ storage });
  try {
    await writer.sidecar.addToSession({
      sessionId: "restored-session",
      entry: entry(),
    });
  } finally {
    writer.restoreDocument();
  }

  const restored = await start({
    storage,
    syncState(session) {
      return {
        status: "SYNCED",
        sessionId: session.session_id,
        anchorId: "restored-cloud-anchor",
        entries: session.entries.map((draft) => ({
          entryId: draft.entry_id,
          status: "SYNCED",
        })),
      };
    },
  });
  try {
    assert.equal(restored.adapter.syncCalls.length, 1);
    assert.equal(restored.adapter.calls.length, 0);
    assert.deepEqual(restored.sidecar.getSessionUploadState(), {
      status: "SYNCED",
      sessionId: "restored-session",
      anchorId: "restored-cloud-anchor",
      entries: [{
        entryId: "local-expense-entry",
        status: "SYNCED",
      }],
    });
    assert.equal(
      restored.sidecar.drafts.getSession().anchor_id,
      "restored-cloud-anchor",
    );
    assert.match(visibleText(restored.root), /Cloud Sync: SYNCED/u);
    assert.doesNotMatch(visibleText(restored.root), /Upload Session/u);
  } finally {
    restored.restoreDocument();
  }
});

test("ambiguous sync never becomes SYNCED and retry performs no business write", async () => {
  const storage = storagePort();
  const writer = await start({ storage });
  try {
    await writer.sidecar.addToSession({
      sessionId: "retry-session",
      entry: entry(),
    });
  } finally {
    writer.restoreDocument();
  }
  let unavailable = true;
  const fixture = await start({
    storage,
    syncState(session) {
      if (unavailable) throw new Error("ambiguous response");
      return {
        status: "CLOUD_MISSING",
        sessionId: session.session_id,
        entries: session.entries.map((draft) => ({
          entryId: draft.entry_id,
          status: "CLOUD_MISSING",
        })),
      };
    },
  });
  try {
    assert.deepEqual(fixture.sidecar.getSessionUploadState(), {
      status: "SYNC_CHECK_UNAVAILABLE",
      sessionId: "retry-session",
    });
    assert.match(visibleText(fixture.root), /Retry Sync Check/u);
    assert.doesNotMatch(visibleText(fixture.root), /Employee Sync State: SYNCED/u);
    assert.doesNotMatch(visibleText(fixture.root), /Upload Session/u);
    assert.equal(fixture.adapter.calls.length, 0);
    unavailable = false;
    assert.equal(await fixture.sidecar.retrySyncCheck(), true);
    assert.equal(fixture.adapter.syncCalls.length, 2);
    assert.equal(fixture.adapter.calls.length, 0);
    assert.equal(
      fixture.sidecar.getSessionUploadState().status,
      "CLOUD_MISSING",
    );
    assert.doesNotMatch(visibleText(fixture.root), /Upload Session/u);
    await validateCurrent(fixture);
    assert.match(visibleText(fixture.root), /Upload Session/u);
  } finally {
    fixture.restoreDocument();
  }
});

test("ambiguous upload survives refresh as sync-only and cannot be resubmitted", async () => {
  const storage = storagePort();
  const first = await start({
    storage,
    syncStateError: true,
    request: async () => {
      throw new Error("response lost");
    },
  });
  try {
    await first.sidecar.addToSession({
      sessionId: "ambiguous-upload-session",
      entry: entry(),
    });
    await validateCurrent(first);
    assert.equal(await first.sidecar.uploadSession(), false);
    assert.equal(first.adapter.calls.length, 1);
    assert.equal(
      first.sidecar.drafts.getSession().cloud_sync_required,
      true,
    );
    assert.equal(
      first.sidecar.getSessionUploadState().status,
      "SYNC_CHECK_UNAVAILABLE",
    );
    assert.doesNotMatch(visibleText(first.root), /Upload Session/u);
  } finally {
    first.restoreDocument();
  }

  const restored = await start({ storage, syncStateError: true });
  try {
    assert.equal(
      restored.sidecar.drafts.getSession().cloud_sync_required,
      true,
    );
    assert.equal(
      restored.sidecar.getSessionUploadState().status,
      "SYNC_CHECK_UNAVAILABLE",
    );
    assert.doesNotMatch(visibleText(restored.root), /Upload Session/u);
    assert.equal(await restored.sidecar.uploadSession(), false);
    assert.equal(restored.adapter.calls.length, 0);
  } finally {
    restored.restoreDocument();
  }
});

test("canonical mismatch, void, correction and owner review states block reupload", async () => {
  for (const status of [
    "CLOUD_MISMATCH",
    "CLOUD_VOIDED",
    "CLOUD_CORRECTED",
    "OWNER_REVIEW_REQUIRED",
  ]) {
    const storage = storagePort();
    const writer = await start({ storage });
    try {
      await writer.sidecar.addToSession({
        sessionId: `cloud-state-${status}`,
        entry: entry(),
      });
    } finally {
      writer.restoreDocument();
    }
    const fixture = await start({
      storage,
      syncState(session) {
        return {
          status,
          sessionId: session.session_id,
          entries: session.entries.map((draft) => ({
            entryId: draft.entry_id,
            status,
          })),
        };
      },
    });
    try {
      assert.equal(fixture.sidecar.getSessionUploadState().status, status);
      assert.match(visibleText(fixture.root), new RegExp(status, "u"));
      assert.doesNotMatch(visibleText(fixture.root), /Upload Session/u);
      assert.equal(await fixture.sidecar.uploadSession(), false);
      assert.equal(fixture.adapter.calls.length, 0);
    } finally {
      fixture.restoreDocument();
    }
  }
});

test("Bed Transfer stays isolated from ordinary aggregate transport", async () => {
  for (const entries of [
    [entry("bed-transfer", "transfer-one")],
    [
      entry("expense", "expense-one"),
      entry("bed-transfer", "transfer-one"),
    ],
  ]) {
    const fixture = await start();
    try {
      for (const draft of entries) {
        await fixture.sidecar.addToSession({
          sessionId: "bed-transfer-boundary",
          entry: draft,
        });
      }
      assert.doesNotMatch(visibleText(fixture.root), /Upload Session/u);
      assert.equal(await fixture.sidecar.uploadSession(), false);
      assert.equal(fixture.adapter.calls.length, 0);
    } finally {
      fixture.restoreDocument();
    }
  }
});

test("exact enabled capability permits one isolated Bed Transfer POST only", async () => {
  const fixture = await start({
    capability: {
      validateEnabled: true,
      writeEnabled: true,
      canonicalWritePath: "/api/employee/entry",
    },
    request: async (request) => ({
      status: 201,
      body: {
        success: true,
        ok: true,
        requested_session_id: "bed-transfer-session",
        canonical_entry: { event_type: "bed_transfer" },
      },
    }),
  });
  try {
    await fixture.sidecar.addToSession({
      sessionId: "bed-transfer-session",
      entry: entry("bed-transfer", "transfer-one"),
    });
    await validateCurrent(fixture);
    assert.match(visibleText(fixture.root), /Upload Session/u);
    assert.equal(await fixture.sidecar.uploadSession(), true);
    assert.equal(fixture.adapter.calls.length, 1);
    assert.equal(fixture.adapter.calls[0].method, "POST");
    assert.equal(fixture.adapter.calls[0].path, "/api/employee/entry");
    assert.equal(fixture.adapter.calls[0].body.aggregate_write, undefined);
    assert.equal(fixture.adapter.calls[0].body.entry.event_type, "bed-transfer");
  } finally {
    fixture.restoreDocument();
  }
});

test("transport and server failures retain the unsynced Expense without retry", async () => {
  const failures = [
    async () => {
      throw new Error("NETWORK_FAILURE");
    },
    async () => ({ status: 504, body: { success: false } }),
    async () => ({ status: 200, body: null }),
    async () => ({ status: 200, body: { success: false } }),
    async () => ({
      status: 200,
      body: {
        success: true,
        error: "failed",
        entry_id: "cloud-expense-entry",
        session_id: "cloud-expense-session",
      },
    }),
    async () => ({
      status: 200,
      body: {
        success: true,
        entry_id: "wrong-entry",
        session_id: "cloud-expense-session",
      },
    }),
    async () => ({
      status: 200,
      body: {
        success: true,
        ok: true,
        aggregate_write: true,
        session_id: "local-session",
        requested_entry_count: 1,
        persisted_entry_count: 1,
        entry_results: [{
          success: true,
          ok: true,
          entry_id: "local-expense-entry",
        }],
      },
    }),
    async () => ({
      status: 200,
      body: {
        success: true,
        ok: true,
        aggregate_write: true,
        committed: true,
        session_id: "local-session",
        requested_entry_count: 1,
        persisted_entry_count: 0,
        entry_results: [],
      },
    }),
  ];
  for (const request of failures) {
    const fixture = await start({ request });
    try {
      await fixture.sidecar.addToSession({
        sessionId: "local-session",
        entry: entry(),
      });
      await validateCurrent(fixture);
      const before = structuredClone(fixture.sidecar.drafts.getSession());
      assert.equal(await fixture.sidecar.uploadExpense(), false);
      assert.equal(fixture.adapter.calls.length, 1);
      assert.deepEqual(fixture.sidecar.getExpenseUploadState(), {
        status: "CLOUD_MISSING",
        sessionId: "local-session",
        entries: [{
          entryId: "local-expense-entry",
          status: "CLOUD_MISSING",
        }],
      });
      assert.equal(
        fixture.sidecar.drafts.getSession().cloud_sync_required,
        true,
      );
      assert.deepEqual(
        fixture.sidecar.drafts.getSession().entries,
        before.entries,
      );
      assert.equal(fixture.sidecar.drafts.getView().entryCount, 1);
    } finally {
      fixture.restoreDocument();
    }
  }
});

test("upload source has no automatic, retry, beacon, legacy or external write path", async () => {
  const source = await readFile(
    resolve(employeeNextRoot, "src", "main.ts"),
    "utf8",
  );
  assert.match(source, /request\.method !== "POST"/u);
  assert.match(source, /request\.path !== adapters\.submitPath/u);
  assert.doesNotMatch(source, /sendBeacon|setInterval|setTimeout/u);
  assert.doesNotMatch(source, /https?:\/\//u);
  assert.doesNotMatch(source, /\/employee(?:["'/?#]|$)/u);
  assert.doesNotMatch(source, /retryExpense|autoUpload|backgroundUpload/iu);
});
