import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { evaluateStayGenesisTrigger } from "../modules/employees/durable-stay-genesis-trigger.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const syncStart = source.indexOf(`function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  assert.ok(start >= 0, `${name} must exist`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

async function loadHarness() {
  const source = await readFile(workerPath, "utf8");
  const context = {
    evaluateStayGenesisTrigger,
    employeeEntryValidationFailure: (stage, error_code, message, extra = {}) => ({
      ok: false,
      stage,
      error_code,
      message,
      ...extra
    }),
    json: (body, status = 200) => ({ body, status })
  };
  vm.createContext(context);
  vm.runInContext([
    functionBlock(source, "employeeEntryValidationEntryFromBody"),
    functionBlock(source, "employeeEntryStayGenesisRows"),
    functionBlock(source, "employeeEntryStayGenesisEnvelopeFailure"),
    functionBlock(source, "evaluateEmployeeEntryStayGenesis"),
    functionBlock(source, "employeeEntryStayGenesisStartRequested"),
    functionBlock(source, "employeeEntryStayGenesisFailure"),
    functionBlock(source, "stayGenesisWriteNotEnabledResponse"),
    functionBlock(source, "durableStayWriteApproved")
  ].join("\n"), context);
  return { source, context };
}

function wrapped(entry, alternatives = {}) {
  return {
    event_index: 0,
    entry,
    entries: [alternatives.entries ?? entry],
    session: { entries: [alternatives.session ?? entry] }
  };
}

test("validate-only accepts strict Rent and Deposit In genesis triggers", async () => {
  const { context } = await loadHarness();
  for (const event_type of ["rent", "deposit_in"]) {
    assert.deepEqual(JSON.parse(JSON.stringify(context.evaluateEmployeeEntryStayGenesis(wrapped({ event_type, stay_action: "start" }), 0))), {
      requested: true,
      genesis_event_type: event_type
    });
  }
});

test("missing trigger preserves all seven event contracts", async () => {
  const { context } = await loadHarness();
  for (const event_type of ["rent", "arrears_payment", "deposit_in", "deposit_out", "checkout", "expense", "bed_transfer"]) {
    assert.deepEqual(JSON.parse(JSON.stringify(context.evaluateEmployeeEntryStayGenesis(wrapped({ event_type }), 0))), {
      requested: false,
      genesis_event_type: null
    });
  }
});

test("invalid actions, disallowed events, and unknown event types never fall back to Rent", async () => {
  const { context } = await loadHarness();
  for (const stay_action of ["", "START", "renew", 1]) {
    assert.equal(context.evaluateEmployeeEntryStayGenesis(wrapped({ event_type: "rent", stay_action }), 0).error_code, "STAY_ACTION_INVALID");
  }
  for (const event_type of ["arrears_payment", "deposit_out", "checkout", "expense", "bed_transfer", "unknown_event"]) {
    assert.equal(context.evaluateEmployeeEntryStayGenesis(wrapped({ event_type, stay_action: "start" }), 0).error_code, "STAY_GENESIS_EVENT_NOT_ALLOWED");
  }
  assert.equal(context.evaluateEmployeeEntryStayGenesis(wrapped({ stay_action: "start" }), 0).error_code, "STAY_EVENT_TYPE_REQUIRED");
});

test("conflicting wrapper triggers reject while identical strict values continue", async () => {
  const { context } = await loadHarness();
  const conflict = wrapped(
    { event_type: "rent", stay_action: "start" },
    { entries: { event_type: "rent", stay_action: "START" }, session: { event_type: "rent", stay_action: "start" } }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(context.evaluateEmployeeEntryStayGenesis(conflict, 0))), {
    error_code: "STAY_TRIGGER_CONFLICT",
    forbidden_fields: []
  });
  assert.equal(context.evaluateEmployeeEntryStayGenesis(wrapped({ event_type: "rent", stay_action: "start" }), 0).requested, true);
});

test("server-managed fields reject in every wrapper without echoing values", async () => {
  const { context } = await loadHarness();
  const fields = ["stay_context_id", "stay_event_link_id", "lifecycle_status", "genesis_anchor_id"];
  const locations = ["entry", "entries", "session"];
  for (const field of fields) {
    for (const location of locations) {
      const secret = `secret-${location}-${field}`;
      const base = { event_type: "rent", stay_action: "start" };
      const body = wrapped({ ...base });
      if (location === "entry") body.entry[field] = secret;
      if (location === "entries") body.entries[0] = { ...base, [field]: secret };
      if (location === "session") body.session.entries[0] = { ...base, [field]: secret };
      const result = context.evaluateEmployeeEntryStayGenesis(body, 0);
      assert.equal(result.error_code, "STAY_SERVER_MANAGED_FIELD_FORBIDDEN");
      assert.deepEqual(Array.from(result.forbidden_fields), [field]);
      assert.equal(JSON.stringify(result).includes(secret), false);
    }
  }
});

test("forbidden fields are sorted and deduplicated in integration errors", async () => {
  const { context } = await loadHarness();
  const body = wrapped(
    { event_type: "rent", stay_action: "start", stay_context_id: "secret-a", genesis_anchor_id: "secret-b" },
    { entries: { event_type: "rent", stay_action: "start", stay_context_id: "secret-c" } }
  );
  const result = context.evaluateEmployeeEntryStayGenesis(body, 0);
  assert.deepEqual(Array.from(result.forbidden_fields), ["genesis_anchor_id", "stay_context_id"]);
  assert.doesNotMatch(JSON.stringify(result), /secret-/);
});

test("real write handler accepts only exact durable stay flag and rejects before every DB access", async () => {
  const { source, context } = await loadHarness();
  const handler = functionBlock(source, "handleEmployeeEntry");
  context.bedTransferForbiddenIdentityFailure = () => { throw new Error("unexpected later guard"); };
  context.validateEmployeeEntryStayGenesisBusinessFields = () => null;
  context.Date = Date;
  vm.runInContext(handler, context);

  for (const event_type of ["rent", "deposit_in"]) {
    for (const flag of [undefined, "false", "TRUE", "1", "yes", true]) {
      let dbAccessed = false;
      const request = {
        headers: { get: () => null },
        json: async () => wrapped({ event_type, stay_action: "start" })
      };
      const env = {
        DURABLE_STAY_WRITE_APPROVED: flag,
        STAY_GENESIS_WRITE_ENABLED: "true",
        DURABLE_STAY_WRITE_ENABLED: "true",
        DB: new Proxy({}, { get() { dbAccessed = true; throw new Error("DB accessed"); } })
      };
      const response = await context.handleEmployeeEntry(request, env, {});
      assert.equal(response.status, 503);
      assert.equal(response.body.error_code, "STAY_GENESIS_WRITE_NOT_ENABLED");
      assert.equal(response.body.write_attempted, false);
      assert.equal(response.body.stay_identity_created, false);
      assert.equal(dbAccessed, false);
    }
  }
  assert.equal(context.durableStayWriteApproved({ DURABLE_STAY_WRITE_APPROVED: "true" }), true);
});

test("validate-only integration adds proof without invoking persistence or UUID generation", async () => {
  const { source } = await loadHarness();
  const validator = functionBlock(source, "validateEmployeeEntryUploadPayload");
  const validateHandler = functionBlock(source, "handleEmployeeEntryValidate");
  const writer = functionBlock(source, "handleEmployeeEntry");

  assert.match(source, /import \{ evaluateStayGenesisTrigger \} from "\.\.\/\.\.\/modules\/employees\/durable-stay-genesis-trigger\.mjs";/);
  assert.match(validator, /evaluateEmployeeEntryStayGenesis\(body\|\|\{\},rawEventIndex\)/);
  assert.match(validator, /stay_genesis:\{requested:true,genesis_event_type:stayGenesis\.genesis_event_type,write_enabled:false\}/);
  assert.match(validator, /write_attempted:false/);
  assert.match(validator, /stay_identity_created:false/);
  assert.match(validator, /persistence_adapter_called:false/);
  assert.match(validateHandler, /validateEmployeeEntryUploadPayload/);
  assert.doesNotMatch(validator, /prepareStayGenesis|materializePreparedStayGenesis|randomUUID/);
  assert.doesNotMatch(validateHandler, /prepareStayGenesis|materializePreparedStayGenesis|randomUUID/);
  assert.ok(writer.indexOf("evaluateEmployeeEntryStayGenesis") < writer.indexOf('empTableExists(env,"sessions")'));
  assert.match(source, /materializePreparedStayGenesis/);
  assert.match(source, /prepareStayGenesis/);
  assert.ok(writer.indexOf("validateEmployeeEntryStayGenesisBusinessFields") < writer.indexOf("durableStayWriteApproved"));
});

test("existing Bed Transfer gates and canonical write closures remain present", async () => {
  const { source } = await loadHarness();
  const writer = functionBlock(source, "handleEmployeeEntry");
  assert.match(writer, /\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
  assert.match(functionBlock(source, "handleEmployeeBedTransferCreate"), /return bedTransferCanonicalPathRequiredResponse\(\);/);
  assert.match(source, /if\(saveSessionContainsBedTransfer\(body\)\)return bedTransferCanonicalPathRequiredResponse\(\);/);
});
