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
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(resolve(sourceRepositoryRoot, "package.json"));
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");
const expenseSource = await readFile(expensePath, "utf8");

const bundle = await esbuild.build({
  bundle: true,
  entryPoints: [expensePath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const runtime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
  }`
);

function cashDraft(overrides = {}) {
  return {
    targetRoom: "ROOM-4",
    expenseAmountAed: "50",
    paymentMethod: "cash",
    cashPaidAed: "50",
    bankPaidAed: "0",
    expenseDescription: "Air-conditioner maintenance",
    ...overrides,
  };
}

function bankDraft(overrides = {}) {
  return cashDraft({
    paymentMethod: "bank",
    cashPaidAed: "0",
    bankPaidAed: "50",
    ...overrides,
  });
}

function codes(contract, draft) {
  return contract.validateDraft(draft).map((issue) => issue.code);
}

test("Expense beta Scheme A exports the fixed category and compact contract", () => {
  assert.equal(runtime.EMPLOYEE_EXPENSE_EVENT_ID, "expense");
  assert.equal(runtime.EMPLOYEE_EXPENSE_CATEGORY, "EXPENSE");
  assert.deepEqual([...runtime.EMPLOYEE_EXPENSE_PAYMENT_METHODS], ["cash", "bank"]);
  const contract = runtime.createEmployeeExpenseEventContract();
  assert.deepEqual(contract.createInitialDraft(), {
    targetRoom: "",
    expenseAmountAed: null,
    paymentMethod: "cash",
    cashPaidAed: null,
    bankPaidAed: null,
    expenseDescription: "",
  });
});

test("Expense accepts exact cash and bank vectors and emits only Scheme A fields", () => {
  const contract = runtime.createEmployeeExpenseEventContract();
  for (const draft of [cashDraft(), bankDraft()]) {
    assert.deepEqual(contract.validateDraft(draft), []);
    const submission = contract.buildSubmission(draft);
    assert.equal(submission.expenseCategory, "EXPENSE");
    assert.equal(submission.targetRoom, "ROOM-4");
    assert.equal(submission.expenseDescription, "Air-conditioner maintenance");
    assert.equal(submission.payment.legs.length, 1);
    assert.equal(submission.payment.legs[0].method, draft.paymentMethod);
    assert.equal(JSON.stringify(submission).includes("BigInt"), false);
    for (const removed of [
      "expenseDate", "vendor", "allocation", "receiptPreview", "evidence",
      "finalNote",
    ]) {
      assert.equal(Object.hasOwn(submission, removed), false, removed);
    }
  }
});

test("Expense uses exact integer fils with no hidden maximum", () => {
  const contract = runtime.createEmployeeExpenseEventContract();
  for (const amount of [
    "0.01", "0.10", "0.29", "1", "1.20", "10.05", "99.99", "100",
    "100.01", "999999.99", "100000000000000",
  ]) {
    const draft = cashDraft({
      expenseAmountAed: amount,
      cashPaidAed: amount,
    });
    assert.deepEqual(contract.validateDraft(draft), [], amount);
    const submission = contract.buildSubmission(draft);
    assert.equal(runtime.employeeExpenseAedToFils(submission.expenseAmountAed),
      runtime.employeeExpenseAedToFils(amount), amount);
    assert.doesNotThrow(() => JSON.stringify(submission), amount);
  }
});

test("Expense rejects invalid decimals, exponent notation and payment vectors", () => {
  const contract = runtime.createEmployeeExpenseEventContract();
  for (const amount of [
    "", "0", "-1", "NaN", "Infinity", "0.001", "0.299", "1e2",
    "2.9e-1", "1abc", "1.00 AED",
  ]) {
    assert.ok(codes(contract, cashDraft({
      expenseAmountAed: amount,
      cashPaidAed: amount,
    })).includes(amount === "" ? "EXPENSE_AMOUNT_INVALID" : "EXPENSE_AMOUNT_INVALID"), amount);
  }
  for (const draft of [
    cashDraft({ cashPaidAed: "49.99" }),
    bankDraft({ bankPaidAed: "49.99" }),
    cashDraft({ bankPaidAed: "1" }),
    cashDraft({ paymentMethod: "other" }),
    cashDraft({ paymentMethod: "mixed" }),
  ]) {
    assert.ok(contract.validateDraft(draft).length > 0);
    assert.throws(() => contract.buildSubmission(draft), /EMPLOYEE_EXPENSE_INVALID_DRAFT/u);
  }
});

test("Expense requires only room, amount, cash or bank, and description", () => {
  const contract = runtime.createEmployeeExpenseEventContract();
  assert.ok(codes(contract, cashDraft({ targetRoom: " " })).includes("EXPENSE_ROOM_REQUIRED"));
  assert.ok(codes(contract, cashDraft({ expenseAmountAed: null })).includes("EXPENSE_AMOUNT_REQUIRED"));
  assert.ok(codes(contract, cashDraft({ expenseDescription: " " })).includes("EXPENSE_DESCRIPTION_REQUIRED"));
  for (const amount of ["50", "99.99", "100", "100.01", "100000000000000"]) {
    assert.deepEqual(contract.validateDraft(cashDraft({
      expenseAmountAed: amount,
      cashPaidAed: amount,
    })), []);
  }
});

test("Expense rejects provider, backend and removed beta fields fail closed", () => {
  const contract = runtime.createEmployeeExpenseEventContract();
  for (const field of [
    "providerPhone", "tenantCardId", "event_type", "expenseDate",
    "expenseCategory", "vendorName", "expenseScope", "receiptAvailable",
  ]) {
    const draft = { ...cashDraft(), [field]: "forbidden" };
    assert.ok(codes(contract, draft).includes("EXPENSE_PROVIDER_IDENTITY_FORBIDDEN"), field);
    assert.throws(() => contract.buildSubmission(draft), /EMPLOYEE_EXPENSE_INVALID_DRAFT/u);
  }
});

test("Expense TypeScript contract rejects removed fields and unsupported methods", () => {
  const compilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  };
  const imports = `
    import type { EmployeeExpenseDraft, EmployeeExpensePaymentMethod } from ${JSON.stringify(expensePath)};
  `;
  const valid = `{
    targetRoom: "ROOM-4",
    expenseAmountAed: "50",
    paymentMethod: "cash",
    cashPaidAed: "50",
    bankPaidAed: "0",
    expenseDescription: "maintenance"
  }`;
  function diagnostics(source) {
    const fileName = resolve(testDirectory, "expense-semantic-fixture.ts");
    const normalizedFileName = fileName.replaceAll("\\", "/").toLowerCase();
    const isFixture = (name) =>
      resolve(name).replaceAll("\\", "/").toLowerCase() === normalizedFileName;
    const host = ts.createCompilerHost(compilerOptions);
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (name, languageVersion, onError, shouldCreate) =>
      isFixture(name)
        ? ts.createSourceFile(name, source, languageVersion, true)
        : original(name, languageVersion, onError, shouldCreate);
    host.readFile = (name) => isFixture(name) ? source : ts.sys.readFile(name);
    host.fileExists = (name) => isFixture(name) || ts.sys.fileExists(name);
    const program = ts.createProgram([fileName], compilerOptions, host);
    return ts.getPreEmitDiagnostics(program);
  }
  assert.deepEqual(diagnostics(`${imports} const value: EmployeeExpenseDraft = ${valid}; void value;`), []);
  for (const source of [
    `${imports} const value: EmployeeExpensePaymentMethod = "other";`,
    `${imports} const value: EmployeeExpensePaymentMethod = "mixed";`,
    `${imports} const value: EmployeeExpenseDraft = { ...${valid}, expenseDate: "2026-07-28" };`,
    `${imports} const value: EmployeeExpenseDraft = { ...${valid}, vendorName: "x" };`,
  ]) {
    assert.ok(diagnostics(source).length > 0, source);
  }
});

test("Expense source remains isolated and side-effect free", () => {
  assert.match(expenseSource, /from "\.\.\/\.\.\/core\/event-contract"/u);
  assert.doesNotMatch(
    expenseSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document|window|navigator|location|cookie|setTimeout|setInterval|process\.env|wrangler|cloudflare)\b|\/api\//iu,
  );
  assert.doesNotMatch(
    expenseSource,
    /providerPhone|tenantCardId|ttlockId|customerName|tenantName|receiptFile|receiptUrl|uploadUrl|backendPayload/iu,
  );
});
