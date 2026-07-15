import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";

function extractRentShortPaidBlock(source) {
  const start = source.indexOf('if(type==="R"&&periodStart&&periodEnd&&periodDue>0)');
  assert.notEqual(start, -1, "rent short-paid reconciliation block should exist");
  const end = source.indexOf('if(type==="AP")', start);
  assert.notEqual(end, -1, "arrears payment reconciliation block should follow rent block");
  return source.slice(start, end);
}

test("rent short paid creates or updates open cloud arrears from current row shortfall", async () => {
  const source = await readFile(workerPath, "utf8");
  const rentBlock = extractRentShortPaidBlock(source);

  assert.match(source, /const currentShortfall=type==="R"&&periodDue>0 \? Math\.max\(0,periodDue-paid\) : 0/);
  assert.match(rentBlock, /const remain=currentShortfall/);
  assert.match(rentBlock, /if\(remain>0\)/);
  assert.match(rentBlock, /empInsertDynamic\(env,"arrear_tasks"/);
  assert.match(rentBlock, /source_type:"employee_entry_short_paid"/);
  assert.match(rentBlock, /source_ref:entryId/);
});

test("duplicate rent rows do not close cloud arrears as paid", async () => {
  const source = await readFile(workerPath, "utf8");
  const rentBlock = extractRentShortPaidBlock(source);

  assert.doesNotMatch(rentBlock, /SUM\(paid\)/);
  assert.doesNotMatch(rentBlock, /SELECT COALESCE\(SUM/);
  assert.doesNotMatch(rentBlock, /close_status='PAID'/);
  assert.doesNotMatch(rentBlock, /followup_status='已结清'/);
  assert.doesNotMatch(rentBlock, /followup_status='PAID'/);
});

test("only arrears payment reconciliation can settle a cloud arrears task", async () => {
  const source = await readFile(workerPath, "utf8");
  const writePathStart = source.indexOf("let arrearTask=null;");
  assert.notEqual(writePathStart, -1, "write-path arrears task block should exist");
  const apStart = source.indexOf('if(type==="AP"){', writePathStart);
  assert.notEqual(apStart, -1, "arrears payment reconciliation block should exist");
  const apBlock = source.slice(apStart, source.indexOf("let leftWithArrearsTask", apStart));

  assert.match(apBlock, /empReconcileArrearTask\(env,user,taskId,authOperatorId,now(?:,room)?\)/);
  assert.match(source, /WHERE corpid=\? AND linked_task_id=\?[^`]+COALESCE\(type,''\)='AP'/s);
  assert.match(source, /closed\?"PAID":""/);
});
