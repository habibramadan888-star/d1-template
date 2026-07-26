import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const expensePath = resolve(employeeNextRoot, "src", "events", "expense", "index.ts");
const eventContractPath = resolve(employeeNextRoot, "src", "core", "event-contract.ts");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(resolve(sourceRepositoryRoot, "package.json"));
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const expenseSource = await readFile(expensePath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [expensePath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const expenseModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_EXPENSE_CATEGORIES",
  "EMPLOYEE_EXPENSE_EVENT_ID",
  "EMPLOYEE_EXPENSE_PAYMENT_METHODS",
  "EMPLOYEE_EXPENSE_SCOPES",
  "EMPLOYEE_EXPENSE_VALIDATION_CODES",
  "createEmployeeExpenseEventContract",
  "isEmployeeExpenseCategory",
  "isEmployeeExpenseDraft",
  "isEmployeeExpensePaymentMethod",
  "isEmployeeExpenseScope",
];
const categories = [
  "maintenance",
  "cleaning",
  "utilities",
  "supplies",
  "internet",
  "laundry",
  "transport",
  "government_fee",
  "other",
];
const methods = ["cash", "bank", "mixed"];
const scopes = ["general", "apartment", "bed"];
const validationCodes = [
  "EXPENSE_DRAFT_NOT_OBJECT",
  "EXPENSE_DATE_REQUIRED",
  "EXPENSE_DATE_INVALID",
  "EXPENSE_CATEGORY_INVALID",
  "EXPENSE_AMOUNT_REQUIRED",
  "EXPENSE_AMOUNT_INVALID",
  "EXPENSE_PAYMENT_METHOD_INVALID",
  "EXPENSE_CASH_AMOUNT_INVALID",
  "EXPENSE_BANK_AMOUNT_INVALID",
  "EXPENSE_PAYMENT_SPLIT_MISMATCH",
  "EXPENSE_SCOPE_INVALID",
  "EXPENSE_SCOPE_TARGET_REQUIRED",
  "EXPENSE_VENDOR_REQUIRED",
  "EXPENSE_DESCRIPTION_REQUIRED",
  "EXPENSE_RECEIPT_NOTE_REQUIRED",
  "EXPENSE_PROVIDER_IDENTITY_FORBIDDEN",
  "EXPENSE_SCOPE_FIELD_FORBIDDEN",
  "EXPENSE_BACKEND_FIELD_FORBIDDEN",
];

function cashDraft(overrides = {}) {
  return {
    expenseDate: "2026-07-26",
    expenseCategory: "maintenance",
    expenseAmountAed: 125,
    paymentMethod: "cash",
    cashPaidAed: 125,
    bankPaidAed: 0,
    expenseScope: "general",
    apartmentLabel: "",
    bedLabel: "",
    vendorName: "Local vendor",
    paidBy: "",
    expenseDescription: "Repair supplies",
    receiptAvailable: false,
    receiptNote: "",
    finalNote: "",
    ...overrides,
  };
}

function codesFor(value) {
  return expenseModule
    .createEmployeeExpenseEventContract()
    .validateDraft(value)
    .map((entry) => entry.code);
}

test("expense runtime success contract", () => {
  assert.deepEqual(Object.keys(expenseModule).sort(), runtimeExports);
  assert.equal(expenseModule.EMPLOYEE_EXPENSE_EVENT_ID, "expense");
  assert.deepEqual(expenseModule.EMPLOYEE_EXPENSE_CATEGORIES, categories);
  assert.deepEqual(expenseModule.EMPLOYEE_EXPENSE_PAYMENT_METHODS, methods);
  assert.deepEqual(expenseModule.EMPLOYEE_EXPENSE_SCOPES, scopes);
  assert.deepEqual(expenseModule.EMPLOYEE_EXPENSE_VALIDATION_CODES, validationCodes);
  for (const value of [
    expenseModule.EMPLOYEE_EXPENSE_CATEGORIES,
    expenseModule.EMPLOYEE_EXPENSE_PAYMENT_METHODS,
    expenseModule.EMPLOYEE_EXPENSE_SCOPES,
    expenseModule.EMPLOYEE_EXPENSE_VALIDATION_CODES,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }

  const contract = expenseModule.createEmployeeExpenseEventContract();
  assert.notEqual(contract, expenseModule.createEmployeeExpenseEventContract());
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(contract.eventId, "expense");
  assert.equal(contract.displayName, "Expense");
  assert.deepEqual(contract.createInitialDraft(), {
    expenseDate: "",
    expenseCategory: "maintenance",
    expenseAmountAed: null,
    paymentMethod: "cash",
    cashPaidAed: null,
    bankPaidAed: null,
    expenseScope: "general",
    apartmentLabel: "",
    bedLabel: "",
    vendorName: "",
    paidBy: "",
    expenseDescription: "",
    receiptAvailable: false,
    receiptNote: "",
    finalNote: "",
  });
  assert.equal(Object.isFrozen(contract.createInitialDraft()), true);
  assert.equal(expenseModule.isEmployeeExpenseCategory("maintenance"), true);
  assert.equal(expenseModule.isEmployeeExpenseCategory("Maintenance"), false);
  assert.equal(expenseModule.isEmployeeExpensePaymentMethod("mixed"), true);
  assert.equal(expenseModule.isEmployeeExpensePaymentMethod("bank_transfer"), false);
  assert.equal(expenseModule.isEmployeeExpenseScope("bed"), true);
  assert.equal(expenseModule.isEmployeeExpenseScope("property"), false);
  assert.equal(expenseModule.isEmployeeExpenseDraft(cashDraft()), true);
  assert.deepEqual(contract.validateDraft(cashDraft()), []);
  assert.equal(Object.isFrozen(contract.validateDraft(cashDraft())), true);

  const cashInput = cashDraft({ finalNote: " retained locally " });
  const cashBefore = structuredClone(cashInput);
  const cash = contract.buildSubmission(cashInput);
  assert.deepEqual(cashInput, cashBefore);
  assert.deepEqual(cash.payment, {
    method: "cash",
    cashPaidAed: 125,
    bankPaidAed: 0,
    legs: [{ method: "cash", amountAed: 125 }],
  });
  assert.deepEqual(cash.allocation, {
    expenseScope: "general",
    apartmentLabel: null,
    bedLabel: null,
  });
  assert.deepEqual(cash.vendor, { vendorName: "Local vendor", paidBy: null });
  assert.deepEqual(cash.receiptPreview, {
    receiptAvailable: false,
    receiptNote: null,
    receiptUploadIncluded: false,
    receiptUploadRequiredLater: false,
  });
  assert.deepEqual(cash.accountingPreview, {
    expenseDeclaredAed: 125,
    rentIncomeAed: 0,
    depositReceivedAed: 0,
    depositRefundedAed: 0,
    arrearsRepaidAed: 0,
    currentDepositMutationAed: 0,
    financeMutationApplied: false,
  });
  assert.deepEqual(cash.reconciliationPreview, {
    financeReconciliationRequired: true,
    receiptReconciliationRequired: false,
    reason: "expense-module-does-not-write-production-finance",
  });
  assert.equal(cash.finalNote, "retained locally");

  const bank = contract.buildSubmission(cashDraft({
    expenseCategory: "utilities",
    expenseAmountAed: 80,
    paymentMethod: "bank",
    cashPaidAed: 0,
    bankPaidAed: 80,
    expenseScope: "apartment",
    apartmentLabel: " A-4 ",
    paidBy: " Staff 4 ",
  }));
  assert.deepEqual(bank.payment.legs, [{ method: "bank", amountAed: 80 }]);
  assert.deepEqual(bank.allocation, {
    expenseScope: "apartment",
    apartmentLabel: "A-4",
    bedLabel: null,
  });
  assert.equal(bank.vendor.paidBy, "Staff 4");

  const mixed = contract.buildSubmission(cashDraft({
    expenseCategory: "supplies",
    expenseAmountAed: 100.1,
    paymentMethod: "mixed",
    cashPaidAed: 40.04,
    bankPaidAed: 60.06,
    expenseScope: "bed",
    bedLabel: " B-12 ",
    receiptAvailable: true,
    receiptNote: " paper copy retained ",
  }));
  assert.equal(mixed.expenseAmountAed, 100.1);
  assert.deepEqual(mixed.payment.legs, [
    { method: "cash", amountAed: 40.04 },
    { method: "bank", amountAed: 60.06 },
  ]);
  assert.deepEqual(mixed.allocation, {
    expenseScope: "bed",
    apartmentLabel: null,
    bedLabel: "B-12",
  });
  assert.deepEqual(mixed.receiptPreview, {
    receiptAvailable: true,
    receiptNote: "paper copy retained",
    receiptUploadIncluded: false,
    receiptUploadRequiredLater: true,
  });
  assert.equal(mixed.reconciliationPreview.receiptReconciliationRequired, true);
  for (const snapshot of [
    cash,
    cash.payment,
    cash.payment.legs,
    cash.payment.legs[0],
    cash.allocation,
    cash.vendor,
    cash.receiptPreview,
    cash.accountingPreview,
    cash.reconciliationPreview,
  ]) {
    assert.equal(Object.isFrozen(snapshot), true);
  }
});

test("expense runtime fail-closed contract", () => {
  assert.deepEqual(codesFor(null), ["EXPENSE_DRAFT_NOT_OBJECT"]);
  for (const [value, code] of [
    [cashDraft({ expenseDate: "" }), "EXPENSE_DATE_REQUIRED"],
    [cashDraft({ expenseDate: "26-07-2026" }), "EXPENSE_DATE_INVALID"],
    [cashDraft({ expenseCategory: "Maintenance" }), "EXPENSE_CATEGORY_INVALID"],
    [cashDraft({ expenseAmountAed: null }), "EXPENSE_AMOUNT_REQUIRED"],
    [cashDraft({ expenseAmountAed: 0 }), "EXPENSE_AMOUNT_INVALID"],
    [cashDraft({ expenseAmountAed: 1.001 }), "EXPENSE_AMOUNT_INVALID"],
    [cashDraft({ paymentMethod: "bank transfer" }), "EXPENSE_PAYMENT_METHOD_INVALID"],
    [cashDraft({ cashPaidAed: -1 }), "EXPENSE_CASH_AMOUNT_INVALID"],
    [cashDraft({ bankPaidAed: Number.POSITIVE_INFINITY }), "EXPENSE_BANK_AMOUNT_INVALID"],
    [cashDraft({ cashPaidAed: 124 }), "EXPENSE_PAYMENT_SPLIT_MISMATCH"],
    [cashDraft({ bankPaidAed: 1 }), "EXPENSE_PAYMENT_SPLIT_MISMATCH"],
    [cashDraft({ paymentMethod: "bank", cashPaidAed: 0, bankPaidAed: 124 }), "EXPENSE_PAYMENT_SPLIT_MISMATCH"],
    [cashDraft({ paymentMethod: "mixed", cashPaidAed: 0, bankPaidAed: 125 }), "EXPENSE_PAYMENT_SPLIT_MISMATCH"],
    [cashDraft({ paymentMethod: "mixed", cashPaidAed: 50, bankPaidAed: 50 }), "EXPENSE_PAYMENT_SPLIT_MISMATCH"],
    [cashDraft({ expenseScope: "Apartment" }), "EXPENSE_SCOPE_INVALID"],
    [cashDraft({ expenseScope: "apartment" }), "EXPENSE_SCOPE_TARGET_REQUIRED"],
    [cashDraft({ expenseScope: "bed" }), "EXPENSE_SCOPE_TARGET_REQUIRED"],
    [cashDraft({ vendorName: " " }), "EXPENSE_VENDOR_REQUIRED"],
    [cashDraft({ expenseDescription: "" }), "EXPENSE_DESCRIPTION_REQUIRED"],
    [cashDraft({ receiptAvailable: true, receiptNote: "" }), "EXPENSE_RECEIPT_NOTE_REQUIRED"],
  ]) {
    assert.ok(codesFor(value).includes(code), `${code}: ${JSON.stringify(value)}`);
  }

  const forbiddenFields = [
    "providerPhone", "phone", "cardId", "tenantCardId", "ttlockId",
    "customerName", "tenantName", "cardName", "previewText", "whatsappText",
    "rentAmountAed", "amountDueAed", "arrearsPaymentAmountAed", "cloudArrearsRef",
    "depositAmountAed", "depositReceivedDate", "refundAmountAed", "checkoutDate",
    "checkoutMode", "fromBed", "toBed", "transferFeeAed", "vacancyStatus",
    "event_type", "type", "endpoint", "url", "headers", "token", "authorization",
    "idempotencyKey", "financeLedgerId", "ownerHistoryId", "canonicalAnchorId",
    "receiptFile", "receiptUrl", "uploadUrl", "receiptBlob", "backendPayload",
  ];
  for (const field of forbiddenFields) {
    const codes = codesFor({ ...cashDraft(), [field]: "secret" });
    assert.ok(codes.includes("EXPENSE_PROVIDER_IDENTITY_FORBIDDEN"), field);
    assert.ok(codes.includes("EXPENSE_SCOPE_FIELD_FORBIDDEN"), field);
    assert.ok(codes.includes("EXPENSE_BACKEND_FIELD_FORBIDDEN"), field);
  }

  for (const invalid of [
    null,
    cashDraft({ expenseAmountAed: 0 }),
    cashDraft({ vendorName: "SECRET-VENDOR", receiptAvailable: true }),
    { ...cashDraft(), token: "SECRET-TOKEN" },
  ]) {
    assert.throws(
      () => expenseModule.createEmployeeExpenseEventContract().buildSubmission(invalid),
      (error) => (
        error.message === "EMPLOYEE_EXPENSE_INVALID_DRAFT"
        && !/SECRET|TOKEN|VENDOR|125/u.test(error.message)
      ),
    );
  }
});

function semanticDiagnosticsFor(source) {
  const virtualFileName = resolve(employeeNextRoot, "tests", "expense-fixture.ts");
  const compilerOptions = {
    strict: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => (
    [virtualFileName, expensePath, eventContractPath]
      .some((candidate) => resolve(fileName) === candidate)
    || ts.sys.fileExists(fileName)
  );
  host.readFile = (fileName) => {
    if (resolve(fileName) === virtualFileName) return source;
    if (resolve(fileName) === expensePath) return expenseSource;
    if (resolve(fileName) === eventContractPath) return eventContractSource;
    return ts.sys.readFile(fileName);
  };
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (resolve(fileName) === virtualFileName) {
      return ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS);
    }
    if (resolve(fileName) === expensePath) {
      return ts.createSourceFile(fileName, expenseSource, languageVersion, true, ts.ScriptKind.TS);
    }
    if (resolve(fileName) === eventContractPath) {
      return ts.createSourceFile(fileName, eventContractSource, languageVersion, true, ts.ScriptKind.TS);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  const program = ts.createProgram([virtualFileName], compilerOptions, host);
  return ts.getPreEmitDiagnostics(program);
}

test("expense TypeScript semantic fixtures", () => {
  const imports = `import {
    createEmployeeExpenseEventContract,
    type EmployeeExpenseCategory,
    type EmployeeExpenseDraft,
    type EmployeeExpenseEventContract,
    type EmployeeExpensePaymentLeg,
    type EmployeeExpensePaymentMethod,
    type EmployeeExpenseScope,
    type EmployeeExpenseSubmission,
  } from "../src/events/expense/index";
  import type { EmployeeEventContract } from "../src/core/event-contract";`;
  const validDraft = `{
    expenseDate: "2026-07-26",
    expenseCategory: "maintenance",
    expenseAmountAed: 125,
    paymentMethod: "cash",
    cashPaidAed: 125,
    bankPaidAed: 0,
    expenseScope: "general",
    apartmentLabel: "",
    bedLabel: "",
    vendorName: "vendor",
    paidBy: "",
    expenseDescription: "repair",
    receiptAvailable: false,
    receiptNote: "",
    finalNote: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeExpenseCategory = "maintenance"; void value;`,
    `${imports} const value: EmployeeExpensePaymentMethod = "mixed"; void value;`,
    `${imports} const value: EmployeeExpenseScope = "general"; void value;`,
    `${imports} const value: EmployeeExpenseDraft = ${validDraft}; void value;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const id: "expense" = value.eventId; void id;`,
    `${imports} const value: EmployeeExpensePaymentLeg = { method: "cash", amountAed: 1 }; void value;`,
    `${imports} const value: EmployeeExpenseEventContract = createEmployeeExpenseEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeExpenseDraft, EmployeeExpenseSubmission> = createEmployeeExpenseEventContract(); void value;`,
    `${imports} const value: EmployeeExpenseSubmission = createEmployeeExpenseEventContract().buildSubmission(${validDraft}); void value;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const zero: 0 = value.accountingPreview.rentIncomeAed; void zero;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const zero: 0 = value.accountingPreview.depositReceivedAed; void zero;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const zero: 0 = value.accountingPreview.depositRefundedAed; void zero;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const zero: 0 = value.accountingPreview.arrearsRepaidAed; void zero;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const zero: 0 = value.accountingPreview.currentDepositMutationAed; void zero;`,
    `${imports} declare const value: EmployeeExpenseSubmission; const applied: false = value.accountingPreview.financeMutationApplied; void applied;`,
  ];
  assert.ok(positives.length >= 10);
  for (const source of positives) assert.deepEqual(semanticDiagnosticsFor(source), []);

  const negatives = [
    [`${imports} const value: EmployeeExpenseCategory = "unknown";`, /unknown/u],
    [`${imports} const value: EmployeeExpensePaymentMethod = "card";`, /card/u],
    [`${imports} const value: EmployeeExpenseScope = "property";`, /property/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, expenseDate: undefined };`, /undefined/u],
    [`${imports} const { expenseAmountAed, ...rest } = ${validDraft}; const value: EmployeeExpenseDraft = rest;`, /expenseAmountAed/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, expenseAmountAed: "125" };`, /string/u],
    [`${imports} const { vendorName, ...rest } = ${validDraft}; const value: EmployeeExpenseDraft = rest;`, /vendorName/u],
    [`${imports} const { expenseDescription, ...rest } = ${validDraft}; const value: EmployeeExpenseDraft = rest;`, /expenseDescription/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, providerPhone: "x" };`, /providerPhone/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, event_type: "expense" };`, /event_type/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, checkoutMode: "normal" };`, /checkoutMode/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, cloudArrearsRef: "x" };`, /cloudArrearsRef/u],
    [`${imports} const value: EmployeeExpenseDraft = { ...${validDraft}, depositAmountAed: 1 };`, /depositAmountAed/u],
    [`${imports} const value: EmployeeExpensePaymentLeg = { method: "mixed", amountAed: 1 };`, /mixed/u],
    [`${imports} const value: EmployeeExpenseSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeExpenseSubmission; const id: "rent" = value.eventId;`, /expense/u],
    [`${imports} declare const value: EmployeeExpenseSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} declare const value: EmployeeExpenseSubmission; const invalid: 1 = value.accountingPreview.rentIncomeAed;`, /0/u],
    [`${imports} declare const value: EmployeeExpenseSubmission; const invalid: true = value.accountingPreview.financeMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeExpenseSubmission; const upload = value.receiptUrl;`, /receiptUrl/u],
    [`${imports} const value: EmployeeExpenseEventContract = { eventId: "expense", displayName: "Expense", createInitialDraft() { return ${validDraft}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeExpenseEventContract = { ...createEmployeeExpenseEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
  ];
  assert.ok(negatives.length >= 18);
  for (const [source, expected] of negatives) {
    const diagnostics = semanticDiagnosticsFor(source);
    assert.ok(diagnostics.length > 0, source);
    const text = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ).join("\n");
    assert.match(text, expected, source);
  }
});

test("expense source boundary excludes integrations and other event rules", async () => {
  assert.match(expenseSource, /from "\.\.\/\.\.\/core\/event-contract"/u);
  assert.doesNotMatch(
    expenseSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:rent|arrears-payment|deposit-in|deposit-out|checkout|bed-transfer)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    expenseSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    expenseSource,
    /providerPhone|tenantCardId|ttlockId|customerName|tenantName|previewText|whatsappText|event_type|financeLedgerId|ownerHistoryId|canonicalAnchorId|receiptFile|receiptUrl|uploadUrl|receiptBlob|backendPayload/iu,
  );
  assert.doesNotMatch(
    expenseSource,
    /createEmployeeEventRegistry|register|singleton|finance ledger|owner history|receipt upload|default\s+export/iu,
  );
  for (const [directory, marker] of [
    ["rent", "EMPLOYEE_RENT_EVENT_ID"],
    ["arrears-payment", "EMPLOYEE_ARREARS_PAYMENT_EVENT_ID"],
    ["deposit-in", "EMPLOYEE_DEPOSIT_IN_EVENT_ID"],
    ["deposit-out", "EMPLOYEE_DEPOSIT_OUT_EVENT_ID"],
    ["checkout", "EMPLOYEE_CHECKOUT_EVENT_ID"],
  ]) {
    const source = await readFile(
      resolve(employeeNextRoot, "src", "events", directory, "index.ts"),
      "utf8",
    );
    assert.match(source, new RegExp(marker, "u"));
  }
  const bedTransferSource = await readFile(
    resolve(employeeNextRoot, "src", "events", "bed-transfer", "index.ts"),
    "utf8",
  );
  assert.equal(
    bedTransferSource.replaceAll("\r\n", "\n"),
    'export const bedTransferScaffold = "bed-transfer-scaffold";\n',
  );
});
