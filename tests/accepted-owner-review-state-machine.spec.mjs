import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPendingOwnerReviewState,
  createStrictDirectAcceptedState,
  recordOwnerReviewMaterializationApplied,
  transitionAcceptedOwnerReviewState,
} from "../modules/employees/accepted-owner-review-state-machine.mjs";

const moduleUrl =
  new URL("../modules/employees/accepted-owner-review-state-machine.mjs", import.meta.url);

function pending(overrides = {}) {
  return createPendingOwnerReviewState({
    company_scope: "homelink",
    submitted_by: "employee-1",
    submitted_at: "2026-07-28T08:00:00.000Z",
    event_type: "expense",
    raw_employee_input: { amount_aed: "50.00" },
    employee_explanation: "Context could not be confirmed.",
    employee_explanation_hash: "a".repeat(64),
    system_evidence: { context: "UNKNOWN" },
    anomaly_codes: ["ARREARS_UNKNOWN"],
    ...overrides,
  });
}

function ownerCommand(action, expectedVersion, overrides = {}) {
  return {
    action,
    expected_version: expectedVersion,
    actor: { userid: "owner-1", role: "OWNER", corpid: "homelink" },
    reason: "Reviewed against the strict event contract.",
    server_time: "2026-07-28T09:00:00.000Z",
    idempotency_key: `decision-${action.toLowerCase()}-1`,
    strict_validator_attestation: {
      passed: true,
      event_type: "expense",
      payload_fingerprint: "payload-fingerprint-1",
      validated_at: "2026-07-28T08:59:00.000Z",
    },
    ...overrides,
  };
}

test("direct accept is active with NOT_REQUIRED and no Owner decision", () => {
  const state = createStrictDirectAcceptedState({
    company_scope: "homelink",
    submitted_by: "employee-1",
    event_type: "expense",
    raw_employee_input: { amount_aed: "50.00" },
    system_evidence: {},
  });
  assert.equal(state.review_status, "NOT_REQUIRED");
  assert.equal(state.effective_origin, "STRICT_DIRECT_ACCEPT");
  assert.equal(state.materialization_ledger_state, "NOT_REQUIRED");
  assert.equal(state.terminal_decision_record, null);
  assert.equal(state.canonical_result, "ACCEPTED_EFFECTIVE");
  assert.equal(state.business_effect_active, true);
});

test("pending review has zero effect and is not represented by ledger false", () => {
  const state = pending();
  assert.equal(state.review_status, "PENDING_OWNER_REVIEW");
  assert.equal(state.materialization_ledger_state, null);
  assert.notEqual(state.materialization_ledger_state, false);
  assert.equal(state.canonical_result, "ACCEPTED_OWNER_REVIEW");
  assert.equal(state.business_effect_active, false);
});

test("employee explanations are append-only, hashed and immutable", () => {
  const state = pending();
  const original = structuredClone(state);
  const result = transitionAcceptedOwnerReviewState(state, {
    action: "APPEND_EXPLANATION",
    expected_version: 1,
    actor: { userid: "employee-1", role: "STAFF", corpid: "homelink" },
    content: "Additional known facts.",
    content_hash: "b".repeat(64),
    server_time: "2026-07-28T08:10:00.000Z",
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.employee_explanation_revisions.length, 2);
  assert.equal(result.state.employee_explanation_revisions[0].content, original.employee_explanation_revisions[0].content);
  assert.equal(result.state.employee_explanation_revisions[1].content_hash, "b".repeat(64));
  assert.deepEqual(state, original);
  assert.equal(Object.isFrozen(result.state.employee_explanation_revisions[1]), true);
});

test("explanation rejects wrong employee, cross-company actor and stale version", () => {
  const state = pending();
  const base = {
    action: "APPEND_EXPLANATION",
    expected_version: 1,
    actor: { userid: "employee-2", role: "EMPLOYEE", corpid: "homelink" },
    content: "Additional known facts.",
    content_hash: "b".repeat(64),
    server_time: "2026-07-28T08:10:00.000Z",
  };
  assert.equal(transitionAcceptedOwnerReviewState(state, base).error_code, "EXPLANATION_ACTOR_NOT_ALLOWED");
  assert.equal(transitionAcceptedOwnerReviewState(state, {
    ...base,
    actor: { ...base.actor, userid: "employee-1", corpid: "other" },
  }).error_code, "CROSS_COMPANY_SCOPE");
  assert.equal(transitionAcceptedOwnerReviewState(state, {
    ...base,
    expected_version: 2,
  }).error_code, "VERSION_CONFLICT");
});

test("Owner approval requires external strict-validator attestation", () => {
  const state = pending();
  const result = transitionAcceptedOwnerReviewState(
    state,
    ownerCommand("APPROVE", 1, { strict_validator_attestation: null }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error_code, "STRICT_VALIDATOR_ATTESTATION_REQUIRED");
  assert.equal(result.materialization_required, false);
});

test("approval is eligible before materialization and active only after APPLIED", () => {
  const state = pending();
  const approved = transitionAcceptedOwnerReviewState(
    state,
    ownerCommand("APPROVE", 1),
  );
  assert.equal(approved.ok, true);
  assert.equal(approved.state.materialization_ledger_state, "NOT_APPLIED");
  assert.equal(approved.materialization_required, true);
  assert.equal(approved.state.business_effect_active, false);

  const applied = recordOwnerReviewMaterializationApplied(approved.state, {
    expected_version: 2,
    materialization_id: "materialization-1",
    applied_at: "2026-07-28T09:01:00.000Z",
    effect_fingerprint: "effect-1",
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.state.materialization_ledger_state, "APPLIED");
  assert.equal(applied.state.business_effect_active, true);
  assert.equal(applied.materialization_required, false);

  const repeated = recordOwnerReviewMaterializationApplied(applied.state, {
    expected_version: 3,
    materialization_id: "materialization-2",
    applied_at: "2026-07-28T09:02:00.000Z",
    effect_fingerprint: "effect-1",
  });
  assert.equal(repeated.ok, false);
  assert.equal(repeated.error_code, "MATERIALIZATION_NOT_ELIGIBLE");
});

test("same terminal command is idempotent but competing terminal command loses", () => {
  const state = pending();
  const command = ownerCommand("APPROVE", 1);
  const approved = transitionAcceptedOwnerReviewState(state, command);
  const replay = transitionAcceptedOwnerReviewState(approved.state, {
    ...command,
    expected_version: 1,
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.state.version, approved.state.version);
  assert.equal(replay.materialization_required, true);

  const rejected = transitionAcceptedOwnerReviewState(
    approved.state,
    ownerCommand("REJECT", approved.state.version),
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error_code, "TERMINAL_DECISION_ALREADY_EXISTS");
});

test("hard guards cannot use APPROVE but can use CORRECT_APPROVE", () => {
  const state = pending({
    requires_correction_before_approve: true,
    hard_guard_codes: ["BED_334"],
  });
  const approve = transitionAcceptedOwnerReviewState(
    state,
    ownerCommand("APPROVE", 1),
  );
  assert.equal(approve.ok, false);
  assert.equal(approve.error_code, "CORRECTION_REQUIRED_BEFORE_APPROVE");

  const correctedPayload = { bed: "335", amount_aed: "50.00" };
  const corrected = transitionAcceptedOwnerReviewState(
    state,
    ownerCommand("CORRECT_APPROVE", 1, {
      corrected_payload: correctedPayload,
      correction_diff: { bed: { from: "334", to: "335" } },
    }),
  );
  assert.equal(corrected.ok, true);
  assert.equal(corrected.state.review_status, "CORRECT_APPROVED");
  assert.equal(corrected.state.canonical_result, "CORRECTED_EFFECTIVE");
  correctedPayload.bed = "999";
  assert.equal(corrected.state.corrected_payload.bed, "335");
});

test("reject stays zero-effect and later terminal decisions fail", () => {
  const state = pending();
  const rejected = transitionAcceptedOwnerReviewState(
    state,
    ownerCommand("REJECT", 1),
  );
  assert.equal(rejected.ok, true);
  assert.equal(rejected.state.canonical_result, "REJECTED_OWNER");
  assert.equal(rejected.state.business_effect_active, false);
  const later = transitionAcceptedOwnerReviewState(
    rejected.state,
    ownerCommand("APPROVE", rejected.state.version),
  );
  assert.equal(later.ok, false);
  assert.equal(later.error_code, "TERMINAL_DECISION_ALREADY_EXISTS");
});

test("VOID and REVERSE disable active effects without overwriting source evidence", () => {
  const direct = createStrictDirectAcceptedState({
    company_scope: "homelink",
    submitted_by: "employee-1",
    event_type: "expense",
    raw_employee_input: { amount_aed: "50.00" },
    system_evidence: { observed: true },
  });
  for (const action of ["VOID", "REVERSE"]) {
    const result = transitionAcceptedOwnerReviewState(
      direct,
      ownerCommand(action, 1),
    );
    assert.equal(result.ok, true);
    assert.equal(result.state.lifecycle_status, action === "VOID" ? "VOIDED" : "REVERSED");
    assert.equal(result.state.business_effect_active, false);
    assert.deepEqual(result.state.raw_employee_input, direct.raw_employee_input);
    assert.deepEqual(result.state.system_evidence, direct.system_evidence);
  }
});

test("state-machine source imports only the pure contract and has no I/O", async () => {
  const source = await readFile(moduleUrl, "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/gu)].map((match) => match[1]);
  assert.deepEqual(imports, ["./accepted-owner-review-contract.mjs"]);
  assert.doesNotMatch(source, /fetch\s*\(|node:|process\.env|cloudflare|wrangler|D1Database|KVNamespace/);
});
