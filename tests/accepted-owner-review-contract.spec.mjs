import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CANONICAL_EMPLOYEE_EVENT_TYPES,
  CANONICAL_RESULTS,
  createAcceptedOwnerReviewFingerprint,
  deriveAcceptedOwnerReviewCanonicalResult,
  EFFECTIVE_ORIGINS,
  findForbiddenIdentityFields,
  INTAKE_STATUSES,
  isBusinessEffectActive,
  isDirectBusinessEffectActive,
  isOwnerReviewBusinessEffectActive,
  isOwnerReviewMaterializationEligible,
  LIFECYCLE_STATUSES,
  MATERIALIZATION_LEDGER_STATES,
  REVIEW_STATUSES,
  validateAcceptedOwnerReviewEnvelope,
} from "../modules/employees/accepted-owner-review-contract.mjs";

const moduleUrl =
  new URL("../modules/employees/accepted-owner-review-contract.mjs", import.meta.url);

function envelope(overrides = {}) {
  return {
    company_scope: "homelink",
    authenticated_employee: {
      userid: "employee-1",
      role: "STAFF",
      corpid: "homelink",
    },
    session_id: "session-1",
    entry_id: "entry-1",
    event_type: "expense",
    submitted_at: "2026-07-28T08:00:00.000Z",
    anomaly_observed_at: "2026-07-28T08:00:01.000Z",
    raw_employee_input: {
      amount_aed: "50.00",
      context_state: "UNKNOWN",
    },
    employee_explanation: "The read-only context was unavailable.",
    system_evidence: {
      context_state: "UNKNOWN",
      attempts: [{ result: "UNKNOWN" }],
    },
    system_error_codes: ["ARREARS_LOOKUP_UNAVAILABLE"],
    anomaly_codes: ["ARREARS_UNKNOWN"],
    review_status: "PENDING_OWNER_REVIEW",
    ...overrides,
  };
}

function reviewRecord(overrides = {}) {
  return {
    intake_status: "ACCEPTED",
    review_status: "APPROVED",
    effective_origin: "OWNER_REVIEW_MATERIALIZATION",
    lifecycle_status: "ACTIVE",
    terminal_decision: "APPROVE",
    materialization_ledger_state: "NOT_APPLIED",
    event_type: "expense",
    strict_validator_attestation: {
      passed: true,
      event_type: "expense",
      payload_fingerprint: "payload-1",
      validated_at: "2026-07-28T08:10:00.000Z",
    },
    canonical_status: "CALLER_CANNOT_OVERRIDE",
    ...overrides,
  };
}

test("exports exact seven-event allowlist and four independent status axes", () => {
  assert.deepEqual(CANONICAL_EMPLOYEE_EVENT_TYPES, [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "expense",
    "bed_transfer",
  ]);
  assert.equal(CANONICAL_EMPLOYEE_EVENT_TYPES.includes("left_with_arrears"), false);
  assert.deepEqual(INTAKE_STATUSES, ["ACCEPTED", "REJECTED_SECURITY"]);
  assert.deepEqual(REVIEW_STATUSES, [
    "NOT_REQUIRED",
    "PENDING_OWNER_REVIEW",
    "APPROVED",
    "CORRECT_APPROVED",
    "REJECTED",
  ]);
  assert.deepEqual(EFFECTIVE_ORIGINS, [
    "NONE",
    "STRICT_DIRECT_ACCEPT",
    "OWNER_REVIEW_MATERIALIZATION",
  ]);
  assert.deepEqual(LIFECYCLE_STATUSES, ["ACTIVE", "VOIDED", "REVERSED"]);
  assert.deepEqual(MATERIALIZATION_LEDGER_STATES, [
    "NOT_REQUIRED",
    "NOT_APPLIED",
    "APPLIED",
  ]);
  assert.equal(CANONICAL_RESULTS.includes("ACCEPTED_OWNER_REVIEW"), true);
});

test("valid envelope preserves UNKNOWN and separates immutable evidence domains", () => {
  const input = envelope();
  const result = validateAcceptedOwnerReviewEnvelope(input);
  assert.equal(result.ok, true);
  assert.equal(result.value.raw_employee_input.context_state, "UNKNOWN");
  assert.equal(result.value.system_evidence.context_state, "UNKNOWN");
  assert.notStrictEqual(result.value.raw_employee_input, input.raw_employee_input);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.system_evidence.attempts[0]), true);
  input.raw_employee_input.context_state = "CHANGED";
  assert.equal(result.value.raw_employee_input.context_state, "UNKNOWN");
});

test("recursively rejects forbidden identity without echoing sensitive values", () => {
  const forbidden = findForbiddenIdentityFields({
    nested: [{ provider_phone: "+971-secret-number" }],
    deeper: { auth: { authorization: "Bearer secret-token" } },
  });
  assert.deepEqual(forbidden, [
    "$.deeper.auth.authorization",
    "$.nested[0].provider_phone",
  ]);
  const result = validateAcceptedOwnerReviewEnvelope(envelope({
    raw_employee_input: {
      nested: { tenant_card_id: "sensitive-card-value" },
    },
  }));
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((error) => error.code === "FORBIDDEN_IDENTITY_FIELD"),
    true,
  );
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("sensitive-card-value"), false);
});

test("fails closed for circular, non-plain, over-deep, oversized and illegal JSON", () => {
  const circular = {};
  circular.self = circular;
  const cases = [
    [circular, "JSON_CIRCULAR_REFERENCE"],
    [new Date("2026-07-28"), "JSON_NON_PLAIN_OBJECT"],
    [{ amount: Number.NaN }, "JSON_NON_FINITE_NUMBER"],
    [{ value: "x".repeat(8_193) }, "JSON_STRING_LIMIT_EXCEEDED"],
  ];
  let deep = {};
  let cursor = deep;
  for (let index = 0; index < 12; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }
  cases.push([deep, "JSON_DEPTH_LIMIT_EXCEEDED"]);

  for (const [raw, expected] of cases) {
    const result = validateAcceptedOwnerReviewEnvelope(envelope({
      raw_employee_input: raw,
    }));
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === expected), true);
  }
});

test("fingerprint uses injected synchronous deterministic hash and not evidence", () => {
  const calls = [];
  const hashPort = (value) => {
    calls.push(value);
    let total = 0;
    for (const character of value) total = (total + character.codePointAt(0)) % 65536;
    return total.toString(16).padStart(64, "0");
  };
  const first = createAcceptedOwnerReviewFingerprint(envelope(), hashPort);
  const second = createAcceptedOwnerReviewFingerprint(envelope({
    system_evidence: { different: "UNKNOWN" },
    submitted_at: "2026-07-29T08:00:00.000Z",
  }), hashPort);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(calls.length, 4);
  assert.equal(calls[0], calls[1]);
  assert.equal(first.canonical.includes("system_evidence"), false);
  assert.throws(
    () => createAcceptedOwnerReviewFingerprint(envelope(), () => Math.random().toString(16)),
    /HASH_PORT_MUST_BE_SYNCHRONOUS_DETERMINISTIC_HEX/,
  );
});

test("canonical result is derived from axes and ignores caller canonical status", () => {
  assert.equal(
    deriveAcceptedOwnerReviewCanonicalResult(reviewRecord()),
    "ACCEPTED_EFFECTIVE",
  );
  assert.equal(
    deriveAcceptedOwnerReviewCanonicalResult(reviewRecord({
      review_status: "CORRECT_APPROVED",
      terminal_decision: "CORRECT_APPROVE",
    })),
    "CORRECTED_EFFECTIVE",
  );
  assert.equal(
    deriveAcceptedOwnerReviewCanonicalResult(reviewRecord({
      intake_status: "REJECTED_SECURITY",
    })),
    "REJECTED_SECURITY",
  );
  assert.equal(
    deriveAcceptedOwnerReviewCanonicalResult(reviewRecord({
      lifecycle_status: "VOIDED",
    })),
    "VOIDED",
  );
});

test("effect firewall splits direct active, review eligibility and review active", () => {
  const direct = {
    intake_status: "ACCEPTED",
    review_status: "NOT_REQUIRED",
    effective_origin: "STRICT_DIRECT_ACCEPT",
    lifecycle_status: "ACTIVE",
    terminal_decision: "",
    materialization_ledger_state: "NOT_REQUIRED",
  };
  const notApplied = reviewRecord();
  const applied = reviewRecord({ materialization_ledger_state: "APPLIED" });
  const pending = reviewRecord({
    review_status: "PENDING_OWNER_REVIEW",
    effective_origin: "NONE",
    terminal_decision: "",
    materialization_ledger_state: null,
  });

  assert.equal(isDirectBusinessEffectActive(direct), true);
  assert.equal(isBusinessEffectActive(direct), true);
  assert.equal(isOwnerReviewMaterializationEligible(notApplied), true);
  assert.equal(isOwnerReviewBusinessEffectActive(notApplied), false);
  assert.equal(isBusinessEffectActive(notApplied), false);
  assert.equal(isOwnerReviewMaterializationEligible(applied), false);
  assert.equal(isOwnerReviewBusinessEffectActive(applied), true);
  assert.equal(isBusinessEffectActive(applied), true);
  assert.equal(isBusinessEffectActive(pending), false);
  assert.equal(isOwnerReviewMaterializationEligible(reviewRecord({
    strict_validator_attestation: null,
  })), false);
  assert.equal(isBusinessEffectActive({
    ...applied,
    lifecycle_status: "VOIDED",
  }), false);
  assert.equal(isBusinessEffectActive({
    ...applied,
    lifecycle_status: "REVERSED",
  }), false);
});

test("review attestation must match the event being materialized", () => {
  assert.equal(isOwnerReviewMaterializationEligible(reviewRecord({
    strict_validator_attestation: {
      passed: true,
      event_type: "rent",
      payload_fingerprint: "payload-1",
      validated_at: "2026-07-28T08:10:00.000Z",
    },
  })), false);
});

test("contract source has no crypto, database, Worker, network or environment dependency", async () => {
  const source = await readFile(moduleUrl, "utf8");
  assert.doesNotMatch(source, /node:crypto|cloudflare|wrangler|fetch\s*\(|process\.env|D1Database|KVNamespace/);
});
