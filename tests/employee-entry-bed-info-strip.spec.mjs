import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

function templateBlock(source, key) {
  const marker = `${key}:{`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${key} template must exist`);
  const nextComma = source.indexOf("\n  },", start);
  const nextEnd = source.indexOf("\n};", start);
  const end = nextComma === -1 ? nextEnd : (nextEnd === -1 ? nextComma : Math.min(nextComma, nextEnd));
  assert.ok(end > start, `${key} template must close`);
  return source.slice(start, end);
}

function functionBlock(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const paramsEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${name} must close`);
}

test("all seven employee Entry templates require bed context", async () => {
  const html = await readFile(employeePath, "utf8");

  for (const key of ["rent", "arrears_payment", "deposit_in", "deposit_out", "checkout"]) {
    const block = templateBlock(html, key);
    assert.match(block, /fields:\[[^\]]*'genericBedFieldWrap'/, `${key} must show Bed field`);
    assert.match(block, /required_fields:\[[^\]]*'bed'/, `${key} must require bed`);
  }

  const expense = templateBlock(html, "expense");
  assert.match(expense, /fields:\[[^\]]*'genericBedFieldWrap'/, "expense must show Target Bed / Room field");
  assert.match(expense, /required_fields:\['target_bed','expense_amount','expense_category','payment_method','reason'\]/);
  assert.doesNotMatch(expense, /forbidden_fields:\[[^\]]*'genericBedFieldWrap'/, "expense must not forbid Bed field");

  const transfer = templateBlock(html, "bed_transfer");
  assert.match(transfer, /required_fields:\['from_bed','to_bed','transfer_date','fee_option','transfer_reason'\]/);
  assert.match(transfer, /fields:\['selectedEventWrap','transferFromBed','bedTo'/);
});

test("bed info strip is mounted below Bed and From Bed inputs", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /id="employeeBedInfoStrip" class="bed-info-strip hidden" data-bed-info-strip="true"/);
  assert.match(html, /id="employeeTransferFromBedInfoStrip" class="bed-info-strip hidden" data-bed-transfer-bed-info-strip="true"/);
  assert.match(html, /\.bed-info-strip/);
  assert.match(html, /\.bed-info-rows/);
  assert.match(html, /function renderEmployeeBedInfoStrips\(\)/);
  assert.match(html, /function employeeScheduleBedInfoStrip\(\)/);
});

test("bed info strip reads open arrears and access card cache without vendor labels", async () => {
  const html = await readFile(employeePath, "utf8");
  const strip = functionBlock(html, "employeeRenderBedInfoStrip");
  const taskLookup = functionBlock(html, "employeeOpenTasksForBedValue");
  const cardLookup = functionBlock(html, "employeeFindCardForBedValue");

  assert.match(taskLookup, /state\.tasks/);
  assert.match(taskLookup, /taskRemain\(t\)>0/);
  assert.match(taskLookup, /target_bed/);
  assert.match(cardLookup, /state\.lockCards/);
  assert.match(cardLookup, /searchText/);
  assert.match(strip, /Open Arrears/);
  assert.match(strip, /No Open Arrears/);
  assert.match(strip, /Access Card/);
  assert.match(strip, /Card Until/);
  assert.match(strip, /Status:/);
  assert.match(strip, /Loading Bed Info/);
  assert.match(strip, /Bed Info Unavailable/);
  assert.doesNotMatch(strip, /TTLock|TT lock|通通锁/);
});

test("bed required validation covers each event-specific validator", async () => {
  const html = await readFile(employeePath, "utf8");

  for (const fn of [
    "validateRentEntry",
    "validateArrearsPaymentEntry",
    "validateDepositInEntry",
    "validateDepositOutEntry",
    "validateCheckoutEntry"
  ]) {
    assert.match(functionBlock(html, fn), /Bed is required\./, `${fn} must require bed`);
  }

  assert.match(functionBlock(html, "validateExpenseEntry"), /Target Bed \/ Room is required\./);
  assert.match(functionBlock(html, "validateBedTransferEntry"), /From Bed is required\./);
  assert.match(functionBlock(html, "validateBedTransferEntry"), /To Bed is required\./);
});

test("bed info refresh does not remount active template while typing", async () => {
  const html = await readFile(employeePath, "utf8");
  const scheduleLookup = functionBlock(html, "employeeScheduleLookupBed");
  const mount = functionBlock(html, "employeeMountEntryTemplate");

  assert.match(scheduleLookup, /employeeScheduleBedInfoStrip\(\)/);
  assert.match(scheduleLookup, /setTimeout\(\(\)=>\{/);
  assert.match(mount, /mount\.dataset\.eventTemplate===key&&existingBody/);
  assert.match(mount, /renderEmployeeBedInfoStrips\(\)/);
  assert.ok(
    mount.indexOf("mount.dataset.eventTemplate===key&&existingBody") < mount.indexOf("mount.replaceChildren(head,body)"),
    "same-template guard must run before remount"
  );
});
