import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";
const ownerPath = "deploy-worker/public/index-51-main.js";

const events = [
  {
    key: "rent",
    code: "R",
    validator: "validateRentEntry",
    builder: "buildRentAnchor",
    uploadValidator: "validateRentUploadFields",
    mustHave: ["period_start", "period_end", "arrear_promise_date"],
    forbidden: ["linkedTaskId", "depositOutFields", "checkoutFields"]
  },
  {
    key: "arrears_payment",
    code: "AP",
    validator: "validateArrearsPaymentEntry",
    builder: "buildArrearsPaymentAnchor",
    uploadValidator: "validateArrearsPaymentUploadFields",
    mustHave: ["linked_task_id", "arrears_ref", "remaining_arrears_after_payment"],
    forbidden: ["listPrice", "periodStep", "periodStart", "periodEnd", "system clear"]
  },
  {
    key: "deposit_in",
    code: "D",
    validator: "validateDepositInEntry",
    builder: "buildDepositInAnchor",
    uploadValidator: "validateDepositInUploadFields",
    mustHave: ["deposit_amt", "deposit_balance"],
    forbidden: ["periodStep", "linkedTaskId", "checkoutFields"]
  },
  {
    key: "deposit_out",
    code: "DR",
    validator: "validateDepositOutEntry",
    builder: "buildDepositOutAnchor",
    uploadValidator: "validateDepositOutUploadFields",
    mustHave: ["actual_refund_amount", "refund_difference", "difference_reason"],
    forbidden: ["periodStep", "periodStart", "periodEnd", "listPrice", "checkoutFields"]
  },
  {
    key: "checkout",
    code: "CO",
    validator: "validateCheckoutEntry",
    builder: "buildCheckoutAnchor",
    uploadValidator: "validateCheckoutUploadFields",
    mustHave: ["left_with_arrears", "whatsapp_phone", "promised_payment_date", "belongings_held"],
    forbidden: ["periodStep", "periodStart", "periodEnd", "listPrice", "depositOutFields", "paymentStep"]
  },
  {
    key: "expense",
    code: "E",
    validator: "validateExpenseEntry",
    builder: "buildExpenseAnchor",
    uploadValidator: "validateExpenseUploadFields",
    mustHave: ["target_bed", "expense_category", "expense_desc"],
    forbidden: ["periodStep", "linkedTaskId", "depositOutFields", "checkoutFields", "listPrice"]
  },
  {
    key: "bed_transfer",
    code: "TF",
    validator: "validateBedTransferEntry",
    builder: "buildBedTransferAnchor",
    uploadValidator: "validateBedTransferUploadFields",
    mustHave: ["from_bed", "to_bed", "fee_waiver_reason", "transfer_reason"],
    forbidden: ["periodStep", "linkedTaskId", "depositOutFields", "checkoutFields", "listPrice", "arrearsPaymentCorePanel"]
  }
];

function functionBlock(source, name) {
  const marker = `function ${name}(`;
  const asyncMarker = `async function ${name}(`;
  const syncStart = source.lastIndexOf(marker);
  const asyncStart = source.lastIndexOf(asyncMarker);
  const start = Math.max(syncStart, asyncStart);
  assert.notEqual(start, -1, `${name} must exist`);
  const paramsEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", paramsEnd);
  assert.ok(bodyStart > start, `${name} body must start`);
  let depth = 0;
  let seenBody = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${name} must close`);
}

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

test("all seven employee Entry events have isolated template, validator, and builder wiring", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /const entryTemplates=\{/);
  assert.match(html, /function employeeMountEntryTemplate/);

  for (const event of events) {
    const template = templateBlock(html, event.key);
    assert.match(template, new RegExp(`code:'${event.code}'`), `${event.key} must own code ${event.code}`);
    assert.match(template, new RegExp(`event_type:'${event.key === "bed_transfer" ? "bed_transfer" : event.key}'`));
    assert.match(template, new RegExp(`validator:${event.validator}`));
    assert.match(template, new RegExp(`anchorBuilder:${event.builder}`));
    assert.match(template, /uploadValidation:uploadValidationByEventType/);
    assert.match(template, /whatsappRenderer:renderEntryAnchorForWhatsapp/);
    assert.match(template, /ownerDetailRenderer:renderEntryAnchorForOwner/);
    assert.match(template, /forbidden_fields:\[/);
    for (const forbidden of event.forbidden) {
      if (forbidden === "system clear") continue;
      assert.match(template, new RegExp(forbidden), `${event.key} must forbid ${forbidden}`);
    }

    const validator = functionBlock(html, event.validator);
    const builder = functionBlock(html, event.builder);
    assert.match(validator, /employeeValidationResult\(errors,warns\)/);
    assert.match(builder, /applyEntryAnchors\(payload\)/);
    assert.doesNotMatch(builder, /entryPayload\(\)/, `${event.key} builder must not use generic entry payload`);
    for (const required of event.mustHave) {
      assert.match(builder + validator, new RegExp(required), `${event.key} must preserve ${required}`);
    }
  }
});

test("backend dry-run validation dispatches by event type and never writes during validation", async () => {
  const worker = await readFile(workerPath, "utf8");
  const dispatcher = functionBlock(worker, "validateEmployeeEntryUploadEventFields");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const validateHandler = functionBlock(worker, "handleEmployeeEntryValidate");

  for (const event of events) {
    assert.match(worker, new RegExp(`function ${event.uploadValidator}\\(`));
    assert.match(dispatcher, new RegExp(`${event.code}:${event.uploadValidator}`), `${event.key} must dispatch to ${event.uploadValidator}`);
  }

  assert.match(validateBlock, /validateEmployeeEntryUploadEventFields\(type,entry,normalized,eventIndex,anchorPreview\)/);
  assert.doesNotMatch(validateBlock, /\.run\(/, "dry-run validation must not write D1");
  assert.doesNotMatch(validateHandler, /\.run\(/, "validate endpoint must not write D1");
  assert.match(validateBlock, /trace_id:homelinkDiagnosticTraceId\("emp-upload"\)/);
  assert.match(validateBlock, /stage:"final_preflight"/);
  assert.match(validateBlock, /message_en:"Upload validation passed\."/);
});

test("invalid fixtures produce event-specific DiagnosticTrace error codes", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  const expectedCodes = [
    "RENT_PERIOD_INVALID",
    "SHORT_PAID_DUE_DATE_REQUIRED",
    "LINKED_TASK_REQUIRED",
    "DEPOSIT_IN_REQUIRED_FIELD_MISSING",
    "DEPOSIT_OUT_REQUIRED_FIELD_MISSING",
    "CHECKOUT_OPEN_ARREARS_LEFT_WITH_ARREARS_REQUIRED",
    "LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING",
    "EXPENSE_REQUIRED_FIELD_MISSING",
    "BED_TRANSFER_WAIVER_REASON_REQUIRED"
  ];

  for (const code of expectedCodes) {
    assert.match(worker, new RegExp(code), `${code} must be returned explicitly`);
  }

  assert.doesNotMatch(validateBlock, /UPLOAD_VALIDATION_FAILED/);
});

test("owner detail decoder reads structured anchors for every employee event type", async () => {
  const worker = await readFile(workerPath, "utf8");
  const owner = await readFile(ownerPath, "utf8");

  assert.match(worker, /const anchorRows=extractEmployeeEntryAnchorsFromSession\(sessionRow\)/);
  assert.match(worker, /const detailChoice=chooseOwnerEmployeeSessionDetailRows\(sessionRow,results,anchorRows,exportRows\)/);
  assert.match(worker, /if\(detailChoice\.rows\.length\)/);
  assert.match(worker, /parseEmployeeEntryAnchorJson/);

  for (const eventType of [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "left_with_arrears",
    "expense",
    "bed_transfer"
  ]) {
    assert.match(worker + owner, new RegExp(eventType), `owner decode/display path must mention ${eventType}`);
  }
  assert.match(owner, /\.\.\.tx/, "owner detail mapper must preserve structured anchor fields");
});

test("shared Ledger renderer is event-specific for seven templates", async () => {
  const html = await readFile(employeePath, "utf8");
  const typeBlock = functionBlock(html, "entryStatementType");
  const lineBlock = functionBlock(html, "entryStatementLine");
  const sessionBlock = functionBlock(html, "buildEntrySessionLedgerText");

  assert.match(typeBlock, /event_type/);
  assert.match(lineBlock, /type==='rent'/);
  assert.match(lineBlock, /type==='arrears_payment'/);
  assert.match(lineBlock, /type==='deposit_in'/);
  assert.match(lineBlock, /type==='deposit_out'/);
  assert.match(lineBlock, /deposit refund/);
  assert.match(lineBlock, /type==='left_with_arrears'/);
  assert.match(lineBlock, /left with arrears/);
  assert.match(lineBlock, /type==='checkout'/);
  assert.match(lineBlock, /checkout/);
  assert.match(lineBlock, /type==='expense'/);
  assert.match(lineBlock, /type==='bed_transfer'/);
  assert.match(lineBlock, /entryStatementBed\(from\)}\\n\$\{entryStatementBed\(to\)}/);
  assert.doesNotMatch(lineBlock, /\[112-111\]|112-111|112->111|112→111/);
  assert.match(sessionBlock, /HOMELINK LEDGER/);
  assert.match(sessionBlock, /Core Summary/);
  assert.match(sessionBlock, /Cash Details/);
  assert.match(sessionBlock, /Arrears Details/);
  assert.match(sessionBlock, /Transfer Details/);
});
