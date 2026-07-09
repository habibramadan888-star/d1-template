import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const docPath = new URL("../docs/EMPLOYEE_7_EVENT_BUSINESS_DEPENDENCY_AND_ANCHOR_MODEL_V1.md", import.meta.url);
const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

const EVENTS = [
  ["Rent", "R", "rent"],
  ["Arrears Payment", "AP", "arrears_payment"],
  ["Deposit In", "D", "deposit_in"],
  ["Deposit Out", "DR", "deposit_out"],
  ["Checkout", "CO", "checkout"],
  ["Expense", "E", "expense"],
  ["Bed Transfer", "TF", "bed_transfer"]
];

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} must end at __name marker`);
  return source.slice(start, end);
}

function contractBlock(source) {
  const start = source.indexOf("const entryAnchorContract=");
  assert.notEqual(start, -1, "entryAnchorContract must exist");
  const end = source.indexOf("};", start);
  assert.ok(end > start, "entryAnchorContract must end");
  return source.slice(start, end);
}

test("source-of-truth document covers all seven event contracts and approved business rules", async () => {
  const doc = await readFile(docPath, "utf8");

  assert.match(doc, /EMPLOYEE_7_EVENT_SOURCE_OF_TRUTH_CONTRACT_V1/);
  assert.match(doc, /OWNER_APPROVED_DEFAULT_RULES_V1/);
  assert.match(doc, /334 duplicate\/alias arrears repair is explicitly deferred/);
  for (const [label] of EVENTS) assert.match(doc, new RegExp(`\\| ${label.replace(" ", "\\s+")} \\|`));

  for (const required of [
    "Deposit In must always be recorded as a separate event anchor",
    "payment above `80` is not allowed",
    "Refund above balance without owner override",
    "Normal Checkout is not allowed with open arrears",
    "Receipt/evidence is required for expenses `>= 100 AED`",
    "New bed becomes occupied on transfer_date",
    "TTLock provider metadata"
  ]) {
    assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("event classifier and dispatch isolate all seven events and reject unknown/missing event types", async () => {
  const worker = await readFile(workerPath, "utf8");
  const classifier = functionBlock(worker, "employeeEntryUploadType");
  const dispatch = functionBlock(worker, "validateEmployeeEntryUploadEventFields");

  for (const [, code, eventType] of EVENTS) {
    assert.match(classifier, new RegExp(`${eventType}:"${code}"`));
    assert.match(dispatch, new RegExp(`${code}:validate`));
  }

  assert.match(dispatch, /UNKNOWN_EVENT_TYPE/);
  assert.doesNotMatch(dispatch, /dispatch\[type\]\|\|validateRentUploadFields/);
  assert.doesNotMatch(classifier, /entry\.type\|\|entry\.reason_code\|\|"R"/);
  assert.match(classifier, /if\(event\)return ""/);
});

test("missing required fields use event-specific validation codes, not Rent errors", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validators = [
    ["validateRentUploadFields", "RENT_REQUIRED_FIELD_MISSING", true],
    ["validateArrearsPaymentUploadFields", "ARREARS_PAYMENT_REQUIRED_FIELD_MISSING", false],
    ["validateDepositInUploadFields", "DEPOSIT_IN_REQUIRED_FIELD_MISSING", false],
    ["validateDepositOutUploadFields", "DEPOSIT_OUT_REQUIRED_FIELD_MISSING", false],
    ["validateCheckoutUploadFields", "CHECKOUT_REQUIRED_FIELD_MISSING", false],
    ["validateExpenseUploadFields", "EXPENSE_REQUIRED_FIELD_MISSING", false],
    ["validateBedTransferUploadFields", "BED_TRANSFER_REQUIRED_FIELD_MISSING", false]
  ];

  for (const [fn, code, isRent] of validators) {
    const block = functionBlock(worker, fn);
    assert.match(block, new RegExp(code));
    if (!isRent) assert.doesNotMatch(block, /RENT_REQUIRED_FIELD_MISSING/);
  }
});

test("runtime anchor contract exposes event-specific required fields from the source-of-truth model", async () => {
  const worker = await readFile(workerPath, "utf8");
  const contract = contractBlock(worker);
  const requiredByType = {
    R: ["expected_rent", "paid_amount", "rent_period_start", "rent_period_end", "short_paid", "arrears_amount"],
    AP: ["arrears_ref", "original_arrears_amount", "already_paid_amount", "remaining_arrears_before_payment", "remaining_arrears_after_payment", "settlement_status"],
    D: ["deposit_amount", "deposit_required_total", "deposit_paid_amount", "deposit_remaining"],
    DR: ["refund_amount", "refund_reason", "deposit_balance", "owner_override_ref"],
    CO: ["checkout_date", "owner_approval_required", "left_with_arrears", "whatsapp_phone", "promised_payment_date"],
    E: ["expense_amount", "expense_category", "reason", "payment_method", "evidence_ref"],
    TF: ["from_bed", "to_bed", "transfer_date", "fee_amount", "fee_status", "waiver_reason"]
  };

  for (const [type, fields] of Object.entries(requiredByType)) {
    const line = contract.match(new RegExp(`${type}:\\[[^\\]]+\\]`))?.[0] || "";
    assert.ok(line, `${type} contract line must exist`);
    for (const field of fields) assert.match(line, new RegExp(field), `${type} must include ${field}`);
  }
});

test("forbidden provider identity fields cannot become business identity or duplicate matching keys", async () => {
  const worker = await readFile(workerPath, "utf8");
  const providerBoundary = worker.slice(
    worker.indexOf("const providerMetadataBusinessIdentityFields"),
    worker.indexOf("__name(assertNoProviderMetadataInBusinessIdentity", worker.indexOf("const providerMetadataBusinessIdentityFields"))
  );
  const fingerprint = functionBlock(worker, "buildCanonicalEventFingerprint");

  for (const field of ["card_id", "tenant_card_id", "provider_phone", "ttlock_phone"]) {
    assert.match(providerBoundary, new RegExp(field));
  }
  assert.match(providerBoundary, /99099/);
  assert.doesNotMatch(fingerprint, /card_id|tenant_card_id|provider_phone|phone_99099|old_ttlock_ref/i);
});

test("anchor normalization preserves canonical event types, refs, and amount fields for all seven events", async () => {
  const worker = await readFile(workerPath, "utf8");
  const normalize = functionBlock(worker, "normalizeEntryAnchor");

  for (const [, code, eventType] of EVENTS) {
    if (code === "CO") assert.match(normalize, /event_type:left\?"left_with_arrears":"checkout"/);
    else assert.match(worker, new RegExp(`${code}:"${eventType}"`));
  }

  for (const field of [
    "expected_rent",
    "paid_amount",
    "arrears_ref",
    "deposit_amount",
    "refund_amount",
    "expense_amount",
    "from_bed",
    "to_bed"
  ]) {
    assert.match(normalize, new RegExp(field));
  }
});

test("owner decoder compatibility reads structured ENTRY ANCHORS JSON and event-specific owner rows", async () => {
  const worker = await readFile(workerPath, "utf8");
  const parser = functionBlock(worker, "parseEmployeeEntryAnchorJson");
  const extractor = functionBlock(worker, "extractEmployeeEntryAnchorsFromSession");
  const renderer = functionBlock(worker, "renderEntryAnchorForOwner");

  assert.match(parser, /JSON\.parse/);
  assert.match(extractor, /ENTRY ANCHORS JSON/);
  for (const [, code] of EVENTS) assert.match(renderer, new RegExp(`type==="${code}"`));
});

test("financial effect contracts are represented by event-specific projection categories", async () => {
  const worker = await readFile(workerPath, "utf8");
  const correctionTotals = functionBlock(worker, "ownerCorrectionPreviewSessionTotals");
  const detailTotals = functionBlock(worker, "ownerEmployeeDetailRowsTotals");

  assert.match(correctionTotals, /type==="rent"/);
  assert.match(correctionTotals, /totals\.rent_income/);
  assert.match(correctionTotals, /type==="arrears_payment"/);
  assert.match(correctionTotals, /totals\.arrears_repaid/);
  assert.match(correctionTotals, /type==="deposit_in"/);
  assert.match(correctionTotals, /totals\.deposit_liability\+=/);
  assert.match(correctionTotals, /type==="deposit_out"/);
  assert.match(correctionTotals, /totals\.deposit_liability-=/);
  assert.match(correctionTotals, /type==="expense"/);
  assert.match(correctionTotals, /totals\.expense/);
  assert.match(correctionTotals, /type==="bed_transfer"/);
  assert.match(correctionTotals, /totals\.transfer_fee/);
  assert.match(detailTotals, /type==="E"/);
  assert.match(detailTotals, /type==="DR"/);
});

test("event-specific business rules are visible in current runtime validation", async () => {
  const worker = await readFile(workerPath, "utf8");
  const rent = functionBlock(worker, "validateRentUploadFields");
  const arrears = functionBlock(worker, "validateArrearsPaymentUploadFields");
  const depositIn = functionBlock(worker, "validateDepositInUploadFields");
  const depositOut = functionBlock(worker, "validateDepositOutUploadFields");
  const checkout = functionBlock(worker, "validateCheckoutUploadFields");
  const expense = functionBlock(worker, "validateExpenseUploadFields");
  const transfer = functionBlock(worker, "validateBedTransferUploadFields");

  assert.match(rent, /arrears_due_date/);
  assert.match(arrears, /remaining_arrears_before_payment/);
  assert.match(arrears, /ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH/);
  assert.match(depositIn, /deposit_required_total/);
  assert.match(depositIn, /deposit_remaining/);
  assert.match(depositOut, /refund_date/);
  assert.match(depositOut, /owner_override_ref/);
  assert.match(checkout, /left_with_arrears/);
  assert.match(checkout, /promised_payment_date/);
  assert.match(expense, /evidence_ref/);
  assert.match(expense, /100/);
  assert.match(transfer, /fromBed===toBed|from_bed.*to_bed/);
});
