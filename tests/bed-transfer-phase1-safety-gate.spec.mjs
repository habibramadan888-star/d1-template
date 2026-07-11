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

test("bedTransferWriteApproved is exact true after trimming", async () => {
  const source = await readWorker();
  const block = functionBlock(source, "bedTransferWriteApproved");
  const cases = [
    [undefined, false],
    [{}, false],
    [{ BED_TRANSFER_WRITE_APPROVED: false }, false],
    [{ BED_TRANSFER_WRITE_APPROVED: 1 }, false],
    [{ BED_TRANSFER_WRITE_APPROVED: " true " }, true]
  ];

  for (const [env, expected] of cases) {
    const context = { env };
    vm.createContext(context);
    vm.runInContext(`${block}\nresult=bedTransferWriteApproved(env);`, context);
    assert.equal(context.result, expected, JSON.stringify({ env, expected }));
  }
});

test("both Bed Transfer routes fail closed before D1 work", async () => {
  const source = await readWorker();
  const directHandler = functionBlock(source, "handleEmployeeBedTransferCreate");
  const entryHandler = functionBlock(source, "handleEmployeeEntry");

  assert.match(directHandler, /^function handleEmployeeBedTransferCreate\(request,env,user\)\{\s*return bedTransferCanonicalPathRequiredResponse\(\);\s*\}\s*$/);
  assert.doesNotMatch(directHandler, /bedTransferRequiredTablesReady|env\.DB|\.prepare\(|\.run\(|\.batch\(|empInsertDynamic/);

  assert.match(entryHandler, /const writeGateType=employeeEntryUploadType\(entryForWriteGate\);/);
  assert.match(entryHandler, /\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
  assert.ok(
    entryHandler.indexOf("bedTransferWriteDisabledResponse()") <
      entryHandler.indexOf('empTableExists(env,"sessions")'),
    "employee entry gate must precede D1 schema inspection"
  );
});

test("disabled response is phase-1 no-go and validation-only", async () => {
  const source = await readWorker();
  const block = functionBlock(source, "bedTransferWriteDisabledResponse");
  assert.match(block, /error:"bed_transfer_write_disabled_phase1_safety"/);
  assert.match(block, /dry_run_only:true/);
  assert.match(block, /validate_endpoint:"\/api\/employee\/entry\/validate"/);
  assert.match(block, /production_cutover:"PRODUCTION_NO_GO"/);
  assert.match(block, /\},409\)/);
});
