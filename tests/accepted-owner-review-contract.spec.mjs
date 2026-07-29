import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CANONICAL_EMPLOYEE_EVENT_TYPES,
  CANONICAL_RESULTS,
  createAcceptedOwnerReviewCandidateFingerprint,
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
  validateAcceptedOwnerReviewRecordConsistency,
  validateBoundStrictValidatorAttestation,
  validateAcceptedOwnerReviewEnvelope,
} from "../modules/employees/accepted-owner-review-contract.mjs";

const moduleUrl =
  new URL("../modules/employees/accepted-owner-review-contract.mjs", import.meta.url);
const hashPort = (value) =>
  createHash("sha256").update(value).digest("hex");

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
  const payload = overrides.candidate_payload ?? { amount_aed: "50.00" };
  const candidateFingerprint = createAcceptedOwnerReviewCandidateFingerprint({
    event_type: "expense",
    payload,
  }, hashPort).fingerprint;
  return {
    intake_status: "ACCEPTED",
    review_status: "APPROVED",
    effective_origin: "OWNER_REVIEW_MATERIALIZATION",
    lifecycle_status: "ACTIVE",
    terminal_decision: "APPROVE",
    materialization_ledger_state: "NOT_APPLIED",
    event_type: "expense",
    strict_validator_attestation: {
      result: "PASS",
      event_type: "expense",
      candidate_fingerprint: candidateFingerprint,
      validator_contract_id: "employee-seven-event-strict-v1",
      validated_at: "2026-07-28T08:10:00.000Z",
    },
    bound_candidate_fingerprint: candidateFingerprint,
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
  }, {
    trusted_section: "raw_input",
  });
  assert.deepEqual(forbidden, [
    { trusted_section: "raw_input", depth: 3, index: 0 },
    { trusted_section: "raw_input", depth: 3 },
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
  assert.equal(serialized.includes("tenant_card_id"), false);
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
  const different = createAcceptedOwnerReviewFingerprint(envelope({
    raw_employee_input: {
      amount_aed: "51.00",
      context_state: "UNKNOWN",
    },
  }), hashPort);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.notEqual(first.fingerprint, different.fingerprint);
  assert.equal(calls.length, 6);
  assert.equal(calls[0], calls[1]);
  assert.equal(first.canonical.includes("system_evidence"), false);
  assert.throws(
    () => createAcceptedOwnerReviewFingerprint(envelope(), () => Math.random().toString(16)),
    /HASH_PORT_MUST_BE_SYNCHRONOUS_DETERMINISTIC_HEX/,
  );
  assert.throws(
    () => createAcceptedOwnerReviewFingerprint(
      envelope(),
      async () => "a".repeat(64),
    ),
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
      result: "PASS",
      event_type: "rent",
      candidate_fingerprint: "owner_review_candidate_" + "a".repeat(64),
      validator_contract_id: "employee-seven-event-strict-v1",
      validated_at: "2026-07-28T08:10:00.000Z",
    },
  })), false);
});

test("strict attestation is contract, event and actual-candidate bound", () => {
  const candidate = {
    event_type: "expense",
    payload: { amount_aed: "50.00" },
  };
  const fingerprint = createAcceptedOwnerReviewCandidateFingerprint(
    candidate,
    hashPort,
  ).fingerprint;
  const attestation = {
    result: "PASS",
    event_type: "expense",
    candidate_fingerprint: fingerprint,
    validator_contract_id: "employee-seven-event-strict-v1",
    validated_at: "2026-07-29T08:00:00.000Z",
  };
  assert.equal(
    validateBoundStrictValidatorAttestation(
      attestation,
      candidate,
      hashPort,
    ).ok,
    true,
  );
  assert.equal(validateBoundStrictValidatorAttestation(
    { ...attestation, candidate_fingerprint: "owner_review_candidate_" + "f".repeat(64) },
    candidate,
    hashPort,
  ).ok, false);
  assert.equal(validateBoundStrictValidatorAttestation(
    { ...attestation, validator_contract_id: "caller-invented-validator" },
    candidate,
    hashPort,
  ).ok, false);
  assert.equal(validateBoundStrictValidatorAttestation(
    { passed: true, event_type: "expense", candidate_fingerprint: fingerprint },
    candidate,
    hashPort,
  ).ok, false);
  assert.equal(validateBoundStrictValidatorAttestation(
    attestation,
    { ...candidate, payload: { amount_aed: "51.00" } },
    hashPort,
  ).ok, false);
});

test("canonical result is a property of four axes only", () => {
  const axes = {
    intake_status: "ACCEPTED",
    review_status: "APPROVED",
    effective_origin: "OWNER_REVIEW_MATERIALIZATION",
    lifecycle_status: "ACTIVE",
  };
  assert.equal(
    deriveAcceptedOwnerReviewCanonicalResult(axes),
    deriveAcceptedOwnerReviewCanonicalResult({
      ...axes,
      terminal_decision: "APPROVE",
    }),
  );
  assert.equal(
    deriveAcceptedOwnerReviewCanonicalResult({
      ...axes,
      terminal_decision: "CORRECT_APPROVE",
    }),
    "ACCEPTED_EFFECTIVE",
  );
  assert.equal(validateAcceptedOwnerReviewRecordConsistency({
    ...axes,
    terminal_decision: "CORRECT_APPROVE",
  }).error_code, "TERMINAL_DECISION_STATUS_MISMATCH");
  assert.equal(validateAcceptedOwnerReviewRecordConsistency({
    ...axes,
    terminal_decision: "APPROVE",
    materialization_ledger_state: "NOT_REQUIRED",
  }).error_code, "MATERIALIZATION_LEDGER_STATUS_MISMATCH");
  assert.equal(validateAcceptedOwnerReviewRecordConsistency({
    ...axes,
    terminal_decision: "APPROVE",
    materialization_ledger_state: "NOT_APPLIED",
  }).ok, true);
});

test("getters, setters, symbols and dangerous prototype keys fail without invocation", () => {
  for (const enumerable of [true, false]) {
    let getterInvocationCount = 0;
    const raw = {};
    Object.defineProperty(raw, "amount", {
      enumerable,
      get() {
        getterInvocationCount += 1;
        return "50";
      },
    });
    const result = validateAcceptedOwnerReviewEnvelope(envelope({
      raw_employee_input: raw,
    }));
    assert.equal(result.ok, false);
    assert.equal(
      result.errors.some((error) =>
        error.code === "JSON_ACCESSOR_PROPERTY_NOT_ALLOWED"
      ),
      true,
    );
    assert.equal(getterInvocationCount, 0);
  }
  const setterRaw = {};
  Object.defineProperty(setterRaw, "amount", {
    enumerable: true,
    set(_value) {},
  });
  assert.equal(validateAcceptedOwnerReviewEnvelope(envelope({
    raw_employee_input: setterRaw,
  })).errors.some((error) =>
    error.code === "JSON_ACCESSOR_PROPERTY_NOT_ALLOWED"
  ), true);

  const symbolRaw = { amount: "50" };
  symbolRaw[Symbol("hidden")] = "secret";
  assert.equal(validateAcceptedOwnerReviewEnvelope(envelope({
    raw_employee_input: symbolRaw,
  })).ok, false);

  for (const key of [
    "__proto__",
    "PROTOtype",
    "Constructor",
    "con_struc-tor",
  ]) {
    const raw = JSON.parse(`{"${key}":{"polluted":true}}`);
    const result = validateAcceptedOwnerReviewEnvelope(envelope({
      raw_employee_input: raw,
    }));
    assert.equal(result.ok, false, key);
    assert.equal(
      result.errors.some((error) =>
        error.code === "JSON_DANGEROUS_KEY_NOT_ALLOWED"
      ),
      true,
      key,
    );
  }
});

test("safe errors never echo an untrusted sensitive field name", () => {
  const sensitiveKey = "provider_phone_971501234567";
  const result = validateAcceptedOwnerReviewEnvelope(envelope({
    raw_employee_input: { [sensitiveKey]: "redacted" },
  }));
  const serialized = JSON.stringify(result);
  assert.equal(result.ok, false);
  assert.equal(serialized.includes(sensitiveKey), false);
  assert.equal(serialized.includes("971501234567"), false);
  assert.equal(
    result.errors.some((error) =>
      error.code === "FORBIDDEN_IDENTITY_FIELD"
      && error.trusted_section === "raw_input"
    ),
    true,
  );
});

test("contract source has no crypto, database, Worker, network or environment dependency", async () => {
  const source = await readFile(moduleUrl, "utf8");
  assert.doesNotMatch(source, /node:crypto|cloudflare|wrangler|fetch\s*\(|process\.env|D1Database|KVNamespace/);
});
