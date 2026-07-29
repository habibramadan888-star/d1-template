import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, posix, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const arrearsPaymentPath = resolve(
  employeeNextRoot,
  "src",
  "events",
  "arrears-payment",
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
const arrearsPaymentSource = await readFile(arrearsPaymentPath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [arrearsPaymentPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const arrearsPaymentModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_ARREARS_PAYMENT_EVENT_ID",
  "EMPLOYEE_ARREARS_PAYMENT_METHODS",
  "EMPLOYEE_ARREARS_PAYMENT_VALIDATION_CODES",
  "createEmployeeArrearsPaymentEventContract",
  "isEmployeeArrearsPaymentDraft",
  "isEmployeeArrearsPaymentMethod",
];
const paymentMethods = ["cash", "bank", "mixed"];
const validationCodes = [
  "ARREARS_PAYMENT_DRAFT_NOT_OBJECT",
  "ARREARS_PAYMENT_BED_REQUIRED",
  "ARREARS_PAYMENT_CLOUD_ARREARS_REF_REQUIRED",
  "ARREARS_PAYMENT_REMAINING_AMOUNT_REQUIRED",
  "ARREARS_PAYMENT_AMOUNT_RECEIVED_REQUIRED",
  "ARREARS_PAYMENT_AMOUNT_INVALID",
  "ARREARS_PAYMENT_METHOD_INVALID",
  "ARREARS_PAYMENT_LEGS_INVALID",
  "ARREARS_PAYMENT_TOTAL_MISMATCH",
  "ARREARS_PAYMENT_PARTIAL_UNSUPPORTED",
  "ARREARS_PAYMENT_OVERPAYMENT_UNSUPPORTED",
  "ARREARS_PAYMENT_REPAYMENT_DATE_REQUIRED",
  "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN",
];

function exactCash(overrides = {}) {
  return {
    bedLabel: "B-201",
    cloudArrearsRef: "AR-CLOUD-001",
    remainingArrearsAed: 250,
    amountReceivedAed: 250,
    paymentMethod: "cash",
    cashReceivedAed: 250,
    bankReceivedAed: 0,
    repaymentDate: "2026-07-26",
    note: "",
    ...overrides,
  };
}

function exactBank(overrides = {}) {
  return exactCash({
    paymentMethod: "bank",
    cashReceivedAed: 0,
    bankReceivedAed: 250,
    ...overrides,
  });
}

function exactMixed(overrides = {}) {
  return exactCash({
    paymentMethod: "mixed",
    cashReceivedAed: 100,
    bankReceivedAed: 150,
    ...overrides,
  });
}

test("arrears-payment runtime success contract", () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };

  check(() => assert.deepEqual(
    Object.keys(arrearsPaymentModule).sort(),
    runtimeExports,
  ));
  check(() => assert.equal(
    arrearsPaymentModule.EMPLOYEE_ARREARS_PAYMENT_EVENT_ID,
    "arrears-payment",
  ));
  check(() => assert.deepEqual(
    arrearsPaymentModule.EMPLOYEE_ARREARS_PAYMENT_METHODS,
    paymentMethods,
  ));
  check(() => assert.equal(
    Object.isFrozen(arrearsPaymentModule.EMPLOYEE_ARREARS_PAYMENT_METHODS),
    true,
  ));
  check(() => assert.deepEqual(
    arrearsPaymentModule.EMPLOYEE_ARREARS_PAYMENT_VALIDATION_CODES,
    validationCodes,
  ));
  check(() => assert.equal(
    Object.isFrozen(
      arrearsPaymentModule.EMPLOYEE_ARREARS_PAYMENT_VALIDATION_CODES,
    ),
    true,
  ));

  const firstContract =
    arrearsPaymentModule.createEmployeeArrearsPaymentEventContract();
  const secondContract =
    arrearsPaymentModule.createEmployeeArrearsPaymentEventContract();
  check(() => assert.equal(firstContract.eventId, "arrears-payment"));
  check(() => assert.equal(firstContract.displayName, "Arrears Payment"));
  check(() => assert.notEqual(firstContract, secondContract));
  check(() => assert.equal(Object.isFrozen(firstContract), true));

  const initialDraft = firstContract.createInitialDraft();
  check(() => assert.deepEqual(initialDraft, {
    bedLabel: "",
    cloudArrearsRef: "",
    remainingArrearsAed: null,
    amountReceivedAed: null,
    paymentMethod: "cash",
    cashReceivedAed: null,
    bankReceivedAed: null,
    repaymentDate: "",
    note: "",
  }));
  check(() => assert.equal(Object.isFrozen(initialDraft), true));
  check(() => assert.equal(
    arrearsPaymentModule.isEmployeeArrearsPaymentDraft(exactCash()),
    true,
  ));
  check(() => assert.equal(
    arrearsPaymentModule.isEmployeeArrearsPaymentMethod("cash"),
    true,
  ));
  check(() => assert.equal(
    arrearsPaymentModule.isEmployeeArrearsPaymentMethod("Cash"),
    false,
  ));

  const cashDraft = exactCash({
    bedLabel: " B-201 ",
    cloudArrearsRef: " AR-CLOUD-001 ",
    note: " received in office ",
  });
  const cashBefore = structuredClone(cashDraft);
  const cashSubmission = firstContract.buildSubmission(cashDraft);
  check(() => assert.deepEqual(cashDraft, cashBefore));
  check(() => assert.deepEqual(cashSubmission, {
    eventId: "arrears-payment",
    schemaVersion: 1,
    displayName: "Arrears Payment",
    bedLabel: "B-201",
    cloudArrearsRef: "AR-CLOUD-001",
    remainingArrearsAed: 250,
    amountReceivedAed: 250,
    payment: {
      method: "cash",
      legs: [{ method: "cash", amountAed: 250 }],
    },
    repaymentDate: "2026-07-26",
    closeArrearsIntent: true,
    accountingPreview: {
      arrearsRepaidAed: 250,
      rentIncomeAed: 0,
    },
    note: "received in office",
  }));
  check(() => assert.equal(cashSubmission.closeArrearsIntent, true));
  check(() => assert.equal(
    cashSubmission.accountingPreview.arrearsRepaidAed,
    250,
  ));
  check(() => assert.equal(cashSubmission.accountingPreview.rentIncomeAed, 0));
  check(() => assert.equal(cashSubmission.repaymentDate, "2026-07-26"));
  check(() => assert.equal(cashSubmission.cloudArrearsRef, "AR-CLOUD-001"));
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

  const bankSubmission = firstContract.buildSubmission(exactBank());
  check(() => assert.deepEqual(bankSubmission.payment.legs, [
    { method: "bank", amountAed: 250 },
  ]));

  const mixedSubmission = firstContract.buildSubmission(exactMixed());
  check(() => assert.deepEqual(mixedSubmission.payment.legs, [
    { method: "cash", amountAed: 100 },
    { method: "bank", amountAed: 150 },
  ]));

  const normalizedSubmission = firstContract.buildSubmission(exactMixed({
    remainingArrearsAed: 100.1,
    amountReceivedAed: 100.1,
    cashReceivedAed: 40.05,
    bankReceivedAed: 60.05,
  }));
  check(() => assert.deepEqual(normalizedSubmission.payment.legs, [
    { method: "cash", amountAed: 40.05 },
    { method: "bank", amountAed: 60.05 },
  ]));

  const issues = firstContract.validateDraft(exactCash());
  check(() => assert.deepEqual(issues, []));
  check(() => assert.equal(Object.isFrozen(issues), true));
  assert.ok(successCases >= 24);
});

test("arrears-payment runtime fail-closed contract", () => {
  const contract =
    arrearsPaymentModule.createEmployeeArrearsPaymentEventContract();
  const invalidCases = [
    [null, "ARREARS_PAYMENT_DRAFT_NOT_OBJECT"],
    [[], "ARREARS_PAYMENT_DRAFT_NOT_OBJECT"],
    [{ ...exactCash(), unexpected: true }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
    [exactCash({ bedLabel: "" }), "ARREARS_PAYMENT_BED_REQUIRED"],
    [exactCash({ bedLabel: "   " }), "ARREARS_PAYMENT_BED_REQUIRED"],
    [exactCash({ cloudArrearsRef: "" }), "ARREARS_PAYMENT_CLOUD_ARREARS_REF_REQUIRED"],
    [exactCash({ cloudArrearsRef: "   " }), "ARREARS_PAYMENT_CLOUD_ARREARS_REF_REQUIRED"],
    [exactCash({ remainingArrearsAed: null }), "ARREARS_PAYMENT_REMAINING_AMOUNT_REQUIRED"],
    [exactCash({ remainingArrearsAed: Number.NaN }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ remainingArrearsAed: 0 }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ remainingArrearsAed: -1 }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ remainingArrearsAed: 1.001 }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ amountReceivedAed: null }), "ARREARS_PAYMENT_AMOUNT_RECEIVED_REQUIRED"],
    [exactCash({ amountReceivedAed: Number.POSITIVE_INFINITY }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ amountReceivedAed: 0 }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ amountReceivedAed: -1 }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ amountReceivedAed: 1.001 }), "ARREARS_PAYMENT_AMOUNT_INVALID"],
    [exactCash({ paymentMethod: "crypto" }), "ARREARS_PAYMENT_METHOD_INVALID"],
    [exactCash({ paymentMethod: "CASH" }), "ARREARS_PAYMENT_METHOD_INVALID"],
    [exactCash({ paymentMethod: "cash_payment" }), "ARREARS_PAYMENT_METHOD_INVALID"],
    [exactCash({ paymentMethod: "cash " }), "ARREARS_PAYMENT_METHOD_INVALID"],
    [exactCash({ cashReceivedAed: null }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactCash({ bankReceivedAed: 1 }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactCash({ cashReceivedAed: 249 }), "ARREARS_PAYMENT_TOTAL_MISMATCH"],
    [exactBank({ bankReceivedAed: null }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactBank({ cashReceivedAed: 1 }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactBank({ bankReceivedAed: 249 }), "ARREARS_PAYMENT_TOTAL_MISMATCH"],
    [exactMixed({ cashReceivedAed: 0, bankReceivedAed: 250 }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactMixed({ cashReceivedAed: 250, bankReceivedAed: 0 }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactMixed({ cashReceivedAed: null }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactMixed({ bankReceivedAed: null }), "ARREARS_PAYMENT_LEGS_INVALID"],
    [exactMixed({ cashReceivedAed: 90, bankReceivedAed: 150 }), "ARREARS_PAYMENT_TOTAL_MISMATCH"],
    [exactCash({ amountReceivedAed: 200, cashReceivedAed: 200 }), "ARREARS_PAYMENT_PARTIAL_UNSUPPORTED"],
    [exactCash({ amountReceivedAed: 300, cashReceivedAed: 300 }), "ARREARS_PAYMENT_OVERPAYMENT_UNSUPPORTED"],
    [exactCash({ repaymentDate: "" }), "ARREARS_PAYMENT_REPAYMENT_DATE_REQUIRED"],
    [exactCash({ repaymentDate: "26/07/2026" }), "ARREARS_PAYMENT_REPAYMENT_DATE_REQUIRED"],
    [{ ...exactCash(), providerPhone: "hidden" }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...exactCash(), cardId: "hidden" }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...exactCash(), tenantName: "hidden" }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...exactCash(), customerName: "hidden" }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...exactCash(), event_type: "hidden" }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
    [{ ...exactCash(), type: "hidden" }, "ARREARS_PAYMENT_PROVIDER_IDENTITY_FORBIDDEN"],
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
      { message: "EMPLOYEE_ARREARS_PAYMENT_INVALID_DRAFT" },
    );
  }

  const sensitiveDraft = exactCash({
    bedLabel: "BED-PRIVATE-987",
    cloudArrearsRef: "REF-PRIVATE-654",
    amountReceivedAed: 300,
    cashReceivedAed: 300,
    note: "private-token-value",
  });
  assert.throws(
    () => contract.buildSubmission(sensitiveDraft),
    (error) => {
      assert.equal(error.message, "EMPLOYEE_ARREARS_PAYMENT_INVALID_DRAFT");
      assert.doesNotMatch(
        error.message,
        /BED-PRIVATE-987|REF-PRIVATE-654|300|private-token-value|secret|headers|raw draft/iu,
      );
      return true;
    },
  );
  assert.ok(invalidCases.length >= 34);
});

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(source) {
  const fixtureFile = "/virtual/events/arrears-payment/fixture.ts";
  const virtualFiles = new Map([
    ["/virtual/core/event-contract.ts", eventContractSource],
    ["/virtual/events/arrears-payment/index.ts", arrearsPaymentSource],
    [fixtureFile, source],
  ]);
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
  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      const resolved = posix.resolve(
        posix.dirname(normalizeVirtualPath(containingFile)),
        moduleName,
      );
      const sourceName = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      return virtualFiles.has(sourceName)
        ? {
            extension: ts.Extension.Ts,
            isExternalLibraryImport: false,
            resolvedFileName: sourceName,
          }
        : undefined;
    });
  const program = ts.createProgram([...virtualFiles.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile
    ),
  );
}

test("arrears-payment TypeScript semantic fixtures", () => {
  const imports = `
    import {
      createEmployeeArrearsPaymentEventContract,
      type EmployeeArrearsPaymentDraft,
      type EmployeeArrearsPaymentEventContract,
      type EmployeeArrearsPaymentLeg,
      type EmployeeArrearsPaymentMethod,
      type EmployeeArrearsPaymentSubmission,
    } from "./index.ts";
    import type { EmployeeEventContract } from "../../core/event-contract.ts";
  `;
  const validDraft = `{
    bedLabel: "B-201",
    cloudArrearsRef: "AR-CLOUD-001",
    remainingArrearsAed: 250,
    amountReceivedAed: 250,
    paymentMethod: "cash",
    cashReceivedAed: 250,
    bankReceivedAed: 0,
    repaymentDate: "2026-07-26",
    note: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeArrearsPaymentMethod = "cash"; void value;`,
    `${imports} const value: EmployeeArrearsPaymentDraft = ${validDraft}; void value;`,
    `${imports} declare const value: EmployeeArrearsPaymentSubmission; const id: "arrears-payment" = value.eventId; void id;`,
    `${imports} const value: EmployeeArrearsPaymentLeg = { method: "bank", amountAed: 25 }; void value;`,
    `${imports} const value: EmployeeArrearsPaymentEventContract = createEmployeeArrearsPaymentEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeArrearsPaymentDraft, EmployeeArrearsPaymentSubmission> = createEmployeeArrearsPaymentEventContract(); void value;`,
    `${imports} const contract = createEmployeeArrearsPaymentEventContract(); const value: EmployeeArrearsPaymentSubmission = contract.buildSubmission(${validDraft}); void value;`,
    `${imports} declare const value: EmployeeArrearsPaymentSubmission; const zero: 0 = value.accountingPreview.rentIncomeAed; void zero;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeArrearsPaymentMethod = "crypto";`, /crypto/u],
    [`${imports} const value: EmployeeArrearsPaymentDraft = { amountReceivedAed: 1 };`, /bedLabel/u],
    [`${imports} const value: EmployeeArrearsPaymentDraft = { ...${validDraft}, cloudArrearsRef: undefined };`, /undefined/u],
    [`${imports} const value: EmployeeArrearsPaymentDraft = { ...${validDraft}, amountReceivedAed: "250" };`, /string/u],
    [`${imports} const value: EmployeeArrearsPaymentDraft = { ...${validDraft}, providerPhone: "x" };`, /providerPhone/u],
    [`${imports} const value: EmployeeArrearsPaymentDraft = { ...${validDraft}, event_type: "x" };`, /event_type/u],
    [`${imports} const value: EmployeeArrearsPaymentLeg = { method: "mixed", amountAed: 25 };`, /mixed/u],
    [`${imports} const value: EmployeeArrearsPaymentSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeArrearsPaymentSubmission; const id: "rent" = value.eventId;`, /arrears-payment/u],
    [`${imports} declare const value: EmployeeArrearsPaymentSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} const value: EmployeeArrearsPaymentEventContract = { eventId: "arrears-payment", displayName: "Arrears Payment", createInitialDraft() { return ${validDraft}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeArrearsPaymentEventContract = { ...createEmployeeArrearsPaymentEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
    [`${imports} declare const value: string; const method: EmployeeArrearsPaymentMethod = value;`, /string/u],
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

test("arrears-payment source boundary excludes integrations and identity fields", async () => {
  assert.match(
    arrearsPaymentSource,
    /from "\.\.\/\.\.\/core\/event-contract"/u,
  );
  assert.doesNotMatch(
    arrearsPaymentSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:rent|deposit-in|deposit-out|checkout|expense|bed-transfer)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    arrearsPaymentSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    arrearsPaymentSource,
    /tenant_card_id|card_id|old_ttlock_ref|provider_phone|providerPhone|phone|ttlockId|customerName|tenantName|previewText|whatsappText|event_type|canonical_anchor_id|finance_ledger_id|owner_history_id|sync_state_id|real_endpoint|idempotency_key/iu,
  );
  assert.doesNotMatch(
    arrearsPaymentSource,
    /createEmployeeEventRegistry|register|singleton/iu,
  );

  const rentSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "rent", "index.ts"),
    "utf8",
  );
  assert.match(rentSource, /EMPLOYEE_RENT_EVENT_ID/u);

  const depositInSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "deposit-in", "index.ts"),
    "utf8",
  );
  assert.match(depositInSource, /EMPLOYEE_DEPOSIT_IN_EVENT_ID/u);
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
  const expenseSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "expense", "index.ts"),
    "utf8",
  );
  assert.match(expenseSource, /EMPLOYEE_EXPENSE_EVENT_ID/u);
  const bedTransferSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "bed-transfer", "index.ts"),
    "utf8",
  );
  assert.match(bedTransferSource, /EMPLOYEE_BED_TRANSFER_EVENT_ID/u);
});
