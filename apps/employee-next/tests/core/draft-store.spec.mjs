import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const draftStorePath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "draft-store.ts",
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
const draftStoreSource = await readFile(draftStorePath, "utf8");
const eventContractSource = await readFile(eventContractPath, "utf8");

const bundledDraftStore = await esbuild.build({
  bundle: true,
  entryPoints: [draftStorePath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const draftStoreModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledDraftStore.outputFiles[0].text).toString("base64")
  }`
);

const eventIds = [
  "rent",
  "arrears-payment",
  "deposit-in",
  "deposit-out",
  "checkout",
  "expense",
  "bed-transfer",
];

function record(
  draftId = "draft-1",
  eventId = "rent",
  payload = { value: "safe" },
) {
  return {
    draft_id: draftId,
    event_id: eventId,
    payload,
    updated_at_iso: "revision-1",
  };
}

function memoryPort() {
  const byScope = new Map();
  const calls = [];
  const scope = (scopeId) => {
    if (!byScope.has(scopeId)) byScope.set(scopeId, new Map());
    return byScope.get(scopeId);
  };
  return {
    calls,
    byScope,
    async list(scopeId) {
      calls.push(["list", scopeId]);
      return [...scope(scopeId).values()];
    },
    async read(scopeId, draftId) {
      calls.push(["read", scopeId, draftId]);
      return scope(scopeId).get(draftId);
    },
    async write(scopeId, value) {
      calls.push(["write", scopeId, value]);
      scope(scopeId).set(value.draft_id, value);
    },
    async remove(scopeId, draftId) {
      calls.push(["remove", scopeId, draftId]);
      scope(scopeId).delete(draftId);
    },
  };
}

test("draft-store runtime success contract", async () => {
  assert.deepEqual(Object.keys(draftStoreModule).sort(), [
    "EMPLOYEE_DRAFT_STORE_ERROR_CODES",
    "createEmployeeDraftStore",
    "isEmployeeDraftId",
    "isEmployeeDraftPayload",
    "isEmployeeDraftRecord",
    "isEmployeeDraftScopeId",
  ]);
  assert.equal(
    Object.isFrozen(draftStoreModule.EMPLOYEE_DRAFT_STORE_ERROR_CODES),
    true,
  );
  assert.equal(draftStoreModule.isEmployeeDraftScopeId("scope-1"), true);
  assert.equal(draftStoreModule.isEmployeeDraftScopeId(""), false);
  assert.equal(draftStoreModule.isEmployeeDraftId("draft-1"), true);
  assert.equal(draftStoreModule.isEmployeeDraftId(""), false);
  for (
    const payload of [
      null,
      "value",
      1,
      true,
      [],
      {},
      { nested: [1, "two", false, null] },
    ]
  ) {
    assert.equal(draftStoreModule.isEmployeeDraftPayload(payload), true);
  }
  for (const eventId of eventIds) {
    assert.equal(draftStoreModule.isEmployeeDraftRecord(record(
      `draft-${eventId}`,
      eventId,
    )), true);
  }

  const port = memoryPort();
  const store = draftStoreModule.createEmployeeDraftStore("scope-1", port);
  assert.equal(store.scopeId, "scope-1");
  assert.equal(Object.isFrozen(store), true);
  assert.deepEqual(await store.list(), { ok: true, value: [] });

  const input = record("draft-save", "expense", {
    nested: { value: "unchanged" },
  });
  const saved = await store.save(input);
  assert.equal(saved.ok, true);
  assert.equal(Object.isFrozen(saved), true);
  assert.equal(Object.isFrozen(saved.value), true);
  assert.equal(Object.isFrozen(saved.value.payload), true);
  assert.equal(Object.isFrozen(saved.value.payload.nested), true);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.payload), false);
  assert.notEqual(port.calls.at(-1)[2], input);
  assert.notEqual(port.calls.at(-1)[2].payload, input.payload);

  input.payload.nested.value = "caller-change";
  assert.equal(saved.value.payload.nested.value, "unchanged");
  const listed = await store.list();
  assert.equal(listed.ok, true);
  assert.equal(listed.value.length, 1);
  assert.equal(Object.isFrozen(listed.value), true);
  assert.equal(Object.isFrozen(listed.value[0]), true);
  assert.equal(Object.isFrozen(listed.value[0].payload), true);

  const read = await store.read("draft-save");
  assert.equal(read.ok, true);
  assert.equal(read.value.draft_id, "draft-save");
  assert.equal(Object.isFrozen(read.value), true);
  port.byScope.get("scope-1").get("draft-save").payload.nested.value =
    "storage-change";
  assert.equal(read.value.payload.nested.value, "unchanged");

  assert.deepEqual(await store.remove("draft-save"), {
    ok: true,
    value: undefined,
  });
  assert.deepEqual(await store.read("draft-save"), {
    ok: true,
    value: undefined,
  });

  const sharedPort = memoryPort();
  const firstScope = draftStoreModule.createEmployeeDraftStore(
    "scope-first",
    sharedPort,
  );
  const secondScope = draftStoreModule.createEmployeeDraftStore(
    "scope-second",
    sharedPort,
  );
  await firstScope.save(record("same-id", "rent"));
  assert.equal((await firstScope.list()).value.length, 1);
  assert.equal((await secondScope.list()).value.length, 0);

  const separatePort = memoryPort();
  const isolated = draftStoreModule.createEmployeeDraftStore(
    "scope-first",
    separatePort,
  );
  assert.equal((await isolated.list()).value.length, 0);

  const sequence = sharedPort.calls.map(([operation]) => operation);
  assert.deepEqual(sequence.slice(0, 4), ["list", "write", "list", "list"]);
});

test("draft-store runtime fail-closed contract", async () => {
  for (const invalid of [null, 1, {}, { list() {}, read() {}, write() {} }]) {
    assert.throws(
      () => draftStoreModule.createEmployeeDraftStore("scope", invalid),
      { message: "EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_PORT" },
    );
  }

  const untouchedPort = memoryPort();
  assert.throws(
    () => draftStoreModule.createEmployeeDraftStore("", untouchedPort),
    { message: "EMPLOYEE_DRAFT_STORE_INVALID_SCOPE_ID" },
  );
  assert.equal(untouchedPort.calls.length, 0);

  const port = memoryPort();
  const store = draftStoreModule.createEmployeeDraftStore("scope", port);
  assert.deepEqual(await store.read(""), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID",
  });
  assert.deepEqual(await store.remove(""), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID",
  });
  assert.equal(port.calls.length, 0);

  const invalidRecords = [
    [record("", "rent"), "EMPLOYEE_DRAFT_STORE_INVALID_DRAFT_ID"],
    [record("d", "unknown"), "EMPLOYEE_DRAFT_STORE_INVALID_EVENT_ID"],
    [record("d", "rent", () => undefined), "EMPLOYEE_DRAFT_STORE_INVALID_PAYLOAD"],
    [record("d", "rent", new Date()), "EMPLOYEE_DRAFT_STORE_INVALID_PAYLOAD"],
    [record("d", "rent", { secret: "hidden" }), "EMPLOYEE_DRAFT_STORE_SECRET_FIELD"],
    [{ ...record(), token: "hidden" }, "EMPLOYEE_DRAFT_STORE_SECRET_FIELD"],
    [{ ...record(), updated_at_iso: "" }, "EMPLOYEE_DRAFT_STORE_INVALID_RECORD"],
  ];
  const circular = {};
  circular.self = circular;
  invalidRecords.push([
    record("d", "rent", circular),
    "EMPLOYEE_DRAFT_STORE_INVALID_PAYLOAD",
  ]);
  for (const [value, errorCode] of invalidRecords) {
    assert.deepEqual(await store.save(value), { ok: false, errorCode });
  }
  assert.equal(port.calls.length, 0);

  const duplicatePort = memoryPort();
  duplicatePort.byScope.set(
    "scope",
    new Map([["existing", record("existing")]]),
  );
  const duplicateStore = draftStoreModule.createEmployeeDraftStore(
    "scope",
    duplicatePort,
  );
  assert.deepEqual(await duplicateStore.save(record("existing")), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_DUPLICATE_DRAFT_ID",
  });
  assert.equal(
    duplicatePort.calls.filter(([operation]) => operation === "write").length,
    0,
  );

  const duplicateListPort = memoryPort();
  duplicateListPort.list = async () => [record("same"), record("same")];
  assert.deepEqual(
    await draftStoreModule.createEmployeeDraftStore(
      "scope",
      duplicateListPort,
    ).list(),
    {
      ok: false,
      errorCode: "EMPLOYEE_DRAFT_STORE_DUPLICATE_DRAFT_ID",
    },
  );

  const invalidDataPort = memoryPort();
  invalidDataPort.list = async () => ({ invalid: true });
  const invalidDataStore = draftStoreModule.createEmployeeDraftStore(
    "scope",
    invalidDataPort,
  );
  assert.deepEqual(await invalidDataStore.list(), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_DATA",
  });
  invalidDataPort.read = async () => ({ invalid: true });
  assert.deepEqual(await invalidDataStore.read("draft"), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_INVALID_STORAGE_DATA",
  });

  for (
    const [method, operation, errorCode] of [
      ["list", () => store.list(), "EMPLOYEE_DRAFT_STORE_STORAGE_LIST_FAILED"],
      ["read", () => store.read("draft"), "EMPLOYEE_DRAFT_STORE_STORAGE_READ_FAILED"],
    ]
  ) {
    const throwingPort = memoryPort();
    throwingPort[method] = async () => {
      throw new Error("private storage detail");
    };
    const throwingStore = draftStoreModule.createEmployeeDraftStore(
      "scope",
      throwingPort,
    );
    const result = method === "list"
      ? await throwingStore.list()
      : await throwingStore.read("draft");
    assert.deepEqual(result, { ok: false, errorCode });
    assert.doesNotMatch(JSON.stringify(result), /private storage detail/u);
    void operation;
  }

  const writePort = memoryPort();
  writePort.write = async () => {
    throw new Error("private storage detail");
  };
  assert.deepEqual(
    await draftStoreModule.createEmployeeDraftStore(
      "scope",
      writePort,
    ).save(record("new")),
    {
      ok: false,
      errorCode: "EMPLOYEE_DRAFT_STORE_STORAGE_WRITE_FAILED",
    },
  );

  const removePort = memoryPort();
  removePort.byScope.set("scope", new Map([["draft", record("draft")]]));
  removePort.remove = async () => {
    throw new Error("private storage detail");
  };
  const removeStore = draftStoreModule.createEmployeeDraftStore(
    "scope",
    removePort,
  );
  assert.deepEqual(await removeStore.remove("draft"), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_STORAGE_REMOVE_FAILED",
  });
  assert.deepEqual(await removeStore.remove("missing"), {
    ok: false,
    errorCode: "EMPLOYEE_DRAFT_STORE_DRAFT_NOT_FOUND",
  });
});

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(source) {
  const contractFile = "/virtual/event-contract.ts";
  const storeFile = "/virtual/draft-store.ts";
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
    [contractFile, eventContractSource],
    [storeFile, draftStoreSource],
    [fixtureFile, source],
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
      if (moduleName === "./event-contract") {
        return {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: contractFile,
        };
      }
      if (
        moduleName === "./draft-store.ts"
        && normalizeVirtualPath(containingFile) === fixtureFile
      ) {
        return {
          extension: ts.Extension.Ts,
          isExternalLibraryImport: false,
          resolvedFileName: storeFile,
        };
      }
      return undefined;
    });
  const program = ts.createProgram(
    [contractFile, storeFile, fixtureFile],
    options,
    host,
  );
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile
    ),
  );
}

test("draft-store TypeScript semantic fixtures", () => {
  const modulePath = "./draft-store.ts";
  const imports = `
    import {
      createEmployeeDraftStore,
      type EmployeeDraftPayload,
      type EmployeeDraftRecord,
      type EmployeeDraftStoragePort,
      type EmployeeDraftStore,
      type EmployeeDraftStoreResult,
    } from ${JSON.stringify(modulePath)};
  `;
  const positiveFixtures = [
    `${imports} const value: EmployeeDraftPayload = { nested: [1, "two", null] }; void value;`,
    `${imports} const value: EmployeeDraftRecord = { draft_id: "d", event_id: "rent", payload: {}, updated_at_iso: "r" }; void value;`,
    `${imports} const port: EmployeeDraftStoragePort = { async list() { return []; }, async read() { return undefined; }, async write() {}, async remove() {} }; void port;`,
    `${imports} declare const port: EmployeeDraftStoragePort; const store: EmployeeDraftStore = createEmployeeDraftStore("scope", port); void store;`,
    `${imports} declare const store: EmployeeDraftStore; const result: Promise<EmployeeDraftStoreResult<readonly EmployeeDraftRecord[]>> = store.list(); void result;`,
    `${imports} const value: EmployeeDraftRecord = { draft_id: "d", event_id: "bed-transfer", payload: null, updated_at_iso: "r" }; void value;`,
  ];
  for (const source of positiveFixtures) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negativeFixtures = [
    [`${imports} const value: EmployeeDraftRecord = { draft_id: "d", event_id: "unknown", payload: {}, updated_at_iso: "r" };`, /unknown/u],
    [`${imports} const value: EmployeeDraftRecord = { event_id: "rent", payload: {}, updated_at_iso: "r" };`, /draft_id/u],
    [`${imports} declare const port: EmployeeDraftStoragePort; createEmployeeDraftStore(port);`, /Expected 2 arguments/u],
    [`${imports} const value: EmployeeDraftPayload = () => undefined;`, /not assignable/u],
    [`${imports} const value: EmployeeDraftPayload = new Date();`, /not assignable/u],
    [`${imports} const port: EmployeeDraftStoragePort = { async list() { return []; }, async read() { return undefined; }, async write() {} };`, /remove/u],
    [`${imports} const port: EmployeeDraftStoragePort = { list() { return []; }, async read() { return undefined; }, async write() {}, async remove() {} };`, /Promise/u],
    [`${imports} declare const result: EmployeeDraftStoreResult<string>; const value: string = result.value;`, /value/u],
    [`${imports} const value: EmployeeDraftRecord = { draft_id: "d", event_id: "rent", payload: {}, updated_at_iso: "r", secret: "x" };`, /secret/u],
    [`${imports} declare const port: EmployeeDraftStoragePort; createEmployeeDraftStore({ value: "scope" }, port);`, /not assignable/u],
    [`${imports} declare const port: EmployeeDraftStoragePort; async function run() { const raw = await port.read("s", "d"); const value: EmployeeDraftRecord = raw; }`, /unknown/u],
  ];
  for (const [source, expected] of negativeFixtures) {
    const diagnostics = semanticDiagnosticsFor(source);
    assert.ok(diagnostics.length > 0, source);
    const text = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ).join("\n");
    assert.match(text, expected, source);
  }
});

test("draft-store source boundary excludes business rules and side effects", () => {
  const imports = [...draftStoreSource.matchAll(
    /^\s*import(?:\s+type)?[\s\S]*?from\s+["']([^"']+)["'];/gmu,
  )].map((match) => match[1]);
  assert.deepEqual(imports, ["./event-contract", "./event-contract"]);
  assert.doesNotMatch(
    draftStoreSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document|window|location|setTimeout|setInterval)\b/u,
  );
  assert.doesNotMatch(
    draftStoreSource,
    /\/api\/|https?:|employee-v3|["']\.\/(?:event-registry|auth|api-client|submit-entry)["']|events\//u,
  );
  assert.doesNotMatch(
    draftStoreSource,
    /\b(?:rent_amount|paid_amount|cash|bank|arrears|remaining_arrears|deposit|deposit_in|deposit_out|checkout|expense|bed_transfer|from_bed|to_bed|tenant|ttlock|card|Dxxx|finance|owner|canonical)\b/iu,
  );
  assert.doesNotMatch(draftStoreSource, /\bany\b/u);
  assert.doesNotMatch(draftStoreSource, /^let\b|^var\b/mu);
  assert.doesNotMatch(
    draftStoreSource,
    /\bdefaultStore\b|\bsingleton\b/u,
  );
});
