import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

async function readWorker() {
  return readFile(workerPath, "utf8");
}

test("legacy write path disabled response is fixed HTTP 409 JSON", async () => {
  const source = await readWorker();
  const block = functionBlock(source, "bedTransferCanonicalPathRequiredResponse");
  const context = { json: (body, status) => ({ body, status }) };
  vm.createContext(context);
  vm.runInContext(`${block}\nresult=bedTransferCanonicalPathRequiredResponse();`, context);

  assert.equal(context.result.status, 409);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result.body)), {
    success: false,
    ok: false,
    error_code: "BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED",
    event_type: "bed_transfer",
    canonical_write_endpoint: "/api/employee/entry",
    validate_endpoint: "/api/employee/entry/validate",
    bed_transfer_write_enabled: false,
    write_attempted: false,
    business_data_written: false,
    message: "Use the canonical employee entry path. Bed Transfer writing remains disabled; no business data was written.",
    production_cutover: "PRODUCTION_NO_GO"
  });
});

test("direct route rejects before request parsing, auth, schema, TTLock, idempotency, or writes", async () => {
  const source = await readWorker();
  const handler = functionBlock(source, "handleEmployeeBedTransferCreate");
  assert.match(handler, /^function handleEmployeeBedTransferCreate\(request,env,user\)\{\s*return bedTransferCanonicalPathRequiredResponse\(\);\s*\}\s*$/);
  assert.doesNotMatch(handler, /request\.json|requireManager|isStaffRoleValue|empTableExists|bedTransferRequiredTablesReady/);
  assert.doesNotMatch(handler, /env\.DB|\.prepare\(|\.run\(|\.batch\(|empInsertDynamic/);
  assert.doesNotMatch(handler, /bed_transfer_events|entry_events|sessions|transactions|arrears|finance|deposit|occupancy|today.?todo/i);
  assert.doesNotMatch(handler, /ttlock|lock\/cards|empLoadLockCards|idempotency/i);
  assert.doesNotMatch(handler, /tenant_card_id|card_id|old_ttlock_ref|provider|phone|99099|creation_time/i);

  const touched = [];
  const trap = (name) => new Proxy({}, { get(){ touched.push(name); throw new Error(`${name} touched`); } });
  const context = {
    bedTransferCanonicalPathRequiredResponse: () => ({ status: 409, error_code: "BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED" })
  };
  vm.createContext(context);
  vm.runInContext(`async ${handler}`, context);
  const result = await context.handleEmployeeBedTransferCreate(
    trap("request"),
    { BED_TRANSFER_WRITE_APPROVED: "true", DB: trap("DB"), TTLOCK: trap("TTLock"), ACCESS: trap("Access") },
    trap("user")
  );
  assert.deepEqual(result, { status: 409, error_code: "BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED" });
  assert.deepEqual(touched, []);
});

test("save_session classifier rejects all Bed Transfer representations only", async () => {
  const source = await readWorker();
  const entryBlock = functionBlock(source, "isBedTransferSaveSessionEntry");
  const payloadBlock = functionBlock(source, "saveSessionContainsBedTransfer");
  const cleanText = (value, max) => String(value ?? "").trim().slice(0, max);
  const employeeEntryUploadType = (entry = {}) => {
    const event = cleanText(entry.event_type, 60).toLowerCase();
    if (event === "bed_transfer") return "TF";
    if (event === "bed_transfer_fee") return "TFF";
    const raw = cleanText(entry.type || entry.reason_code, 20).toUpperCase();
    return ({ TF: "TF", TFF: "TFF", T: "TF", TRANSFER: "TF", BED_TRANSFER: "TF", BED_TRANSFER_FEE: "TFF" })[raw] || "";
  };
  const context = { cleanText, employeeEntryUploadType };
  vm.createContext(context);
  vm.runInContext(`${entryBlock}\n${payloadBlock}`, context);

  const rejected = [
    { session: { entries: [{ event_type: "bed_transfer" }] } },
    { session: { entries: [{ type: "TF" }] } },
    { session: { entries: [{ type: "TFF" }] } },
    { session: { entries: [{ tag: "Transfer" }] } },
    { transactions: [{ reason_code: "BED_TRANSFER" }] }
  ];
  for (const payload of rejected) {
    assert.equal(context.saveSessionContainsBedTransfer(payload), true, JSON.stringify(payload));
  }

  const allowed = [
    { session: { entries: [{ event_type: "rent", type: "R", tag: "Old" }] } },
    { session: { entries: [{ event_type: "arrears_payment", type: "AP" }] } },
    { session: { entries: [{ event_type: "deposit_in", type: "D" }] } },
    { session: { entries: [{ event_type: "checkout", type: "CO" }] } },
    { session: { entries: [{ event_type: "expense", type: "E" }] } }
  ];
  for (const payload of allowed) {
    assert.equal(context.saveSessionContainsBedTransfer(payload), false, JSON.stringify(payload));
  }
});

test("save_session guard precedes schema and every D1 write", async () => {
  const source = await readWorker();
  const routeStart = source.indexOf('if (path === "/api/save_session" && method === "POST")');
  const routeEnd = source.indexOf('if (path === "/api/delete_session"', routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  const route = source.slice(routeStart, routeEnd);
  const guard = route.indexOf("if(saveSessionContainsBedTransfer(body))return bedTransferCanonicalPathRequiredResponse();");
  assert.ok(guard >= 0, "save_session Bed Transfer guard must exist");
  assert.ok(guard < route.indexOf("empEnsureSchema(env)"), "guard must precede schema ensure");
  assert.ok(guard < route.indexOf("env.DB.prepare"), "guard must precede D1 prepare");
  assert.ok(guard < route.indexOf("env.DB.batch"), "guard must precede D1 batch");
});

test("canonical employee entry Bed Transfer write gate remains fail closed", async () => {
  const source = await readWorker();
  const handler = functionBlock(source, "handleEmployeeEntry");
  assert.match(handler, /const writeGateType=employeeEntryUploadType\(entryForWriteGate\);/);
  assert.match(handler, /\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
  assert.ok(
    handler.indexOf("bedTransferWriteDisabledResponse()") < handler.indexOf('empTableExists(env,"sessions")'),
    "canonical employee entry gate must remain before D1 schema inspection"
  );
});

test("canonical validate and employee entry routes remain the only Phase 1 path", async () => {
  const source = await readWorker();
  assert.match(source, /path==="\/api\/employee\/entry\/validate"&&request\.method==="POST"\)return handleEmployeeEntryValidate\(request,env,user\)/);
  assert.match(source, /path==="\/api\/employee\/entry"&&request\.method==="POST"\)return handleEmployeeEntry\(request,env,user\)/);
  assert.match(source, /path==="\/api\/employee\/bed-transfers"&&request\.method==="POST"\)return handleEmployeeBedTransferCreate\(request,env,user\)/);

  const validateHandler = functionBlock(source, "handleEmployeeEntryValidate");
  const validatePayload = functionBlock(source, "validateEmployeeEntryUploadPayload");
  const entryHandler = functionBlock(source, "handleEmployeeEntry");
  const classifier = functionBlock(source, "employeeEntryUploadType");
  const dispatch = functionBlock(source, "validateEmployeeEntryUploadEventFields");

  assert.doesNotMatch(validateHandler, /\.run\(|\.batch\(|empInsertDynamic/);
  assert.match(classifier, /bed_transfer:"TF"/);
  assert.match(dispatch, /TF:validateBedTransferUploadFields/);
  assert.match(validatePayload, /validateEmployeeBedTransferPhase1\(env,user,entry,normalized\)/);
  assert.match(validatePayload, /const sessionEntriesJson=JSON\.stringify/);
  assert.match(validatePayload, /employeeEntryExportTextWithAnchors/);
  assert.match(entryHandler, /entries_json:cleanText\(sessionEntriesJson,50000\)/);
  assert.match(entryHandler, /\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
});

test("historical Bed Transfer table remains read-only and is not deleted", async () => {
  const source = await readWorker();
  const ownerRead = functionBlock(source, "handleOwnerBedTransfers");
  assert.match(ownerRead, /SELECT \* FROM bed_transfer_events/);
  assert.doesNotMatch(ownerRead, /INSERT|UPDATE|DELETE|DROP|ALTER/i);
  assert.doesNotMatch(source, /DROP TABLE(?: IF EXISTS)? bed_transfer_events/i);
});

test("no new Bed Transfer write route is introduced", async () => {
  const source = await readWorker();
  const postRoutes = [...source.matchAll(/path==?=?"([^\"]*bed-transfer[^\"]*)"&&request\.method==?=?"POST"/g)].map((match) => match[1]);
  assert.deepEqual(postRoutes, ["/api/employee/bed-transfers"]);
  assert.doesNotMatch(functionBlock(source, "isBedTransferSaveSessionEntry"), /card_id|tenant_card_id|old_ttlock_ref|provider_phone|phone_99099/i);
});
