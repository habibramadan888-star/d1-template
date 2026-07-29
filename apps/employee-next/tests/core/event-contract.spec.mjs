import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const employeeNextRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const contractPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "event-contract.ts",
);
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const gitDirectory = (await readFile(resolve(worktreeRoot, ".git"), "utf8"))
  .trim()
  .replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const ts = requireFromRepository("typescript");

const expectedEventIds = [
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
];
const expectedStatuses = ["DRAFT", "SUBMITTING", "SYNCED", "ERROR"];
const expectedSeverities = ["ERROR", "WARNING"];
const expectedRuntimeExports = [
  "EMPLOYEE_ENTRY_STATUSES",
  "EMPLOYEE_EVENT_IDS",
  "EVENT_VALIDATION_SEVERITIES",
  "hasBlockingValidationIssue",
  "isEmployeeEntryStatus",
  "isEmployeeEventId",
];

async function loadRuntimeContract() {
  const result = await esbuild.build({
    bundle: true,
    entryPoints: [contractPath],
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  assert.equal(result.outputFiles.length, 1);
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(fixtureSource) {
  const contractFile = "/virtual/event-contract.ts";
  const fixtureFile = "/virtual/fixture.ts";
  const options = {
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const virtualFiles = new Map([
    [contractFile, contractSource],
    [fixtureFile, fixtureSource],
  ]);
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
    const source = virtualFiles.get(normalized);
    if (source !== undefined) {
      return ts.createSourceFile(
        normalized,
        source,
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
  host.resolveModuleNames = (moduleNames) => moduleNames.map(
    (moduleName) => (
      moduleName === "./event-contract.ts"
        ? {
            extension: ts.Extension.Ts,
            isExternalLibraryImport: false,
            resolvedFileName: contractFile,
          }
        : undefined
    ),
  );

  const program = ts.createProgram([contractFile, fixtureFile], options, host);
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile,
  );
}

function diagnosticText(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function assertSemanticPass(source, label) {
  const diagnostics = semanticDiagnosticsFor(source);
  assert.deepEqual(
    diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnosticText(diagnostic),
    })),
    [],
    label,
  );
}

function assertSemanticReject(source, expectedCode, expectedText, label) {
  const diagnostics = semanticDiagnosticsFor(source);
  assert.ok(diagnostics.length > 0, `${label}: expected a TypeScript error`);
  assert.ok(
    diagnostics.some(
      (diagnostic) => (
        diagnostic.code === expectedCode
        && diagnosticText(diagnostic).includes(expectedText)
      ),
    ),
    `${label}: ${JSON.stringify(diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnosticText(diagnostic),
    })))}`,
  );
}

const contractSource = await readFile(contractPath, "utf8");

test("event-contract runtime constants, guards and blocking behavior", async () => {
  const contract = await loadRuntimeContract();

  assert.deepEqual(Object.keys(contract).sort(), expectedRuntimeExports);
  assert.deepEqual(contract.EMPLOYEE_EVENT_IDS, expectedEventIds);
  assert.equal(Object.isFrozen(contract.EMPLOYEE_EVENT_IDS), true);
  assert.deepEqual(contract.EMPLOYEE_ENTRY_STATUSES, expectedStatuses);
  assert.equal(Object.isFrozen(contract.EMPLOYEE_ENTRY_STATUSES), true);
  assert.deepEqual(contract.EVENT_VALIDATION_SEVERITIES, expectedSeverities);
  assert.equal(Object.isFrozen(contract.EVENT_VALIDATION_SEVERITIES), true);

  for (const eventId of expectedEventIds) {
    assert.equal(contract.isEmployeeEventId(eventId), true, eventId);
  }
  for (const value of [
    "bed_transfer",
    "RENT",
    " rent",
    "",
    1,
    null,
    {},
    "unknown",
  ]) {
    assert.equal(contract.isEmployeeEventId(value), false, String(value));
  }

  for (const status of expectedStatuses) {
    assert.equal(contract.isEmployeeEntryStatus(status), true, status);
  }
  for (const value of ["draft", "SUCCESS", " ERROR ", "", null, {}]) {
    assert.equal(contract.isEmployeeEntryStatus(value), false, String(value));
  }

  const warning = Object.freeze({
    code: "W",
    message: "warning",
    severity: "WARNING",
  });
  const error = Object.freeze({
    code: "E",
    field: "field",
    message: "error",
    severity: "ERROR",
  });
  const warningOnly = Object.freeze([warning]);
  const mixed = Object.freeze([warning, error]);
  const warningBefore = structuredClone(warningOnly);
  const mixedBefore = structuredClone(mixed);

  assert.equal(contract.hasBlockingValidationIssue([]), false);
  assert.equal(contract.hasBlockingValidationIssue(warningOnly), false);
  assert.equal(contract.hasBlockingValidationIssue(mixed), true);
  assert.equal(contract.hasBlockingValidationIssue(mixed), true);
  assert.deepEqual(warningOnly, warningBefore);
  assert.deepEqual(mixed, mixedBefore);

  const eventInput = Object.freeze({ value: "rent" });
  const statusInput = Object.freeze({ value: "DRAFT" });
  assert.equal(contract.isEmployeeEventId(eventInput.value), true);
  assert.equal(contract.isEmployeeEventId(eventInput.value), true);
  assert.equal(contract.isEmployeeEntryStatus(statusInput.value), true);
  assert.equal(contract.isEmployeeEntryStatus(statusInput.value), true);
  assert.deepEqual(eventInput, { value: "rent" });
  assert.deepEqual(statusInput, { value: "DRAFT" });
});

test("event-contract TypeScript positive and negative semantic fixtures", () => {
  const importContract = `
    import type {
      EmployeeEntryStatus,
      EmployeeEventContract,
      EmployeeEventId,
      EventValidationIssue,
    } from "./event-contract.ts";
  `;
  const positiveFixtures = [
    `${importContract}
      const values: readonly EmployeeEventId[] = [
        "rent", "arrears-payment", "deposit-in", "deposit-out",
        "checkout", "expense", "bed-transfer",
      ];
      void values;
    `,
    `${importContract}
      const values: readonly EmployeeEntryStatus[] = [
        "DRAFT", "SUBMITTING", "SYNCED", "ERROR",
      ];
      void values;
    `,
    `${importContract}
      type Draft = { readonly value: string };
      type Submission = { readonly value: string };
      const implementation: EmployeeEventContract<Draft, Submission> = {
        eventId: "rent",
        displayName: "Display",
        createInitialDraft: () => ({ value: "" }),
        validateDraft: (_draft) => [],
        buildSubmission: (draft) => ({ value: draft.value }),
      };
      void implementation;
    `,
    `${importContract}
      declare const issues: readonly EventValidationIssue[];
      const same: readonly EventValidationIssue[] = issues;
      void same;
    `,
    `${importContract}
      type Draft = { readonly value: string };
      type Submission = { readonly mapped: string };
      declare const implementation: EmployeeEventContract<Draft, Submission>;
      const result: Submission = implementation.buildSubmission({ value: "x" });
      void result;
    `,
  ];
  for (const [index, fixture] of positiveFixtures.entries()) {
    assertSemanticPass(fixture, `positive fixture ${index + 1}`);
  }

  const negativeFixtures = [
    {
      code: 2322,
      label: "unknown eighth event id",
      source: `${importContract}
        const value: EmployeeEventId = "eighth-event";
        void value;
      `,
      text: "not assignable to type",
    },
    {
      code: 2820,
      label: "underscore event id",
      source: `${importContract}
        const value: EmployeeEventId = "bed_transfer";
        void value;
      `,
      text: "not assignable to type",
    },
    {
      code: 2322,
      label: "unknown employee entry status",
      source: `${importContract}
        const value: EmployeeEntryStatus = "SUCCESS";
        void value;
      `,
      text: "not assignable to type",
    },
    {
      code: 2322,
      label: "unknown validation severity",
      source: `${importContract}
        const value: EventValidationIssue = {
          code: "X",
          message: "X",
          severity: "NOTICE",
        };
        void value;
      `,
      text: "not assignable to type",
    },
    {
      code: 2741,
      label: "missing buildSubmission",
      source: `${importContract}
        type Draft = { readonly value: string };
        type Submission = { readonly value: string };
        const value: EmployeeEventContract<Draft, Submission> = {
          eventId: "rent",
          displayName: "Display",
          createInitialDraft: () => ({ value: "" }),
          validateDraft: () => [],
        };
        void value;
      `,
      text: "buildSubmission",
    },
    {
      code: 2740,
      label: "asynchronous validateDraft",
      source: `${importContract}
        type Draft = { readonly value: string };
        type Submission = { readonly value: string };
        const value: EmployeeEventContract<Draft, Submission> = {
          eventId: "rent",
          displayName: "Display",
          createInitialDraft: () => ({ value: "" }),
          validateDraft: async () => [],
          buildSubmission: (draft) => ({ value: draft.value }),
        };
        void value;
      `,
      text: "missing the following properties",
    },
    {
      code: 2540,
      label: "readonly validation issue",
      source: `${importContract}
        declare const issue: EventValidationIssue;
        issue.message = "changed";
      `,
      text: "read-only property",
    },
    {
      code: 2322,
      label: "unchecked string event id",
      source: `${importContract}
        declare const text: string;
        const value: EmployeeEventId = text;
        void value;
      `,
      text: "not assignable to type",
    },
  ];
  for (const fixture of negativeFixtures) {
    assertSemanticReject(
      fixture.source,
      fixture.code,
      fixture.text,
      fixture.label,
    );
  }
});

test("event-contract excludes business rules and side effects", () => {
  const sourceFile = ts.createSourceFile(
    contractPath,
    contractSource,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const forbiddenIdentifiers = new Set([
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "IndexedDB",
    "localStorage",
    "sessionStorage",
    "sendBeacon",
    "fetch",
    "setInterval",
    "setTimeout",
    "rentAmount",
    "rentPeriod",
    "shortPayment",
    "arrearsReference",
    "remainingArrears",
    "repayment",
    "depositAmount",
    "checkoutDate",
    "expenseCategory",
    "receipt",
    "fromBed",
    "toBed",
    "transferDate",
    "carryover",
    "transferFee",
    "stayAction",
    "stayContextId",
    "genesisAnchorId",
    "eventType",
    "endpoint",
    "canonicalAnchor",
  ]);
  const forbiddenStringPatterns = [
    /\/api\//i,
    /\bevent_type\b/i,
    /\bstay_(?:action|context_id|event_link_id)\b/i,
    /\b(?:from_bed|to_bed|transfer_date|transfer_fee)\b/i,
    /\b(?:rent_amount|arrears_reference|deposit_amount|checkout_date)\b/i,
  ];
  const violations = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isVariableStatement(statement)
      && (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      violations.push("top-level mutable declaration");
    }
    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
      if (statement.moduleSpecifier) {
        violations.push(`module dependency:${statement.moduleSpecifier.getText(sourceFile)}`);
      }
    }
  }

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      violations.push("any keyword");
    }
    if (ts.isSwitchStatement(node)) {
      violations.push("switch statement");
    }
    if (ts.isIdentifier(node) && forbiddenIdentifiers.has(node.text)) {
      violations.push(`forbidden identifier:${node.text}`);
    }
    if (
      ts.isStringLiteralLike(node)
      && forbiddenStringPatterns.some((pattern) => pattern.test(node.text))
    ) {
      violations.push(`forbidden string:${node.text}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  assert.deepEqual([...new Set(violations)].sort(), []);
  assert.doesNotMatch(contractSource, /\beventContractScaffold\b/);
});
