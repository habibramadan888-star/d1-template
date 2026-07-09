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

test("Expense validation enforces evidence threshold and required fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validator = functionBlock(worker, "validateExpenseUploadFields");

  for (const field of ["expense_amount", "expense_category", "payment_method", "reason"]) {
    assert.match(validator, new RegExp(`missing\\.push\\("${field}"\\)`), `${field} must be required`);
  }
  assert.match(validator, /amount>=100/);
  assert.match(validator, /evidenceRef/);
  assert.match(validator, /EXPENSE_EVIDENCE_REQUIRED/);
  assert.match(validator, /EXPENSE_REQUIRED_FIELD_MISSING/);
  assert.doesNotMatch(validator, /RENT_REQUIRED_FIELD_MISSING/);
});

test("Employee Expense UI captures evidence_ref and requires it at 100 AED or more", async () => {
  const html = await readFile(employeePath, "utf8");
  const validate = functionBlock(html, "validateExpenseEntry");
  const builder = functionBlock(html, "buildExpenseAnchor");

  assert.match(html, /id="expenseEvidenceRef"/);
  assert.match(validate, /amount'\)\)>=100/);
  assert.match(validate, /expenseEvidenceRef/);
  assert.match(validate, /Evidence Ref is required for expenses of 100 AED or more/);
  assert.match(builder, /evidence_ref:employeeTrimField\('expenseEvidenceRef'\)/);
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

test("Today Todo surfaces canonical Expense evidence gaps without becoming source of truth", async () => {
  const worker = await readFile(workerPath, "utf8");
  const archive = functionBlock(worker, "ownerTodayTodoArchiveContextFromSessions");
  const evidence = functionBlock(worker, "ownerTodayTodoBuildExpenseEvidence");
  const gateway = functionBlock(worker, "buildOwnerTodayTodoGateway");

  assert.match(archive, /expense_events/);
  assert.match(archive, /canonical_event_archive_expense/);
  assert.match(evidence, /EXPENSE_EVIDENCE_MISSING/);
  assert.match(evidence, /entryAnchorMoney\(event\.amount\)<100/);
  assert.match(evidence, /canonical_event_archive \+ canonical_finance_projection_gateway/);
  assert.match(evidence, /ownerTodayTodoSourceProof/);
  assert.match(gateway, /ownerTodayTodoBuildExpenseEvidence/);
  assert.match(gateway, /readonly:true/);
  assert.match(gateway, /no_write:true/);
});
