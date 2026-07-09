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
    TF: ["from_bed", "to_bed", "transfer_date", "transfer_reason", "deposit_balance_carryover", "arrears_carryover", "rent_coverage_carryover", "fee_amount", "fee_status", "payment_method", "waiver_reason", "fee_waived_reason"]
  };

  const missingRuntimeFields = [];
  for (const [type, fields] of Object.entries(requiredByType)) {
    const line = contract.match(new RegExp(`${type}:\\[[^\\]]+\\]`))?.[0] || "";
    assert.ok(line, `${type} contract line must exist`);
    for (const field of fields) {
      if (!new RegExp(field).test(line)) missingRuntimeFields.push(`${type}.${field}`);
    }
  }
  assert.deepEqual(missingRuntimeFields, []);
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

  const missingRuntimeRules = [
    ["Rent.short_paid_arrears_due_date", rent, /arrears_due_date/],
    ["ArrearsPayment.remaining_before", arrears, /remaining_arrears_before_payment/],
    ["ArrearsPayment.status_consistency", arrears, /ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH/],
    ["DepositIn.deposit_required_total", depositIn, /deposit_required_total/],
    ["DepositIn.deposit_remaining", depositIn, /deposit_remaining/],
    ["DepositOut.refund_date", depositOut, /refund_date/],
    ["DepositOut.owner_override_ref", depositOut, /owner_override_ref/],
    ["Checkout.left_with_arrears", checkout, /left_with_arrears/],
    ["Checkout.promised_payment_date", checkout, /promised_payment_date/],
    ["Expense.evidence_ref", expense, /evidence_ref/],
    ["Expense.evidence_threshold_100", expense, /100/],
    ["BedTransfer.reject_same_bed", transfer, /fromBed===toBed|from_bed.*to_bed/]
  ].filter(([, block, pattern]) => !pattern.test(block)).map(([name]) => name);

  assert.deepEqual(missingRuntimeRules, []);
});

test("Deposit In contract requires total, paid, and remaining fields without routing to Rent", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositInUploadFields");
  const normalize = functionBlock(worker, "normalizeEntryAnchor");
  const contract = contractBlock(worker);
  const contractLine = contract.match(/D:\[[^\]]+\]/)?.[0] || "";
  const correctionTotals = functionBlock(worker, "ownerCorrectionPreviewSessionTotals");

  for (const field of ["deposit_required_total", "deposit_paid_amount", "deposit_remaining"]) {
    assert.match(validator, new RegExp(field));
    assert.match(normalize, new RegExp(field));
    assert.match(contractLine, new RegExp(field));
  }

  assert.match(validator, /DEPOSIT_IN_REQUIRED_FIELD_MISSING/);
  assert.doesNotMatch(validator, /RENT_REQUIRED_FIELD_MISSING/);
  assert.match(correctionTotals, /type==="deposit_in"\)totals\.deposit_liability\+=/);
  assert.doesNotMatch(correctionTotals, /type==="deposit_in"\)totals\.rent_income/);
});

test("Deposit Out contract preserves balance, override, offset, and refund fields without routing to Rent", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateDepositOutUploadFields");
  const normalize = functionBlock(worker, "normalizeEntryAnchor");
  const contract = contractBlock(worker);
  const contractLine = contract.match(/DR:\[[^\]]+\]/)?.[0] || "";
  const correctionTotals = functionBlock(worker, "ownerCorrectionPreviewSessionTotals");

  for (const field of ["deposit_balance", "refund_amount", "refund_method", "refund_date", "refund_reason", "deposit_remaining_after_refund", "owner_override_ref", "arrears_offset_ref", "arrears_offset_amount"]) {
    assert.match(validator + normalize + contractLine, new RegExp(field));
  }

  assert.match(validator, /DEPOSIT_OUT_REQUIRED_FIELD_MISSING/);
  assert.match(validator, /DEPOSIT_OUT_EXCEEDS_BALANCE/);
  assert.match(validator, /DEPOSIT_OUT_OPEN_ARREARS_REQUIRES_OFFSET_OR_APPROVAL/);
  assert.doesNotMatch(validator, /RENT_REQUIRED_FIELD_MISSING/);
  assert.match(correctionTotals, /type==="deposit_out"\)totals\.deposit_liability-=/);
  assert.doesNotMatch(correctionTotals, /type==="deposit_out"\)totals\.rent_income/);
});

test("Expense contract preserves evidence, category, payment method, and cost-only accounting", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateExpenseUploadFields");
  const normalize = functionBlock(worker, "normalizeEntryAnchor");
  const contract = contractBlock(worker);
  const contractLine = contract.match(/E:\[[^\]]+\]/)?.[0] || "";
  const correctionTotals = functionBlock(worker, "ownerCorrectionPreviewSessionTotals");

  for (const field of ["expense_amount", "expense_category", "reason", "payment_method", "evidence_ref"]) {
    assert.match(validator + normalize + contractLine, new RegExp(field));
  }

  assert.match(validator, /EXPENSE_REQUIRED_FIELD_MISSING/);
  assert.match(validator, /EXPENSE_EVIDENCE_REQUIRED/);
  assert.match(validator, /amount>=100/);
  assert.doesNotMatch(validator, /RENT_REQUIRED_FIELD_MISSING/);
  assert.doesNotMatch(normalize, /linked_tenant_ref/);
  assert.match(correctionTotals, /type==="expense"\)totals\.expense\+=/);
  assert.doesNotMatch(correctionTotals, /type==="expense"\)totals\.rent_income/);
  assert.doesNotMatch(correctionTotals, /type==="expense"\)totals\.arrears_repaid/);
});

test("Bed Transfer contract preserves transfer, carryover, and fee rules without routing to Rent", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateBedTransferUploadFields");
  const normalize = functionBlock(worker, "normalizeEntryAnchor");
  const contract = contractBlock(worker);
  const contractLine = contract.match(/TF:\[[^\]]+\]/)?.[0] || "";
  const correctionTotals = functionBlock(worker, "ownerCorrectionPreviewSessionTotals");

  for (const field of ["from_bed", "to_bed", "transfer_date", "transfer_reason", "deposit_balance_carryover", "arrears_carryover", "rent_coverage_carryover", "fee_status", "fee_amount", "payment_method", "fee_waived_reason"]) {
    assert.match(validator + normalize + contractLine, new RegExp(field));
  }

  assert.match(validator, /BED_TRANSFER_REQUIRED_FIELD_MISSING/);
  assert.match(validator, /BED_TRANSFER_SAME_BED_NOT_ALLOWED/);
  assert.match(validator, /fromBed===toBed/);
  assert.match(validator, /BED_TRANSFER_FEE_FIELD_MISSING/);
  assert.match(validator, /BED_TRANSFER_WAIVER_REASON_REQUIRED/);
  assert.doesNotMatch(validator, /RENT_REQUIRED_FIELD_MISSING/);
  assert.match(correctionTotals, /type==="bed_transfer"\|\|type==="bed_transfer_fee"\)totals\.transfer_fee\+=/);
  assert.doesNotMatch(correctionTotals, /type==="bed_transfer"\)totals\.rent_income/);
});
