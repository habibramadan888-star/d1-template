import {
  CANONICAL_EMPLOYEE_EVENT_TYPES,
  deriveAcceptedOwnerReviewCanonicalResult,
  EFFECTIVE_ORIGINS,
  INTAKE_STATUSES,
  isBusinessEffectActive,
  isOwnerReviewMaterializationEligible,
  LIFECYCLE_STATUSES,
  MATERIALIZATION_LEDGER_STATES,
  REVIEW_STATUSES,
} from "./accepted-owner-review-contract.mjs";

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze));
  if (isPlainObject(value)) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneFreeze(child)]),
    ));
  }
  return value;
}

function safeText(value, maximum = 240) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : "";
}

function failure(state, code) {
  return Object.freeze({
    ok: false,
    error_code: code,
    state,
    materialization_required: false,
  });
}

function success(state, extra = {}) {
  const frozen = cloneFreeze({
    ...state,
    canonical_result: deriveAcceptedOwnerReviewCanonicalResult(state),
    business_effect_active: isBusinessEffectActive(state),
  });
  return Object.freeze({
    ok: true,
    state: frozen,
    materialization_required: false,
    ...extra,
  });
}

function validActor(command, roles) {
  const actor = command?.actor;
  return isPlainObject(actor)
    && safeText(actor.userid, 120)
    && roles.includes(safeText(actor.role, 40).toUpperCase())
    && safeText(actor.corpid, 120);
}

function sameCompany(state, command) {
  return safeText(state.company_scope, 120)
    === safeText(command?.actor?.corpid, 120);
}

function nextVersion(state) {
  return Number(state.version) + 1;
}

function versionMatches(state, command) {
  return Number.isInteger(command?.expected_version)
    && command.expected_version === state.version;
}

function hasStrictAttestation(command, eventType) {
  const value = command?.strict_validator_attestation;
  return isPlainObject(value)
    && value.passed === true
    && value.event_type === eventType
    && safeText(value.payload_fingerprint, 180)
    && safeText(value.validated_at, 80);
}

function ownerDecisionBase(state, command, reviewStatus, decision) {
  return {
    ...state,
    version: nextVersion(state),
    review_status: reviewStatus,
    effective_origin: "OWNER_REVIEW_MATERIALIZATION",
    lifecycle_status: "ACTIVE",
    terminal_decision: decision,
    terminal_decision_record: {
      action: decision,
      actor: {
        userid: safeText(command.actor.userid, 120),
        role: safeText(command.actor.role, 40).toUpperCase(),
      },
      reason: safeText(command.reason, 1_000),
      decided_at: safeText(command.server_time, 80),
      idempotency_key: safeText(command.idempotency_key, 180),
    },
    strict_validator_attestation: cloneFreeze(
      command.strict_validator_attestation,
    ),
    materialization_ledger_state: "NOT_APPLIED",
  };
}

export function createStrictDirectAcceptedState(input) {
  if (
    !isPlainObject(input)
    || !CANONICAL_EMPLOYEE_EVENT_TYPES.includes(input.event_type)
    || !safeText(input.company_scope, 120)
    || !safeText(input.submitted_by, 120)
  ) {
    throw new Error("DIRECT_ACCEPT_INPUT_INVALID");
  }
  return success({
    version: 1,
    company_scope: safeText(input.company_scope, 120),
    submitted_by: safeText(input.submitted_by, 120),
    event_type: input.event_type,
    raw_employee_input: cloneFreeze(input.raw_employee_input ?? {}),
    employee_explanation_revisions: Object.freeze([]),
    system_evidence: cloneFreeze(input.system_evidence ?? {}),
    intake_status: "ACCEPTED",
    review_status: "NOT_REQUIRED",
    effective_origin: "STRICT_DIRECT_ACCEPT",
    lifecycle_status: "ACTIVE",
    terminal_decision: "",
    terminal_decision_record: null,
    materialization_ledger_state: "NOT_REQUIRED",
  }).state;
}

export function createPendingOwnerReviewState(input) {
  if (
    !isPlainObject(input)
    || !CANONICAL_EMPLOYEE_EVENT_TYPES.includes(input.event_type)
    || !safeText(input.company_scope, 120)
    || !safeText(input.submitted_by, 120)
  ) {
    throw new Error("OWNER_REVIEW_INPUT_INVALID");
  }
  const initialExplanation = safeText(input.employee_explanation, 8_192);
  if (
    initialExplanation
    && !safeText(input.employee_explanation_hash, 180)
  ) {
    throw new Error("OWNER_REVIEW_EXPLANATION_HASH_REQUIRED");
  }
  const revisions = initialExplanation
    ? [{
      revision: 1,
      content: initialExplanation,
      actor: {
        userid: safeText(input.submitted_by, 120),
        role: "EMPLOYEE",
      },
      server_time: safeText(input.submitted_at, 80),
      content_hash: safeText(input.employee_explanation_hash, 180),
    }]
    : [];
  return success({
    version: 1,
    company_scope: safeText(input.company_scope, 120),
    submitted_by: safeText(input.submitted_by, 120),
    event_type: input.event_type,
    raw_employee_input: cloneFreeze(input.raw_employee_input ?? {}),
    employee_explanation_revisions: cloneFreeze(revisions),
    system_evidence: cloneFreeze(input.system_evidence ?? {}),
    anomaly_codes: cloneFreeze(input.anomaly_codes ?? []),
    requires_correction_before_approve:
      input.requires_correction_before_approve === true,
    hard_guard_codes: cloneFreeze(input.hard_guard_codes ?? []),
    intake_status: "ACCEPTED",
    review_status: "PENDING_OWNER_REVIEW",
    effective_origin: "NONE",
    lifecycle_status: "ACTIVE",
    terminal_decision: "",
    terminal_decision_record: null,
    materialization_ledger_state: null,
  }).state;
}

export function transitionAcceptedOwnerReviewState(state, command) {
  if (!isPlainObject(state) || !isPlainObject(command)) {
    return failure(state, "STATE_OR_COMMAND_INVALID");
  }
  if (!sameCompany(state, command)) {
    return failure(state, "CROSS_COMPANY_SCOPE");
  }

  const action = safeText(command.action, 60).toUpperCase();
  if (
    ["APPROVE", "CORRECT_APPROVE", "REJECT"].includes(action)
    && state.terminal_decision_record?.action === action
    && safeText(state.terminal_decision_record.idempotency_key, 180)
      === safeText(command.idempotency_key, 180)
  ) {
    return Object.freeze({
      ...success(state),
      idempotent_replay: true,
      materialization_required:
        isOwnerReviewMaterializationEligible(state),
    });
  }
  if (!versionMatches(state, command)) {
    return failure(state, "VERSION_CONFLICT");
  }

  if (action === "APPEND_EXPLANATION") {
    if (
      state.review_status !== "PENDING_OWNER_REVIEW"
      || state.terminal_decision
    ) return failure(state, "EXPLANATION_REVISION_NOT_ALLOWED");
    if (
      !validActor(command, ["EMPLOYEE", "STAFF"])
      || safeText(command.actor.userid, 120) !== state.submitted_by
    ) return failure(state, "EXPLANATION_ACTOR_NOT_ALLOWED");
    const content = safeText(command.content, 8_192);
    const contentHash = safeText(command.content_hash, 180);
    if (!content || !contentHash || !safeText(command.server_time, 80)) {
      return failure(state, "EXPLANATION_REVISION_INVALID");
    }
    const revisions = [
      ...state.employee_explanation_revisions,
      {
        revision: state.employee_explanation_revisions.length + 1,
        content,
        content_hash: contentHash,
        actor: {
          userid: safeText(command.actor.userid, 120),
          role: safeText(command.actor.role, 40).toUpperCase(),
        },
        server_time: safeText(command.server_time, 80),
      },
    ];
    return success({
      ...state,
      version: nextVersion(state),
      employee_explanation_revisions: cloneFreeze(revisions),
    });
  }

  if (["APPROVE", "CORRECT_APPROVE", "REJECT"].includes(action)) {
    if (
      state.review_status !== "PENDING_OWNER_REVIEW"
      || state.terminal_decision
    ) return failure(state, "TERMINAL_DECISION_ALREADY_EXISTS");
    if (!validActor(command, ["OWNER", "MANAGER"])) {
      return failure(state, "OWNER_DECISION_ROLE_REQUIRED");
    }
    if (
      !safeText(command.reason, 1_000)
      || !safeText(command.server_time, 80)
      || !safeText(command.idempotency_key, 180)
    ) return failure(state, "OWNER_DECISION_AUDIT_FIELDS_REQUIRED");
    if (action === "REJECT") {
      return success({
        ...state,
        version: nextVersion(state),
        review_status: "REJECTED",
        effective_origin: "NONE",
        terminal_decision: "REJECT",
        terminal_decision_record: cloneFreeze({
          action: "REJECT",
          actor: {
            userid: safeText(command.actor.userid, 120),
            role: safeText(command.actor.role, 40).toUpperCase(),
          },
          reason: safeText(command.reason, 1_000),
          decided_at: safeText(command.server_time, 80),
          idempotency_key: safeText(command.idempotency_key, 180),
        }),
        materialization_ledger_state: null,
      });
    }
    if (
      action === "APPROVE"
      && state.requires_correction_before_approve === true
    ) {
      return failure(state, "CORRECTION_REQUIRED_BEFORE_APPROVE");
    }
    if (!hasStrictAttestation(command, state.event_type)) {
      return failure(state, "STRICT_VALIDATOR_ATTESTATION_REQUIRED");
    }
    if (
      state.employee_explanation_revisions.length === 0
      || !safeText(
        state.employee_explanation_revisions.at(-1)?.content,
        8_192,
      )
    ) return failure(state, "EMPLOYEE_EXPLANATION_REQUIRED");
    if (
      action === "CORRECT_APPROVE"
      && (
        !isPlainObject(command.corrected_payload)
        || !isPlainObject(command.correction_diff)
      )
    ) {
      return failure(state, "CORRECTION_PAYLOAD_AND_DIFF_REQUIRED");
    }
    const next = ownerDecisionBase(
      state,
      command,
      action === "APPROVE" ? "APPROVED" : "CORRECT_APPROVED",
      action,
    );
    if (action === "CORRECT_APPROVE") {
      next.corrected_payload = cloneFreeze(command.corrected_payload);
      next.correction_diff = cloneFreeze(command.correction_diff ?? {});
    }
    const result = success(next, { materialization_required: true });
    return Object.freeze({
      ...result,
      materialization_required:
        isOwnerReviewMaterializationEligible(result.state),
    });
  }

  if (["VOID", "REVERSE"].includes(action)) {
    if (!validActor(command, ["OWNER", "MANAGER"])) {
      return failure(state, "OWNER_DECISION_ROLE_REQUIRED");
    }
    if (!isBusinessEffectActive(state)) {
      return failure(state, "ACTIVE_EFFECT_REQUIRED");
    }
    if (
      !safeText(command.reason, 1_000)
      || !safeText(command.server_time, 80)
    ) return failure(state, "LIFECYCLE_AUDIT_FIELDS_REQUIRED");
    return success({
      ...state,
      version: nextVersion(state),
      lifecycle_status: action === "VOID" ? "VOIDED" : "REVERSED",
      lifecycle_action: cloneFreeze({
        action,
        actor: {
          userid: safeText(command.actor.userid, 120),
          role: safeText(command.actor.role, 40).toUpperCase(),
        },
        reason: safeText(command.reason, 1_000),
        server_time: safeText(command.server_time, 80),
      }),
    });
  }

  return failure(state, "ACTION_NOT_SUPPORTED");
}

export function recordOwnerReviewMaterializationApplied(state, input) {
  if (!isPlainObject(state) || !isPlainObject(input)) {
    return failure(state, "STATE_OR_MATERIALIZATION_INVALID");
  }
  if (
    !Number.isInteger(input.expected_version)
    || input.expected_version !== state.version
  ) return failure(state, "VERSION_CONFLICT");
  if (!isOwnerReviewMaterializationEligible(state)) {
    return failure(state, "MATERIALIZATION_NOT_ELIGIBLE");
  }
  if (
    !safeText(input.materialization_id, 180)
    || !safeText(input.applied_at, 80)
    || !safeText(input.effect_fingerprint, 180)
  ) return failure(state, "MATERIALIZATION_RECEIPT_INVALID");
  return success({
    ...state,
    version: nextVersion(state),
    materialization_ledger_state: "APPLIED",
    materialization_receipt: cloneFreeze({
      materialization_id: safeText(input.materialization_id, 180),
      applied_at: safeText(input.applied_at, 80),
      effect_fingerprint: safeText(input.effect_fingerprint, 180),
    }),
  });
}

export const ACCEPTED_OWNER_REVIEW_STATE_MACHINE_VALUES = Object.freeze({
  intake_statuses: INTAKE_STATUSES,
  review_statuses: REVIEW_STATUSES,
  effective_origins: EFFECTIVE_ORIGINS,
  lifecycle_statuses: LIFECYCLE_STATUSES,
  materialization_ledger_states: MATERIALIZATION_LEDGER_STATES,
});
