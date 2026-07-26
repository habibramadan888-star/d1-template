import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const depositOutPath = resolve(
  employeeNextRoot,
  "src",
  "events",
  "deposit-out",
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
const depositOutSource = await readFile(depositOutPath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [depositOutPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const depositOutModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_DEPOSIT_OUT_EVENT_ID",
  "EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS",
  "EMPLOYEE_DEPOSIT_OUT_VALIDATION_CODES",
  "createEmployeeDepositOutEventContract",
  "isEmployeeDepositOutDraft",
  "isEmployeeDepositOutRefundMethod",
];
const refundMethods = ["cash", "bank", "mixed"];
const validationCodes = [
  "DEPOSIT_OUT_DRAFT_NOT_OBJECT",
  "DEPOSIT_OUT_BED_REQUIRED",
  "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED",
  "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
  "DEPOSIT_OUT_REFUND_AMOUNT_REQUIRED",
  "DEPOSIT_OUT_REFUND_AMOUNT_INVALID",
  "DEPOSIT_OUT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
  "DEPOSIT_OUT_DIFFERENCE_REASON_REQUIRED",
  "DEPOSIT_OUT_REFUND_METHOD_INVALID",
  "DEPOSIT_OUT_REFUND_LEGS_INVALID",
  "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH",
  "DEPOSIT_OUT_REFUND_DATE_REQUIRED",
  "DEPOSIT_OUT_PROVIDER_IDENTITY_FORBIDDEN",
  "DEPOSIT_OUT_SCOPE_FIELD_FORBIDDEN",
];

function cashDraft(overrides = {}) {
  return {
    bedLabel: "B-401",
    currentDepositSnapshotAed: 500,
    refundAmountAed: 500,
    refundMethod: "cash",
    cashRefundedAed: 500,
    bankRefundedAed: 0,
    refundDate: "2026-07-26",
    differenceReason: "",
    note: "",
    ...overrides,
  };
}

function bankDraft(overrides = {}) {
  return cashDraft({
    refundMethod: "bank",
    cashRefundedAed: 0,
    bankRefundedAed: 500,
    ...overrides,
  });
}

function mixedDraft(overrides = {}) {
  return cashDraft({
    refundMethod: "mixed",
    cashRefundedAed: 200,
    bankRefundedAed: 300,
    ...overrides,
  });
}

function validationCodesFor(value) {
  return depositOutModule
    .createEmployeeDepositOutEventContract()
    .validateDraft(value)
    .map((entry) => entry.code);
}

test("deposit-out runtime success contract", () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };

  check(() => assert.deepEqual(Object.keys(depositOutModule).sort(), runtimeExports));
  check(() => assert.equal(depositOutModule.EMPLOYEE_DEPOSIT_OUT_EVENT_ID, "deposit-out"));
  check(() => assert.deepEqual(depositOutModule.EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS, refundMethods));
  check(() => assert.equal(Object.isFrozen(depositOutModule.EMPLOYEE_DEPOSIT_OUT_REFUND_METHODS), true));
  check(() => assert.deepEqual(depositOutModule.EMPLOYEE_DEPOSIT_OUT_VALIDATION_CODES, validationCodes));
  check(() => assert.equal(Object.isFrozen(depositOutModule.EMPLOYEE_DEPOSIT_OUT_VALIDATION_CODES), true));

  const firstContract = depositOutModule.createEmployeeDepositOutEventContract();
  const secondContract = depositOutModule.createEmployeeDepositOutEventContract();
  check(() => assert.equal(firstContract.eventId, "deposit-out"));
  check(() => assert.equal(firstContract.displayName, "Deposit Out"));
  check(() => assert.notEqual(firstContract, secondContract));
  check(() => assert.equal(Object.isFrozen(firstContract), true));
  check(() => assert.deepEqual(firstContract.createInitialDraft(), {
    bedLabel: "",
    currentDepositSnapshotAed: null,
    refundAmountAed: null,
    refundMethod: "cash",
    cashRefundedAed: null,
    bankRefundedAed: null,
    refundDate: "",
    differenceReason: "",
    note: "",
  }));
  check(() => assert.equal(Object.isFrozen(firstContract.createInitialDraft()), true));
  check(() => assert.equal(depositOutModule.isEmployeeDepositOutDraft(cashDraft()), true));
  check(() => assert.equal(depositOutModule.isEmployeeDepositOutRefundMethod("cash"), true));
  check(() => assert.equal(depositOutModule.isEmployeeDepositOutRefundMethod("Cash"), false));
  const validIssues = firstContract.validateDraft(cashDraft());
  check(() => assert.deepEqual(validIssues, []));
  check(() => assert.equal(Object.isFrozen(validIssues), true));

  const cashInput = cashDraft({ bedLabel: " B-401 ", note: " returned at desk " });
  const cashBefore = structuredClone(cashInput);
  const cash = firstContract.buildSubmission(cashInput);
  check(() => assert.deepEqual(cashInput, cashBefore));
  check(() => assert.equal(cash.eventId, "deposit-out"));
  check(() => assert.equal(cash.schemaVersion, 1));
  check(() => assert.equal(cash.displayName, "Deposit Out"));
  check(() => assert.equal(cash.bedLabel, "B-401"));
  check(() => assert.equal(cash.currentDepositSnapshotAed, 500));
  check(() => assert.equal(cash.refundAmountAed, 500));
  check(() => assert.deepEqual(cash.refund, {
    method: "cash",
    legs: [{ method: "cash", amountAed: 500 }],
  }));
  check(() => assert.equal(cash.refundDate, "2026-07-26"));
  check(() => assert.deepEqual(cash.difference, {
    amountAed: 0,
    reasonRequired: false,
    reason: null,
  }));
  check(() => assert.deepEqual(cash.accountingPreview, {
    depositRefundedAed: 500,
    rentIncomeAed: 0,
    currentDepositMutationAed: 0,
  }));
  check(() => assert.deepEqual(cash.reconciliationPreview, {
    currentDepositReconciliationRequired: true,
    reason: "deposit-out-does-not-control-current-balance",
  }));
  check(() => assert.equal(cash.note, "returned at desk"));
  check(() => assert.equal(Object.isFrozen(cash), true));
  check(() => assert.equal(Object.isFrozen(cash.refund), true));
  check(() => assert.equal(Object.isFrozen(cash.refund.legs), true));
  check(() => assert.equal(Object.isFrozen(cash.refund.legs[0]), true));
  check(() => assert.equal(Object.isFrozen(cash.difference), true));
  check(() => assert.equal(Object.isFrozen(cash.accountingPreview), true));
  check(() => assert.equal(Object.isFrozen(cash.reconciliationPreview), true));

  const bank = firstContract.buildSubmission(bankDraft());
  check(() => assert.deepEqual(bank.refund, {
    method: "bank",
    legs: [{ method: "bank", amountAed: 500 }],
  }));
  const mixed = firstContract.buildSubmission(mixedDraft());
  check(() => assert.deepEqual(mixed.refund, {
    method: "mixed",
    legs: [
      { method: "cash", amountAed: 200 },
      { method: "bank", amountAed: 300 },
    ],
  }));
  const partial = firstContract.buildSubmission(cashDraft({
    refundAmountAed: 350,
    cashRefundedAed: 350,
    differenceReason: " maintenance deduction ",
  }));
  check(() => assert.deepEqual(partial.difference, {
    amountAed: 150,
    reasonRequired: true,
    reason: "maintenance deduction",
  }));
  check(() => assert.equal(partial.accountingPreview.depositRefundedAed, 350));
  check(() => assert.equal(partial.accountingPreview.rentIncomeAed, 0));
  check(() => assert.equal(partial.accountingPreview.currentDepositMutationAed, 0));
  check(() => assert.equal("occupancy" in partial, false));
  check(() => assert.equal(successCases >= 32, true));
});

test("deposit-out runtime fail-closed contract", () => {
  let failClosedCases = 0;
  const expectCode = (value, code) => {
    assert.ok(validationCodesFor(value).includes(code), code);
    failClosedCases += 1;
  };
  const expectThrow = (value) => {
    assert.throws(
      () => depositOutModule.createEmployeeDepositOutEventContract().buildSubmission(value),
      /EMPLOYEE_DEPOSIT_OUT_INVALID_DRAFT/u,
    );
    failClosedCases += 1;
  };

  for (const value of [null, undefined, [], "draft", 1, true, new Date()]) {
    expectCode(value, "DEPOSIT_OUT_DRAFT_NOT_OBJECT");
  }
  expectCode(cashDraft({ bedLabel: "" }), "DEPOSIT_OUT_BED_REQUIRED");
  expectCode(cashDraft({ bedLabel: " " }), "DEPOSIT_OUT_BED_REQUIRED");
  expectCode(cashDraft({ currentDepositSnapshotAed: null }), "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED");
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.001, "500"]) {
    expectCode(cashDraft({ currentDepositSnapshotAed: value }), "DEPOSIT_OUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID");
  }
  expectCode(cashDraft({ refundAmountAed: null }), "DEPOSIT_OUT_REFUND_AMOUNT_REQUIRED");
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.001, "500"]) {
    expectCode(cashDraft({ refundAmountAed: value }), "DEPOSIT_OUT_REFUND_AMOUNT_INVALID");
  }
  expectCode(
    cashDraft({ currentDepositSnapshotAed: 499, refundAmountAed: 500 }),
    "DEPOSIT_OUT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
  );
  expectCode(
    cashDraft({ refundAmountAed: 400, cashRefundedAed: 400 }),
    "DEPOSIT_OUT_DIFFERENCE_REASON_REQUIRED",
  );
  expectCode(
    cashDraft({ refundAmountAed: 400, cashRefundedAed: 400, differenceReason: " " }),
    "DEPOSIT_OUT_DIFFERENCE_REASON_REQUIRED",
  );
  expectCode(cashDraft({ refundMethod: "crypto" }), "DEPOSIT_OUT_REFUND_METHOD_INVALID");
  expectCode(cashDraft({ refundMethod: "Cash" }), "DEPOSIT_OUT_REFUND_METHOD_INVALID");
  expectCode(cashDraft({ refundMethod: "cash_refund" }), "DEPOSIT_OUT_REFUND_METHOD_INVALID");
  expectCode(cashDraft({ refundMethod: "cash refund" }), "DEPOSIT_OUT_REFUND_METHOD_INVALID");
  expectCode(cashDraft({ cashRefundedAed: null }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(cashDraft({ bankRefundedAed: 1 }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(cashDraft({ cashRefundedAed: 499 }), "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH");
  expectCode(bankDraft({ bankRefundedAed: null }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(bankDraft({ cashRefundedAed: 1 }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(bankDraft({ bankRefundedAed: 499 }), "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH");
  expectCode(mixedDraft({ cashRefundedAed: 0, bankRefundedAed: 500 }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(mixedDraft({ cashRefundedAed: 500, bankRefundedAed: 0 }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(mixedDraft({ cashRefundedAed: null }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(mixedDraft({ bankRefundedAed: null }), "DEPOSIT_OUT_REFUND_LEGS_INVALID");
  expectCode(mixedDraft({ cashRefundedAed: 199 }), "DEPOSIT_OUT_REFUND_TOTAL_MISMATCH");
  for (const value of ["", "2026/07/26", "26-07-2026", 20260726]) {
    expectCode(cashDraft({ refundDate: value }), "DEPOSIT_OUT_REFUND_DATE_REQUIRED");
  }

  const forbiddenExtras = [
    ["providerPhone", "hidden"],
    ["cardId", "hidden"],
    ["tenantName", "hidden"],
    ["customerName", "hidden"],
    ["depositAmountAed", 1],
    ["depositReceivedDate", "2026-07-26"],
    ["arrearsRef", "hidden"],
    ["cloudArrearsRef", "hidden"],
    ["checkoutType", "hidden"],
    ["moveOutDate", "2026-07-26"],
    ["vacancyStatus", "hidden"],
    ["expenseCategory", "hidden"],
    ["event_type", "hidden"],
    ["type", "hidden"],
  ];
  for (const [key, value] of forbiddenExtras) {
    const draft = { ...cashDraft(), [key]: value };
    expectCode(draft, "DEPOSIT_OUT_PROVIDER_IDENTITY_FORBIDDEN");
    expectCode(draft, "DEPOSIT_OUT_SCOPE_FIELD_FORBIDDEN");
  }
  const extraIdentity = { ...cashDraft(), providerIdentity: "hidden" };
  const extraScope = { ...cashDraft(), companyScope: "hidden" };
  assert.equal(depositOutModule.isEmployeeDepositOutDraft(extraIdentity), false);
  failClosedCases += 1;
  assert.equal(depositOutModule.isEmployeeDepositOutDraft({ ...cashDraft(), note: 1 }), false);
  failClosedCases += 1;
  assert.equal(depositOutModule.isEmployeeDepositOutDraft({ ...cashDraft(), refundMethod: "wire" }), false);
  failClosedCases += 1;

  for (const value of [
    null,
    cashDraft({ bedLabel: "" }),
    cashDraft({ currentDepositSnapshotAed: null }),
    cashDraft({ refundAmountAed: 501, cashRefundedAed: 501 }),
    cashDraft({ refundAmountAed: 400, cashRefundedAed: 400 }),
    cashDraft({ refundMethod: "wire" }),
    mixedDraft({ cashRefundedAed: 100 }),
    cashDraft({ refundDate: "" }),
    extraIdentity,
  ]) {
    expectThrow(value);
  }
  assert.equal(
    (() => {
      try {
        depositOutModule
          .createEmployeeDepositOutEventContract()
          .buildSubmission(cashDraft({
            bedLabel: "SECRET-BED",
            refundAmountAed: 600,
            cashRefundedAed: 600,
            differenceReason: "SECRET-REASON",
            note: "SECRET-NOTE",
          }));
      } catch (error) {
        return error.message === "EMPLOYEE_DEPOSIT_OUT_INVALID_DRAFT";
      }
      return false;
    })(),
    true,
  );
  failClosedCases += 1;
  assert.equal(failClosedCases >= 44, true);
});

function semanticDiagnosticsFor(source) {
  const virtualFileName = resolve(employeeNextRoot, "tests", "deposit-out-fixture.ts");
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
    [virtualFileName, depositOutPath, eventContractPath]
      .some((candidate) => resolve(fileName) === candidate)
    || ts.sys.fileExists(fileName)
  );
  host.readFile = (fileName) => {
    if (resolve(fileName) === virtualFileName) return source;
    if (resolve(fileName) === depositOutPath) return depositOutSource;
    if (resolve(fileName) === eventContractPath) return eventContractSource;
    return ts.sys.readFile(fileName);
  };
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (resolve(fileName) === virtualFileName) {
      return ts.createSourceFile(
        fileName,
        source,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    if (resolve(fileName) === depositOutPath) {
      return ts.createSourceFile(
        fileName,
        depositOutSource,
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
      shouldCreateNewSourceFile,
    );
  };
  const program = ts.createProgram([virtualFileName], compilerOptions, host);
  return ts.getPreEmitDiagnostics(program);
}

test("deposit-out TypeScript semantic fixtures", () => {
  const imports = `import {
    createEmployeeDepositOutEventContract,
    type EmployeeDepositOutDraft,
    type EmployeeDepositOutEventContract,
    type EmployeeDepositOutRefundLeg,
    type EmployeeDepositOutRefundMethod,
    type EmployeeDepositOutSubmission,
  } from "../src/events/deposit-out/index";
  import type { EmployeeEventContract } from "../src/core/event-contract";`;
  const validDraft = `{
    bedLabel: "B-401",
    currentDepositSnapshotAed: 500,
    refundAmountAed: 500,
    refundMethod: "cash",
    cashRefundedAed: 500,
    bankRefundedAed: 0,
    refundDate: "2026-07-26",
    differenceReason: "",
    note: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeDepositOutRefundMethod = "cash"; void value;`,
    `${imports} const value: EmployeeDepositOutDraft = ${validDraft}; void value;`,
    `${imports} declare const value: EmployeeDepositOutSubmission; const id: "deposit-out" = value.eventId; void id;`,
    `${imports} const value: EmployeeDepositOutRefundLeg = { method: "bank", amountAed: 25 }; void value;`,
    `${imports} const value: EmployeeDepositOutEventContract = createEmployeeDepositOutEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeDepositOutDraft, EmployeeDepositOutSubmission> = createEmployeeDepositOutEventContract(); void value;`,
    `${imports} const contract = createEmployeeDepositOutEventContract(); const value: EmployeeDepositOutSubmission = contract.buildSubmission(${validDraft}); void value;`,
    `${imports} declare const value: EmployeeDepositOutSubmission; const zero: 0 = value.accountingPreview.rentIncomeAed; void zero;`,
    `${imports} declare const value: EmployeeDepositOutSubmission; const zero: 0 = value.accountingPreview.currentDepositMutationAed; void zero;`,
    `${imports} declare const value: EmployeeDepositOutSubmission; const reason: string | null = value.difference.reason; void reason;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeDepositOutRefundMethod = "crypto";`, /crypto/u],
    [`${imports} const value: EmployeeDepositOutDraft = { refundAmountAed: 1 };`, /bedLabel/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, refundAmountAed: undefined };`, /undefined/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, refundAmountAed: "500" };`, /string/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, providerPhone: "x" };`, /providerPhone/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, event_type: "x" };`, /event_type/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, currentDepositSnapshotAed: undefined };`, /undefined/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, checkoutType: "x" };`, /checkoutType/u],
    [`${imports} const value: EmployeeDepositOutDraft = { ...${validDraft}, depositAmountAed: 1 };`, /depositAmountAed/u],
    [`${imports} const value: EmployeeDepositOutRefundLeg = { method: "mixed", amountAed: 25 };`, /mixed/u],
    [`${imports} const value: EmployeeDepositOutSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeDepositOutSubmission; const id: "rent" = value.eventId;`, /deposit-out/u],
    [`${imports} declare const value: EmployeeDepositOutSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} declare const value: EmployeeDepositOutSubmission; const invalid: 1 = value.accountingPreview.rentIncomeAed;`, /0/u],
    [`${imports} declare const value: EmployeeDepositOutSubmission; const invalid: 1 = value.accountingPreview.currentDepositMutationAed;`, /0/u],
    [`${imports} declare const value: EmployeeDepositOutSubmission; const invalid = value.occupancyMutation;`, /occupancyMutation/u],
    [`${imports} const value: EmployeeDepositOutEventContract = { eventId: "deposit-out", displayName: "Deposit Out", createInitialDraft() { return ${validDraft}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeDepositOutEventContract = { ...createEmployeeDepositOutEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
    [`${imports} declare const value: string; const method: EmployeeDepositOutRefundMethod = value;`, /string/u],
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

test("deposit-out source boundary excludes integrations and other event rules", async () => {
  assert.match(depositOutSource, /from "\.\.\/\.\.\/core\/event-contract"/u);
  assert.doesNotMatch(
    depositOutSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:rent|arrears-payment|deposit-in|checkout|expense|bed-transfer)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    depositOutSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    depositOutSource,
    /tenant_card_id|card_id|old_ttlock_ref|provider_phone|providerPhone|phone|ttlockId|customerName|tenantName|previewText|whatsappText|arrearsRef|cloudArrearsRef|event_type|canonical_anchor_id|deposit_ledger_id|finance_ledger_id|owner_history_id|sync_state_id|real_endpoint|headers|token|idempotency_key/iu,
  );
  assert.doesNotMatch(
    depositOutSource,
    /createEmployeeEventRegistry|register|singleton|canonical anchor|deposit ledger|finance ledger|owner history|sync state|currentDepositSnapshotAed\s*[+\-]=|occupancy|change room/iu,
  );

  for (const [directory, marker] of [
    ["rent", "EMPLOYEE_RENT_EVENT_ID"],
    ["arrears-payment", "EMPLOYEE_ARREARS_PAYMENT_EVENT_ID"],
    ["deposit-in", "EMPLOYEE_DEPOSIT_IN_EVENT_ID"],
  ]) {
    const source = await readFile(
      resolve(employeeNextRoot, "src", "events", directory, "index.ts"),
      "utf8",
    );
    assert.match(source, new RegExp(marker, "u"));
  }
  for (const [directory, expected] of [
    ["checkout", 'export const checkoutScaffold = "checkout-scaffold";\n'],
    ["expense", 'export const expenseScaffold = "expense-scaffold";\n'],
    ["bed-transfer", 'export const bedTransferScaffold = "bed-transfer-scaffold";\n'],
  ]) {
    const source = await readFile(
      resolve(employeeNextRoot, "src", "events", directory, "index.ts"),
      "utf8",
    );
    assert.equal(source.replaceAll("\r\n", "\n"), expected);
  }
});
