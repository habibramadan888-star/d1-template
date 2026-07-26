import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, posix, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const rentPath = resolve(employeeNextRoot, "src", "events", "rent", "index.ts");
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
const rentSource = await readFile(rentPath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledRent = await esbuild.build({
  bundle: true,
  entryPoints: [rentPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const rentModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledRent.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_RENT_EVENT_ID",
  "EMPLOYEE_RENT_PAYMENT_METHODS",
  "EMPLOYEE_RENT_PAYMENT_STATUSES",
  "EMPLOYEE_RENT_SHORT_PAYMENT_MODES",
  "EMPLOYEE_RENT_VALIDATION_CODES",
  "createEmployeeRentEventContract",
  "isEmployeeRentDraft",
  "isEmployeeRentPaymentMethod",
  "isEmployeeRentShortPaymentMode",
];

const paymentMethods = ["cash", "bank", "mixed"];
const shortPaymentModes = ["none", "fifteen-days", "custom-date"];
const paymentStatuses = ["full-paid", "short-paid"];
const validationCodes = [
  "RENT_DRAFT_NOT_OBJECT",
  "RENT_BED_REQUIRED",
  "RENT_AMOUNT_DUE_REQUIRED",
  "RENT_AMOUNT_RECEIVED_REQUIRED",
  "RENT_AMOUNT_INVALID",
  "RENT_PAYMENT_METHOD_INVALID",
  "RENT_PAYMENT_LEGS_INVALID",
  "RENT_PAYMENT_TOTAL_MISMATCH",
  "RENT_SHORT_PAYMENT_MODE_REQUIRED",
  "RENT_SHORT_PAYMENT_NOTE_REQUIRED",
  "RENT_PROMISE_DATE_REQUIRED",
  "RENT_OVERPAYMENT_UNSUPPORTED",
];

function fullCash(overrides = {}) {
  return {
    bedLabel: "A-101",
    amountDueAed: 1_000,
    amountReceivedAed: 1_000,
    paymentMethod: "cash",
    cashReceivedAed: 1_000,
    bankReceivedAed: 0,
    shortPaymentMode: "none",
    promiseDate: "",
    note: "",
    ...overrides,
  };
}

function fullBank(overrides = {}) {
  return fullCash({
    paymentMethod: "bank",
    cashReceivedAed: 0,
    bankReceivedAed: 1_000,
    ...overrides,
  });
}

function fullMixed(overrides = {}) {
  return fullCash({
    paymentMethod: "mixed",
    cashReceivedAed: 400,
    bankReceivedAed: 600,
    ...overrides,
  });
}

function shortCash(overrides = {}) {
  return fullCash({
    amountReceivedAed: 700,
    cashReceivedAed: 700,
    shortPaymentMode: "fifteen-days",
    note: " Follow up locally ",
    ...overrides,
  });
}

function issueCodes(contract, value) {
  return contract.validateDraft(value).map((issue) => issue.code);
}

test("rent runtime success contract", () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };

  check(() => assert.deepEqual(Object.keys(rentModule).sort(), runtimeExports));
  check(() => assert.equal(rentModule.EMPLOYEE_RENT_EVENT_ID, "rent"));
  check(() => assert.deepEqual(rentModule.EMPLOYEE_RENT_PAYMENT_METHODS, paymentMethods));
  check(() => assert.equal(Object.isFrozen(rentModule.EMPLOYEE_RENT_PAYMENT_METHODS), true));
  check(() => assert.deepEqual(rentModule.EMPLOYEE_RENT_SHORT_PAYMENT_MODES, shortPaymentModes));
  check(() => assert.equal(Object.isFrozen(rentModule.EMPLOYEE_RENT_SHORT_PAYMENT_MODES), true));
  check(() => assert.deepEqual(rentModule.EMPLOYEE_RENT_PAYMENT_STATUSES, paymentStatuses));
  check(() => assert.equal(Object.isFrozen(rentModule.EMPLOYEE_RENT_PAYMENT_STATUSES), true));
  check(() => assert.deepEqual(rentModule.EMPLOYEE_RENT_VALIDATION_CODES, validationCodes));
  check(() => assert.equal(Object.isFrozen(rentModule.EMPLOYEE_RENT_VALIDATION_CODES), true));

  const firstContract = rentModule.createEmployeeRentEventContract();
  const secondContract = rentModule.createEmployeeRentEventContract();
  check(() => assert.equal(firstContract.eventId, "rent"));
  check(() => assert.equal(firstContract.displayName, "Rent"));
  check(() => assert.notEqual(firstContract, secondContract));
  check(() => assert.equal(Object.isFrozen(firstContract), true));

  const initialDraft = firstContract.createInitialDraft();
  check(() => assert.deepEqual(initialDraft, {
    bedLabel: "",
    amountDueAed: null,
    amountReceivedAed: null,
    paymentMethod: "cash",
    cashReceivedAed: null,
    bankReceivedAed: null,
    shortPaymentMode: "none",
    promiseDate: "",
    note: "",
  }));
  check(() => assert.equal(Object.isFrozen(initialDraft), true));
  check(() => assert.equal(rentModule.isEmployeeRentDraft(fullCash()), true));
  check(() => assert.equal(rentModule.isEmployeeRentPaymentMethod("cash"), true));
  check(() => assert.equal(rentModule.isEmployeeRentPaymentMethod("Cash"), false));
  check(() => assert.equal(rentModule.isEmployeeRentShortPaymentMode("custom-date"), true));
  check(() => assert.equal(rentModule.isEmployeeRentShortPaymentMode("custom_date"), false));

  const cashDraft = fullCash({ bedLabel: " A-101 ", note: " receipt checked " });
  const cashBefore = structuredClone(cashDraft);
  const cashSubmission = firstContract.buildSubmission(cashDraft);
  check(() => assert.deepEqual(cashDraft, cashBefore));
  check(() => assert.deepEqual(cashSubmission, {
    eventId: "rent",
    schemaVersion: 1,
    displayName: "Rent",
    bedLabel: "A-101",
    amountDueAed: 1_000,
    amountReceivedAed: 1_000,
    balanceAed: 0,
    paymentStatus: "full-paid",
    payment: {
      method: "cash",
      legs: [{ method: "cash", amountAed: 1_000 }],
    },
    note: "receipt checked",
  }));
  check(() => assert.equal(Object.isFrozen(cashSubmission), true));
  check(() => assert.equal(Object.isFrozen(cashSubmission.payment), true));
  check(() => assert.equal(Object.isFrozen(cashSubmission.payment.legs), true));
  check(() => assert.equal(Object.isFrozen(cashSubmission.payment.legs[0]), true));

  const bankSubmission = firstContract.buildSubmission(fullBank());
  check(() => assert.deepEqual(bankSubmission.payment.legs, [
    { method: "bank", amountAed: 1_000 },
  ]));

  const mixedSubmission = firstContract.buildSubmission(fullMixed());
  check(() => assert.deepEqual(mixedSubmission.payment.legs, [
    { method: "cash", amountAed: 400 },
    { method: "bank", amountAed: 600 },
  ]));

  const fifteenDaySubmission = firstContract.buildSubmission(shortCash());
  check(() => assert.deepEqual(fifteenDaySubmission.shortPayment, {
    amountAed: 300,
    mode: "fifteen-days",
    note: "Follow up locally",
  }));
  check(() => assert.equal("promiseDate" in fifteenDaySubmission.shortPayment, false));
  check(() => assert.equal(fifteenDaySubmission.paymentStatus, "short-paid"));
  check(() => assert.equal(fifteenDaySubmission.balanceAed, 300));

  const shortBankSubmission = firstContract.buildSubmission(fullBank({
    amountReceivedAed: 650,
    bankReceivedAed: 650,
    shortPaymentMode: "fifteen-days",
    note: "Bank balance due",
  }));
  check(() => assert.equal(shortBankSubmission.balanceAed, 350));

  const customDateSubmission = firstContract.buildSubmission(shortCash({
    shortPaymentMode: "custom-date",
    promiseDate: "2026-08-15",
  }));
  check(() => assert.equal(customDateSubmission.shortPayment.promiseDate, "2026-08-15"));

  const normalizedSubmission = firstContract.buildSubmission(fullMixed({
    amountDueAed: 100.1,
    amountReceivedAed: 100.1,
    cashReceivedAed: 40.05,
    bankReceivedAed: 60.05,
  }));
  check(() => assert.deepEqual(normalizedSubmission.payment.legs, [
    { method: "cash", amountAed: 40.05 },
    { method: "bank", amountAed: 60.05 },
  ]));

  const issues = firstContract.validateDraft(fullCash());
  check(() => assert.deepEqual(issues, []));
  check(() => assert.equal(Object.isFrozen(issues), true));
  assert.ok(successCases >= 24);
});

test("rent runtime fail-closed contract", () => {
  const contract = rentModule.createEmployeeRentEventContract();
  const invalidCases = [
    [null, "RENT_DRAFT_NOT_OBJECT"],
    [[], "RENT_DRAFT_NOT_OBJECT"],
    [{ ...fullCash(), secret: "hidden" }, "RENT_DRAFT_NOT_OBJECT"],
    [fullCash({ bedLabel: "" }), "RENT_BED_REQUIRED"],
    [fullCash({ bedLabel: "   " }), "RENT_BED_REQUIRED"],
    [fullCash({ amountDueAed: null }), "RENT_AMOUNT_DUE_REQUIRED"],
    [fullCash({ amountDueAed: Number.NaN }), "RENT_AMOUNT_INVALID"],
    [fullCash({ amountDueAed: 0 }), "RENT_AMOUNT_INVALID"],
    [fullCash({ amountDueAed: -1 }), "RENT_AMOUNT_INVALID"],
    [fullCash({ amountDueAed: 1.001 }), "RENT_AMOUNT_INVALID"],
    [fullCash({ amountReceivedAed: null }), "RENT_AMOUNT_RECEIVED_REQUIRED"],
    [fullCash({ amountReceivedAed: Number.POSITIVE_INFINITY }), "RENT_AMOUNT_INVALID"],
    [fullCash({ amountReceivedAed: -1 }), "RENT_AMOUNT_INVALID"],
    [fullCash({ amountReceivedAed: 1.001 }), "RENT_AMOUNT_INVALID"],
    [fullCash({ paymentMethod: "crypto" }), "RENT_PAYMENT_METHOD_INVALID"],
    [fullCash({ paymentMethod: "CASH" }), "RENT_PAYMENT_METHOD_INVALID"],
    [fullCash({ paymentMethod: "cash " }), "RENT_PAYMENT_METHOD_INVALID"],
    [fullCash({ cashReceivedAed: null }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullCash({ bankReceivedAed: 1 }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullCash({ cashReceivedAed: 999 }), "RENT_PAYMENT_TOTAL_MISMATCH"],
    [fullBank({ bankReceivedAed: null }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullBank({ cashReceivedAed: 1 }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullBank({ bankReceivedAed: 999 }), "RENT_PAYMENT_TOTAL_MISMATCH"],
    [fullMixed({ cashReceivedAed: 0, bankReceivedAed: 1_000 }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullMixed({ cashReceivedAed: 1_000, bankReceivedAed: 0 }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullMixed({ cashReceivedAed: null }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullMixed({ bankReceivedAed: null }), "RENT_PAYMENT_LEGS_INVALID"],
    [fullMixed({ cashReceivedAed: 300, bankReceivedAed: 600 }), "RENT_PAYMENT_TOTAL_MISMATCH"],
    [fullCash({ amountReceivedAed: 1_001, cashReceivedAed: 1_001 }), "RENT_OVERPAYMENT_UNSUPPORTED"],
    [fullCash({ amountReceivedAed: 700, cashReceivedAed: 700 }), "RENT_SHORT_PAYMENT_MODE_REQUIRED"],
    [shortCash({ shortPaymentMode: "later" }), "RENT_SHORT_PAYMENT_MODE_REQUIRED"],
    [fullCash({ shortPaymentMode: "fifteen-days" }), "RENT_SHORT_PAYMENT_MODE_REQUIRED"],
    [shortCash({ note: "" }), "RENT_SHORT_PAYMENT_NOTE_REQUIRED"],
    [shortCash({ note: "   " }), "RENT_SHORT_PAYMENT_NOTE_REQUIRED"],
    [shortCash({ shortPaymentMode: "custom-date", promiseDate: "" }), "RENT_PROMISE_DATE_REQUIRED"],
    [shortCash({ shortPaymentMode: "custom-date", promiseDate: "15/08/2026" }), "RENT_PROMISE_DATE_REQUIRED"],
  ];

  for (const [draft, expectedCode] of invalidCases) {
    const issues = contract.validateDraft(draft);
    assert.ok(issueCodes(contract, draft).includes(expectedCode), expectedCode);
    assert.equal(Object.isFrozen(issues), true);
    for (const entry of issues) {
      assert.equal(Object.isFrozen(entry), true);
      assert.equal(entry.severity, "ERROR");
    }
    assert.throws(
      () => contract.buildSubmission(draft),
      { message: "EMPLOYEE_RENT_INVALID_DRAFT" },
    );
  }

  const sensitiveDraft = fullCash({
    bedLabel: "BED-PRIVATE-987",
    amountReceivedAed: 1_001,
    cashReceivedAed: 1_001,
    note: "private-token-value",
  });
  assert.throws(
    () => contract.buildSubmission(sensitiveDraft),
    (error) => {
      assert.equal(error.message, "EMPLOYEE_RENT_INVALID_DRAFT");
      assert.doesNotMatch(
        error.message,
        /BED-PRIVATE-987|1001|private-token-value|secret|headers|raw draft/iu,
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
  const fixtureFile = "/virtual/events/rent/fixture.ts";
  const virtualFiles = new Map([
    ["/virtual/core/event-contract.ts", eventContractSource],
    ["/virtual/events/rent/index.ts", rentSource],
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

test("rent TypeScript semantic fixtures", () => {
  const imports = `
    import {
      createEmployeeRentEventContract,
      type EmployeeRentDraft,
      type EmployeeRentEventContract,
      type EmployeeRentPaymentLeg,
      type EmployeeRentPaymentMethod,
      type EmployeeRentShortPaymentMode,
      type EmployeeRentSubmission,
    } from "./index.ts";
    import type { EmployeeEventContract } from "../../core/event-contract.ts";
  `;
  const validDraft = `{
    bedLabel: "A-101",
    amountDueAed: 1000,
    amountReceivedAed: 1000,
    paymentMethod: "cash",
    cashReceivedAed: 1000,
    bankReceivedAed: 0,
    shortPaymentMode: "none",
    promiseDate: "",
    note: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeRentPaymentMethod = "cash"; void value;`,
    `${imports} const value: EmployeeRentShortPaymentMode = "custom-date"; void value;`,
    `${imports} const value: EmployeeRentDraft = ${validDraft}; void value;`,
    `${imports} declare const value: EmployeeRentSubmission; const id: "rent" = value.eventId; void id;`,
    `${imports} const value: EmployeeRentPaymentLeg = { method: "bank", amountAed: 25 }; void value;`,
    `${imports} const value: EmployeeRentEventContract = createEmployeeRentEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeRentDraft, EmployeeRentSubmission> = createEmployeeRentEventContract(); void value;`,
    `${imports} const contract = createEmployeeRentEventContract(); const value: EmployeeRentSubmission = contract.buildSubmission(${validDraft}); void value;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeRentPaymentMethod = "crypto";`, /crypto/u],
    [`${imports} const value: EmployeeRentShortPaymentMode = "later";`, /later/u],
    [`${imports} const value: EmployeeRentDraft = { amountDueAed: 1 };`, /bedLabel/u],
    [`${imports} const value: EmployeeRentDraft = { ...${validDraft}, amountDueAed: "1000" };`, /string/u],
    [`${imports} const value: EmployeeRentDraft = { ...${validDraft}, token: "x" };`, /token/u],
    [`${imports} const value: EmployeeRentPaymentLeg = { method: "mixed", amountAed: 25 };`, /mixed/u],
    [`${imports} const value: EmployeeRentSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeRentSubmission; const id: "expense" = value.eventId;`, /rent/u],
    [`${imports} declare const value: EmployeeRentSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} const value: EmployeeRentEventContract = { eventId: "rent", displayName: "Rent", createInitialDraft() { return ${validDraft}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeRentEventContract = { ...createEmployeeRentEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
    [`${imports} declare const value: string; const method: EmployeeRentPaymentMethod = value;`, /string/u],
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

test("rent source boundary excludes integrations and other event rules", async () => {
  assert.match(
    rentSource,
    /from "\.\.\/\.\.\/core\/event-contract"/u,
  );
  assert.doesNotMatch(
    rentSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:arrears-payment|deposit-in|deposit-out|checkout|expense|bed-transfer)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    rentSource,
    /\b(?:fetch|localStorage|sessionStorage|XMLHttpRequest|document|window|cookie|setTimeout|setInterval|process\.env)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    rentSource,
    /tenant_card_id|card_id|provider_phone|provider identity|TTLock API|Dxxx|(?:^|[^A-Za-z])E\/e(?:[^A-Za-z]|$)|MMDD|cloud_arrears_ref|event_type|type=RT|authorization|token/imu,
  );
  assert.doesNotMatch(
    rentSource,
    /createEmployeeEventRegistry|register|singleton|canonical anchor|owner history|finance ledger|sync state/iu,
  );

  const arrearsPaymentSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "arrears-payment", "index.ts"),
    "utf8",
  );
  assert.match(
    arrearsPaymentSource,
    /export const EMPLOYEE_ARREARS_PAYMENT_EVENT_ID = "arrears-payment"/u,
  );
  assert.doesNotMatch(arrearsPaymentSource, /arrearsPaymentScaffold/u);

  const depositInSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "deposit-in", "index.ts"),
    "utf8",
  );
  assert.match(
    depositInSource,
    /export const EMPLOYEE_DEPOSIT_IN_EVENT_ID = "deposit-in"/u,
  );
  assert.doesNotMatch(depositInSource, /depositInScaffold/u);
  const depositOutSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "deposit-out", "index.ts"),
    "utf8",
  );
  assert.match(
    depositOutSource,
    /export const EMPLOYEE_DEPOSIT_OUT_EVENT_ID = "deposit-out"/u,
  );
  assert.doesNotMatch(depositOutSource, /depositOutScaffold/u);
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
