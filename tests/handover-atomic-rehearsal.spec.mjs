import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildHandoverCommitDraft,
  compareHandoverFrontendTotals,
  computeHandoverBackendTotals,
  detectDuplicateHandoverSubmission,
  formatHandoverCommitResult,
  generateIdempotencyFingerprint,
  normalizeHandoverRows,
  planHandoverAuditEvents,
  planHandoverEntryEvents,
  rejectVoidedRows,
  validateHandoverCommitRequest
} from "../modules/finance/handover-atomic.mjs";
import { filsToAedString, parseAedToFils } from "../modules/finance/money.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(testDir, "fixtures", "handover-atomic");

async function loadFixture(name) {
  const text = await readFile(path.join(fixtureDir, `${name}.json`), "utf8");
  return JSON.parse(text);
}

async function buildDraft(name) {
  const fixture = await loadFixture(name);
  const context = buildContext(fixture);
  return { fixture, draft: buildHandoverCommitDraft(fixture.input, context) };
}

function buildContext(fixture) {
  const context = { ...(fixture.context || {}) };
  const mode = fixture.existing_state?.mode;
  if (mode === "same_idempotency_key") {
    context.existingCommits = [
      {
        commit_id: "prior-commit",
        idempotencyKey: fixture.input.idempotency_key,
        fingerprint: generateIdempotencyFingerprint(fixture.input)
      }
    ];
  } else if (mode === "same_fingerprint_different_key") {
    context.existingCommits = [
      {
        commit_id: "prior-commit",
        idempotencyKey: "different-prior-key",
        fingerprint: generateIdempotencyFingerprint(fixture.input)
      }
    ];
  } else {
    context.existingCommits = fixture.existing_state?.commits || [];
  }
  return context;
}

function codes(items) {
  return (items || []).map((item) => item.code);
}

function assertExpected(draft, expected) {
  assert.equal(draft.status, expected.status);
  if (expected.idempotency_status) {
    assert.equal(draft.idempotency.status, expected.idempotency_status);
  }
  if (expected.accepted_rows !== undefined)
    assert.equal(draft.acceptedRows.length, expected.accepted_rows);
  if (expected.rejected_rows !== undefined)
    assert.equal(draft.rejectedRows.length, expected.rejected_rows);
  if (expected.cash_handover)
    assert.equal(draft.backendTotals.cashHandoverAed, expected.cash_handover);
  if (expected.bank_transfer_total) {
    assert.equal(draft.backendTotals.bankTransferTotalAed, expected.bank_transfer_total);
  }
  if (expected.gross_received)
    assert.equal(draft.backendTotals.grossReceivedAed, expected.gross_received);
  if (expected.session_total)
    assert.equal(draft.backendTotals.sessionTotalAed, expected.session_total);
  if (expected.deposit_received) {
    assert.equal(draft.backendTotals.depositReceivedAed, expected.deposit_received);
  }
  if (expected.rent_received)
    assert.equal(draft.backendTotals.rentReceivedAed, expected.rent_received);
  if (expected.arrears_paid)
    assert.equal(draft.backendTotals.arrearsPaidAed, expected.arrears_paid);
  if (expected.bank_transfer_count !== undefined) {
    assert.equal(draft.backendTotals.bankTransferCount, expected.bank_transfer_count);
  }
  if (expected.min_warnings !== undefined)
    assert.ok(draft.warnings.length >= expected.min_warnings);
  if (expected.errors !== undefined) assert.equal(draft.errors.length, expected.errors);
  if (expected.warning_code) assert.ok(codes(draft.warnings).includes(expected.warning_code));
  if (expected.error_code) assert.ok(codes(draft.errors).includes(expected.error_code));
  if (expected.error_code_absent)
    assert.equal(codes(draft.errors).includes(expected.error_code_absent), false);
  if (expected.audit_events) {
    assert.deepEqual(
      draft.auditEventsPlan.map((event) => event.event_type),
      expected.audit_events
    );
  }
}

test("handover atomic fixtures cover required scenarios", async () => {
  const files = (await readdir(fixtureDir)).filter((name) => name.endsWith(".json")).sort();
  assert.deepEqual(
    files,
    [
      "arrears-payment.json",
      "deposit-and-rent.json",
      "duplicate-different-idempotency-key.json",
      "duplicate-same-idempotency-key.json",
      "empty-amount.json",
      "frontend-total-tampered.json",
      "invalid-money-3dp.json",
      "legacy-decimal-warning.json",
      "mixed-cash-bank.json",
      "multi-row-large-handover.json",
      "owner-submitter-invalid.json",
      "partial-upload-simulation.json",
      "unauthorized-employee-scope.json",
      "valid-bank-only.json",
      "valid-cash-only.json",
      "voided-session-row.json",
      "voided-transaction-row.json",
      "weak-network-retry.json"
    ].sort()
  );
});

test("valid cash-only handover creates accepted commit draft", async () => {
  const { fixture, draft } = await buildDraft("valid-cash-only");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.commitAccepted, true);
});

test("valid bank-only handover creates accepted commit draft", async () => {
  const { fixture, draft } = await buildDraft("valid-bank-only");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.commitAccepted, true);
});

test("mixed cash and bank handover totals are recomputed backend-side", async () => {
  const { fixture, draft } = await buildDraft("mixed-cash-bank");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.discrepancy.matches, true);
});

test("deposit and rent are separated in accepted rows", async () => {
  const { fixture, draft } = await buildDraft("deposit-and-rent");
  assertExpected(draft, fixture.expected);
});

test("arrears payment is classified separately", async () => {
  const { fixture, draft } = await buildDraft("arrears-payment");
  assertExpected(draft, fixture.expected);
});

test("frontend total tamper produces structured discrepancy", async () => {
  const { fixture, draft } = await buildDraft("frontend-total-tampered");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.commitAccepted, false);
  assert.equal(draft.discrepancy.matches, false);
});

test("same idempotency key replay is idempotent", async () => {
  const { fixture, draft } = await buildDraft("duplicate-same-idempotency-key");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.writePlanAllowed, false);
});

test("same rows with different idempotency key produces duplicate warning", async () => {
  const { fixture, draft } = await buildDraft("duplicate-different-idempotency-key");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.writePlanAllowed, false);
});

test("weak network retry does not create duplicate financial result", async () => {
  const { fixture, draft } = await buildDraft("weak-network-retry");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.idempotency.replay, true);
});

test("partial upload simulation is rejected before commit", async () => {
  const { fixture, draft } = await buildDraft("partial-upload-simulation");
  assertExpected(draft, fixture.expected);
  assert.equal(draft.commitAccepted, false);
});

test("voided session row is rejected", async () => {
  const { fixture, draft } = await buildDraft("voided-session-row");
  assertExpected(draft, fixture.expected);
});

test("voided transaction row is rejected", async () => {
  const { fixture, draft } = await buildDraft("voided-transaction-row");
  assertExpected(draft, fixture.expected);
});

test("three-decimal money is rejected", async () => {
  const { fixture, draft } = await buildDraft("invalid-money-3dp");
  assertExpected(draft, fixture.expected);
});

test("empty amount is rejected", async () => {
  const { fixture, draft } = await buildDraft("empty-amount");
  assertExpected(draft, fixture.expected);
});

test("unauthorized employee scope is rejected", async () => {
  const { fixture, draft } = await buildDraft("unauthorized-employee-scope");
  assertExpected(draft, fixture.expected);
});

test("owner submitter is rejected for employee handover", async () => {
  const { fixture, draft } = await buildDraft("owner-submitter-invalid");
  assertExpected(draft, fixture.expected);
});

test("large multi-row handover totals are correct", async () => {
  const { fixture, draft } = await buildDraft("multi-row-large-handover");
  assertExpected(draft, fixture.expected);
});

test("legacy decimal warning is preserved", async () => {
  const { fixture, draft } = await buildDraft("legacy-decimal-warning");
  assertExpected(draft, fixture.expected);
});

test("audit event plan includes attempt and accepted/rejected outcome", async () => {
  const accepted = (await buildDraft("valid-cash-only")).draft;
  const rejected = (await buildDraft("invalid-money-3dp")).draft;

  assert.deepEqual(
    planHandoverAuditEvents(accepted).map((event) => event.event_type),
    ["handover_commit_attempt", "handover_commit_accepted"]
  );
  assert.deepEqual(
    planHandoverAuditEvents(rejected).map((event) => event.event_type),
    ["handover_commit_attempt", "handover_commit_rejected"]
  );
});

test("entry event plan covers accepted and rejected rows", async () => {
  const accepted = (await buildDraft("valid-cash-only")).draft;
  const rejected = (await buildDraft("voided-session-row")).draft;

  assert.equal(planHandoverEntryEvents(accepted).length, 1);
  assert.equal(planHandoverEntryEvents(rejected).length, 1);
  assert.equal(planHandoverEntryEvents(rejected)[0].event_type, "handover_entry_rejected");
});

test("helper functions expose validation, normalization, duplicate detection, and formatting", async () => {
  const fixture = await loadFixture("valid-cash-only");
  const validation = validateHandoverCommitRequest(fixture.input, fixture.context);
  const normalized = normalizeHandoverRows(fixture.input.rows);
  const rejected = rejectVoidedRows((await loadFixture("voided-session-row")).input.rows);
  const backend = computeHandoverBackendTotals(normalized.map((item) => item.normalized));
  const comparison = compareHandoverFrontendTotals(fixture.input.frontend_totals, backend);
  const fingerprint = generateIdempotencyFingerprint(fixture.input);
  const duplicate = detectDuplicateHandoverSubmission(
    [{ idempotencyKey: fixture.input.idempotency_key, fingerprint }],
    {
      idempotencyKey: fixture.input.idempotency_key,
      fingerprint,
      input: fixture.input
    }
  );
  const result = formatHandoverCommitResult(
    buildHandoverCommitDraft(fixture.input, fixture.context)
  );

  assert.equal(validation.ok, true);
  assert.equal(normalized[0].ok, true);
  assert.equal(rejected.rejectedRows.length, 1);
  assert.equal(comparison.matches, true);
  assert.equal(typeof fingerprint, "string");
  assert.equal(duplicate.status, "IDEMPOTENT_REPLAY");
  assert.equal(result.status, "ACCEPTED");
});

test("handover module is non-invasive and does not require database writes", async () => {
  const fixture = await loadFixture("valid-cash-only");
  const before = JSON.stringify(fixture.input);
  const draft = buildHandoverCommitDraft(fixture.input, fixture.context);
  const after = JSON.stringify(fixture.input);

  assert.equal(before, after);
  assert.equal(draft.writePlanAllowed, true);
  assert.equal(draft.auditEventsPlan.length, 2);
});

test("integer fils math remains authoritative for handover totals", async () => {
  const draft = (await buildDraft("multi-row-large-handover")).draft;
  const expected = parseAedToFils("1010.00");

  assert.equal(draft.backendTotals.sessionTotalFils, expected);
  assert.equal(filsToAedString(draft.backendTotals.sessionTotalFils), "1010.00");
});
