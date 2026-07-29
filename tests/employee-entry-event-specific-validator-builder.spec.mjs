import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";

function functionBlock(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} should exist`);
  let depth = 0;
  let seenBody = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${name} should close`);
}

test("employee Entry validators are event-specific, not generic wrappers", async () => {
  const html = await readFile(htmlPath, "utf8");
  for (const name of [
    "validateRentEntry",
    "validateArrearsPaymentEntry",
    "validateDepositInEntry",
    "validateDepositOutEntry",
    "validateCheckoutEntry",
    "validateExpenseEntry",
    "validateBedTransferEntry"
  ]) {
    const block = functionBlock(html, name);
    assert.doesNotMatch(block, /return\s+validate\(\)/, `${name} must not call generic validate()`);
    assert.match(block, /employeeValidationResult\(errors,warns\)/, `${name} should return event-specific validation result`);
  }

  assert.match(functionBlock(html, "validateRentEntry"), /periodStart/);
  assert.match(functionBlock(html, "validateRentEntry"), /arrearPromiseDate/);
  assert.doesNotMatch(functionBlock(html, "validateRentEntry"), /linkedTaskId/);

  assert.match(functionBlock(html, "validateArrearsPaymentEntry"), /linkedTaskId/);
  assert.doesNotMatch(functionBlock(html, "validateArrearsPaymentEntry"), /periodStart/);

  assert.match(functionBlock(html, "validateDepositOutEntry"), /depositOutDifferenceReason/);
  assert.doesNotMatch(functionBlock(html, "validateDepositOutEntry"), /periodStart/);

  assert.match(functionBlock(html, "validateCheckoutEntry"), /leftWithArrearsSelected/);
  assert.doesNotMatch(functionBlock(html, "validateCheckoutEntry"), /periodStart/);

  assert.match(functionBlock(html, "validateExpenseEntry"), /expenseCategory/);
  assert.doesNotMatch(functionBlock(html, "validateExpenseEntry"), /linkedTaskId/);

  assert.match(functionBlock(html, "validateBedTransferEntry"), /transferWaiverReason/);
  assert.doesNotMatch(functionBlock(html, "validateBedTransferEntry"), /periodStart/);
});

test("employee Entry anchor builders are event-specific, not generic wrappers", async () => {
  const html = await readFile(htmlPath, "utf8");
  for (const name of [
    "buildRentAnchor",
    "buildArrearsPaymentAnchor",
    "buildDepositInAnchor",
    "buildDepositOutAnchor",
    "buildCheckoutAnchor",
    "buildExpenseAnchor",
    "buildBedTransferAnchor"
  ]) {
    const block = functionBlock(html, name);
    assert.doesNotMatch(block, /entryPayload\(\)/, `${name} must not call generic entryPayload()`);
    assert.match(block, /applyEntryAnchors\(payload\)/, `${name} should emit a canonical anchor`);
  }

  assert.match(functionBlock(html, "buildRentAnchor"), /period_start/);
  assert.match(functionBlock(html, "buildArrearsPaymentAnchor"), /remaining_arrears_before_payment/);
  assert.match(functionBlock(html, "buildDepositInAnchor"), /deposit_amt/);
  assert.match(functionBlock(html, "buildDepositOutAnchor"), /refund_difference/);
  assert.match(functionBlock(html, "buildCheckoutAnchor"), /left_with_arrears/);
  assert.match(functionBlock(html, "buildExpenseAnchor"), /expense_category/);
  assert.match(functionBlock(html, "buildBedTransferAnchor"), /fee_waiver_reason/);
});

test("upload validation keeps event_type-specific backend branches and detailed errors", async () => {
  const worker = await readFile(workerPath, "utf8");
  const start = worker.indexOf("async function validateEmployeeEntryUploadPayload(");
  assert.notEqual(start, -1, "validateEmployeeEntryUploadPayload should exist");
  const end = worker.indexOf("__name(validateEmployeeEntryUploadPayload", start);
  assert.notEqual(end, -1, "validateEmployeeEntryUploadPayload should be named");
  const validateBlock = worker.slice(start, end);
  const dispatcher = functionBlock(worker, "validateEmployeeEntryUploadEventFields");

  for (const name of [
    "validateRentUploadFields",
    "validateArrearsPaymentUploadFields",
    "validateDepositInUploadFields",
    "validateDepositOutUploadFields",
    "validateCheckoutUploadFields",
    "validateExpenseUploadFields",
    "validateBedTransferUploadFields"
  ]) {
    assert.match(worker, new RegExp(`function ${name}\\(`), `${name} should exist`);
    assert.match(dispatcher, new RegExp(name), `${name} should be registered in upload dispatch`);
  }

  assert.match(validateBlock, /validateEmployeeEntryUploadEventFields\(type,entry,normalized,eventIndex,anchorPreview\)/);

  for (const branch of [
    'type==="R"',
    'type==="TF"',
    'type==="AP"',
    'type==="DR"',
    'type==="CO"&&entry.left_with_arrears'
  ]) {
    assert.match(validateBlock, new RegExp(branch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const field of [
    "event_index",
    "event_type",
    "error_code",
    "missing_fields",
    "invalid_fields"
  ]) {
    assert.match(worker, new RegExp(field), `dry-run response should expose ${field}`);
  }
});
