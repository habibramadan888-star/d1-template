import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const eventsIndexPath = resolve(employeeNextRoot, "src", "events", "index.ts");
const eventRegistryPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "event-registry.ts",
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
const eventsIndexSource = await readFile(eventsIndexPath, "utf8");

const expectedEventIds = Object.freeze([
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
]);

const eventFactoryNames = Object.freeze([
  "createEmployeeRentEventContract",
  "createEmployeeArrearsPaymentEventContract",
  "createEmployeeDepositInEventContract",
  "createEmployeeDepositOutEventContract",
  "createEmployeeCheckoutEventContract",
  "createEmployeeExpenseEventContract",
  "createEmployeeBedTransferEventContract",
]);

const eventModulePaths = Object.freeze([
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
]);

const bundledModule = await esbuild.build({
  bundle: true,
  entryPoints: [eventsIndexPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const runtime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledModule.outputFiles[0].text).toString("base64")
  }`
);

const bundledRegistry = await esbuild.build({
  bundle: true,
  entryPoints: [eventRegistryPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const registryRuntime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledRegistry.outputFiles[0].text).toString("base64")
  }`
);

function exactError(factory, expectedMessage) {
  assert.throws(
    factory,
    (error) => error instanceof Error && error.message === expectedMessage,
  );
}

function diagnosticText(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function semanticDiagnosticsFor(fixtureSource) {
  const fixtureFile = resolve(employeeNextRoot, "tests", "virtual-018-fixture.ts");
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
  const normalizedFixture = fixtureFile.replaceAll("\\", "/");
  const defaultFileExists = host.fileExists.bind(host);
  const defaultReadFile = host.readFile.bind(host);
  const defaultGetSourceFile = host.getSourceFile.bind(host);

  host.fileExists = (fileName) => (
    fileName.replaceAll("\\", "/") === normalizedFixture
    || defaultFileExists(fileName)
  );
  host.readFile = (fileName) => (
    fileName.replaceAll("\\", "/") === normalizedFixture
      ? fixtureSource
      : defaultReadFile(fileName)
  );
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (fileName.replaceAll("\\", "/") === normalizedFixture) {
      return ts.createSourceFile(
        fixtureFile,
        fixtureSource,
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
  host.resolveModuleNames = (moduleNames, containingFile) => (
    moduleNames.map((moduleName) => {
      if (
        containingFile.replaceAll("\\", "/") === normalizedFixture
        && moduleName === "../../src/events/index.ts"
      ) {
        return {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: eventsIndexPath,
        };
      }
      if (
        containingFile.replaceAll("\\", "/") === normalizedFixture
        && moduleName === "../../src/core/event-registry.ts"
      ) {
        return {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: eventRegistryPath,
        };
      }
      return ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        host,
      ).resolvedModule;
    })
  );

  const program = ts.createProgram(
    [eventsIndexPath, eventRegistryPath, eventContractPath, fixtureFile],
    options,
    host,
  );
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      diagnostic.file?.fileName.replaceAll("\\", "/") === normalizedFixture
    ),
  );
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

test("register-seven-events runtime success preserves real contracts", () => {
  assert.deepEqual(Object.keys(runtime).sort(), [
    "createEmployeeSevenEventContracts",
    "createEmployeeSevenEventRegistry",
  ]);

  const firstContracts = runtime.createEmployeeSevenEventContracts();
  const secondContracts = runtime.createEmployeeSevenEventContracts();
  assert.equal(firstContracts.length, 7);
  assert.deepEqual(firstContracts.map(({ eventId }) => eventId), expectedEventIds);
  assert.ok(Object.isFrozen(firstContracts));
  assert.notEqual(firstContracts, secondContracts);

  for (const [index, contract] of firstContracts.entries()) {
    assert.equal(contract.eventId, expectedEventIds[index]);
    assert.equal(typeof contract.displayName, "string");
    assert.equal(typeof contract.createInitialDraft, "function");
    assert.equal(typeof contract.validateDraft, "function");
    assert.equal(typeof contract.buildSubmission, "function");
    assert.ok(Object.isFrozen(contract));
    assert.notEqual(contract, secondContracts[index]);
  }

  const firstRegistry = runtime.createEmployeeSevenEventRegistry();
  const secondRegistry = runtime.createEmployeeSevenEventRegistry();
  assert.deepEqual(firstRegistry.eventIds, expectedEventIds);
  assert.deepEqual(
    firstRegistry.contracts.map(({ eventId }) => eventId),
    expectedEventIds,
  );
  assert.ok(Object.isFrozen(firstRegistry));
  assert.ok(Object.isFrozen(firstRegistry.eventIds));
  assert.ok(Object.isFrozen(firstRegistry.contracts));
  assert.notEqual(firstRegistry, secondRegistry);
  assert.notEqual(firstRegistry.eventIds, secondRegistry.eventIds);
  assert.notEqual(firstRegistry.contracts, secondRegistry.contracts);

  for (const [index, eventId] of expectedEventIds.entries()) {
    assert.equal(firstRegistry.get(eventId), firstRegistry.contracts[index]);
    assert.notEqual(
      firstRegistry.contracts[index],
      secondRegistry.contracts[index],
    );
  }
  assert.equal(firstRegistry.get("bed_transfer"), undefined);
  assert.equal(firstRegistry.get("rent "), undefined);
  assert.equal(firstRegistry.get("unknown"), undefined);
});

test("register-seven-events keeps generic registration fail-closed", () => {
  const validContracts = runtime.createEmployeeSevenEventContracts();
  const cases = [
    {
      contracts: [...validContracts.slice(0, 6)],
      error: "EMPLOYEE_EVENT_REGISTRY_MISSING_EVENT_ID",
    },
    {
      contracts: [...validContracts.slice(0, 6), validContracts[0]],
      error: "EMPLOYEE_EVENT_REGISTRY_DUPLICATE_EVENT_ID",
    },
    {
      contracts: [...validContracts.slice(0, 6), null],
      error: "EMPLOYEE_EVENT_REGISTRY_INVALID_CONTRACT",
    },
    {
      contracts: [
        ...validContracts.slice(0, 6),
        { ...validContracts[6], eventId: "bed_transfer" },
      ],
      error: "EMPLOYEE_EVENT_REGISTRY_UNKNOWN_EVENT_ID",
    },
    {
      contracts: [...validContracts, validContracts[0]],
      error: "EMPLOYEE_EVENT_REGISTRY_INVALID_COLLECTION",
    },
  ];

  for (const scenario of cases) {
    exactError(
      () => registryRuntime.createEmployeeEventRegistry(scenario.contracts),
      scenario.error,
    );
    assert.doesNotMatch(
      scenario.error,
      /customer|amount|bed|provider|token|header|url|payload/i,
    );
  }

  const recovered = runtime.createEmployeeSevenEventRegistry();
  assert.deepEqual(recovered.eventIds, expectedEventIds);
});

test("register-seven-events TypeScript semantic fixtures", () => {
  const positives = [
    `
      import {
        createEmployeeSevenEventContracts,
        createEmployeeSevenEventRegistry,
      } from "../../src/events/index.ts";
      import type {
        EmployeeEventRegistry,
        EmployeeEventRegistryContract,
      } from "../../src/core/event-registry.ts";
      const contracts: readonly EmployeeEventRegistryContract[] =
        createEmployeeSevenEventContracts();
      const registry: EmployeeEventRegistry =
        createEmployeeSevenEventRegistry();
      const rent = registry.get("rent");
      if (rent !== undefined) {
        const narrowed: EmployeeEventRegistryContract = rent;
        void narrowed;
      }
      void contracts;
    `,
    `
      import {
        createEmployeeSevenEventContracts,
        createEmployeeSevenEventRegistry,
      } from "../../src/events/index.ts";
      const contracts = createEmployeeSevenEventContracts();
      const registry = createEmployeeSevenEventRegistry();
      const ids: readonly string[] = registry.eventIds;
      const count: number = contracts.length + registry.contracts.length;
      void ids;
      void count;
    `,
    `
      import {
        createEmployeeSevenEventRegistry,
      } from "../../src/events/index.ts";
      const registry = createEmployeeSevenEventRegistry();
      const missing = registry.get("missing");
      if (missing === undefined) {
        const safe: undefined = missing;
        void safe;
      }
    `,
  ];
  positives.forEach((source, index) => {
    assertSemanticPass(source, `positive fixture ${index + 1}`);
  });

  const negatives = [
    {
      code: 2339,
      text: "Property 'push' does not exist",
      source: `
        import { createEmployeeSevenEventContracts } from "../../src/events/index.ts";
        createEmployeeSevenEventContracts().push({} as never);
      `,
    },
    {
      code: 2542,
      text: "only permits reading",
      source: `
        import { createEmployeeSevenEventRegistry } from "../../src/events/index.ts";
        const registry = createEmployeeSevenEventRegistry();
        registry.eventIds[0] = "rent";
      `,
    },
    {
      code: 2542,
      text: "only permits reading",
      source: `
        import { createEmployeeSevenEventRegistry } from "../../src/events/index.ts";
        const registry = createEmployeeSevenEventRegistry();
        registry.contracts[0] = registry.contracts[1];
      `,
    },
    {
      code: 2322,
      text: "undefined",
      source: `
        import { createEmployeeSevenEventRegistry } from "../../src/events/index.ts";
        import type { EmployeeEventRegistryContract } from "../../src/core/event-registry.ts";
        const contract: EmployeeEventRegistryContract =
          createEmployeeSevenEventRegistry().get("missing");
        void contract;
      `,
    },
    {
      code: 2322,
      text: "not assignable",
      source: `
        import { createEmployeeSevenEventRegistry } from "../../src/events/index.ts";
        const controller: (value: string) => Promise<unknown> =
          createEmployeeSevenEventRegistry;
        void controller;
      `,
    },
    {
      code: 2339,
      text: "Property 'request' does not exist",
      source: `
        import { createEmployeeSevenEventRegistry } from "../../src/events/index.ts";
        createEmployeeSevenEventRegistry.request("/employee");
      `,
    },
  ];
  negatives.forEach((fixture, index) => {
    assertSemanticReject(
      fixture.source,
      fixture.code,
      fixture.text,
      `negative fixture ${index + 1}`,
    );
  });
});

test("register-seven-events source boundary stays isolated", async () => {
  const importSpecifiers = [
    ...eventsIndexSource.matchAll(/from\s+["']([^"']+)["']/gu),
  ].map((match) => match[1]);
  assert.deepEqual(importSpecifiers.sort(), [
    "../core/event-registry",
    "../core/event-registry",
    ...eventModulePaths.map((path) => `./${path}`),
  ].sort());

  for (const factoryName of eventFactoryNames) {
    assert.match(eventsIndexSource, new RegExp(`\\b${factoryName}\\(\\)`));
  }
  assert.doesNotMatch(
    eventsIndexSource,
    /\.(?:createInitialDraft|validateDraft|buildSubmission)\s*\(/u,
  );
  assert.doesNotMatch(
    eventsIndexSource,
    /submit-entry|api-client|auth|draft-store|\.\.\/ui|main|worker|owner|finance|canonical|ttlock|cloud\s*arrears/iu,
  );
  assert.doesNotMatch(
    eventsIndexSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|window|document|localStorage|sessionStorage|indexedDB|cookie|setTimeout|setInterval|process\.env)\b/u,
  );
  assert.doesNotMatch(
    eventsIndexSource,
    /\/api\/|https?:|event_type|\btype\s*:|authorization|headers|token|idempotency|provider|card[_ ]?id|ttlock[_ ]?id|whatsapp/iu,
  );
  assert.doesNotMatch(
    eventsIndexSource,
    /\b(?:let|var)\b|new\s+(?:Map|Set)\b|\.(?:add|remove|replace|set|clear|register)\s*\(/u,
  );
  assert.doesNotMatch(
    eventsIndexSource,
    /defaultRegistry|EMPLOYEE_REGISTERED_EVENTS|EMPLOYEE_REGISTERED_CONTRACTS/u,
  );

  const expectedRuntimeExports = [
    "createEmployeeSevenEventContracts",
    "createEmployeeSevenEventRegistry",
  ];
  assert.deepEqual(Object.keys(runtime).sort(), expectedRuntimeExports);
});
