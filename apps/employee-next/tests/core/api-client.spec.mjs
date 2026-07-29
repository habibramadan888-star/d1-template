import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const apiClientPath = resolve(
  employeeNextRoot,
  "src",
  "core",
  "api-client.ts",
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
const apiClientSource = await readFile(apiClientPath, "utf8");

const bundledApiClient = await esbuild.build({
  bundle: true,
  entryPoints: [apiClientPath],
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const apiClientModule = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundledApiClient.outputFiles[0].text).toString("base64")
  }`
);

function transportWith(handler) {
  const requests = [];
  return {
    requests,
    async request(request) {
      requests.push(request);
      return handler(request);
    },
  };
}

test("api-client runtime success contract", async () => {
  assert.deepEqual(Object.keys(apiClientModule).sort(), [
    "EMPLOYEE_API_CLIENT_ERROR_CODES",
    "EMPLOYEE_API_METHODS",
    "createEmployeeApiClient",
    "isEmployeeApiHeaders",
    "isEmployeeApiJsonValue",
    "isEmployeeApiMethod",
    "isEmployeeApiPath",
    "isEmployeeApiRequest",
    "isEmployeeApiResponse",
  ]);
  assert.deepEqual(apiClientModule.EMPLOYEE_API_METHODS, ["GET", "POST"]);
  assert.equal(Object.isFrozen(apiClientModule.EMPLOYEE_API_METHODS), true);
  assert.deepEqual(apiClientModule.EMPLOYEE_API_CLIENT_ERROR_CODES, [
    "INVALID_TRANSPORT",
    "INVALID_METHOD",
    "INVALID_PATH",
    "INVALID_HEADERS",
    "INVALID_BODY",
    "INVALID_REQUEST",
    "INVALID_RESPONSE",
    "TRANSPORT_FAILED",
    "HTTP_ERROR_STATUS",
    "UNSAFE_RESPONSE_ECHO",
  ]);
  assert.equal(
    Object.isFrozen(apiClientModule.EMPLOYEE_API_CLIENT_ERROR_CODES),
    true,
  );
  assert.equal(apiClientModule.isEmployeeApiMethod("GET"), true);
  assert.equal(apiClientModule.isEmployeeApiMethod("POST"), true);
  assert.equal(apiClientModule.isEmployeeApiPath("/local/path"), true);
  assert.equal(
    apiClientModule.isEmployeeApiHeaders({ "x-test": "value" }),
    true,
  );
  assert.equal(
    apiClientModule.isEmployeeApiJsonValue({
      nested: [1, "two", true, null],
    }),
    true,
  );
  assert.equal(
    apiClientModule.isEmployeeApiRequest({
      method: "GET",
      path: "/local/path",
    }),
    true,
  );
  assert.equal(
    apiClientModule.isEmployeeApiResponse({ status: 200, body: {} }),
    true,
  );

  const responseBody = { nested: { value: "response" } };
  const responseHeaders = { "x-result": "ok" };
  const transport = transportWith(() => ({
    status: 200,
    headers: responseHeaders,
    body: responseBody,
  }));
  const client = apiClientModule.createEmployeeApiClient(transport);
  assert.equal(Object.isFrozen(client), true);

  const requestHeaders = { "x-request": "value" };
  const requestBody = { nested: { value: "request" } };
  const postRequest = {
    method: "POST",
    path: "/local/path",
    headers: requestHeaders,
    body: requestBody,
  };
  const pending = client.request(postRequest);
  requestHeaders["x-request"] = "caller-change";
  requestBody.nested.value = "caller-change";
  const result = await pending;
  assert.equal(transport.requests.length, 1);
  assert.equal(transport.requests[0].method, "POST");
  assert.equal(transport.requests[0].headers["x-request"], "value");
  assert.equal(transport.requests[0].body.nested.value, "request");
  assert.notEqual(transport.requests[0], postRequest);
  assert.notEqual(transport.requests[0].headers, requestHeaders);
  assert.notEqual(transport.requests[0].body, requestBody);
  assert.equal(Object.isFrozen(transport.requests[0]), true);
  assert.equal(Object.isFrozen(transport.requests[0].headers), true);
  assert.equal(Object.isFrozen(transport.requests[0].body), true);
  assert.equal(Object.isFrozen(postRequest), false);
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.response), true);
  assert.equal(Object.isFrozen(result.response.headers), true);
  assert.equal(Object.isFrozen(result.response.body), true);

  responseHeaders["x-result"] = "transport-change";
  responseBody.nested.value = "transport-change";
  assert.equal(result.response.headers["x-result"], "ok");
  assert.equal(result.response.body.nested.value, "response");

  const getTransport = transportWith(() => ({ status: 204 }));
  const getClient = apiClientModule.createEmployeeApiClient(getTransport);
  assert.deepEqual(
    await getClient.request({ method: "GET", path: "/empty" }),
    { ok: true, response: { status: 204 } },
  );
  assert.equal(getTransport.requests.length, 1);

  const otherTransport = transportWith(() => ({ status: 200, body: null }));
  const otherClient = apiClientModule.createEmployeeApiClient(otherTransport);
  await otherClient.request({ method: "GET", path: "/other" });
  assert.equal(transport.requests.length, 1);
  assert.equal(otherTransport.requests.length, 1);
});

test("api-client runtime fail-closed contract", async () => {
  for (const invalid of [null, 1, {}, { request: 1 }]) {
    assert.throws(
      () => apiClientModule.createEmployeeApiClient(invalid),
      { message: "INVALID_TRANSPORT" },
    );
  }

  const transport = transportWith(() => ({ status: 200 }));
  const client = apiClientModule.createEmployeeApiClient(transport);
  const circular = {};
  circular.self = circular;
  const invalidCases = [
    [{ method: "PUT", path: "/path" }, "INVALID_METHOD"],
    [{ method: "GET", path: "https://invalid.example" }, "INVALID_PATH"],
    [{ method: "GET", path: "//invalid" }, "INVALID_PATH"],
    [{ method: "GET", path: "/one/../two" }, "INVALID_PATH"],
    [{ method: "GET", path: "/white space" }, "INVALID_PATH"],
    [{ method: "GET", path: "/control\u0001" }, "INVALID_PATH"],
    [{ method: "GET", path: "/path", headers: { x: 1 } }, "INVALID_HEADERS"],
    [{ method: "GET", path: "/path", body: null }, "INVALID_BODY"],
    [{ method: "POST", path: "/path", body: () => undefined }, "INVALID_BODY"],
    [{ method: "POST", path: "/path", body: new Date() }, "INVALID_BODY"],
    [{ method: "POST", path: "/path", body: circular }, "INVALID_BODY"],
    [{ path: "/path" }, "INVALID_REQUEST"],
    [{ method: "GET" }, "INVALID_REQUEST"],
    [{ method: "GET", path: "/path", extra: true }, "INVALID_REQUEST"],
  ];
  for (const [request, errorCode] of invalidCases) {
    assert.deepEqual(await client.request(request), { ok: false, errorCode });
  }
  assert.equal(transport.requests.length, 0);

  const throwingClient = apiClientModule.createEmployeeApiClient({
    request() {
      throw new Error("private transport detail");
    },
  });
  const thrown = await throwingClient.request({
    method: "POST",
    path: "/path",
    headers: { confidential: "header-value" },
    body: { confidential: "body-value" },
  });
  assert.deepEqual(thrown, { ok: false, errorCode: "TRANSPORT_FAILED" });
  assert.doesNotMatch(
    JSON.stringify(thrown),
    /private transport detail|header-value|body-value/u,
  );

  const rejectedClient = apiClientModule.createEmployeeApiClient({
    async request() {
      throw new Error("private rejection detail");
    },
  });
  assert.deepEqual(
    await rejectedClient.request({ method: "GET", path: "/path" }),
    { ok: false, errorCode: "TRANSPORT_FAILED" },
  );

  for (
    const invalidResponse of [
      undefined,
      {},
      { status: 99 },
      { status: 600 },
      { status: 200.5 },
      { status: 200, headers: { x: 1 } },
      { status: 200, body: new Date() },
      { status: 200, extra: true },
    ]
  ) {
    const invalidClient = apiClientModule.createEmployeeApiClient(
      transportWith(() => invalidResponse),
    );
    assert.deepEqual(
      await invalidClient.request({ method: "GET", path: "/path" }),
      { ok: false, errorCode: "INVALID_RESPONSE" },
    );
  }

  const errorResponse = {
    status: 403,
    headers: { confidential: "response-header" },
    body: { confidential: "response-body" },
  };
  const httpClient = apiClientModule.createEmployeeApiClient(
    transportWith(() => errorResponse),
  );
  const httpResult = await httpClient.request({
    method: "POST",
    path: "/path",
    headers: { confidential: "request-header" },
    body: { confidential: "request-body" },
  });
  assert.deepEqual(httpResult, {
    ok: false,
    errorCode: "HTTP_ERROR_STATUS",
  });
  assert.doesNotMatch(
    JSON.stringify(httpResult),
    /request-header|request-body|response-header|response-body/u,
  );
});

function normalizeVirtualPath(value) {
  return value.replaceAll("\\", "/");
}

function semanticDiagnosticsFor(source) {
  const clientFile = "/virtual/api-client.ts";
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
    [clientFile, apiClientSource],
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
  host.resolveModuleNames = (moduleNames) => moduleNames.map(
    (moduleName) => (
      moduleName === "./api-client.ts"
        ? {
            extension: ts.Extension.Ts,
            isExternalLibraryImport: false,
            resolvedFileName: clientFile,
          }
        : undefined
    ),
  );
  const program = ts.createProgram([clientFile, fixtureFile], options, host);
  return ts.getPreEmitDiagnostics(program).filter(
    (diagnostic) => (
      normalizeVirtualPath(diagnostic.file?.fileName ?? "") === fixtureFile
    ),
  );
}

test("api-client TypeScript semantic fixtures", () => {
  const imports = `
    import {
      createEmployeeApiClient,
      type EmployeeApiClient,
      type EmployeeApiHeaders,
      type EmployeeApiJsonValue,
      type EmployeeApiMethod,
      type EmployeeApiPath,
      type EmployeeApiRequest,
      type EmployeeApiTransport,
    } from "./api-client.ts";
  `;
  const positives = [
    `${imports} const value: EmployeeApiMethod = "GET"; void value;`,
    `${imports} const value: EmployeeApiPath = "/path"; void value;`,
    `${imports} const value: EmployeeApiJsonValue = { nested: [1, null] }; void value;`,
    `${imports} const value: EmployeeApiHeaders = { x: "value" }; void value;`,
    `${imports} const value: EmployeeApiTransport = { async request() { return { status: 200 }; } }; void value;`,
    `${imports} declare const transport: EmployeeApiTransport; const value: EmployeeApiClient = createEmployeeApiClient(transport); void value;`,
  ];
  for (const source of positives) {
    assert.deepEqual(semanticDiagnosticsFor(source), []);
  }

  const negatives = [
    [`${imports} const value: EmployeeApiMethod = "PUT";`, /PUT/u],
    [`${imports} const value: EmployeeApiRequest = { path: "/path" };`, /method/u],
    [`${imports} const value: EmployeeApiRequest = { method: "GET" };`, /path/u],
    [`${imports} const value: EmployeeApiRequest = { method: "GET", path: "/path", body: null };`, /body/u],
    [`${imports} const value: EmployeeApiJsonValue = () => undefined;`, /not assignable/u],
    [`${imports} const value: EmployeeApiJsonValue = new Date();`, /not assignable/u],
    [`${imports} const value: EmployeeApiHeaders = { x: 1 };`, /number/u],
    [`${imports} const value: EmployeeApiTransport = {};`, /request/u],
    [`${imports} const value: EmployeeApiTransport = { request() { return { status: 200 }; } };`, /Promise/u],
    [`${imports} declare const client: EmployeeApiClient; async function run() { const result = await client.request({ method: "GET", path: "/path" }); const status: number = result.response.status; }`, /response/u],
    [`${imports} const value: EmployeeApiRequest = { method: "POST", path: "/path", body: Symbol("x") };`, /symbol/u],
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

test("api-client source boundary excludes integrations and business rules", () => {
  assert.doesNotMatch(apiClientSource, /^\s*import\b/mu);
  assert.doesNotMatch(
    apiClientSource,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document|window|navigator|setTimeout|setInterval)\b/u,
  );
  assert.doesNotMatch(apiClientSource, /\/api\/|https?:|employee-v3/u);
  assert.doesNotMatch(
    apiClientSource,
    /\b(?:auth|draftStore|submitEntry|eventRegistry|rent|arrears|deposit|checkout|expense|bedTransfer|ttlock|finance|owner|canonical)\b/iu,
  );
  assert.doesNotMatch(apiClientSource, /\bany\b/u);
  assert.doesNotMatch(apiClientSource, /^let\b|^var\b/mu);
  assert.doesNotMatch(
    apiClientSource,
    /\bdefaultClient\b|\bsingleton\b/u,
  );
});
