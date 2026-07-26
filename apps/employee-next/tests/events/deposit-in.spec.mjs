import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const depositInPath = resolve(
  employeeNextRoot,
  "src",
  "events",
  "deposit-in",
  "index.ts",
);
const eventContractPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "event-contract.ts",
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
const depositInSource = await readFile(depositInPath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [depositInPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const depositInModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_DEPOSIT_IN_EVENT_ID",
  "EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS",
  "EMPLOYEE_DEPOSIT_IN_VALIDATION_CODES",
  "createEmployeeDepositInEventContract",
  "isEmployeeDepositInDraft",
  "isEmployeeDepositInPaymentMethod",
];
const paymentMethods = ["cash", "bank", "mixed"];
const validationCodes = [
  "DEPOSIT_IN_DRAFT_NOT_OBJECT",
  "DEPOSIT_IN_BED_REQUIRED",
  "DEPOSIT_IN_AMOUNT_REQUIRED",
  "DEPOSIT_IN_AMOUNT_INVALID",
  "DEPOSIT_IN_PAYMENT_METHOD_INVALID",
  "DEPOSIT_IN_PAYMENT_LEGS_INVALID",
  "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH",
  "DEPOSIT_IN_RECEIVED_DATE_REQUIRED",
  "DEPOSIT_IN_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
  "DEPOSIT_IN_EXISTING_DEPOSIT_NOTE_REQUIRED",
  "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN",
];

function cashDraft(overrides = {}) {
  return {
    bedLabel: "B-301",
    depositAmountAed: 500,
    paymentMethod: "cash",
    cashReceivedAed: 500,
    bankReceivedAed: 0,
    depositReceivedDate: "2026-07-26",
    currentDepositSnapshotAed: null,
    note: "",
    ...overrides,
  };
}

function bankDraft(overrides = {}) {
  return cashDraft({
    paymentMethod: "bank",
    cashReceivedAed: 0,
    bankReceivedAed: 500,
    ...overrides,
  });
}

function mixedDraft(overrides = {}) {
  return cashDraft({
    paymentMethod: "mixed",
    cashReceivedAed: 200,
    bankReceivedAed: 300,
    ...overrides,
  });
}

test("deposit-in runtime success contract", () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };

  check(() => assert.deepEqual(
    Object.keys(depositInModule).sort(),
    runtimeExports,
  ));
  check(() => assert.equal(
    depositInModule.EMPLOYEE_DEPOSIT_IN_EVENT_ID,
    "deposit-in",
  ));
  check(() => assert.deepEqual(
    depositInModule.EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS,
    paymentMethods,
  ));
  check(() => assert.equal(
    Object.isFrozen(depositInModule.EMPLOYEE_DEPOSIT_IN_PAYMENT_METHODS),
    true,
  ));
  check(() => assert.deepEqual(
    depositInModule.EMPLOYEE_DEPOSIT_IN_VALIDATION_CODES,
    validationCodes,
  ));
  check(() => assert.equal(
    Object.isFrozen(depositInModule.EMPLOYEE_DEPOSIT_IN_VALIDATION_CODES),
    true,
  ));

  const firstContract = depositInModule.createEmployeeDepositInEventContract();
  const secondContract = depositInModule.createEmployeeDepositInEventContract();
  check(() => assert.equal(firstContract.eventId, "deposit-in"));
  check(() => assert.equal(firstContract.displayName, "Deposit In"));
  check(() => assert.notEqual(firstContract, secondContract));
  check(() => assert.equal(Object.isFrozen(firstContract), true));

  const initialDraft = firstContract.createInitialDraft();
  check(() => assert.deepEqual(initialDraft, {
    bedLabel: "",
    depositAmountAed: null,
    paymentMethod: "cash",
    cashReceivedAed: null,
    bankReceivedAed: null,
    depositReceivedDate: "",
    currentDepositSnapshotAed: null,
    note: "",
  }));
  check(() => assert.equal(Object.isFrozen(initialDraft), true));
  check(() => assert.equal(
    depositInModule.isEmployeeDepositInDraft(cashDraft()),
    true,
  ));
  check(() => assert.equal(
    depositInModule.isEmployeeDepositInPaymentMethod("cash"),
    true,
  ));
  check(() => assert.equal(
    depositInModule.isEmployeeDepositInPaymentMethod("Cash"),
    false,
  ));

  const cash = cashDraft({
    bedLabel: " B-301 ",
    note: " collected in office ",
  });
  const cashBefore = structuredClone(cash);
  const cashSubmission = firstContract.buildSubmission(cash);
  check(() => assert.deepEqual(cash, cashBefore));
  check(() => assert.deepEqual(cashSubmission, {
    eventId: "deposit-in",
    schemaVersion: 1,
    displayName: "Deposit In",
    bedLabel: "B-301",
    depositAmountAed: 500,
    payment: {
      method: "cash",
      legs: [{ method: "cash", amountAed: 500 }],
    },
    depositReceivedDate: "2026-07-26",
    currentDepositSnapshotAed: null,
    accountingPreview: {
      depositReceivedAed: 500,
      rentIncomeAed: 0,
      currentDepositMutationAed: 0,
    },
    reconciliationPreview: {
      currentDepositReconciliationRequired: true,
      reason: "deposit-in-does-not-control-current-balance",
    },
    note: "collected in office",
  }));
  check(() => assert.equal(cashSubmission.depositReceivedDate, "2026-07-26"));
  check(() => assert.equal(cashSubmission.currentDepositSnapshotAed, null));
  check(() => assert.equal(
    cashSubmission.accountingPreview.depositReceivedAed,
    500,
  ));
  check(() => assert.equal(cashSubmission.accountingPreview.rentIncomeAed, 0));
  check(() => assert.equal(
    cashSubmission.accountingPreview.currentDepositMutationAed,
    0,
  ));
  check(() => assert.equal(
    cashSubmission.reconciliationPreview.currentDepositReconciliationRequired,
    true,
  ));
  check(() => assert.equal(
    cashSubmission.reconciliationPreview.reason,
    "deposit-in-does-not-control-current-balance",
  ));
  check(() => assert.equal(Object.isFrozen(cashSubmission), true));
  check(() => assert.equal(Object.isFrozen(cashSubmission.payment), true));
  check(() => assert.equal(Object.isFrozen(cashSubmission.payment.legs), true));
  check(() => assert.equal(
    Object.isFrozen(cashSubmission.payment.legs[0]),
    true,
  ));
  check(() => assert.equal(
    Object.isFrozen(cashSubmission.accountingPreview),
    true,
  ));
  check(() => assert.equal(
    Object.isFrozen(cashSubmission.reconciliationPreview),
    true,
  ));

  const bankSubmission = firstContract.buildSubmission(bankDraft());
  check(() => assert.deepEqual(bankSubmission.payment.legs, [
    { method: "bank", amountAed: 500 },
  ]));

  const mixedSubmission = firstContract.buildSubmission(mixedDraft());
  check(() => assert.deepEqual(mixedSubmission.payment.legs, [
    { method: "cash", amountAed: 200 },
    { method: "bank", amountAed: 300 },
  ]));

  const normalizedSubmission = firstContract.buildSubmission(mixedDraft({
    depositAmountAed: 100.1,
    cashReceivedAed: 40.05,
    bankReceivedAed: 60.05,
    currentDepositSnapshotAed: 75.1,
    note: " existing deposit confirmed ",
  }));
  check(() => assert.deepEqual(normalizedSubmission.payment.legs, [
    { method: "cash", amountAed: 40.05 },
    { method: "bank", amountAed: 60.05 },
  ]));
  check(() => assert.equal(
    normalizedSubmission.currentDepositSnapshotAed,
    75.1,
  ));
  check(() => assert.equal(
    normalizedSubmission.note,
    "existing deposit confirmed",
  ));

  const zeroSnapshot = firstContract.buildSubmission(
    cashDraft({ currentDepositSnapshotAed: 0 }),
  );
  check(() => assert.equal(zeroSnapshot.currentDepositSnapshotAed, 0));

  const issues = firstContract.validateDraft(cashDraft());
  check(() => assert.deepEqual(issues, []));
  check(() => assert.equal(Object.isFrozen(issues), true));
  assert.ok(successCases >= 28);
});

test("deposit-in runtime fail-closed contract", () => {
  const contract = depositInModule.createEmployeeDepositInEventContract();
  const invalidCases = [
    [null, "DEPOSIT_IN_DRAFT_NOT_OBJECT"],
    [[], "DEPOSIT_IN_DRAFT_NOT_OBJECT"],
    [{ ...cashDraft(), unexpected: true }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [cashDraft({ bedLabel: "" }), "DEPOSIT_IN_BED_REQUIRED"],
    [cashDraft({ bedLabel: "   " }), "DEPOSIT_IN_BED_REQUIRED"],
    [cashDraft({ depositAmountAed: null }), "DEPOSIT_IN_AMOUNT_REQUIRED"],
    [cashDraft({ depositAmountAed: Number.NaN }), "DEPOSIT_IN_AMOUNT_INVALID"],
    [cashDraft({ depositAmountAed: Number.POSITIVE_INFINITY }), "DEPOSIT_IN_AMOUNT_INVALID"],
    [cashDraft({ depositAmountAed: 0 }), "DEPOSIT_IN_AMOUNT_INVALID"],
    [cashDraft({ depositAmountAed: -1 }), "DEPOSIT_IN_AMOUNT_INVALID"],
    [cashDraft({ depositAmountAed: 1.001 }), "DEPOSIT_IN_AMOUNT_INVALID"],
    [cashDraft({ paymentMethod: "crypto" }), "DEPOSIT_IN_PAYMENT_METHOD_INVALID"],
    [cashDraft({ paymentMethod: "CASH" }), "DEPOSIT_IN_PAYMENT_METHOD_INVALID"],
    [cashDraft({ paymentMethod: "cash_payment" }), "DEPOSIT_IN_PAYMENT_METHOD_INVALID"],
    [cashDraft({ paymentMethod: "cash " }), "DEPOSIT_IN_PAYMENT_METHOD_INVALID"],
    [cashDraft({ cashReceivedAed: null }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [cashDraft({ bankReceivedAed: 1 }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [cashDraft({ cashReceivedAed: 499 }), "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH"],
    [bankDraft({ bankReceivedAed: null }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [bankDraft({ cashReceivedAed: 1 }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [bankDraft({ bankReceivedAed: 499 }), "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH"],
    [mixedDraft({ cashReceivedAed: 0, bankReceivedAed: 500 }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [mixedDraft({ cashReceivedAed: 500, bankReceivedAed: 0 }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [mixedDraft({ cashReceivedAed: null }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [mixedDraft({ bankReceivedAed: null }), "DEPOSIT_IN_PAYMENT_LEGS_INVALID"],
    [mixedDraft({ cashReceivedAed: 190, bankReceivedAed: 300 }), "DEPOSIT_IN_PAYMENT_TOTAL_MISMATCH"],
    [cashDraft({ depositReceivedDate: "" }), "DEPOSIT_IN_RECEIVED_DATE_REQUIRED"],
    [cashDraft({ depositReceivedDate: "26/07/2026" }), "DEPOSIT_IN_RECEIVED_DATE_REQUIRED"],
    [cashDraft({ currentDepositSnapshotAed: Number.NaN }), "DEPOSIT_IN_CURRENT_DEPOSIT_SNAPSHOT_INVALID"],
    [cashDraft({ currentDepositSnapshotAed: -1 }), "DEPOSIT_IN_CURRENT_DEPOSIT_SNAPSHOT_INVALID"],
    [cashDraft({ currentDepositSnapshotAed: 1.001 }), "DEPOSIT_IN_CURRENT_DEPOSIT_SNAPSHOT_INVALID"],
    [cashDraft({ currentDepositSnapshotAed: 50, note: "" }), "DEPOSIT_IN_EXISTING_DEPOSIT_NOTE_REQUIRED"],
    [cashDraft({ currentDepositSnapshotAed: 50, note: "   " }), "DEPOSIT_IN_EXISTING_DEPOSIT_NOTE_REQUIRED"],
    [{ ...cashDraft(), providerPhone: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), phone: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), cardId: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), tenantCardId: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), ttlockId: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), customerName: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), tenantName: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), arrearsRef: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), cloudArrearsRef: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), refundReason: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), checkoutType: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), event_type: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...cashDraft(), type: "hidden" }, "DEPOSIT_IN_PROVIDER_IDENTITY_FORBIDDEN"],
  ];

  for (const [draft, expectedCode] of invalidCases) {
    const issues = contract.validateDraft(draft);
    assert.ok(
      issues.some((entry) => entry.code === expectedCode),
      expectedCode,
    );
    assert.equal(Object.isFrozen(issues), true);
    for (const entry of issues) {
      assert.equal(Object.isFrozen(entry), true);
      assert.equal(entry.severity, "ERROR");
    }
    assert.throws(
      () => contract.buildSubmission(draft),
      { message: "EMPLOYEE_DEPOSIT_IN_INVALID_DRAFT" },
    );
  }

  const sensitiveDraft = cashDraft({
    bedLabel: "BED-PRIVATE-987",
    depositAmountAed: 678.9,
    cashReceivedAed: 678.9,
    note: "private-token-value",
  });
  assert.throws(
    () => contract.buildSubmission({
      ...sensitiveDraft,
      depositAmountAed: 100,
    }),
    (error) => {
      assert.equal(error.message, "EMPLOYEE_DEPOSIT_IN_INVALID_DRAFT");
      assert.doesNotMatch(
        error.message,
        /BED-PRIVATE|678|private-token-value|token|secret|header/iu,
      );
      return true;
    },
  );

  assert.ok(invalidCases.length >= 36);
});

function semanticDiagnosticsFor(source) {
  const virtualFileName = resolve(employeeNextRoot, "tests", "deposit-in-fixture.ts");
  const compilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (resolve(fileName) === virtualFileName) {
      return ts.createSourceFile(
        fileName,
        source,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    if (resolve(fileName) === depositInPath) {
      return ts.createSourceFile(
        fileName,
        depositInSource,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    if (resolve(fileName) === eventContractPath) {
      return ts.createSourceFile(
        fileName,
        eventContractSource,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    return originalGetSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreate,
    );
  };
  host.fileExists = (fileName) => (
    [virtualFileName, depositInPath, eventContractPath]
      .some((candidate) => resolve(fileName) === candidate)
    || ts.sys.fileExists(fileName)
  );
  host.readFile = (fileName) => {
    if (resolve(fileName) === virtualFileName) {
      return source;
    }
    if (resolve(fileName) === depositInPath) {
      return depositInSource;
    }
    if (resolve(fileName) === eventContractPath) {
      return eventContractSource;
    }
    return ts.sys.readFile(fileName);
  };
  const program = ts.createProgram([virtualFileName], compilerOptions, host);
  return ts.getPreEmitDiagnostics(program);
}

test("deposit-in TypeScript semantic fixtures", () => {
  const imports = `import {
    createEmployeeDepositInEventContract,
    type EmployeeDepositInDraft,
    type EmployeeDepositInEventContract,
    type EmployeeDepositInPaymentLeg,
    type EmployeeDepositInPaymentMethod,
    type EmployeeDepositInSubmission,
  } from "../src/events/deposit-in/index";
  import type { EmployeeEventContract } from "../src/core/event-contract";`;
  const validDraft = `{
    bedLabel: "B-301",
    depositAmountAed: 500,
    paymentMethod: "cash",
    cashReceivedAed: 500,
    bankReceivedAed: 0,
    depositReceivedDate: "2026-07-26",
    currentDepositSnapshotAed: null,
    note: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeDepositInPaymentMethod = "cash"; void value;`,
    `${imports} const value: EmployeeDepositInDraft = ${validDraft}; void value;`,
    `${imports} declare const value: EmployeeDepositInSubmission; const id: "deposit-in" = value.eventId; void id;`,
    `${imports} const value: EmployeeDepositInPaymentLeg = { method: "bank", amountAed: 25 }; void value;`,
    `${imports} const value: EmployeeDepositInEventContract = createEmployeeDepositInEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeDepositInDraft, EmployeeDepositInSubmission> = createEmployeeDepositInEventContract(); void value;`,
    `${imports} const contract = createEmployeeDepositInEventContract(); const value: EmployeeDepositInSubmission = contract.buildSubmission(${validDraft}); void value;`,
    `${imports} declare const value: EmployeeDepositInSubmission; const zero: 0 = value.accountingPreview.rentIncomeAed; void zero;`,
    `${imports} declare const value: EmployeeDepositInSubmission; const zero: 0 = value.accountingPreview.currentDepositMutationAed; void zero;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeDepositInPaymentMethod = "crypto";`, /crypto/u],
    [`${imports} const value: EmployeeDepositInDraft = { depositAmountAed: 1 };`, /bedLabel/u],
    [`${imports} const value: EmployeeDepositInDraft = { ...${validDraft}, depositAmountAed: undefined };`, /undefined/u],
    [`${imports} const value: EmployeeDepositInDraft = { ...${validDraft}, depositAmountAed: "500" };`, /string/u],
    [`${imports} const value: EmployeeDepositInDraft = { ...${validDraft}, providerPhone: "x" };`, /providerPhone/u],
    [`${imports} const value: EmployeeDepositInDraft = { ...${validDraft}, event_type: "x" };`, /event_type/u],
    [`${imports} const value: EmployeeDepositInDraft = { ...${validDraft}, cloudArrearsRef: "x" };`, /cloudArrearsRef/u],
    [`${imports} const value: EmployeeDepositInPaymentLeg = { method: "mixed", amountAed: 25 };`, /mixed/u],
    [`${imports} const value: EmployeeDepositInSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeDepositInSubmission; const id: "rent" = value.eventId;`, /deposit-in/u],
    [`${imports} declare const value: EmployeeDepositInSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} declare const value: EmployeeDepositInSubmission; const invalid: 1 = value.accountingPreview.rentIncomeAed;`, /0/u],
    [`${imports} declare const value: EmployeeDepositInSubmission; const invalid: 1 = value.accountingPreview.currentDepositMutationAed;`, /0/u],
    [`${imports} const value: EmployeeDepositInEventContract = { eventId: "deposit-in", displayName: "Deposit In", createInitialDraft() { return ${validDraft}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeDepositInEventContract = { ...createEmployeeDepositInEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
    [`${imports} declare const value: string; const method: EmployeeDepositInPaymentMethod = value;`, /string/u],
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

test("deposit-in source boundary excludes integrations and identity fields", async () => {
  assert.match(
    depositInSource,
    /from "\.\.\/\.\.\/core\/event-contract"/u,
  );
  assert.doesNotMatch(
    depositInSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:rent|arrears-payment|deposit-out|checkout|expense|bed-transfer)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    depositInSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    depositInSource,
    /tenant_card_id|card_id|old_ttlock_ref|provider_phone|providerPhone|phone|ttlockId|customerName|tenantName|previewText|whatsappText|arrearsRef|cloudArrearsRef|refundReason|checkoutType|event_type|canonical_anchor_id|deposit_ledger_id|finance_ledger_id|owner_history_id|sync_state_id|real_endpoint|headers|token|idempotency_key/iu,
  );
  assert.doesNotMatch(
    depositInSource,
    /createEmployeeEventRegistry|register|singleton|canonical anchor|deposit ledger|finance ledger|owner history|sync state/iu,
  );

  const rentSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "rent", "index.ts"),
    "utf8",
  );
  const arrearsPaymentSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "arrears-payment", "index.ts"),
    "utf8",
  );
  assert.match(rentSource, /EMPLOYEE_RENT_EVENT_ID/u);
  assert.match(
    arrearsPaymentSource,
    /EMPLOYEE_ARREARS_PAYMENT_EVENT_ID/u,
  );
  const depositOutSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "deposit-out", "index.ts"),
    "utf8",
  );
  assert.match(depositOutSource, /EMPLOYEE_DEPOSIT_OUT_EVENT_ID/u);
  const checkoutSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "checkout", "index.ts"),
    "utf8",
  );
  assert.match(checkoutSource, /EMPLOYEE_CHECKOUT_EVENT_ID/u);

  const placeholders = new Map([
    ["expense", 'export const expenseScaffold = "expense-scaffold";\n'],
    ["bed-transfer", 'export const bedTransferScaffold = "bed-transfer-scaffold";\n'],
  ]);
  for (const [directory, expected] of placeholders) {
    const source = await readFile(
      resolve(employeeNextRoot, "src", "events", directory, "index.ts"),
      "utf8",
    );
    assert.equal(source.replaceAll("\r\n", "\n"), expected);
  }
});
