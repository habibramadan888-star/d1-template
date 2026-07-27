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
      export * from "./apps/employee-next/src/session-draft.ts";
      export { employeeNextDraftStorageKey } from "./apps/employee-next/src/core/draft-store.ts";
      export {
        createEmployeeNextSidecarAdapters,
        startEmployeeNextSidecarRoute,
      } from "./apps/employee-next/src/main.ts";
    `,
    loader: "ts",
    resolveDir: worktreeRoot,
    sourcefile: "scoped-session-draft-test-entry.ts",
  },
  target: "es2022",
  write: false,
});
const runtime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
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

function staff(userid = "employee-a", corpid = "homelink") {
  return {
    user: {
      employeeId: userid,
      displayName: "Scoped Staff",
      role: "STAFF",
      userid,
      corpid,
    },
  };
}

function entry(eventType, index, overrides = {}) {
  return {
    entry_id: `entry-${index}`,
    event_type: eventType,
    payload: {
      marker: `${eventType}-${index}`,
      nested: { exact: true },
    },
    cash_amount_aed: index,
    bank_amount_aed: index + 0.25,
    ...overrides,
  };
}

function storagePort(initial = new Map()) {
  const values = new Map(initial);
  const calls = [];
  return {
    values,
    calls,
    getItem(key) {
      calls.push(["getItem", key]);
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      calls.push(["setItem", key, value]);
      values.set(key, value);
    },
    removeItem(key) {
      calls.push(["removeItem", key]);
      values.delete(key);
    },
  };
}

async function saveSeven(controller, sessionId = "session-seven") {
  for (const [index, eventType] of eventIds.entries()) {
    const result = await controller.addToSession({
      sessionId,
      entry: entry(eventType, index + 1),
    });
    assert.equal(result.ok, true, eventType);
  }
}

test("scope is strict, employee/staff-derived and collision-safe", async () => {
  assert.equal(runtime.createEmployeeDraftScope("scope"), undefined);
  assert.equal(runtime.createEmployeeDraftScope({}), undefined);
  assert.equal(
    runtime.createEmployeeDraftScope({
      user: { role: "STAFF", corpid: "homelink" },
    }),
    undefined,
  );
  assert.equal(
    runtime.createEmployeeDraftScope({
      user: { role: "STAFF", userid: "employee" },
    }),
    undefined,
  );
  assert.deepEqual(
    runtime.createEmployeeDraftScope({
      user: {
        role: "EMPLOYEE",
        corpid: "homelink",
        userid: "employee",
      },
    }),
    { corpid: "homelink", userid: "employee" },
  );
  assert.equal(
    runtime.createEmployeeDraftScope({
      user: {
        role: "OWNER",
        corpid: "homelink",
        userid: "owner",
      },
    }),
    undefined,
  );

  const same = runtime.employeeNextDraftStorageKey({
    corpid: "homelink",
    userid: "employee",
  });
  assert.equal(
    same,
    runtime.employeeNextDraftStorageKey({
      corpid: "homelink",
      userid: "employee",
    }),
  );
  assert.match(same, /^homelink:employee-next:draft:v1:/u);
  assert.notEqual(
    same,
    runtime.employeeNextDraftStorageKey({
      corpid: "other",
      userid: "employee",
    }),
  );
  assert.notEqual(
    same,
    runtime.employeeNextDraftStorageKey({
      corpid: "homelink",
      userid: "other",
    }),
  );
  assert.notEqual(
    runtime.employeeNextDraftStorageKey({ corpid: "a:b", userid: "c" }),
    runtime.employeeNextDraftStorageKey({ corpid: "a", userid: "b:c" }),
  );

  const storage = storagePort();
  for (const invalid of [
    undefined,
    { user: { role: "STAFF", corpid: "homelink" } },
    { user: { role: "STAFF", userid: "employee" } },
  ]) {
    const controller = runtime.createEmployeeNextSessionDraftController(storage);
    const result = await controller.restore(invalid);
    assert.equal(result.ok, false);
  }
  assert.equal(storage.calls.length, 0);
});

test("A and B scopes round-trip exact independent sessions without restore writes", async () => {
  const storage = storagePort();
  const controller = runtime.createEmployeeNextSessionDraftController(
    storage,
    () => "2026-07-27T08:00:00.000Z",
  );
  assert.equal((await controller.restore(staff("A", "one"))).ok, true);
  await saveSeven(controller, "session-a");
  const keyA = runtime.employeeNextDraftStorageKey({
    corpid: "one",
    userid: "A",
  });
  const rawA = storage.values.get(keyA);
  const sessionA = structuredClone(controller.getSession());

  assert.equal((await controller.restore(staff("A", "two"))).ok, true);
  assert.equal(controller.getSession(), undefined);
  await controller.addToSession({
    sessionId: "session-b",
    entry: entry("rent", 10),
  });
  const keyB = runtime.employeeNextDraftStorageKey({
    corpid: "two",
    userid: "A",
  });
  assert.notEqual(keyA, keyB);

  const writesBeforeRestore = storage.calls.filter(
    ([method]) => method === "setItem",
  ).length;
  assert.equal((await controller.restore(staff("A", "one"))).ok, true);
  assert.deepEqual(controller.getSession(), sessionA);
  assert.equal(storage.values.get(keyA), rawA);
  assert.equal(
    storage.calls.filter(([method]) => method === "setItem").length,
    writesBeforeRestore,
  );
  assert.equal(controller.getView().entryCount, 7);
  assert.equal(controller.getView().cashTotalAed, 13);
  assert.equal(controller.getView().bankTotalAed, 14);
  assert.deepEqual(
    controller.getSession().entries.map((item) => item.event_type),
    eventIds,
  );

  assert.equal((await controller.restore(staff("B", "one"))).ok, true);
  assert.equal(controller.getSession(), undefined);
  assert.equal((await controller.restore(staff("A", "two"))).ok, true);
  assert.equal(controller.getSession().session_id, "session-b");
  assert.equal((await controller.restore(staff("A", "one"))).ok, true);
  assert.deepEqual(controller.getSession(), sessionA);
});

test("corrupt JSON, schema and scope mismatch fail closed without overwrite", async () => {
  const scope = { corpid: "homelink", userid: "employee-a" };
  const key = runtime.employeeNextDraftStorageKey(scope);
  const invalidValues = [
    "{broken",
    JSON.stringify({ schema_version: 2 }),
    JSON.stringify({
      schema_version: 1,
      scope: { corpid: "other", userid: "employee-a" },
      session: { session_id: "session", entries: [] },
      revision: 1,
      saved_at: "2026-07-27T08:00:00.000Z",
    }),
  ];
  for (const raw of invalidValues) {
    const storage = storagePort(new Map([[key, raw]]));
    const controller = runtime.createEmployeeNextSessionDraftController(storage);
    const result = await controller.restore(staff());
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, "DRAFT_ENVELOPE_INVALID");
    assert.equal(controller.getView().status, "DRAFT_UNAVAILABLE");
    assert.equal(controller.getSession(), undefined);
    assert.equal(storage.values.get(key), raw);
    assert.equal(
      storage.calls.some(([method]) => method === "setItem"),
      false,
    );
  }
});

test("storage write failure preserves prior memory and storage", async () => {
  const storage = storagePort();
  const controller = runtime.createEmployeeNextSessionDraftController(storage);
  await controller.restore(staff());
  await controller.addToSession({
    sessionId: "session",
    entry: entry("rent", 1),
  });
  const beforeSession = structuredClone(controller.getSession());
  const key = runtime.employeeNextDraftStorageKey({
    corpid: "homelink",
    userid: "employee-a",
  });
  const beforeRaw = storage.values.get(key);
  storage.setItem = () => {
    throw new Error("private storage failure");
  };
  const result = await controller.addToSession({
    sessionId: "session",
    entry: entry("expense", 2),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRAFT_SAVE_FAILED");
  assert.deepEqual(controller.getSession(), beforeSession);
  assert.equal(storage.values.get(key), beforeRaw);
  assert.equal(controller.getView().errorCode, "DRAFT_SAVE_FAILED");
});

test("canonical local summary keeps cash Expense out of received totals", async () => {
  const storage = storagePort();
  const controller = runtime.createEmployeeNextSessionDraftController(storage);
  await controller.restore(staff());
  await controller.addToSession({
    sessionId: "expense-session",
    entry: entry("expense", 1, {
      payload: {
        eventId: "expense",
        payment: {
          method: "cash",
          legs: [{ method: "cash", amountAed: 1 }],
        },
      },
      cash_amount_aed: 0,
      bank_amount_aed: 0,
    }),
  });
  assert.deepEqual(controller.getView().summary, {
    cashReceivedAed: 0,
    bankReceivedAed: 0,
    totalReceivedAed: 0,
    cashExpensesAed: 1,
    bankExpensesAed: 0,
    expensesAed: 1,
    cashNetAed: -1,
    bankNetAed: 0,
    netFundsAed: -1,
  });
});

test("remove local draft persists exact scope atomically and preserves order", async () => {
  const storage = storagePort(new Map([["unrelated", "preserve"]]));
  const controller = runtime.createEmployeeNextSessionDraftController(
    storage,
    () => "2026-07-27T13:00:00.000Z",
  );
  await controller.restore(staff());
  for (const index of [1, 2, 3]) {
    await controller.addToSession({
      sessionId: "remove-session",
      entry: entry(index === 2 ? "expense" : "rent", index),
    });
  }
  const key = runtime.employeeNextDraftStorageKey({
    corpid: "homelink",
    userid: "employee-a",
  });
  const result = await controller.removeLocalDraft("entry-2");
  assert.equal(result.ok, true);
  assert.equal(controller.getSession().session_id, "remove-session");
  assert.deepEqual(
    controller.getSession().entries.map((item) => item.entry_id),
    ["entry-1", "entry-3"],
  );
  assert.equal(storage.values.get("unrelated"), "preserve");
  assert.equal(storage.values.has(key), true);
  assert.deepEqual(
    JSON.parse(storage.values.get(key)).session.entries.map(
      (item) => item.entry_id,
    ),
    ["entry-1", "entry-3"],
  );
  assert.equal(
    storage.calls.filter(([method]) => method === "removeItem").length,
    0,
  );
});

test("last local draft removal deletes only the exact scoped key", async () => {
  const storage = storagePort(new Map([["unrelated", "preserve"]]));
  const controller = runtime.createEmployeeNextSessionDraftController(storage);
  await controller.restore(staff());
  await controller.addToSession({
    sessionId: "single-session",
    entry: entry("expense", 1),
  });
  const key = runtime.employeeNextDraftStorageKey({
    corpid: "homelink",
    userid: "employee-a",
  });
  const result = await controller.removeLocalDraft("entry-1");
  assert.equal(result.ok, true);
  assert.equal(controller.getSession(), undefined);
  assert.equal(controller.getView().entryCount, 0);
  assert.equal(storage.values.has(key), false);
  assert.equal(storage.values.get("unrelated"), "preserve");
  assert.deepEqual(
    storage.calls.filter(([method]) => method === "removeItem"),
    [["removeItem", key]],
  );
});

test("local draft removal failure preserves storage memory and summary", async () => {
  const storage = storagePort();
  const controller = runtime.createEmployeeNextSessionDraftController(storage);
  await controller.restore(staff());
  await controller.addToSession({
    sessionId: "failure-session",
    entry: entry("expense", 1),
  });
  const beforeSession = structuredClone(controller.getSession());
  const beforeView = structuredClone(controller.getView());
  const key = runtime.employeeNextDraftStorageKey({
    corpid: "homelink",
    userid: "employee-a",
  });
  const beforeRaw = storage.values.get(key);
  storage.removeItem = () => {
    throw new Error("private delete failure");
  };
  const result = await controller.removeLocalDraft("entry-1");
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRAFT_DELETE_FAILED");
  assert.deepEqual(controller.getSession(), beforeSession);
  assert.deepEqual(controller.getView().summary, beforeView.summary);
  assert.equal(controller.getView().entryCount, 1);
  assert.equal(controller.getView().errorCode, "DRAFT_DELETE_FAILED");
  assert.equal(storage.values.get(key), beforeRaw);
});

test("unknown or cloud-only entry identity cannot delete local drafts", async () => {
  const storage = storagePort();
  const controller = runtime.createEmployeeNextSessionDraftController(storage);
  await controller.restore(staff());
  await controller.addToSession({
    sessionId: "guard-session",
    entry: entry("rent", 1),
  });
  const before = structuredClone(controller.getSession());
  const result = await controller.removeLocalDraft("cloud-entry");
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRAFT_ENVELOPE_INVALID");
  assert.deepEqual(controller.getSession(), before);
  assert.equal(
    storage.calls.some(([method]) => method === "removeItem"),
    false,
  );
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.textContent = "";
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
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

test("sidecar renders restoring then true summary and add never calls business transport", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    let resolveGet;
    const storage = storagePort();
    storage.getItem = (key) => {
      storage.calls.push(["getItem", key]);
      return new Promise((resolve) => {
        resolveGet = resolve;
      });
    };
    let businessRequests = 0;
    const adapters = {
      submitPath: "/unit-test-submit",
      transport: {
        async request() {
          businessRequests += 1;
          return { status: 500, body: null };
        },
      },
      buildApiRequest() {
        throw new Error("not used");
      },
      async restoreSession() {
        return staff();
      },
    };
    const root = new FakeElement("main");
    const sidecar = runtime.startEmployeeNextSidecarRoute(root, adapters, {
      draftStorage: storage,
      now: () => "2026-07-27T08:00:00.000Z",
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.match(visibleText(root), /Restoring (?:session|draft)/u);
    assert.doesNotMatch(visibleText(root), /Current Session \(0\)/u);

    resolveGet(null);
    assert.equal(await sidecar.sessionRestore, true);
    assert.match(visibleText(root), /Current Session \(0\)/u);
    assert.match(visibleText(root), /Bed Transfer/u);

    assert.equal(await sidecar.addToSession({
      sessionId: "session-ui",
      entry: entry("rent", 1, {
        cash_amount_aed: 1_300,
        bank_amount_aed: 0,
      }),
    }), true);
    assert.match(visibleText(root), /Current Session \(1\)/u);
    assert.match(visibleText(root), /Cash Received: AED 1300\.00/u);
    assert.match(visibleText(root), /Bank Received: AED 0\.00/u);
    assert.equal(businessRequests, 0);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("sidecar auth failure does not read drafts or render a false zero", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const storage = storagePort();
    const root = new FakeElement("main");
    root.append(Object.assign(new FakeElement("p"), {
      textContent: "Authentication: AUTHENTICATED Current Session (1) Upload Session",
    }));
    let businessRequests = 0;
    const sidecar = runtime.startEmployeeNextSidecarRoute(root, {
      submitPath: "/unit-test-submit",
      transport: {
        async request() {
          businessRequests += 1;
          throw new Error("not used");
        },
      },
      buildApiRequest() { throw new Error("not used"); },
      async restoreSession() {
        throw new Error("private auth detail");
      },
    }, { draftStorage: storage });
    assert.equal(await sidecar.sessionRestore, false);
    assert.equal(storage.calls.length, 0);
    assert.match(visibleText(root), /Draft unavailable/u);
    assert.doesNotMatch(visibleText(root), /Current Session \(0\)/u);
    assert.doesNotMatch(visibleText(root), /Authentication: AUTHENTICATED/u);
    assert.doesNotMatch(visibleText(root), /Current Session \(1\)/u);
    assert.doesNotMatch(visibleText(root), /Upload Session/u);
    assert.doesNotMatch(visibleText(root), /Expense date/u);
    assert.equal(businessRequests, 0);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("contradictory auth envelopes render no authenticated session or event form", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const staleStaff = {
      userid: "employee-stale",
      employee_id: "employee-stale",
      display_name: "Stale Staff",
      corpid: "homelink",
      role: "staff",
    };
    for (const body of [
      { code: 0, success: false, data: staleStaff },
      { code: 0, error: "session expired", data: { user: staleStaff } },
      { code: 40_101, data: staleStaff },
    ]) {
      const storage = storagePort();
      let businessRequests = 0;
      const adapters = runtime.createEmployeeNextSidecarAdapters({
        requestPort: {
          async request(path) {
            if (path === "/api/me") {
              return { status: 200, async json() { return body; } };
            }
            businessRequests += 1;
            return { status: 500, async json() { return null; } };
          },
        },
        sessionPath: "/api/me",
        submitPath: "/api/employee/entry",
      });
      const root = new FakeElement("main");
      root.append(Object.assign(new FakeElement("p"), {
        textContent: "Authentication: AUTHENTICATED Current Session (1)",
      }));
      const sidecar = runtime.startEmployeeNextSidecarRoute(
        root,
        adapters,
        { draftStorage: storage },
      );
      assert.equal(await sidecar.sessionRestore, false);
      assert.equal(storage.calls.length, 0);
      assert.doesNotMatch(visibleText(root), /Authentication: AUTHENTICATED/u);
      assert.doesNotMatch(visibleText(root), /Current Session/u);
      assert.doesNotMatch(visibleText(root), /Expense date/u);
      assert.doesNotMatch(visibleText(root), /Upload Session/u);
      assert.equal(businessRequests, 0);
    }
  } finally {
    globalThis.document = previousDocument;
  }
});

test("source uses only the new scoped namespace and no legacy/global fallback key", async () => {
  const sources = await Promise.all([
    readFile(resolve(employeeNextRoot, "src", "session-draft.ts"), "utf8"),
    readFile(resolve(employeeNextRoot, "src", "core", "draft-store.ts"), "utf8"),
    readFile(resolve(employeeNextRoot, "src", "main.ts"), "utf8"),
  ]);
  const combined = sources.join("\n");
  assert.match(combined, /homelink:employee-next:draft:v1:/u);
  assert.doesNotMatch(
    combined,
    /homelink:employee:(?!next)|global[_:-]?draft|fallback[_:-]?draft/iu,
  );
  assert.doesNotMatch(
    combined,
    /\b(?:POST|PUT|PATCH|DELETE)\b.*(?:draft|localStorage)/u,
  );
});
