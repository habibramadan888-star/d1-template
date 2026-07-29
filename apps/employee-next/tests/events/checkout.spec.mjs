import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const checkoutPath = resolve(employeeNextRoot, "src", "events", "checkout", "index.ts");
const eventContractPath = resolve(employeeNextRoot, "src", "core", "event-contract.ts");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(resolve(sourceRepositoryRoot, "package.json"));
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const checkoutSource = await readFile(checkoutPath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [checkoutPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const checkoutModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const runtimeExports = [
  "EMPLOYEE_CHECKOUT_EVENT_ID",
  "EMPLOYEE_CHECKOUT_MODES",
  "EMPLOYEE_CHECKOUT_VALIDATION_CODES",
  "createEmployeeCheckoutEventContract",
  "isEmployeeCheckoutDraft",
  "isEmployeeCheckoutMode",
];
const modes = ["normal", "left_with_arrears"];
const validationCodes = [
  "CHECKOUT_DRAFT_NOT_OBJECT",
  "CHECKOUT_BED_REQUIRED",
  "CHECKOUT_DATE_REQUIRED",
  "CHECKOUT_DATE_INVALID",
  "CHECKOUT_MODE_INVALID",
  "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED",
  "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID",
  "CHECKOUT_DEPOSIT_REFUND_AMOUNT_REQUIRED",
  "CHECKOUT_DEPOSIT_REFUND_AMOUNT_INVALID",
  "CHECKOUT_DEPOSIT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
  "CHECKOUT_DEPOSIT_DIFFERENCE_REASON_REQUIRED",
  "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_REQUIRED",
  "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_INVALID",
  "CHECKOUT_NORMAL_WITH_OPEN_ARREARS_FORBIDDEN",
  "CHECKOUT_LEFT_WITH_ARREARS_REF_REQUIRED",
  "CHECKOUT_LEFT_WITH_ARREARS_CONTACT_REQUIRED",
  "CHECKOUT_LEFT_WITH_ARREARS_BELONGINGS_NOTE_REQUIRED",
  "CHECKOUT_PROMISE_DATE_INVALID",
  "CHECKOUT_PROVIDER_IDENTITY_FORBIDDEN",
  "CHECKOUT_SCOPE_FIELD_FORBIDDEN",
];

function normalDraft(overrides = {}) {
  return {
    bedLabel: "B-501",
    checkoutDate: "2026-07-26",
    checkoutMode: "normal",
    currentDepositSnapshotAed: 500,
    depositRefundAed: 500,
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
    ...overrides,
  };
}

function arrearsDraft(overrides = {}) {
  return normalDraft({
    checkoutMode: "left_with_arrears",
    outstandingArrearsSnapshotAed: 350,
    cloudArrearsRef: "AR-CLOUD-001",
    formerCustomerName: "Former customer",
    contactMethod: "declared contact",
    contactNote: "follow up",
    promisedPaymentDate: "2026-08-01",
    ...overrides,
  });
}

function codesFor(value) {
  return checkoutModule
    .createEmployeeCheckoutEventContract()
    .validateDraft(value)
    .map((entry) => entry.code);
}

test("checkout runtime success contract", () => {
  let successCases = 0;
  const check = (callback) => {
    callback();
    successCases += 1;
  };

  check(() => assert.deepEqual(Object.keys(checkoutModule).sort(), runtimeExports));
  check(() => assert.equal(checkoutModule.EMPLOYEE_CHECKOUT_EVENT_ID, "checkout"));
  check(() => assert.deepEqual(checkoutModule.EMPLOYEE_CHECKOUT_MODES, modes));
  check(() => assert.equal(Object.isFrozen(checkoutModule.EMPLOYEE_CHECKOUT_MODES), true));
  check(() => assert.deepEqual(checkoutModule.EMPLOYEE_CHECKOUT_VALIDATION_CODES, validationCodes));
  check(() => assert.equal(Object.isFrozen(checkoutModule.EMPLOYEE_CHECKOUT_VALIDATION_CODES), true));

  const firstContract = checkoutModule.createEmployeeCheckoutEventContract();
  const secondContract = checkoutModule.createEmployeeCheckoutEventContract();
  check(() => assert.equal(firstContract.eventId, "checkout"));
  check(() => assert.equal(firstContract.displayName, "Checkout"));
  check(() => assert.notEqual(firstContract, secondContract));
  check(() => assert.equal(Object.isFrozen(firstContract), true));
  check(() => assert.deepEqual(firstContract.createInitialDraft(), {
    bedLabel: "",
    checkoutDate: "",
    checkoutMode: "normal",
    currentDepositSnapshotAed: null,
    depositRefundAed: null,
    depositDifferenceReason: "",
    outstandingArrearsSnapshotAed: null,
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
  }));
  check(() => assert.equal(Object.isFrozen(firstContract.createInitialDraft()), true));
  check(() => assert.equal(checkoutModule.isEmployeeCheckoutDraft(normalDraft()), true));
  check(() => assert.equal(checkoutModule.isEmployeeCheckoutMode("normal"), true));
  check(() => assert.equal(checkoutModule.isEmployeeCheckoutMode("Normal"), false));
  const validIssues = firstContract.validateDraft(normalDraft());
  check(() => assert.deepEqual(validIssues, []));
  check(() => assert.equal(Object.isFrozen(validIssues), true));

  const normalInput = normalDraft({ bedLabel: " B-501 ", finalNote: " completed " });
  const normalBefore = structuredClone(normalInput);
  const normal = firstContract.buildSubmission(normalInput);
  check(() => assert.deepEqual(normalInput, normalBefore));
  check(() => assert.equal(normal.eventId, "checkout"));
  check(() => assert.equal(normal.schemaVersion, 1));
  check(() => assert.equal(normal.displayName, "Checkout"));
  check(() => assert.equal(normal.bedLabel, "B-501"));
  check(() => assert.equal(normal.checkoutDate, "2026-07-26"));
  check(() => assert.equal(normal.checkoutMode, "normal"));
  check(() => assert.deepEqual(normal.depositSettlement, {
    currentDepositSnapshotAed: 500,
    depositRefundDeclaredAed: 500,
    differenceAed: 0,
    differenceReason: null,
  }));
  check(() => assert.deepEqual(normal.arrearsSnapshot, {
    outstandingArrearsAed: 0,
    cloudArrearsRef: null,
    closesArrears: false,
  }));
  check(() => assert.equal(normal.leftWithArrears, null));
  check(() => assert.deepEqual(normal.ownerApprovalPreview, {
    ownerApprovalRequired: false,
    ownerApprovalStatus: "not_required",
    reason: null,
  }));
  check(() => assert.deepEqual(normal.accountingPreview, {
    depositRefundDeclaredAed: 500,
    rentIncomeAed: 0,
    currentDepositMutationAed: 0,
    arrearsClosedAed: 0,
  }));
  check(() => assert.deepEqual(normal.occupancyPreview, {
    checkoutDeclared: true,
    occupancyMutationApplied: false,
    bedVacancyMutationApplied: false,
    accessMutationApplied: false,
    reason: "checkout-module-does-not-control-occupancy",
  }));
  check(() => assert.deepEqual(normal.reconciliationPreview, {
    depositReconciliationRequired: true,
    arrearsReconciliationRequired: false,
    occupancyReconciliationRequired: true,
    reason: "checkout-does-not-write-production-sources",
  }));
  check(() => assert.equal(normal.finalNote, "completed"));
  for (const snapshot of [
    normal,
    normal.depositSettlement,
    normal.arrearsSnapshot,
    normal.ownerApprovalPreview,
    normal.accountingPreview,
    normal.occupancyPreview,
    normal.reconciliationPreview,
  ]) {
    check(() => assert.equal(Object.isFrozen(snapshot), true));
  }

  const partial = firstContract.buildSubmission(normalDraft({
    depositRefundAed: 0,
    depositDifferenceReason: " retained for damage ",
  }));
  check(() => assert.deepEqual(partial.depositSettlement, {
    currentDepositSnapshotAed: 500,
    depositRefundDeclaredAed: 0,
    differenceAed: 500,
    differenceReason: "retained for damage",
  }));

  const leftInput = arrearsDraft({
    formerCustomerName: " Former customer ",
    formerCustomerPhone: " 0500000000 ",
    contactMethod: " phone ",
    contactNote: " follow up ",
    belongingsHeld: true,
    belongingsNote: " one bag ",
    promisedReturnDate: "2026-08-02",
  });
  const left = firstContract.buildSubmission(leftInput);
  check(() => assert.equal(left.checkoutMode, "left_with_arrears"));
  check(() => assert.equal(left.arrearsSnapshot.outstandingArrearsAed, 350));
  check(() => assert.equal(left.arrearsSnapshot.cloudArrearsRef, "AR-CLOUD-001"));
  check(() => assert.equal(left.arrearsSnapshot.closesArrears, false));
  check(() => assert.deepEqual(left.leftWithArrears, {
    customerLeft: true,
    formerCustomerName: "Former customer",
    formerCustomerPhone: "0500000000",
    contactMethod: "phone",
    contactNote: "follow up",
    belongingsHeld: true,
    belongingsNote: "one bag",
    promisedPaymentDate: "2026-08-01",
    promisedReturnDate: "2026-08-02",
  }));
  check(() => assert.equal(Object.isFrozen(left.leftWithArrears), true));
  check(() => assert.deepEqual(left.ownerApprovalPreview, {
    ownerApprovalRequired: true,
    ownerApprovalStatus: "required_not_requested",
    reason: "left-with-arrears-requires-owner-review",
  }));
  check(() => assert.equal(left.reconciliationPreview.arrearsReconciliationRequired, true));
  check(() => assert.equal(left.accountingPreview.rentIncomeAed, 0));
  check(() => assert.equal(left.accountingPreview.currentDepositMutationAed, 0));
  check(() => assert.equal(left.accountingPreview.arrearsClosedAed, 0));
  check(() => assert.equal(successCases >= 45, true));
});

test("checkout runtime fail-closed contract", () => {
  let failClosedCases = 0;
  const expectCode = (value, code) => {
    assert.ok(codesFor(value).includes(code), code);
    failClosedCases += 1;
  };
  const expectThrow = (value) => {
    assert.throws(
      () => checkoutModule.createEmployeeCheckoutEventContract().buildSubmission(value),
      /EMPLOYEE_CHECKOUT_INVALID_DRAFT/u,
    );
    failClosedCases += 1;
  };

  for (const value of [null, undefined, [], "draft", 1, true, new Date()]) {
    expectCode(value, "CHECKOUT_DRAFT_NOT_OBJECT");
  }
  expectCode(normalDraft({ bedLabel: "" }), "CHECKOUT_BED_REQUIRED");
  expectCode(normalDraft({ checkoutDate: "" }), "CHECKOUT_DATE_REQUIRED");
  for (const value of ["2026/07/26", "26-07-2026", 20260726]) {
    expectCode(normalDraft({ checkoutDate: value }), "CHECKOUT_DATE_INVALID");
  }
  for (const value of ["Normal", "left-with-arrears", "unknown"]) {
    expectCode(normalDraft({ checkoutMode: value }), "CHECKOUT_MODE_INVALID");
  }
  expectCode(normalDraft({ currentDepositSnapshotAed: null }), "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_REQUIRED");
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.001, "500"]) {
    expectCode(normalDraft({ currentDepositSnapshotAed: value }), "CHECKOUT_CURRENT_DEPOSIT_SNAPSHOT_INVALID");
  }
  expectCode(normalDraft({ depositRefundAed: null }), "CHECKOUT_DEPOSIT_REFUND_AMOUNT_REQUIRED");
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.001, "500"]) {
    expectCode(normalDraft({ depositRefundAed: value }), "CHECKOUT_DEPOSIT_REFUND_AMOUNT_INVALID");
  }
  expectCode(
    normalDraft({ depositRefundAed: 501 }),
    "CHECKOUT_DEPOSIT_REFUND_EXCEEDS_CURRENT_DEPOSIT",
  );
  expectCode(
    normalDraft({ depositRefundAed: 499 }),
    "CHECKOUT_DEPOSIT_DIFFERENCE_REASON_REQUIRED",
  );
  expectCode(
    normalDraft({ depositRefundAed: 499, depositDifferenceReason: " " }),
    "CHECKOUT_DEPOSIT_DIFFERENCE_REASON_REQUIRED",
  );
  expectCode(
    normalDraft({ outstandingArrearsSnapshotAed: null }),
    "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_REQUIRED",
  );
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 1.001, "1"]) {
    expectCode(
      normalDraft({ outstandingArrearsSnapshotAed: value }),
      "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_INVALID",
    );
  }
  expectCode(
    normalDraft({ outstandingArrearsSnapshotAed: 1 }),
    "CHECKOUT_NORMAL_WITH_OPEN_ARREARS_FORBIDDEN",
  );
  expectCode(
    arrearsDraft({ outstandingArrearsSnapshotAed: 0 }),
    "CHECKOUT_OUTSTANDING_ARREARS_SNAPSHOT_INVALID",
  );
  expectCode(arrearsDraft({ cloudArrearsRef: "" }), "CHECKOUT_LEFT_WITH_ARREARS_REF_REQUIRED");
  expectCode(
    arrearsDraft({ formerCustomerName: "", formerCustomerPhone: "" }),
    "CHECKOUT_LEFT_WITH_ARREARS_CONTACT_REQUIRED",
  );
  expectCode(
    arrearsDraft({ belongingsHeld: true, belongingsNote: "" }),
    "CHECKOUT_LEFT_WITH_ARREARS_BELONGINGS_NOTE_REQUIRED",
  );
  expectCode(
    arrearsDraft({ promisedPaymentDate: "2026/08/01" }),
    "CHECKOUT_PROMISE_DATE_INVALID",
  );
  expectCode(
    arrearsDraft({ promisedReturnDate: "01-08-2026" }),
    "CHECKOUT_PROMISE_DATE_INVALID",
  );

  const forbiddenExtras = [
    ["providerPhone", "hidden"],
    ["phone", "hidden"],
    ["cardId", "hidden"],
    ["tenantCardId", "hidden"],
    ["ttlockId", "hidden"],
    ["previewText", "hidden"],
    ["whatsappText", "hidden"],
    ["customerName", "hidden"],
    ["tenantName", "hidden"],
    ["cardName", "hidden"],
    ["rentAmountAed", 1],
    ["amountDueAed", 1],
    ["arrearsPaymentAmountAed", 1],
    ["depositAmountAed", 1],
    ["refundAmountAed", 1],
    ["expenseCategory", "hidden"],
    ["fromBed", "hidden"],
    ["toBed", "hidden"],
    ["vacancyStatus", "hidden"],
    ["event_type", "hidden"],
    ["type", "hidden"],
  ];
  for (const [key, value] of forbiddenExtras) {
    const draft = { ...normalDraft(), [key]: value };
    expectCode(draft, "CHECKOUT_PROVIDER_IDENTITY_FORBIDDEN");
    expectCode(draft, "CHECKOUT_SCOPE_FIELD_FORBIDDEN");
  }
  assert.equal(
    checkoutModule.isEmployeeCheckoutDraft({ ...normalDraft(), providerPhone: "x" }),
    false,
  );
  failClosedCases += 1;

  for (const value of [
    null,
    normalDraft({ bedLabel: "" }),
    normalDraft({ checkoutDate: "" }),
    normalDraft({ currentDepositSnapshotAed: null }),
    normalDraft({ depositRefundAed: 501 }),
    normalDraft({ outstandingArrearsSnapshotAed: 1 }),
    arrearsDraft({ cloudArrearsRef: "" }),
    arrearsDraft({ formerCustomerName: "", formerCustomerPhone: "" }),
    { ...normalDraft(), providerPhone: "SECRET" },
  ]) {
    expectThrow(value);
  }
  assert.equal(
    (() => {
      try {
        checkoutModule.createEmployeeCheckoutEventContract().buildSubmission(
          normalDraft({
            bedLabel: "SECRET-BED",
            depositRefundAed: 600,
            depositDifferenceReason: "SECRET-REASON",
            finalNote: "SECRET-NOTE",
          }),
        );
      } catch (error) {
        return error.message === "EMPLOYEE_CHECKOUT_INVALID_DRAFT";
      }
      return false;
    })(),
    true,
  );
  failClosedCases += 1;
  assert.equal(failClosedCases >= 75, true);
});

function semanticDiagnosticsFor(source) {
  const virtualFileName = resolve(employeeNextRoot, "tests", "checkout-fixture.ts");
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
    [virtualFileName, checkoutPath, eventContractPath]
      .some((candidate) => resolve(fileName) === candidate)
    || ts.sys.fileExists(fileName)
  );
  host.readFile = (fileName) => {
    if (resolve(fileName) === virtualFileName) return source;
    if (resolve(fileName) === checkoutPath) return checkoutSource;
    if (resolve(fileName) === eventContractPath) return eventContractSource;
    return ts.sys.readFile(fileName);
  };
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (resolve(fileName) === virtualFileName) {
      return ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS);
    }
    if (resolve(fileName) === checkoutPath) {
      return ts.createSourceFile(fileName, checkoutSource, languageVersion, true, ts.ScriptKind.TS);
    }
    if (resolve(fileName) === eventContractPath) {
      return ts.createSourceFile(fileName, eventContractSource, languageVersion, true, ts.ScriptKind.TS);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  const program = ts.createProgram([virtualFileName], compilerOptions, host);
  return ts.getPreEmitDiagnostics(program);
}

test("checkout TypeScript semantic fixtures", () => {
  const imports = `import {
    createEmployeeCheckoutEventContract,
    type EmployeeCheckoutDraft,
    type EmployeeCheckoutEventContract,
    type EmployeeCheckoutLeftWithArrearsDetails,
    type EmployeeCheckoutMode,
    type EmployeeCheckoutSubmission,
  } from "../src/events/checkout/index";
  import type { EmployeeEventContract } from "../src/core/event-contract";`;
  const validDraft = `{
    bedLabel: "B-501",
    checkoutDate: "2026-07-26",
    checkoutMode: "normal",
    currentDepositSnapshotAed: 500,
    depositRefundAed: 500,
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
    finalNote: ""
  }`;
  const positives = [
    `${imports} const value: EmployeeCheckoutMode = "normal"; void value;`,
    `${imports} const value: EmployeeCheckoutDraft = ${validDraft}; void value;`,
    `${imports} declare const value: EmployeeCheckoutSubmission; const id: "checkout" = value.eventId; void id;`,
    `${imports} const value: EmployeeCheckoutLeftWithArrearsDetails = { customerLeft: true, formerCustomerName: null, formerCustomerPhone: null, contactMethod: null, contactNote: null, belongingsHeld: false, belongingsNote: null, promisedPaymentDate: null, promisedReturnDate: null }; void value;`,
    `${imports} const value: EmployeeCheckoutEventContract = createEmployeeCheckoutEventContract(); void value;`,
    `${imports} const value: EmployeeEventContract<EmployeeCheckoutDraft, EmployeeCheckoutSubmission> = createEmployeeCheckoutEventContract(); void value;`,
    `${imports} const value: EmployeeCheckoutSubmission = createEmployeeCheckoutEventContract().buildSubmission(${validDraft}); void value;`,
    `${imports} declare const value: EmployeeCheckoutSubmission; const zero: 0 = value.accountingPreview.rentIncomeAed; void zero;`,
    `${imports} declare const value: EmployeeCheckoutSubmission; const closed: false = value.arrearsSnapshot.closesArrears; void closed;`,
    `${imports} declare const value: EmployeeCheckoutSubmission; const applied: false = value.occupancyPreview.occupancyMutationApplied; void applied;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeCheckoutMode = "unknown";`, /unknown/u],
    [`${imports} const value: EmployeeCheckoutDraft = { checkoutDate: "x" };`, /bedLabel/u],
    [`${imports} const value: EmployeeCheckoutDraft = { ...${validDraft}, currentDepositSnapshotAed: undefined };`, /undefined/u],
    [`${imports} const value: EmployeeCheckoutDraft = { ...${validDraft}, depositRefundAed: "500" };`, /string/u],
    [`${imports} const value: EmployeeCheckoutDraft = { ...${validDraft}, providerPhone: "x" };`, /providerPhone/u],
    [`${imports} const value: EmployeeCheckoutDraft = { ...${validDraft}, rentAmountAed: 1 };`, /rentAmountAed/u],
    [`${imports} const value: EmployeeCheckoutSubmission = { schemaVersion: 1 };`, /eventId/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const id: "rent" = value.eventId;`, /checkout/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const wire = value.event_type;`, /event_type/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const invalid: 1 = value.accountingPreview.rentIncomeAed;`, /0/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const invalid: true = value.arrearsSnapshot.closesArrears;`, /false/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const invalid: true = value.occupancyPreview.occupancyMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const invalid: true = value.occupancyPreview.bedVacancyMutationApplied;`, /false/u],
    [`${imports} declare const value: EmployeeCheckoutSubmission; const invalid: true = value.occupancyPreview.accessMutationApplied;`, /false/u],
    [`${imports} const value: EmployeeCheckoutEventContract = { eventId: "checkout", displayName: "Checkout", createInitialDraft() { return ${validDraft}; }, validateDraft() { return []; } };`, /buildSubmission/u],
    [`${imports} const value: EmployeeCheckoutEventContract = { ...createEmployeeCheckoutEventContract(), buildSubmission: async () => ({}) };`, /Promise/u],
    [`${imports} declare const value: string; const mode: EmployeeCheckoutMode = value;`, /string/u],
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

test("checkout source boundary excludes integrations and other event rules", async () => {
  assert.match(checkoutSource, /from "\.\.\/\.\.\/core\/event-contract"/u);
  assert.doesNotMatch(
    checkoutSource,
    /core\/(?:auth|api-client|draft-store|submit-entry|event-registry)|\.\.\/(?:rent|arrears-payment|deposit-in|deposit-out|expense|bed-transfer)|\.\.\/\.\.\/ui\/|\.\.\/\.\.\/main/u,
  );
  assert.doesNotMatch(
    checkoutSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    checkoutSource,
    /provider_phone|tenant_card_id|card_id|old_ttlock_ref|ttlockId|previewText|whatsappText|event_type|canonical_anchor_id|deposit_ledger_id|finance_ledger_id|owner_history_id|sync_state_id|real_endpoint|headers|token|idempotency_key/iu,
  );
  assert.doesNotMatch(
    checkoutSource,
    /createEmployeeEventRegistry|register|singleton|canonical anchor|deposit ledger|finance ledger|owner history|sync state|currentDepositSnapshotAed\s*[+\-]=/iu,
  );

  for (const [directory, marker] of [
    ["rent", "EMPLOYEE_RENT_EVENT_ID"],
    ["arrears-payment", "EMPLOYEE_ARREARS_PAYMENT_EVENT_ID"],
    ["deposit-in", "EMPLOYEE_DEPOSIT_IN_EVENT_ID"],
    ["deposit-out", "EMPLOYEE_DEPOSIT_OUT_EVENT_ID"],
    ["expense", "EMPLOYEE_EXPENSE_EVENT_ID"],
    ["bed-transfer", "EMPLOYEE_BED_TRANSFER_EVENT_ID"],
  ]) {
    const source = await readFile(
      resolve(employeeNextRoot, "src", "events", directory, "index.ts"),
      "utf8",
    );
    assert.match(source, new RegExp(marker, "u"));
  }
});
