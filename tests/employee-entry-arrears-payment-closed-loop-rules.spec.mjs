import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function validateArrearsPaymentFixture(entry) {
  const missing = [];
  const invalid = [];
  const forbiddenIdentityFields = [
    "card_id",
    "tenant_card_id",
    "old_ttlock_ref",
    "provider_phone",
    "phone_99099",
    "ttlock_context",
    "old_ttlock_context"
  ];
  const forbiddenUsed = forbiddenIdentityFields.filter((field) => entry[field]);

  if (!entry.bed) missing.push("bed");
  if (!entry.arrears_ref && !entry.original_arrears_id && !entry.task_id) missing.push("arrears_ref");
  if (!entry.payment_method) missing.push("payment_method");
  if (money(entry.payment_amount) <= 0) missing.push("payment_amount");
  if (entry.remaining_arrears_before_payment === undefined) missing.push("remaining_before");
  if (entry.remaining_arrears_after_payment === undefined) missing.push("remaining_after");
  if (!entry.settlement_status) missing.push("settlement_status");

  if (forbiddenUsed.length) invalid.push(...forbiddenUsed);
  if (entry.task_status && !["open", "partial"].includes(String(entry.task_status).toLowerCase())) invalid.push("arrears_ref");

  const before = money(entry.remaining_arrears_before_payment);
  const payment = money(entry.payment_amount);
  const after = money(entry.remaining_arrears_after_payment);
  const expectedAfter = Math.max(0, before - payment);
  const status = String(entry.settlement_status || "").toLowerCase();

  if (payment > before) invalid.push("payment_amount");
  if (Math.abs(after - expectedAfter) > 0.01) invalid.push("remaining_arrears_after_payment");
  if ((after <= 0.01 && status !== "settled") || (after > 0.01 && !["partial", "open"].includes(status))) {
    invalid.push("settlement_status");
  }

  if (missing.length) {
    return { ok: false, error_code: "ARREARS_PAYMENT_REQUIRED_FIELD_MISSING", missing_fields: missing, invalid_fields: invalid };
  }
  if (invalid.includes("payment_amount")) {
    return { ok: false, error_code: "ARREARS_PAYMENT_EXCEEDS_REMAINING", missing_fields: missing, invalid_fields: invalid };
  }
  if (invalid.includes("arrears_ref")) {
    return { ok: false, error_code: "ARREARS_REF_STALE_REFRESH_REQUIRED", missing_fields: missing, invalid_fields: invalid };
  }
  if (invalid.length) {
    return { ok: false, error_code: "ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH", missing_fields: missing, invalid_fields: invalid };
  }
  return {
    ok: true,
    anchor: {
      event_type: "arrears_payment",
      bed: entry.bed,
      arrears_ref: entry.arrears_ref || entry.original_arrears_id || entry.task_id,
      original_arrears_id: entry.original_arrears_id || entry.arrears_ref || entry.task_id,
      original_arrears_amount: money(entry.original_arrears_amount),
      already_paid_amount: money(entry.already_paid_amount),
      payment_amount: payment,
      remaining_arrears_before_payment: before,
      remaining_arrears_after_payment: after,
      settlement_status: status,
      payment_method: entry.payment_method
    }
  };
}

const base = {
  event_type: "arrears_payment",
  bed: "334",
  arrears_ref: "task-arrears-334",
  original_arrears_id: "task-arrears-334",
  original_arrears_amount: 80,
  already_paid_amount: 0,
  payment_method: "cash",
  task_status: "open"
};

test("full repayment fixture creates settled Arrears Payment anchor", () => {
  const result = validateArrearsPaymentFixture({
    ...base,
    payment_amount: 80,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    settlement_status: "settled"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.anchor).sort(), [
    "already_paid_amount",
    "arrears_ref",
    "bed",
    "event_type",
    "original_arrears_amount",
    "original_arrears_id",
    "payment_amount",
    "payment_method",
    "remaining_arrears_after_payment",
    "remaining_arrears_before_payment",
    "settlement_status"
  ].sort());
  assert.equal(result.anchor.remaining_arrears_after_payment, 0);
  assert.equal(result.anchor.settlement_status, "settled");
});

test("partial repayment fixture leaves arrears open", () => {
  const result = validateArrearsPaymentFixture({
    ...base,
    original_arrears_amount: 200,
    payment_amount: 50,
    remaining_arrears_before_payment: 200,
    remaining_arrears_after_payment: 150,
    settlement_status: "partial"
  });

  assert.equal(result.ok, true);
  assert.equal(result.anchor.remaining_arrears_after_payment, 150);
  assert.match(result.anchor.settlement_status, /partial|open/);
});

test("overpayment fixture is rejected by default", () => {
  const result = validateArrearsPaymentFixture({
    ...base,
    payment_amount: 100,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    settlement_status: "settled"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "ARREARS_PAYMENT_EXCEEDS_REMAINING");
  assert.ok(result.invalid_fields.includes("payment_amount"));
});

test("missing arrears_ref fixture is rejected", () => {
  const result = validateArrearsPaymentFixture({
    ...base,
    arrears_ref: "",
    original_arrears_id: "",
    task_id: "",
    payment_amount: 80,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    settlement_status: "settled"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "ARREARS_PAYMENT_REQUIRED_FIELD_MISSING");
  assert.ok(result.missing_fields.includes("arrears_ref"));
});

test("bed-only repayment fixture is rejected", () => {
  const result = validateArrearsPaymentFixture({
    event_type: "arrears_payment",
    bed: "334",
    payment_method: "cash",
    payment_amount: 80,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    settlement_status: "settled"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error_code, "ARREARS_PAYMENT_REQUIRED_FIELD_MISSING");
  assert.ok(result.missing_fields.includes("arrears_ref"));
});

test("already settled or void arrears fixture is rejected", () => {
  for (const task_status of ["settled", "closed", "void"]) {
    const result = validateArrearsPaymentFixture({
      ...base,
      task_status,
      payment_amount: 80,
      remaining_arrears_before_payment: 80,
      remaining_arrears_after_payment: 0,
      settlement_status: "settled"
    });

    assert.equal(result.ok, false);
    assert.equal(result.error_code, "ARREARS_REF_STALE_REFRESH_REQUIRED");
    assert.ok(result.invalid_fields.includes("arrears_ref"));
  }
});

test("inconsistent remaining and settlement status fixture is rejected", () => {
  for (const entry of [
    { remaining_arrears_after_payment: 0, settlement_status: "partial" },
    { remaining_arrears_after_payment: 150, settlement_status: "settled" }
  ]) {
    const result = validateArrearsPaymentFixture({
      ...base,
      original_arrears_amount: 200,
      payment_amount: entry.remaining_arrears_after_payment === 0 ? 200 : 50,
      remaining_arrears_before_payment: 200,
      ...entry
    });

    assert.equal(result.ok, false);
    assert.equal(result.error_code, "ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH");
    assert.ok(result.invalid_fields.includes("settlement_status"));
  }
});

test("forbidden identity fields are rejected for Arrears Payment matching", () => {
  const result = validateArrearsPaymentFixture({
    ...base,
    payment_amount: 80,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    settlement_status: "settled",
    card_id: "card-334",
    tenant_card_id: "tenant-card-334",
    old_ttlock_ref: "lock-334",
    provider_phone: "+971525199099",
    phone_99099: "+9715011199099",
    ttlock_context: "lock-334",
    old_ttlock_context: "lock-334"
  });

  assert.equal(result.ok, false);
  for (const field of ["card_id", "tenant_card_id", "old_ttlock_ref", "provider_phone", "phone_99099", "ttlock_context", "old_ttlock_context"]) {
    assert.ok(result.invalid_fields.includes(field));
  }
});

test("runtime Arrears Payment validator and anchor contract expose the closed-loop fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validationStart = worker.indexOf("function validateArrearsPaymentUploadFields");
  const validationEnd = worker.indexOf("__name(validateArrearsPaymentUploadFields", validationStart);
  const validationBlock = worker.slice(validationStart, validationEnd);

  assert.match(validationBlock, /missing\.push\("arrears_ref"\)/);
  assert.match(validationBlock, /remaining_arrears_before_payment/);
  assert.match(validationBlock, /remaining_arrears_after_payment/);
  assert.match(validationBlock, /settlement_status/);
  assert.match(validationBlock, /ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH/);

  const refValidationStart = worker.indexOf('}else if(type==="AP"){');
  const refValidationEnd = worker.indexOf('if(["R","TF","TFF"].includes(type))', refValidationStart);
  const refValidationBlock = worker.slice(refValidationStart, refValidationEnd);

  assert.match(refValidationBlock, /LINKED_TASK_REQUIRED/);
  assert.match(refValidationBlock, /empFindProjectionArrearsForPayment\(env,user,taskId,room\)/);
  assert.match(refValidationBlock, /ARREARS_REF_STALE_REFRESH_REQUIRED/);
  assert.match(refValidationBlock, /ARREAR_PAYMENT_AMOUNT_INVALID/);
  assert.match(refValidationBlock, /amount>remain\+0\.01/);

  const contractStart = worker.indexOf("const entryAnchorContract=");
  const contractEnd = worker.indexOf("};", contractStart);
  const contractBlock = worker.slice(contractStart, contractEnd);
  const contractLine = contractBlock.match(/AP:\[[^\]]+\]/)?.[0] || "";
  for (const field of [
    "arrears_ref",
    "original_arrears_amount",
    "already_paid_amount",
    "payment_amount",
    "remaining_arrears_before_payment",
    "remaining_arrears_after_payment",
    "settlement_status"
  ]) {
    assert.match(contractLine, new RegExp(field));
  }
});

test("runtime dry-run dispatch reads AP rows from session/top-level entries instead of defaulting to rent", async () => {
  const worker = await readFile(workerPath, "utf8");
  const entrySelectorStart = worker.indexOf("function employeeEntryValidationEntryFromBody");
  const entrySelectorEnd = worker.indexOf("__name(employeeEntryValidationEntryFromBody", entrySelectorStart);
  const entrySelectorBlock = worker.slice(entrySelectorStart, entrySelectorEnd);
  const validateStart = worker.indexOf("async function validateEmployeeEntryUploadPayload");
  const validateEnd = worker.indexOf("__name(validateEmployeeEntryUploadPayload", validateStart);
  const validateBlock = worker.slice(validateStart, validateEnd);
  const duplicateStart = worker.indexOf("function employeeEntryDuplicateIncomingRows");
  const duplicateEnd = worker.indexOf("__name(employeeEntryDuplicateIncomingRows", duplicateStart);
  const duplicateBlock = worker.slice(duplicateStart, duplicateEnd);
  const typeStart = worker.indexOf("function employeeEntryUploadType");
  const typeEnd = worker.indexOf("__name(employeeEntryUploadType", typeStart);
  const typeBlock = worker.slice(typeStart, typeEnd);

  assert.match(entrySelectorBlock, /body\?\.session\?\.entries/);
  assert.match(entrySelectorBlock, /body\?\.entries/);
  assert.match(entrySelectorBlock, /return entries\[index\]\|\|entries\[0\]\|\|\{\}/);
  assert.match(duplicateBlock, /Array\.isArray\(body\?\.entries\)&&body\.entries\.length\?body\.entries/);
  assert.match(validateBlock, /const entry=employeeEntryValidationEntryFromBody\(body,eventIndex\)/);
  assert.match(validateBlock, /const rawSessionEntries=Array\.isArray\(session\.entries\)\?session\.entries:\(Array\.isArray\(body\?\.entries\)\?body\.entries:\[\]\)/);
  assert.match(typeBlock, /if\(cleanId\(entry\.arrears_ref\|\|entry\.linked_task_id\|\|entry\.original_arrears_id\)\)return "AP"/);
  assert.match(typeBlock, /arrears_payment:"AP"/);
});

test("runtime AP validator accepts zero remaining_after and rejects forbidden identity fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validationStart = worker.indexOf("function validateArrearsPaymentUploadFields");
  const validationEnd = worker.indexOf("__name(validateArrearsPaymentUploadFields", validationStart);
  const validationBlock = worker.slice(validationStart, validationEnd);

  assert.match(validationBlock, /const remainingAfterValue=normalized\.remaining_arrears_after_payment \?\? entry\.remaining_arrears_after_payment \?\? normalized\.remaining_arrears \?\? entry\.remaining_arrears/);
  assert.match(validationBlock, /employeeEntryUploadHasValue\(remainingAfterValue\)/);
  assert.doesNotMatch(validationBlock, /normalized\.remaining_arrears_after_payment\|\|entry\.remaining_arrears_after_payment/);
  assert.match(validationBlock, /ARREARS_PAYMENT_FORBIDDEN_IDENTITY_FIELD/);
  for (const field of ["card_id", "tenant_card_id", "old_ttlock_ref", "provider_phone", "phone_99099", "ttlock_context", "old_ttlock_context"]) {
    assert.match(validationBlock, new RegExp(field));
  }
});

test("employee AP upload sanitizer strips provider identity fields from canonical payloads", async () => {
  const html = await readFile(employeePath, "utf8");
  const sanitizerStart = html.indexOf("const EMPLOYEE_AP_FORBIDDEN_IDENTITY_FIELDS=");
  const sanitizerEnd = html.indexOf("function employeeValidateCommonAmount", sanitizerStart);
  const sanitizerBlock = html.slice(sanitizerStart, sanitizerEnd);
  const applyStart = html.indexOf("function applyEntryAnchors");
  const applyEnd = html.indexOf("function normalizeEntryAnchor", applyStart);
  const applyBlock = html.slice(applyStart, applyEnd);

  assert.match(sanitizerBlock, /EMPLOYEE_AP_FORBIDDEN_IDENTITY_FIELDS/);
  assert.match(sanitizerBlock, /delete entry\[field\]/);
  assert.match(sanitizerBlock, /type==='AP'/);
  assert.match(sanitizerBlock, /eventType==='arrears_payment'/);
  assert.match(sanitizerBlock, /entry\.arrears_ref\|\|entry\.linked_task_id\|\|entry\.original_arrears_id/);
  for (const field of ["card_id", "tenant_card_id", "old_ttlock_ref", "provider_phone", "phone_99099"]) {
    assert.match(sanitizerBlock, new RegExp(field));
  }
  assert.match(applyBlock, /employeeSanitizeArrearsPaymentEntry\(e\)/);
});

test("frontend AP builder uses selected arrears ref without spreading selected task context", async () => {
  const html = await readFile(employeePath, "utf8");
  const builderStart = html.indexOf("function buildArrearsPaymentAnchor");
  const builderEnd = html.indexOf("function buildDepositInAnchor", builderStart);
  const builderBlock = html.slice(builderStart, builderEnd);
  const taskInfoStart = html.indexOf("function renderTaskInfo");
  const taskInfoEnd = html.indexOf("function applyLinkedTask", taskInfoStart);
  const taskInfoBlock = html.slice(taskInfoStart, taskInfoEnd);

  assert.match(builderBlock, /const ref=employeeFieldValue\('linkedTaskId'\)/);
  assert.match(builderBlock, /linked_task_id:ref/);
  assert.match(builderBlock, /arrears_ref:ref/);
  assert.match(builderBlock, /original_arrears_id:ref/);
  assert.doesNotMatch(builderBlock, /\.\.\.task/);
  assert.doesNotMatch(taskInfoBlock, /tenant_card_id|old_ttlock_ref|provider_phone|phone_99099/);
});

test("Worker normalized AP anchor removes forbidden identity fields from ENTRY ANCHORS JSON", async () => {
  const worker = await readFile(workerPath, "utf8");
  const normalizeStart = worker.indexOf("function normalizeEntryAnchor");
  const normalizeEnd = worker.indexOf("__name(normalizeEntryAnchor", normalizeStart);
  const normalizeBlock = worker.slice(normalizeStart, normalizeEnd);

  assert.match(normalizeBlock, /type==="AP"/);
  assert.match(normalizeBlock, /\.forEach\(field=>delete anchor\[field\]\)/);
  for (const field of ["card_id", "tenant_card_id", "old_ttlock_ref", "provider_phone", "phone_99099"]) {
    assert.match(normalizeBlock, new RegExp(field));
  }
});
