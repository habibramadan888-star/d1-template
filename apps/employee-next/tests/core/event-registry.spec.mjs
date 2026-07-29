import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
const registryPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "event-registry.ts",
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
const contractSource = await readFile(contractPath, "utf8");
const registrySource = await readFile(registryPath, "utf8");

async function loadRuntimeRegistry() {
  const result = await esbuild.build({
    bundle: true,
    entryPoints: [registryPath],
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  assert.equal(result.outputFiles.length, 1);
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function makeContract(eventId, calls = undefined) {
  const callCounts = calls ?? {
    buildSubmission: 0,
    createInitialDraft: 0,
    validateDraft: 0,
  };
  return {
    eventId,
    displayName: `Display ${eventId}`,
    createInitialDraft() {
      callCounts.createInitialDraft += 1;
      return { value: "" };
    },
    validateDraft() {
      callCounts.validateDraft += 1;
      return [];
    },
    buildSubmission(draft) {
      callCounts.buildSubmission += 1;
      return { value: draft.value };
    },
  };
}

function exactError(factory, expectedMessage) {
  assert.throws(
    factory,
    (error) => (
      error instanceof Error
      && error.message === expectedMessage
    ),
  );
}

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(fixtureSource) {
  const contractFile = "/virtual/event-contract.ts";
  const registryFile = "/virtual/event-registry.ts";
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
    [registryFile, registrySource],
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
  host.resolveModuleNames = (moduleNames) => moduleNames.map((moduleName) => {
    if (moduleName === "./event-contract" || moduleName === "./event-contract.ts") {
      return {
        extension: ts.Extension.Ts,
        isExternalLibraryImport: false,
        resolvedFileName: contractFile,
      };
    }
    if (moduleName === "./event-registry.ts") {
      return {
        extension: ts.Extension.Ts,
        isExternalLibraryImport: false,
        resolvedFileName: registryFile,
      };
    }
    return undefined;
  });

  const program = ts.createProgram(
    [contractFile, registryFile, fixtureFile],
    options,
    host,
  );
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

test("event-registry runtime success preserves order, identity and immutability", async () => {
  const runtime = await loadRuntimeRegistry();
  assert.deepEqual(Object.keys(runtime), ["createEmployeeEventRegistry"]);

  const calls = {
    buildSubmission: 0,
    createInitialDraft: 0,
    validateDraft: 0,
  };
  const contracts = expectedEventIds.map((eventId) => makeContract(eventId, calls));
  const reversedInput = [...contracts].reverse();
  const inputBefore = [...reversedInput];
  const contractSnapshots = contracts.map((contract) => ({ ...contract }));

  const registry = runtime.createEmployeeEventRegistry(reversedInput);

  assert.deepEqual(registry.eventIds, expectedEventIds);
  assert.deepEqual(
    registry.contracts.map((contract) => contract.eventId),
    expectedEventIds,
  );
  for (const [index, eventId] of expectedEventIds.entries()) {
    assert.equal(registry.contracts[index], contracts[index]);
    assert.equal(registry.get(eventId), contracts[index]);
    assert.equal(registry.get(eventId), registry.contracts[index]);
  }
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.eventIds), true);
  assert.equal(Object.isFrozen(registry.contracts), true);
  assert.equal(Object.isFrozen(reversedInput), false);
  assert.deepEqual(reversedInput, inputBefore);
  for (const [index, contract] of contracts.entries()) {
    assert.equal(Object.isFrozen(contract), false);
    assert.deepEqual(contract, contractSnapshots[index]);
  }
  assert.deepEqual(calls, {
    buildSubmission: 0,
    createInitialDraft: 0,
    validateDraft: 0,
  });
  assert.equal(registry.get("rent"), registry.get("rent"));

  const secondRegistry = runtime.createEmployeeEventRegistry(contracts);
  assert.notEqual(secondRegistry, registry);
  assert.notEqual(secondRegistry.eventIds, registry.eventIds);
  assert.notEqual(secondRegistry.contracts, registry.contracts);
  for (const eventId of expectedEventIds) {
    assert.equal(secondRegistry.get(eventId), registry.get(eventId));
  }
});

test("event-registry runtime fails closed with exact deterministic diagnostics", async () => {
  const { createEmployeeEventRegistry } = await loadRuntimeRegistry();
  const validContracts = expectedEventIds.map(makeContract);

  exactError(
    () => createEmployeeEventRegistry(null),
    "EMPLOYEE_EVENT_REGISTRY_INVALID_COLLECTION",
  );
  exactError(
    () => createEmployeeEventRegistry(validContracts.slice(0, 6)),
    "EMPLOYEE_EVENT_REGISTRY_MISSING_EVENT_ID",
  );
  exactError(
    () => createEmployeeEventRegistry([...validContracts, makeContract("rent")]),
    "EMPLOYEE_EVENT_REGISTRY_INVALID_COLLECTION",
  );

  const withNull = [...validContracts];
  withNull[0] = null;
  exactError(
    () => createEmployeeEventRegistry(withNull),
    "EMPLOYEE_EVENT_REGISTRY_INVALID_CONTRACT",
  );

  const invalidDisplayName = {
    ...validContracts[0],
    displayName: 1,
  };
  exactError(
    () => createEmployeeEventRegistry([invalidDisplayName, ...validContracts.slice(1)]),
    "EMPLOYEE_EVENT_REGISTRY_INVALID_CONTRACT",
  );

  for (const methodName of [
    "createInitialDraft",
    "validateDraft",
    "buildSubmission",
  ]) {
    const invalidContract = { ...validContracts[0] };
    delete invalidContract[methodName];
    exactError(
      () => createEmployeeEventRegistry([invalidContract, ...validContracts.slice(1)]),
      "EMPLOYEE_EVENT_REGISTRY_INVALID_CONTRACT",
    );
  }

  for (const unknownEventId of ["bed_transfer", "RENT"]) {
    const unknownContract = {
      ...validContracts[0],
      eventId: unknownEventId,
    };
    exactError(
      () => createEmployeeEventRegistry([unknownContract, ...validContracts.slice(1)]),
      "EMPLOYEE_EVENT_REGISTRY_UNKNOWN_EVENT_ID",
    );
  }

  const duplicateInput = [
    makeContract("rent"),
    makeContract("rent"),
    ...validContracts.slice(2),
  ];
  exactError(
    () => createEmployeeEventRegistry(duplicateInput),
    "EMPLOYEE_EVENT_REGISTRY_DUPLICATE_EVENT_ID",
  );

  const registry = createEmployeeEventRegistry(validContracts);
  for (const value of ["bed_transfer", "RENT", " rent", "", null, {}]) {
    assert.equal(registry.get(value), undefined);
  }

  const repeatFailure = () => {
    try {
      createEmployeeEventRegistry(duplicateInput);
      return "NO_ERROR";
    } catch (error) {
      assert.ok(error instanceof Error);
      return error.message;
    }
  };
  assert.equal(
    repeatFailure(),
    "EMPLOYEE_EVENT_REGISTRY_DUPLICATE_EVENT_ID",
  );
  assert.equal(repeatFailure(), repeatFailure());
});

test("event-registry TypeScript positive and negative semantic fixtures", () => {
  const imports = `
    import type {
      EmployeeEventContract,
      EmployeeEventId,
    } from "./event-contract.ts";
    import {
      createEmployeeEventRegistry,
    } from "./event-registry.ts";
    import type {
      EmployeeEventRegistry,
      EmployeeEventRegistryContract,
    } from "./event-registry.ts";
  `;
  const contractLiteral = `
    {
      eventId: "rent",
      displayName: "Display",
      createInitialDraft: () => ({ value: "" }),
      validateDraft: () => [],
      buildSubmission: (draft: { readonly value: string }) => ({ label: draft.value }),
    }
  `;
  const positiveFixtures = [
    `${imports}
      const value: EmployeeEventRegistryContract = ${contractLiteral};
      void value;
    `,
    `${imports}
      const first: EmployeeEventContract<
        { readonly value: string },
        { readonly label: string }
      > = ${contractLiteral};
      const second: EmployeeEventContract<
        { readonly label: number },
        { readonly value: number }
      > = {
        eventId: "expense",
        displayName: "Second",
        createInitialDraft: () => ({ label: 1 }),
        validateDraft: () => [],
        buildSubmission: (draft) => ({ value: draft.label }),
      };
      const values: readonly EmployeeEventRegistryContract[] = [first, second];
      void values;
    `,
    `${imports}
      declare const values: readonly EmployeeEventRegistryContract[];
      const registry: EmployeeEventRegistry = createEmployeeEventRegistry(values);
      void registry;
    `,
    `${imports}
      declare const registry: EmployeeEventRegistry;
      const ids: readonly EmployeeEventId[] = registry.eventIds;
      void ids;
    `,
    `${imports}
      declare const registry: EmployeeEventRegistry;
      const contracts: readonly EmployeeEventRegistryContract[] = registry.contracts;
      void contracts;
    `,
    `${imports}
      declare const registry: EmployeeEventRegistry;
      const contract = registry.get("rent");
      if (contract !== undefined) {
        const value: EmployeeEventRegistryContract = contract;
        void value;
      }
    `,
  ];
  for (const [index, fixture] of positiveFixtures.entries()) {
    assertSemanticPass(fixture, `positive fixture ${index + 1}`);
  }

  const negativeFixtures = [
    {
      code: 2322,
      label: "unknown event id contract",
      source: `${imports}
        const value: EmployeeEventRegistryContract = {
          ...${contractLiteral},
          eventId: "eighth-event",
        };
        void value;
      `,
      text: "not assignable to type",
    },
    {
      code: 2820,
      label: "underscore event id contract",
      source: `${imports}
        const value: EmployeeEventRegistryContract = {
          ...${contractLiteral},
          eventId: "bed_transfer",
        };
        void value;
      `,
      text: "not assignable to type",
    },
    {
      code: 2741,
      label: "missing createInitialDraft",
      source: `${imports}
        const value: EmployeeEventRegistryContract = {
          eventId: "rent",
          displayName: "Display",
          validateDraft: () => [],
          buildSubmission: () => ({}),
        };
        void value;
      `,
      text: "createInitialDraft",
    },
    {
      code: 2741,
      label: "missing validateDraft",
      source: `${imports}
        const value: EmployeeEventRegistryContract = {
          eventId: "rent",
          displayName: "Display",
          createInitialDraft: () => ({}),
          buildSubmission: () => ({}),
        };
        void value;
      `,
      text: "validateDraft",
    },
    {
      code: 2741,
      label: "missing buildSubmission",
      source: `${imports}
        const value: EmployeeEventRegistryContract = {
          eventId: "rent",
          displayName: "Display",
          createInitialDraft: () => ({}),
          validateDraft: () => [],
        };
        void value;
      `,
      text: "buildSubmission",
    },
    {
      code: 2339,
      label: "readonly eventIds",
      source: `${imports}
        declare const registry: EmployeeEventRegistry;
        registry.eventIds.push("rent");
      `,
      text: "does not exist",
    },
    {
      code: 2339,
      label: "readonly contracts",
      source: `${imports}
        declare const registry: EmployeeEventRegistry;
        registry.contracts.push(${contractLiteral});
      `,
      text: "does not exist",
    },
    {
      code: 2322,
      label: "unchecked get result",
      source: `${imports}
        declare const registry: EmployeeEventRegistry;
        const value: EmployeeEventRegistryContract = registry.get("rent");
        void value;
      `,
      text: "undefined",
    },
    {
      code: 2345,
      label: "unconstrained object array",
      source: `${imports}
        const values = [{
          eventId: "rent",
          displayName: "Display",
          createInitialDraft: () => ({}),
          validateDraft: () => [],
          buildSubmission: () => ({}),
        }];
        createEmployeeEventRegistry(values);
      `,
      text: "not assignable",
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

test("event-registry excludes business rules and side effects", async () => {
  const runtime = await loadRuntimeRegistry();
  assert.deepEqual(Object.keys(runtime), ["createEmployeeEventRegistry"]);

  const sourceFile = ts.createSourceFile(
    registryPath,
    registrySource,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const moduleDependencies = [];
  const violations = [];
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
  const forbiddenMethodCalls = new Set([
    "createInitialDraft",
    "validateDraft",
    "buildSubmission",
    "add",
    "remove",
    "replace",
    "clear",
  ]);
  const forbiddenStringPatterns = [
    /\/api\//i,
    /\bevent_type\b/i,
    /\bstay_(?:action|context_id|event_link_id)\b/i,
    /\b(?:from_bed|to_bed|transfer_date|transfer_fee)\b/i,
    /\b(?:rent_amount|arrears_reference|deposit_amount|checkout_date)\b/i,
  ];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      moduleDependencies.push(statement.moduleSpecifier.text);
    }
    if (
      ts.isVariableStatement(statement)
      && (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      violations.push("top-level mutable declaration");
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          declaration.initializer
          && ts.isNewExpression(declaration.initializer)
          && declaration.initializer.expression.getText(sourceFile) === "Map"
        ) {
          violations.push("top-level Map");
        }
      }
    }
  }

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      violations.push("any keyword");
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
    if (ts.isCallExpression(node)) {
      const calledName = ts.isPropertyAccessExpression(node.expression)
        ? node.expression.name.text
        : ts.isIdentifier(node.expression)
          ? node.expression.text
          : "";
      if (forbiddenMethodCalls.has(calledName)) {
        violations.push(`forbidden method call:${calledName}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  assert.deepEqual([...new Set(moduleDependencies)].sort(), ["./event-contract"]);
  assert.deepEqual([...new Set(violations)].sort(), []);
  assert.doesNotMatch(registrySource, /\beventRegistryScaffold\b/);
  assert.doesNotMatch(registrySource, /(?:from|import)\s+["'][^"']*events\//u);

  const contracts = expectedEventIds.map(makeContract);
  const first = runtime.createEmployeeEventRegistry(contracts);
  const second = runtime.createEmployeeEventRegistry(contracts);
  assert.deepEqual(first.eventIds, second.eventIds);
  assert.deepEqual(
    first.contracts.map((contract) => contract.eventId),
    second.contracts.map((contract) => contract.eventId),
  );
  assert.equal(first.get("unknown"), undefined);
  assert.equal(first.get("unknown"), second.get("unknown"));
});
