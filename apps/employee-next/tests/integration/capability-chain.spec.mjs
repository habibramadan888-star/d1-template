import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const employeeNextRoot = resolve(testDirectory, "..", "..");
const worktreeRoot = resolve(employeeNextRoot, "..", "..");
const gitDirectory = (
  await readFile(resolve(worktreeRoot, ".git"), "utf8")
).trim().replace(/^gitdir:\s*/u, "");
const sourceRepositoryRoot = resolve(gitDirectory, "..", "..", "..");
const requireFromRepository = createRequire(
  resolve(sourceRepositoryRoot, "package.json"),
);
const esbuild = requireFromRepository("esbuild");
const workerSource = await readFile(
  resolve(worktreeRoot, "deploy-worker", "src", "index.js"),
  "utf8",
);
const { ok, fail } = await import(
  new URL("../../../../dist/lib/lib/api-response.js", import.meta.url)
);
const { ErrorCodes } = await import(
  new URL("../../../../dist/lib/constants/error-codes.js", import.meta.url)
);

function functionBlock(source, name, async = false) {
  const prefix = `${async ? "async " : ""}function ${name}(`;
  const start = source.indexOf(prefix);
  assert.ok(start >= 0, `${name} missing`);
  const marker = source.indexOf(`__name(${name},`, start);
  assert.ok(marker > start, `${name} marker missing`);
  return source.slice(start, marker);
}

function createWorkerHarness() {
  let authenticatedUser;
  let authFailure;
  const source = [
    functionBlock(workerSource, "qaAcceptanceEnabled"),
    functionBlock(workerSource, "ownerTodayTodoAcknowledgmentWriteEnabled"),
    functionBlock(workerSource, "ownerBedTransferVoidWriteEnabled"),
    functionBlock(workerSource, "bedTransferWriteApproved"),
    functionBlock(workerSource, "bedTransferDeploymentCapabilities"),
    functionBlock(workerSource, "authFailureResponse"),
    functionBlock(workerSource, "json"),
    functionBlock(workerSource, "success"),
    functionBlock(workerSource, "handleRequest", true),
    "globalThis.workerHandleRequest=handleRequest;",
  ].join("\n");
  const sandbox = {
    URL,
    Request,
    Response,
    ErrorCodes,
    ok,
    fail,
    CORS_HEADERS: {},
    HOMELINK_DIAGNOSTIC_ASSET_VERSION: "capability-chain-test",
    cleanText(value, max) {
      return String(value ?? "").trim().slice(0, max);
    },
    clearSessionCookie() {
      return "session=; Max-Age=0";
    },
    async handleAppEntryRoute() {
      return null;
    },
    enforceTrustedOrigin() {
      return null;
    },
    async requireAuth() {
      return authFailure ?? { payload: authenticatedUser };
    },
    async handleEmployeeApi() {
      return null;
    },
    isManagerRoleValue() {
      return false;
    },
    isReadonlyAdminRoleValue() {
      return false;
    },
    canWriteOwnerData() {
      return false;
    },
  };
  vm.runInNewContext(source, sandbox);
  return Object.freeze({
    async request(path, env, user, failure) {
      authenticatedUser = user;
      authFailure = failure;
      return sandbox.workerHandleRequest(
        new Request(`https://homelink.invalid${path}`, { method: "GET" }),
        env,
        {},
      );
    },
  });
}

const bundle = await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "node",
  stdin: {
    contents: `
      export {
        createEmployeeNextSidecarAdapters,
        startEmployeeNextSidecarRoute,
      } from "./apps/employee-next/src/main.ts";
    `,
    loader: "ts",
    resolveDir: worktreeRoot,
    sourcefile: "capability-chain-test-entry.ts",
  },
  target: "es2022",
  write: false,
});
const runtime = await import(
  `data:text/javascript;base64,${
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
  }`
);

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.textContent = "";
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.disabled = false;
    this.value = "";
    this.checked = false;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }
}

function visibleText(element) {
  return [
    element.textContent,
    ...element.children.flatMap((child) =>
      child instanceof FakeElement ? visibleText(child) : String(child)
    ),
  ].join("\n");
}

function storagePort(mode = "normal") {
  const values = new Map();
  return {
    getItem(key) {
      if (mode === "read-error") {
        throw new Error("LOCAL_DRAFT_READ_FAILED");
      }
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

const enabledEnv = Object.freeze({
  APP_ENV: "internal_beta",
  APP_VERSION: "capability-chain-test",
  BED_TRANSFER_WRITE_APPROVED: "true",
  BED_TRANSFER_LEGACY_GENESIS_MODE: "server_verified",
  CORPID: "homelink",
});
const sessionPath = "/api/me";
const submitPath = "/api/employee/entry";
const capabilitiesPath = "/api/capabilities";

function serverUser(role) {
  return Object.freeze({
    userid: `capability-${role}`,
    employee_name: `Capability ${role}`,
    corpid: "homelink",
    role,
  });
}

async function startChain({
  role = "staff",
  env = enabledEnv,
  capabilityResponse,
  capabilityAuthFailure,
  storageMode = "normal",
} = {}) {
  const worker = createWorkerHarness();
  const calls = [];
  const requestPort = {
    async request(path, init) {
      calls.push({ path, init });
      const response = await worker.request(
        path,
        env,
        serverUser(role),
        path === capabilitiesPath ? capabilityAuthFailure : undefined,
      );
      calls[calls.length - 1].responseStatus = response.status;
      calls[calls.length - 1].responseBody = await response.clone().json();
      if (path === capabilitiesPath && capabilityResponse !== undefined) {
        return capabilityResponse(response);
      }
      return response;
    },
  };
  const adapters = runtime.createEmployeeNextSidecarAdapters({
    requestPort,
    sessionPath,
    submitPath,
    capabilitiesPath,
  });
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  const root = new FakeElement("main");
  const sidecar = runtime.startEmployeeNextSidecarRoute(root, adapters, {
    draftStorage: storagePort(storageMode),
  });
  await sidecar.sessionRestore;
  const bedTransferButton = root.children
    .flatMap((child) => child.children ?? [])
    .find((child) => child.dataset?.eventId === "bed-transfer");
  assert.ok(bedTransferButton, "Bed Transfer event button missing");
  bedTransferButton.listeners.get("click")();
  await sidecar.controller.render();
  return {
    calls,
    root,
    restoreDocument() {
      globalThis.document = previousDocument;
    },
  };
}

function enabledNotice(root) {
  return /Formal Bed Transfer write: enabled through the canonical employee entry\./u
    .test(visibleText(root));
}

test("actual Worker envelope enables the actual Employee Next gate for staff and employee", async () => {
  for (const role of ["staff", "employee"]) {
    const fixture = await startChain({ role });
    try {
      assert.equal(
        enabledNotice(fixture.root),
        true,
        `${role}: ${JSON.stringify(fixture.calls)}\n${
          visibleText(fixture.root)
        }`,
      );
      const capabilityCall = fixture.calls.find(
        (call) => call.path === capabilitiesPath,
      );
      assert.ok(capabilityCall, `${role} capability request missing`);
      assert.equal(capabilityCall.init.method, "GET");
      assert.equal(capabilityCall.init.credentials, "same-origin");
      assert.equal("body" in capabilityCall.init, false);
      assert.equal(capabilityCall.responseStatus, 200);
      assert.equal(capabilityCall.responseBody.code, 0);
      assert.equal(capabilityCall.responseBody.message, "success");
      assert.deepEqual(
        {
          bed_transfer_validate_enabled:
            capabilityCall.responseBody.data.bed_transfer_validate_enabled,
          bed_transfer_write_enabled:
            capabilityCall.responseBody.data.bed_transfer_write_enabled,
          canonical_write_path:
            capabilityCall.responseBody.data.canonical_write_path,
          internal_beta: capabilityCall.responseBody.data.internal_beta,
          qa_acceptance: capabilityCall.responseBody.data.qa_acceptance,
          production_cutover:
            capabilityCall.responseBody.data.production_cutover,
        },
        {
          bed_transfer_validate_enabled: true,
          bed_transfer_write_enabled: true,
          canonical_write_path: submitPath,
          internal_beta: true,
          qa_acceptance: false,
          production_cutover: "PRODUCTION_NO_GO",
        },
      );
      assert.equal(
        JSON.stringify(capabilityCall.init).includes("role"),
        false,
      );
    } finally {
      fixture.restoreDocument();
    }
  }
});

test("actual Worker exact write binding controls the actual Employee Next gate", async () => {
  for (const value of [undefined, "TRUE", "1", "false"]) {
    const env = { ...enabledEnv };
    if (value === undefined) {
      delete env.BED_TRANSFER_WRITE_APPROVED;
    } else {
      env.BED_TRANSFER_WRITE_APPROVED = value;
    }
    const fixture = await startChain({ env });
    try {
      assert.equal(enabledNotice(fixture.root), false, String(value));
      const capabilityCall = fixture.calls.find(
        (call) => call.path === capabilitiesPath,
      );
      assert.equal(
        capabilityCall.responseBody.data.bed_transfer_validate_enabled,
        true,
      );
      assert.equal(
        capabilityCall.responseBody.data.bed_transfer_write_enabled,
        false,
      );
    } finally {
      fixture.restoreDocument();
    }
  }
});

test("actual Worker 401/1001 response keeps the actual Employee Next gate closed", async () => {
  const fixture = await startChain({
    capabilityAuthFailure: {
      error: "unauthenticated",
      status: 401,
    },
  });
  try {
    assert.equal(enabledNotice(fixture.root), false);
    const capabilityCall = fixture.calls.find(
      (call) => call.path === capabilitiesPath,
    );
    assert.equal(capabilityCall.responseStatus, 401);
    assert.equal(capabilityCall.responseBody.code, 1001);
  } finally {
    fixture.restoreDocument();
  }
});

test("invalid and incomplete capability envelopes fail closed", async () => {
  for (const body of [
    { code: 0, message: "success", data: {} },
    {
      code: 0,
      message: "success",
      data: {
        bed_transfer_validate_enabled: true,
        bed_transfer_write_enabled: "true",
        canonical_write_path: submitPath,
      },
    },
    {
      code: 1001,
      message: "unauthenticated",
      data: {
        bed_transfer_validate_enabled: true,
        bed_transfer_write_enabled: true,
        canonical_write_path: submitPath,
      },
    },
  ]) {
    const fixture = await startChain({
      capabilityResponse: () => new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    });
    try {
      assert.equal(enabledNotice(fixture.root), false);
    } finally {
      fixture.restoreDocument();
    }
  }
});

test("QA flag absence does not disable internal-beta write capability", async () => {
  const fixture = await startChain({
    env: {
      ...enabledEnv,
      QA_ACCEPTANCE_ENABLED: undefined,
    },
  });
  try {
    assert.equal(enabledNotice(fixture.root), true);
    const capabilityCall = fixture.calls.find(
      (call) => call.path === capabilitiesPath,
    );
    assert.equal(capabilityCall.responseBody.data.qa_acceptance, false);
    assert.equal(
      capabilityCall.responseBody.data.bed_transfer_write_enabled,
      true,
    );
  } finally {
    fixture.restoreDocument();
  }
});

test("authenticated capability restoration is independent from local draft restoration", async () => {
  const fixture = await startChain({ storageMode: "read-error" });
  try {
    assert.equal(
      fixture.calls.some((call) => call.path === capabilitiesPath),
      true,
    );
    assert.equal(enabledNotice(fixture.root), true);
  } finally {
    fixture.restoreDocument();
  }
});
