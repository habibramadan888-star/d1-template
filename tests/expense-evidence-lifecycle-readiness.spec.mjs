import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  if (end > start) return source.slice(start, end);
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
  assert.fail(`${name} must close`);
}

function constBlock(source, name) {
  const start = source.indexOf(`const ${name}=`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("};", start);
  assert.ok(end > start, `${name} must end`);
  return source.slice(start, end + 2);
}

test("Expense validation requires only room, positive amount, Cash or Bank, and description", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateExpenseUploadFields");

  for (const field of ["target_bed", "expense_amount", "payment_method", "expense_description"]) {
    assert.match(validator, new RegExp(`missing\\.push\\("${field}"\\)`), `${field} must be required`);
  }
  assert.match(validator, /const rawPaymentMethod=cleanText\(entry\.payment_method\|\|entry\.pay_type\|\|""/);
  assert.match(validator, /const rawDescription=cleanText\(entry\.expense_description\|\|entry\.expense_desc\|\|entry\.note/);
  assert.match(validator, /\["cash","bank"\]\.includes\(paymentMethod\)/);
  assert.doesNotMatch(validator, /amount>=100|evidenceRef|EXPENSE_EVIDENCE_REQUIRED/);
  assert.match(validator, /EXPENSE_REQUIRED_FIELD_MISSING/);
  assert.doesNotMatch(validator, /RENT_REQUIRED_FIELD_MISSING/);
});

test("Expense missing description and payment method cannot be hidden by normalization defaults", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateExpenseUploadFields");
  const normalizer = functionBlock(worker, "normalizeEntryAnchor");

  assert.match(normalizer, /payment_method=entryAnchorPaymentMethod/);
  assert.match(normalizer, /const description=anchor\.expense_description\|\|anchor\.expense_desc/);
  assert.match(validator, /rawDescription/);
  assert.match(validator, /rawPaymentMethod/);
  assert.match(validator, /if\(!rawDescription\)missing\.push\("expense_description"\)/);
  assert.match(validator, /if\(!employeeEntryUploadHasValue\(rawPaymentMethod\)\)missing\.push\("payment_method"\)/);
  assert.match(validator, /entry\.expense_desc\|\|entry\.note/);
});

test("Employee Expense UI has exactly the approved four inputs and no evidence control", async () => {
  const html = await readFile(employeePath, "utf8");
  const validate = functionBlock(html, "validateExpenseEntry");
  const builder = functionBlock(html, "buildExpenseAnchor");

  assert.doesNotMatch(html, /id="expenseEvidenceRef"|Evidence Ref/);
  assert.doesNotMatch(validate, /expenseEvidenceRef|evidence_ref/);
  assert.doesNotMatch(builder, /expenseEvidenceRef/);
  assert.match(builder, /reason:note/);
});

test("Expense anchor normalization and ENTRY ANCHORS JSON stay clean", async () => {
  const worker = await readFile(workerPath, "utf8");
  const normalizer = functionBlock(worker, "normalizeEntryAnchor");
  const renderer = functionBlock(worker, "renderEntryAnchorForOwner");
  const exporter = functionBlock(worker, "employeeEntryExportTextWithAnchors");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const expenseAllowed = allowed.match(/E:\[[^\]]+\]/s)?.[0] || "";

  for (const field of ["expense_amount", "expense_category", "target_bed", "reason", "payment_method", "evidence_ref"]) {
    assert.match(normalizer, new RegExp(field), `${field} must be normalized`);
    assert.match(expenseAllowed, new RegExp(field), `${field} must be allowed in Expense`);
  }
  assert.match(renderer, /expense/);
  assert.match(exporter, /ENTRY ANCHORS JSON/);

  for (const forbidden of ["tenant_card_id", "card_id", "old_ttlock_ref", "provider_phone", "phone_99099", "ttlock_metadata"]) {
    assert.doesNotMatch(expenseAllowed, new RegExp(forbidden), `${forbidden} must not be allowed in Expense payload`);
  }
});

test("Expense finance movement is outflow only and not tenant debt", async () => {
  const worker = await readFile(workerPath, "utf8");
  const apply = functionBlock(worker, "canonicalFinanceProjectionApplyAnchor");
  const expenseSlice = apply.slice(apply.indexOf('type==="expense"'), apply.indexOf('type==="bed_transfer"'));
  const candidate = functionBlock(worker, "buildEmployeeEntryOccupancyCandidateEventPreview");

  assert.match(expenseSlice, /canonicalFinanceProjectionAddOutflow/);
  assert.match(expenseSlice, /totals\.expenses\+=amount/);
  assert.doesNotMatch(expenseSlice, /rent_income|deposit_received|arrears_repaid/);
  assert.match(candidate, /candidate_not_applicable/);
});

test("Today Todo does not recreate the removed Expense evidence requirement", async () => {
  const worker = await readFile(workerPath, "utf8");
  const evidence = functionBlock(worker, "ownerTodayTodoBuildExpenseEvidence");
  assert.match(evidence, /return todos/);
  assert.doesNotMatch(evidence, /EXPENSE_EVIDENCE_MISSING|evidence_ref|100/);
});
