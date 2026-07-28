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
const requireFromRepository = createRequire(resolve(sourceRepositoryRoot, "package.json"));
const esbuild = requireFromRepository("esbuild");

const entryPath = resolve(employeeNextRoot, "src", "ui", "event-entry-templates.ts");
const mainPath = resolve(employeeNextRoot, "src", "main.ts");
const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [entryPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const runtime = await import(`data:text/javascript;base64,${
  Buffer.from(bundle.outputFiles[0].text).toString("base64")
}`);
const mainBundle = await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  stdin: {
    contents: `
      export { startEmployeeNextSidecarRoute } from "./src/main.ts";
      export { createEmployeeSevenEventRegistry } from "./src/events/index.ts";
    `,
    loader: "ts",
    resolveDir: employeeNextRoot,
    sourcefile: "employee-next-entry-template-test.ts",
  },
  write: false,
});
const mainRuntime = await import(`data:text/javascript;base64,${
  Buffer.from(mainBundle.outputFiles[0].text).toString("base64")
}`);

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.textContent = "";
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.type = "";
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

function all(root) {
  return [root, ...root.children.flatMap((child) => all(child))];
}

function byDataset(root, key, value) {
  return all(root).find((element) => element.dataset?.[key] === value);
}

function visibleText(root) {
  return all(root).map((element) => element.textContent).join("\n");
}

function staff() {
  return {
    user: {
      employeeId: "staff-a",
      userid: "staff-a",
      corpid: "homelink",
      displayName: "Staff A",
      role: "STAFF",
    },
  };
}

function sourceSnapshot() {
  return {
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
  };
}

function targetSnapshot() {
  return {
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
  };
}

const contexts = {
  rent: {
    ready: true,
    values: { amountDueAed: 1_000 },
    summary: "Expected rent verified.",
  },
  "arrears-payment": {
    ready: true,
    values: { cloudArrearsRef: "AR-CLOUD-001", remainingArrearsAed: 250 },
    summary: "Cloud arrears verified.",
  },
  "deposit-in": {
    ready: true,
    values: { depositRequiredTotalAed: 1_000, currentDepositSnapshotAed: 0 },
    summary: "Deposit context verified.",
  },
  "deposit-out": {
    ready: true,
    values: {
      currentDepositSnapshotAed: 500,
      openArrears: [],
      openArrearsTotalAed: 0,
      openArrearsSnapshotComplete: true,
      openArrearsSummary: "No open arrears.",
    },
    summary: "TTLock D snapshot verified.",
  },
  checkout: {
    ready: true,
    values: {
      currentDepositSnapshotAed: 500,
      outstandingArrearsSnapshotAed: 0,
      cloudArrearsRef: "",
    },
    summary: "Checkout context verified.",
  },
  expense: {
    ready: true,
    values: {},
    summary: "No business identity required.",
  },
  "bed-transfer": {
    ready: true,
    values: {
      companyScope: "homelink",
      sourceAccessSnapshot: sourceSnapshot(),
      targetAccessSnapshot: targetSnapshot(),
      cloudArrearsRef: "",
      carriedArrearsAmountAed: null,
    },
    summary: "Source and target context verified.",
  },
};

const editable = {
  rent: {
    bedLabel: "A-101",
    rentPeriodStart: "2026-07-01",
    rentPeriodEnd: "2026-08-01",
    amountReceivedAed: 1_000,
    paymentMethod: "cash",
  },
  "arrears-payment": {
    bedLabel: "B-201",
    amountReceivedAed: 250,
    paymentMethod: "cash",
    repaymentDate: "2026-07-27",
  },
  "deposit-in": {
    bedLabel: "B-301",
    depositAmountAed: 500,
    paymentMethod: "cash",
    depositReceivedDate: "2026-07-27",
  },
  "deposit-out": {
    bedLabel: "B-401",
    refundAmountAed: 500,
    refundMethod: "cash",
    refundDate: "2026-07-27",
    arrearsNonRepaymentReason: "",
  },
  checkout: {
    bedLabel: "B-501",
    checkoutDate: "2026-07-27",
    checkoutMode: "normal",
    depositRefundAed: 0,
    depositDifferenceReason: "Owner reconciliation required",
  },
  expense: {
    targetRoom: "LOCAL-CANARY",
    expenseAmountAed: 1,
    paymentMethod: "cash",
    expenseDescription: "LOCAL_DRAFT_CANARY_TEST",
  },
  "bed-transfer": {
    fromBed: "144",
    toBed: "122",
    transferDate: "2026-07-27",
    transferReason: "Operational transfer",
    transferFeeMode: "paid",
    transferFeeAmountAed: 50,
    transferFeePaymentMethod: "cash",
    bedPriceDifferenceMode: "none",
    bedPriceDifferenceAmountAed: 0,
    bedPriceDifferencePaymentMethod: "none",
  },
};

function complete(template, context, values) {
  let draft = template.createInitialFormState(context);
  for (const [field, value] of Object.entries(values)) {
    draft = template.updateFormState(draft, field, value, context);
  }
  return draft;
}

test("seven independent templates dispatch exact event contracts and fail closed", () => {
  const registry = runtime.createEmployeeEntryTemplateRegistry(
    mainRuntime.createEmployeeSevenEventRegistry(),
  );
  assert.deepEqual(registry.eventTypes, [
    "rent",
    "arrears-payment",
    "deposit-in",
    "deposit-out",
    "checkout",
    "expense",
    "bed-transfer",
  ]);
  assert.equal(registry.get(undefined), undefined);
  assert.equal(registry.get("unknown"), undefined);

  for (const eventType of registry.eventTypes) {
    const template = registry.get(eventType);
    const context = contexts[eventType];
    const draft = complete(template, context, editable[eventType]);
    assert.deepEqual(template.validate(draft, context), [], eventType);
    const entry = template.buildDraftEntry(draft, `entry-${eventType}`, context);
    assert.equal(entry.event_type, eventType);
    assert.equal(entry.entry_id, `entry-${eventType}`);
    assert.equal(entry.payload.eventId, eventType);
    assert.equal(Object.isFrozen(entry), true);

    const incomplete = template.createInitialFormState(context);
    assert.ok(template.validate(incomplete, context).length > 0, eventType);
    assert.throws(
      () => template.buildDraftEntry(incomplete, "entry-invalid", context),
      /EMPLOYEE_ENTRY_TEMPLATE_INVALID_DRAFT/u,
    );
  }

  const rent = registry.get("rent");
  const expense = registry.get("expense");
  assert.equal(rent.employeeEditableFields.includes("expenseAmountAed"), false);
  assert.equal(expense.employeeEditableFields.includes("amountDueAed"), false);
  assert.equal(expense.employeeEditableFields.includes("fromBed"), false);
});

test("context-dependent events block while safe local expense remains available", () => {
  const registry = runtime.createEmployeeEntryTemplateRegistry(
    mainRuntime.createEmployeeSevenEventRegistry(),
  );
  for (const eventType of [
    "rent",
    "arrears-payment",
    "deposit-in",
    "deposit-out",
    "checkout",
    "bed-transfer",
  ]) {
    const template = registry.get(eventType);
    const draft = template.createInitialFormState({
      ready: false,
      values: {},
      summary: "Unavailable",
    });
    assert.ok(
      template.validate(draft, { ready: false, values: {}, summary: "Unavailable" })
        .some((entry) => entry.code.endsWith("CONTEXT_UNAVAILABLE")),
      eventType,
    );
  }
  const expense = registry.get("expense");
  const oneAed = complete(expense, contexts.expense, editable.expense);
  assert.deepEqual(expense.validate(oneAed, contexts.expense), []);
  assert.equal(oneAed.targetRoom, "LOCAL-CANARY");
  assert.equal(Object.hasOwn(oneAed, "tenantId"), false);

  const fifty = complete(expense, contexts.expense, {
    ...editable.expense,
    expenseAmountAed: 50,
  });
  assert.deepEqual(expense.validate(fifty, contexts.expense), []);

  const hundredWithoutEvidence = complete(expense, contexts.expense, {
    ...editable.expense,
    expenseAmountAed: 100,
  });
  assert.deepEqual(expense.validate(hundredWithoutEvidence, contexts.expense), []);
  assert.deepEqual(
    expense.employeeEditableFields,
    ["targetRoom", "expenseAmountAed", "paymentMethod", "expenseDescription"],
  );
});

test("Bed Transfer form is local-capable and explicitly keeps formal write disabled", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const registry = runtime.createEmployeeEntryTemplateRegistry(
      mainRuntime.createEmployeeSevenEventRegistry(),
    );
    const template = registry.get("bed-transfer");
    const draft = complete(
      template,
      contexts["bed-transfer"],
      editable["bed-transfer"],
    );
    const root = new FakeElement("section");
    template.mount(root, {
      draft,
      context: contexts["bed-transfer"],
      issues: template.validate(draft, contexts["bed-transfer"]),
      canAdd: true,
      busy: false,
      onChange() {},
      onAdd() {},
    });
    assert.match(visibleText(root), /Formal Bed Transfer write: disabled/u);
    assert.equal(byDataset(root, "action", "add-to-session").disabled, false);
    assert.equal(
      template.buildDraftEntry(
        draft,
        "bed-transfer-local",
        contexts["bed-transfer"],
      ).event_type,
      "bed-transfer",
    );
  } finally {
    globalThis.document = previousDocument;
  }
});

test("Expense money inputs preserve the original decimal text before validation", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const registry = runtime.createEmployeeEntryTemplateRegistry(
      mainRuntime.createEmployeeSevenEventRegistry(),
    );
    const template = registry.get("expense");
    const draft = template.createInitialFormState();
    const changes = [];
    const root = new FakeElement("section");
    template.mount(root, {
      draft,
      issues: [],
      canAdd: false,
      busy: false,
      onChange(field, value) {
        changes.push([field, value]);
      },
      onAdd() {},
    });
    const amount = byDataset(root, "fieldInput", "expenseAmountAed");
    amount.value = "100000000000000.25";
    amount.listeners.get("input")();
    assert.deepEqual(changes.at(-1), [
      "expenseAmountAed",
      "100000000000000.25",
    ]);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("real Expense DOM Add to Session is scoped, atomic, and transport-free", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const values = new Map();
    const storageCalls = [];
    const storage = {
      getItem(key) {
        storageCalls.push(["getItem", key]);
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        storageCalls.push(["setItem", key]);
        values.set(key, value);
      },
      removeItem(key) {
        storageCalls.push(["removeItem", key]);
        values.delete(key);
      },
    };
    let businessRequests = 0;
    let id = 0;
    const root = new FakeElement("main");
    const sidecar = mainRuntime.startEmployeeNextSidecarRoute(root, {
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
    }, {
      draftStorage: storage,
      now: () => "2026-07-27T12:00:00.000Z",
      createId: () => String(++id),
      confirmLocalDraftRemoval: () => true,
    });
    assert.equal(await sidecar.sessionRestore, true);

    const expenseChoice = byDataset(root, "eventId", "expense");
    expenseChoice.listeners.get("click")();
    await Promise.resolve();

    async function enter(field, value) {
      const input = byDataset(root, "fieldInput", field);
      assert.ok(input, field);
      if (typeof value === "boolean") input.checked = value;
      else input.value = String(value);
      input.listeners.get("input")();
      await Promise.resolve();
      await Promise.resolve();
    }

    await enter("targetRoom", "LOCAL-CANARY");
    await enter("expenseAmountAed", 1);
    await enter("paymentMethod", "cash");
    await enter("expenseDescription", "LOCAL_DRAFT_CANARY_TEST");

    const add = byDataset(root, "action", "add-to-session");
    assert.equal(add.disabled, false);
    add.listeners.get("click")();
    add.listeners.get("click")();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.match(visibleText(root), /Current Session \(1\)/u);
    assert.equal(sidecar.drafts.getSession().entries.length, 1);
    assert.equal(sidecar.drafts.getSession().entries[0].event_type, "expense");
    assert.equal(sidecar.drafts.getSession().entries[0].payload.eventId, "expense");
    assert.equal(
      storageCalls.filter(([method]) => method === "setItem").length,
      1,
    );
    assert.equal(businessRequests, 0);
    assert.match(storageCalls[1][1], /^homelink:employee-next:draft:v1:/u);
    assert.match(visibleText(root), /Cash Received: AED 0\.00/u);
    assert.match(visibleText(root), /Bank Received: AED 0\.00/u);
    assert.match(visibleText(root), /Total Received: AED 0\.00/u);
    assert.match(visibleText(root), /Expenses: AED 1\.00/u);
    assert.match(visibleText(root), /Cash Net: AED -1\.00/u);
    assert.match(visibleText(root), /Bank Net: AED 0\.00/u);
    assert.match(visibleText(root), /Net Funds: AED -1\.00/u);
    assert.match(
      visibleText(root),
      /expense — unsent local draft — AED 1\.00 — cash — LOCAL_DRAFT_CANARY_TEST/u,
    );

    const remove = byDataset(root, "action", "remove-local-draft");
    assert.ok(remove);
    remove.listeners.get("click")();
    remove.listeners.get("click")();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.match(visibleText(root), /Current Session \(0\)/u);
    assert.equal(sidecar.drafts.getSession(), undefined);
    assert.equal(
      storageCalls.filter(([method]) => method === "removeItem").length,
      1,
    );
    assert.equal(values.size, 0);
    assert.equal(businessRequests, 0);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("storage failure retains Expense form values and Current Session count", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const storage = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("private storage detail");
      },
      removeItem() {
        throw new Error("not used");
      },
    };
    let id = 0;
    const root = new FakeElement("main");
    const sidecar = mainRuntime.startEmployeeNextSidecarRoute(root, {
      submitPath: "/unit-test-submit",
      transport: { async request() { throw new Error("not used"); } },
      buildApiRequest() { throw new Error("not used"); },
      async restoreSession() { return staff(); },
    }, {
      draftStorage: storage,
      createId: () => String(++id),
    });
    await sidecar.sessionRestore;
    byDataset(root, "eventId", "expense").listeners.get("click")();
    await Promise.resolve();

    async function enter(field, value) {
      const input = byDataset(root, "fieldInput", field);
      input.value = String(value);
      input.listeners.get("input")();
      await Promise.resolve();
      await Promise.resolve();
    }
    await enter("targetRoom", "LOCAL-CANARY");
    await enter("expenseAmountAed", 1);
    await enter("expenseDescription", "LOCAL_DRAFT_CANARY_TEST");
    byDataset(root, "action", "add-to-session").listeners.get("click")();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.match(visibleText(root), /Current Session \(0\)/u);
    assert.match(visibleText(root), /DRAFT_SAVE_FAILED/u);
    assert.equal(
      byDataset(root, "fieldInput", "expenseDescription").value,
      "LOCAL_DRAFT_CANARY_TEST",
    );
    assert.equal(sidecar.drafts.getSession(), undefined);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("Remove Local Draft storage failure keeps UI and memory unchanged", async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  try {
    const values = new Map();
    const storage = {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
      removeItem() {
        throw new Error("private delete detail");
      },
    };
    let businessRequests = 0;
    const root = new FakeElement("main");
    const sidecar = mainRuntime.startEmployeeNextSidecarRoute(root, {
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
    }, {
      draftStorage: storage,
      confirmLocalDraftRemoval: () => true,
    });
    await sidecar.sessionRestore;
    assert.equal(await sidecar.addToSession({
      sessionId: "delete-failure-session",
      entry: {
        entry_id: "delete-failure-entry",
        event_type: "expense",
        payload: {
          eventId: "expense",
          payment: {
            method: "cash",
            legs: [{ method: "cash", amountAed: 1 }],
          },
        },
        cash_amount_aed: 0,
        bank_amount_aed: 0,
      },
    }), true);

    const before = structuredClone(sidecar.drafts.getSession());
    const remove = byDataset(root, "action", "remove-local-draft");
    remove.listeners.get("click")();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(sidecar.drafts.getSession(), before);
    assert.match(visibleText(root), /Current Session \(1\)/u);
    assert.match(visibleText(root), /DRAFT_DELETE_FAILED/u);
    assert.equal(businessRequests, 0);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("template switch clears unsaved form without writing or changing session", async () => {
  const registry = mainRuntime.createEmployeeSevenEventRegistry();
  const calls = [];
  let renders = 0;
  const controller = runtime.createEmployeeEntryUiController({
    registry,
    contexts: { read(eventId) { return contexts[eventId]; } },
    createId: () => "fixed",
    addToSession: async (value) => {
      calls.push(value);
      return true;
    },
    session: () => undefined,
    draftView: () => ({
      status: "CURRENT_SESSION_READY",
      entryCount: 0,
      cashTotalAed: 0,
      bankTotalAed: 0,
    }),
    requestRender: () => {
      renders += 1;
    },
  });
  assert.equal(controller.selectEvent("expense"), true);
  const expenseBefore = controller.getDraft();
  assert.equal(controller.selectEvent("rent"), true);
  assert.equal(controller.getSelectedEvent(), "rent");
  assert.equal(controller.selectEvent("expense"), true);
  assert.deepEqual(controller.getDraft(), expenseBefore);
  assert.equal(calls.length, 0);
  assert.equal(renders, 3);
  assert.equal(controller.selectEvent("missing"), false);
  assert.equal(controller.getSelectedEvent(), undefined);
});

test("source contains no legacy/global key or business transport in Add path", async () => {
  const source = await readFile(entryPath, "utf8");
  assert.doesNotMatch(
    source,
    /homelink:employee:(?!next)|global[_:-]?draft|fallback[_:-]?draft/iu,
  );
  assert.doesNotMatch(
    source,
    /\b(?:fetch|XMLHttpRequest|sendBeacon)\b|\/api\//u,
  );
  assert.match(source, /Add to Session/u);
  assert.match(source, /DRAFT_SAVE_FAILED/u);
});
