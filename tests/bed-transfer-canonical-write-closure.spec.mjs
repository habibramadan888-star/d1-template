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

test("canonical-path-required response is fixed HTTP 409 JSON", async () => {
  const source = await readWorker();
  const block = functionBlock(source, "bedTransferCanonicalPathRequiredResponse");
  const context = { json: (body, status) => ({ body, status }) };
  vm.createContext(context);
  vm.runInContext(`${block}\nresult=bedTransferCanonicalPathRequiredResponse();`, context);

  assert.equal(context.result.status, 409);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result.body)), {
    ok: false,
    error_code: "BED_TRANSFER_CANONICAL_PATH_REQUIRED",
    event_type: "bed_transfer",
    write_attempted: false,
    production_cutover: "PRODUCTION_NO_GO"
  });
});

test("direct route rejects even when approval is true and before D1 work", async () => {
  const source = await readWorker();
  const handler = functionBlock(source, "handleEmployeeBedTransferCreate");
  assert.match(handler, /^function handleEmployeeBedTransferCreate\(request,env,user\)\{\s*return bedTransferCanonicalPathRequiredResponse\(\);/);
  assert.ok(
    handler.indexOf("bedTransferCanonicalPathRequiredResponse()") <
      handler.indexOf("bedTransferRequiredTablesReady(env)"),
    "direct route must reject before schema inspection"
  );
  assert.ok(
    handler.indexOf("bedTransferCanonicalPathRequiredResponse()") <
      handler.indexOf("env.DB.batch"),
    "direct route must reject before D1 writes"
  );

  const context = {
    bedTransferCanonicalPathRequiredResponse: () => ({ status: 409, approval: true }),
    writeTouched: false
  };
  vm.createContext(context);
  vm.runInContext(`async ${handler}\nresult=handleEmployeeBedTransferCreate({}, { BED_TRANSFER_WRITE_APPROVED: "true", DB: new Proxy({}, { get(){ writeTouched=true; throw new Error("D1 touched"); } }) }, {});`, context);
  assert.deepEqual(await context.result, { status: 409, approval: true });
  assert.equal(context.writeTouched, false);
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

test("no new Bed Transfer write route is introduced", async () => {
  const source = await readWorker();
  const postRoutes = [...source.matchAll(/path==?=?"([^\"]*bed-transfer[^\"]*)"&&request\.method==?=?"POST"/g)].map((match) => match[1]);
  assert.deepEqual(postRoutes, ["/api/employee/bed-transfers"]);
  assert.doesNotMatch(functionBlock(source, "isBedTransferSaveSessionEntry"), /card_id|tenant_card_id|old_ttlock_ref|provider_phone|phone_99099/i);
});
