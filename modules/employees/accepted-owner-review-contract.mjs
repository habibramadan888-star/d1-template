const MAX_DEPTH = 10;
const MAX_NODES = 2_000;
const MAX_STRING_LENGTH = 8_192;
const MAX_SERIALIZED_BYTES = 65_536;

export const CANONICAL_EMPLOYEE_EVENT_TYPES = Object.freeze([
  "rent",
  "arrears_payment",
  "deposit_in",
  "deposit_out",
  "checkout",
  "expense",
  "bed_transfer",
]);

export const INTAKE_STATUSES = Object.freeze([
  "ACCEPTED",
  "REJECTED_SECURITY",
]);

export const REVIEW_STATUSES = Object.freeze([
  "NOT_REQUIRED",
  "PENDING_OWNER_REVIEW",
  "APPROVED",
  "CORRECT_APPROVED",
  "REJECTED",
]);

export const EFFECTIVE_ORIGINS = Object.freeze([
  "NONE",
  "STRICT_DIRECT_ACCEPT",
  "OWNER_REVIEW_MATERIALIZATION",
]);

export const LIFECYCLE_STATUSES = Object.freeze([
  "ACTIVE",
  "VOIDED",
  "REVERSED",
]);

export const CANONICAL_RESULTS = Object.freeze([
  "ACCEPTED_EFFECTIVE",
  "ACCEPTED_OWNER_REVIEW",
  "CORRECTED_EFFECTIVE",
  "REJECTED_OWNER",
  "REJECTED_SECURITY",
  "VOIDED",
  "REVERSED",
  "INVALID_STATE",
]);

export const MATERIALIZATION_LEDGER_STATES = Object.freeze([
  "NOT_REQUIRED",
  "NOT_APPLIED",
  "APPLIED",
]);

export const ACCEPTED_STRICT_VALIDATOR_CONTRACT_IDS = Object.freeze([
  "employee-seven-event-strict-v1",
]);

const FOUR_AXIS_CANONICAL_RESULTS = Object.freeze({
  "REJECTED_SECURITY|NOT_REQUIRED|NONE|ACTIVE": "REJECTED_SECURITY",
  "ACCEPTED|PENDING_OWNER_REVIEW|NONE|ACTIVE": "ACCEPTED_OWNER_REVIEW",
  "ACCEPTED|REJECTED|NONE|ACTIVE": "REJECTED_OWNER",
  "ACCEPTED|NOT_REQUIRED|STRICT_DIRECT_ACCEPT|ACTIVE": "ACCEPTED_EFFECTIVE",
  "ACCEPTED|APPROVED|OWNER_REVIEW_MATERIALIZATION|ACTIVE":
    "ACCEPTED_EFFECTIVE",
  "ACCEPTED|CORRECT_APPROVED|OWNER_REVIEW_MATERIALIZATION|ACTIVE":
    "CORRECTED_EFFECTIVE",
  "ACCEPTED|NOT_REQUIRED|STRICT_DIRECT_ACCEPT|VOIDED": "VOIDED",
  "ACCEPTED|APPROVED|OWNER_REVIEW_MATERIALIZATION|VOIDED": "VOIDED",
  "ACCEPTED|CORRECT_APPROVED|OWNER_REVIEW_MATERIALIZATION|VOIDED": "VOIDED",
  "ACCEPTED|NOT_REQUIRED|STRICT_DIRECT_ACCEPT|REVERSED": "REVERSED",
  "ACCEPTED|APPROVED|OWNER_REVIEW_MATERIALIZATION|REVERSED": "REVERSED",
  "ACCEPTED|CORRECT_APPROVED|OWNER_REVIEW_MATERIALIZATION|REVERSED":
    "REVERSED",
});

const DANGEROUS_NORMALIZED_KEYS = new Set([
  "proto",
  "prototype",
  "constructor",
]);

const FORBIDDEN_IDENTITY_KEYS = Object.freeze([
  /(^|_)(tenant_?card_?id|card_?id|old_?ttlock_?ref|ttlock_?id)($|_)/iu,
  /(^|_)(provider_?phone|provider_?identity|phone_?99099|whatsapp_?phone)($|_)/iu,
  /(^|_)(adder_?metadata|local_?cache_?identity)($|_)/iu,
  /(^|_)(authorization|cookie|jwt|token|secret|password|pin)($|_)/iu,
]);

const FORBIDDEN_VALUE_PATTERN =
  /\b(?:Bearer\s+[A-Za-z0-9._~-]+|tenant_card_id|provider_phone|phone_99099)\b/iu;

function isPlainObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeString(value, maximum = 160) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, maximum)
    : "";
}

function safeError(code, trustedSection = "", location = {}) {
  return Object.freeze({
    code,
    ...(trustedSection
      ? { trusted_section: trustedSection.slice(0, 80) }
      : {}),
    ...(Number.isInteger(location.depth)
      ? { depth: location.depth }
      : {}),
    ...(Number.isInteger(location.index)
      ? { index: location.index }
      : {}),
  });
}

function scanJsonSafe(value, options = {}) {
  const errors = [];
  const seen = new Set();
  let nodes = 0;
  const trustedSection = safeString(
    options.trustedSection,
    80,
  ) || "input";

  function visit(current, depth, safeIndex) {
    nodes += 1;
    if (nodes > MAX_NODES) {
      errors.push(safeError(
        "JSON_NODE_LIMIT_EXCEEDED",
        trustedSection,
        { depth, index: safeIndex },
      ));
      return;
    }
    if (depth > MAX_DEPTH) {
      errors.push(safeError(
        "JSON_DEPTH_LIMIT_EXCEEDED",
        trustedSection,
        { depth, index: safeIndex },
      ));
      return;
    }
    if (
      current === null
      || typeof current === "boolean"
      || typeof current === "string"
    ) {
      if (
        typeof current === "string"
        && current.length > MAX_STRING_LENGTH
      ) {
        errors.push(safeError(
          "JSON_STRING_LIMIT_EXCEEDED",
          trustedSection,
          { depth, index: safeIndex },
        ));
      }
      return;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        errors.push(safeError(
          "JSON_NON_FINITE_NUMBER",
          trustedSection,
          { depth, index: safeIndex },
        ));
      }
      return;
    }
    if (typeof current !== "object") {
      errors.push(safeError(
        "JSON_TYPE_NOT_ALLOWED",
        trustedSection,
        { depth, index: safeIndex },
      ));
      return;
    }
    if (seen.has(current)) {
      errors.push(safeError(
        "JSON_CIRCULAR_REFERENCE",
        trustedSection,
        { depth, index: safeIndex },
      ));
      return;
    }
    seen.add(current);
    if (!Array.isArray(current) && !isPlainObject(current)) {
      errors.push(safeError(
        "JSON_NON_PLAIN_OBJECT",
        trustedSection,
        { depth, index: safeIndex },
      ));
      seen.delete(current);
      return;
    }

    let descriptors;
    try {
      if (Object.getOwnPropertySymbols(current).length > 0) {
        errors.push(safeError(
          "JSON_SYMBOL_KEY_NOT_ALLOWED",
          trustedSection,
          { depth, index: safeIndex },
        ));
      }
      descriptors = Object.getOwnPropertyDescriptors(current);
    } catch {
      errors.push(safeError(
        "JSON_PROPERTY_INSPECTION_FAILED",
        trustedSection,
        { depth, index: safeIndex },
      ));
      seen.delete(current);
      return;
    }

    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (Array.isArray(current) && key === "length") continue;
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/gu, "");
      if (DANGEROUS_NORMALIZED_KEYS.has(normalizedKey)) {
        errors.push(safeError(
          "JSON_DANGEROUS_KEY_NOT_ALLOWED",
          trustedSection,
          { depth, index: safeIndex },
        ));
        continue;
      }
      if (
        typeof descriptor.get === "function"
        || typeof descriptor.set === "function"
      ) {
        errors.push(safeError(
          "JSON_ACCESSOR_PROPERTY_NOT_ALLOWED",
          trustedSection,
          { depth, index: safeIndex },
        ));
        continue;
      }
      if (descriptor.enumerable !== true) {
        errors.push(safeError(
          "JSON_NON_ENUMERABLE_PROPERTY_NOT_ALLOWED",
          trustedSection,
          { depth, index: safeIndex },
        ));
        continue;
      }
      if (key.length > 160) {
        errors.push(safeError(
          "JSON_KEY_LIMIT_EXCEEDED",
          trustedSection,
          { depth, index: safeIndex },
        ));
        continue;
      }
      const childIndex = Array.isArray(current) && /^\d+$/u.test(key)
        ? Number(key)
        : undefined;
      visit(descriptor.value, depth + 1, childIndex);
    }
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(descriptors, String(index))) {
          errors.push(safeError(
            "JSON_SPARSE_ARRAY_NOT_ALLOWED",
            trustedSection,
            { depth, index },
          ));
        }
      }
    }
    seen.delete(current);
  }

  visit(value, 0);
  if (errors.length === 0) {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
      if (bytes > MAX_SERIALIZED_BYTES) {
        errors.push(safeError(
          "JSON_SERIALIZED_LIMIT_EXCEEDED",
          trustedSection,
        ));
      }
    } catch {
      errors.push(safeError("JSON_SERIALIZATION_FAILED", trustedSection));
    }
  }
  return Object.freeze(errors);
}

function cloneJson(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneJson));
  }
  if (isPlainObject(value)) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneJson(child)]),
    ));
  }
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function forbiddenKey(key) {
  return FORBIDDEN_IDENTITY_KEYS.some((pattern) => pattern.test(key));
}

export function findForbiddenIdentityFields(value, options = {}) {
  const findings = [];
  const seen = new Set();
  const trustedSection = safeString(
    options.trusted_section,
    80,
  ) || "input";

  function addFinding(depth, index) {
    findings.push(Object.freeze({
      trusted_section: trustedSection,
      depth,
      ...(Number.isInteger(index) ? { index } : {}),
    }));
  }

  function visit(current, depth, safeIndex) {
    if (typeof current === "string" && FORBIDDEN_VALUE_PATTERN.test(current)) {
      addFinding(depth, safeIndex);
      return;
    }
    if (typeof current !== "object" || current === null) return;
    if (seen.has(current)) {
      return;
    }
    seen.add(current);
    if (!Array.isArray(current) && !isPlainObject(current)) {
      seen.delete(current);
      return;
    }
    let descriptors;
    try {
      descriptors = Object.getOwnPropertyDescriptors(current);
    } catch {
      seen.delete(current);
      return;
    }
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (Array.isArray(current) && key === "length") continue;
      const index = Array.isArray(current) && /^\d+$/u.test(key)
        ? Number(key)
        : undefined;
      if (forbiddenKey(key)) addFinding(depth + 1, index ?? safeIndex);
      else if (
        typeof descriptor.get !== "function"
        && typeof descriptor.set !== "function"
      ) {
        visit(descriptor.value, depth + 1, index);
      }
    }
    seen.delete(current);
  }

  visit(value, 0);
  const unique = new Map(findings.map((finding) => [
    JSON.stringify(finding),
    finding,
  ]));
  return Object.freeze([...unique.values()]);
}

function validAuthenticatedEmployee(value, companyScope) {
  return isPlainObject(value)
    && safeString(value.userid, 120) !== ""
    && ["EMPLOYEE", "STAFF"].includes(safeString(value.role, 40).toUpperCase())
    && safeString(value.corpid, 120) === companyScope;
}

function validStringArray(value, maximum = 100) {
  return Array.isArray(value)
    && value.length <= maximum
    && value.every((item) =>
      typeof item === "string"
      && item.trim().length > 0
      && item.length <= 160
    );
}

export function validateAcceptedOwnerReviewEnvelope(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    return Object.freeze({
      ok: false,
      errors: Object.freeze([safeError("ENVELOPE_OBJECT_REQUIRED")]),
    });
  }

  const jsonErrors = scanJsonSafe(value, {
    trustedSection: "owner_review_envelope",
  });
  errors.push(...jsonErrors);
  if (jsonErrors.length > 0) {
    return Object.freeze({
      ok: false,
      errors: Object.freeze(errors),
    });
  }
  const companyScope = safeString(value.company_scope, 120);
  if (!companyScope) errors.push(safeError("COMPANY_SCOPE_REQUIRED", "company_scope"));
  if (!validAuthenticatedEmployee(value.authenticated_employee, companyScope)) {
    errors.push(safeError("AUTHENTICATED_EMPLOYEE_INVALID", "authenticated_employee"));
  }
  for (const field of ["session_id", "entry_id", "submitted_at", "anomaly_observed_at"]) {
    if (!safeString(value[field], 180)) {
      errors.push(safeError("REQUIRED_FIELD_MISSING", field));
    }
  }
  if (!CANONICAL_EMPLOYEE_EVENT_TYPES.includes(value.event_type)) {
    errors.push(safeError("EVENT_TYPE_NOT_ALLOWED", "event_type"));
  }
  if (!isPlainObject(value.raw_employee_input)) {
    errors.push(safeError("RAW_EMPLOYEE_INPUT_OBJECT_REQUIRED", "raw_employee_input"));
  }
  if (typeof value.employee_explanation !== "string") {
    errors.push(safeError("EMPLOYEE_EXPLANATION_STRING_REQUIRED", "employee_explanation"));
  }
  if (!isPlainObject(value.system_evidence)) {
    errors.push(safeError("SYSTEM_EVIDENCE_OBJECT_REQUIRED", "system_evidence"));
  }
  if (!validStringArray(value.system_error_codes)) {
    errors.push(safeError("SYSTEM_ERROR_CODES_INVALID", "system_error_codes"));
  }
  if (!validStringArray(value.anomaly_codes)) {
    errors.push(safeError("ANOMALY_CODES_INVALID", "anomaly_codes"));
  }
  if (value.review_status !== "PENDING_OWNER_REVIEW") {
    errors.push(safeError("REVIEW_STATUS_INVALID", "review_status"));
  }
  if (jsonErrors.length === 0) {
    const sections = [
      ["raw_input", value.raw_employee_input],
      ["employee_explanation", value.employee_explanation],
      ["system_evidence", value.system_evidence],
    ];
    for (const [trustedSection, sectionValue] of sections) {
      const forbidden = findForbiddenIdentityFields(sectionValue, {
        trusted_section: trustedSection,
      });
      errors.push(...forbidden.map((finding) =>
        safeError(
          "FORBIDDEN_IDENTITY_FIELD",
          finding.trusted_section,
          { depth: finding.depth, index: finding.index },
        )
      ));
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    ...(errors.length === 0 ? { value: cloneJson(value) } : {}),
  });
}

export function validateAcceptedOwnerReviewJsonValue(
  value,
  trustedSection = "value",
) {
  const errors = scanJsonSafe(value, {
    trustedSection: safeString(trustedSection, 80) || "value",
  });
  return Object.freeze({
    ok: errors.length === 0,
    errors,
    ...(errors.length === 0 ? { value: cloneJson(value) } : {}),
  });
}

function runDeterministicHash(hashPort, canonical) {
  if (typeof hashPort !== "function") {
    throw new TypeError("A synchronous deterministic hash port is required.");
  }
  const first = hashPort(canonical);
  const second = hashPort(canonical);
  if (
    typeof first !== "string"
    || first !== second
    || !/^[a-f0-9]{32,128}$/iu.test(first)
  ) {
    throw new Error("HASH_PORT_MUST_BE_SYNCHRONOUS_DETERMINISTIC_HEX");
  }
  return first.toLowerCase();
}

function createStableFingerprint(namespace, value, hashPort, trustedSection) {
  const validation = validateAcceptedOwnerReviewJsonValue(
    value,
    trustedSection,
  );
  if (!validation.ok) {
    throw new Error(
      `FINGERPRINT_INPUT_INVALID:${validation.errors[0]?.code ?? "UNKNOWN"}`,
    );
  }
  const canonical = stableJson(validation.value);
  const hash = runDeterministicHash(hashPort, canonical);
  return Object.freeze({
    canonical,
    fingerprint: `${namespace}_${hash}`,
  });
}

export function createAcceptedOwnerReviewFingerprint(input, hashPort) {
  const validation = validateAcceptedOwnerReviewEnvelope(input);
  if (!validation.ok) {
    throw new Error(`OWNER_REVIEW_ENVELOPE_INVALID:${validation.errors[0]?.code ?? "UNKNOWN"}`);
  }
  const employee = validation.value.authenticated_employee;
  const canonical = stableJson({
    company_scope: validation.value.company_scope,
    employee_userid: employee.userid,
    session_id: validation.value.session_id,
    entry_id: validation.value.entry_id,
    event_type: validation.value.event_type,
    raw_employee_input: validation.value.raw_employee_input,
    employee_explanation: validation.value.employee_explanation,
  });
  const hash = runDeterministicHash(hashPort, canonical);
  return Object.freeze({
    canonical,
    fingerprint: `owner_review_${hash}`,
  });
}

export function createAcceptedOwnerReviewCandidateFingerprint(
  candidate,
  hashPort,
) {
  const validation = validateAcceptedOwnerReviewJsonValue(
    candidate,
    "candidate",
  );
  const safeCandidate = validation.value;
  if (
    !validation.ok
    || !isPlainObject(safeCandidate)
    || !CANONICAL_EMPLOYEE_EVENT_TYPES.includes(safeCandidate.event_type)
    || !Object.hasOwn(safeCandidate, "payload")
  ) {
    throw new Error("OWNER_REVIEW_CANDIDATE_INVALID");
  }
  const forbidden = findForbiddenIdentityFields(safeCandidate.payload, {
    trusted_section: "candidate",
  });
  if (forbidden.length > 0) {
    throw new Error("OWNER_REVIEW_CANDIDATE_FORBIDDEN_IDENTITY");
  }
  return createStableFingerprint(
    "owner_review_candidate",
    {
      event_type: safeCandidate.event_type,
      payload: safeCandidate.payload,
    },
    hashPort,
    "candidate",
  );
}

export function createAcceptedOwnerReviewCommandFingerprint(
  commandProjection,
  hashPort,
) {
  return createStableFingerprint(
    "owner_review_command",
    commandProjection,
    hashPort,
    "command",
  );
}

export function validateBoundStrictValidatorAttestation(
  attestation,
  candidate,
  hashPort,
) {
  const validation = validateAcceptedOwnerReviewJsonValue(
    attestation,
    "strict_validator_attestation",
  );
  if (!validation.ok || !isPlainObject(validation.value)) {
    return Object.freeze({
      ok: false,
      error_code: "STRICT_VALIDATOR_ATTESTATION_INVALID",
    });
  }
  let computed;
  try {
    computed = createAcceptedOwnerReviewCandidateFingerprint(
      candidate,
      hashPort,
    );
  } catch {
    return Object.freeze({
      ok: false,
      error_code: "STRICT_VALIDATOR_CANDIDATE_INVALID",
    });
  }
  const value = validation.value;
  if (
    value.result !== "PASS"
    || value.event_type !== candidate.event_type
    || !ACCEPTED_STRICT_VALIDATOR_CONTRACT_IDS.includes(
      value.validator_contract_id,
    )
    || value.candidate_fingerprint !== computed.fingerprint
    || !safeString(value.validated_at, 80)
  ) {
    return Object.freeze({
      ok: false,
      error_code: "STRICT_VALIDATOR_ATTESTATION_NOT_BOUND",
    });
  }
  return Object.freeze({
    ok: true,
    candidate_fingerprint: computed.fingerprint,
    validator_contract_id: value.validator_contract_id,
  });
}

function statusValue(record, field) {
  return typeof record?.[field] === "string" ? record[field] : "";
}

function fourAxisKey(record) {
  return [
    statusValue(record, "intake_status"),
    statusValue(record, "review_status"),
    statusValue(record, "effective_origin"),
    statusValue(record, "lifecycle_status"),
  ].join("|");
}

export function validateAcceptedOwnerReviewFourAxisCombination(record) {
  const canonicalResult = FOUR_AXIS_CANONICAL_RESULTS[fourAxisKey(record)];
  if (!canonicalResult) {
    return Object.freeze({
      ok: false,
      canonical_result: "INVALID_STATE",
      error_code: "FOUR_AXIS_STATE_INVALID",
    });
  }
  return Object.freeze({
    ok: true,
    canonical_result: canonicalResult,
  });
}

function approvedDecision(record) {
  return ["APPROVE", "CORRECT_APPROVE"].includes(
    statusValue(record, "terminal_decision"),
  );
}

export function deriveAcceptedOwnerReviewCanonicalResult(record) {
  return validateAcceptedOwnerReviewFourAxisCombination(record).canonical_result;
}

export function validateAcceptedOwnerReviewRecordConsistency(record) {
  if (!isPlainObject(record)) {
    return Object.freeze({
      ok: false,
      error_code: "OWNER_REVIEW_RECORD_INVALID",
    });
  }
  const fourAxis = validateAcceptedOwnerReviewFourAxisCombination(record);
  if (!fourAxis.ok) return fourAxis;
  const review = statusValue(record, "review_status");
  const terminal = statusValue(record, "terminal_decision");
  const expectedTerminal = review === "APPROVED"
    ? "APPROVE"
    : review === "CORRECT_APPROVED"
    ? "CORRECT_APPROVE"
    : review === "REJECTED"
    ? "REJECT"
    : "";
  if (terminal !== expectedTerminal) {
    return Object.freeze({
      ok: false,
      error_code: "TERMINAL_DECISION_STATUS_MISMATCH",
    });
  }
  const ledger = record?.materialization_ledger_state ?? null;
  const ledgerValid = review === "NOT_REQUIRED"
    ? ledger === "NOT_REQUIRED"
    : ["APPROVED", "CORRECT_APPROVED"].includes(review)
    ? ["NOT_APPLIED", "APPLIED"].includes(ledger)
    : ledger === null;
  if (!ledgerValid) {
    return Object.freeze({
      ok: false,
      error_code: "MATERIALIZATION_LEDGER_STATUS_MISMATCH",
    });
  }
  return Object.freeze({
    ok: true,
    canonical_result: fourAxis.canonical_result,
  });
}

export function isDirectBusinessEffectActive(record) {
  return validateAcceptedOwnerReviewRecordConsistency(record).ok
    && statusValue(record, "lifecycle_status") === "ACTIVE"
    && deriveAcceptedOwnerReviewCanonicalResult(record) === "ACCEPTED_EFFECTIVE"
    && statusValue(record, "effective_origin") === "STRICT_DIRECT_ACCEPT"
    && statusValue(record, "review_status") === "NOT_REQUIRED"
    && statusValue(record, "materialization_ledger_state") === "NOT_REQUIRED"
    && !statusValue(record, "terminal_decision");
}

export function isOwnerReviewMaterializationEligible(record) {
  const canonical = deriveAcceptedOwnerReviewCanonicalResult(record);
  const attestation = record?.strict_validator_attestation;
  return validateAcceptedOwnerReviewRecordConsistency(record).ok
    && statusValue(record, "lifecycle_status") === "ACTIVE"
    && ["ACCEPTED_EFFECTIVE", "CORRECTED_EFFECTIVE"].includes(canonical)
    && statusValue(record, "effective_origin") === "OWNER_REVIEW_MATERIALIZATION"
    && approvedDecision(record)
    && statusValue(record, "materialization_ledger_state") === "NOT_APPLIED"
    && safeString(record?.bound_candidate_fingerprint, 180) !== ""
    && attestation?.result === "PASS"
    && ACCEPTED_STRICT_VALIDATOR_CONTRACT_IDS.includes(
      attestation?.validator_contract_id,
    )
    && attestation?.event_type === record?.event_type
    && attestation?.candidate_fingerprint === record.bound_candidate_fingerprint;
}

export function isOwnerReviewBusinessEffectActive(record) {
  const canonical = deriveAcceptedOwnerReviewCanonicalResult(record);
  const attestation = record?.strict_validator_attestation;
  return validateAcceptedOwnerReviewRecordConsistency(record).ok
    && statusValue(record, "lifecycle_status") === "ACTIVE"
    && ["ACCEPTED_EFFECTIVE", "CORRECTED_EFFECTIVE"].includes(canonical)
    && statusValue(record, "effective_origin") === "OWNER_REVIEW_MATERIALIZATION"
    && approvedDecision(record)
    && statusValue(record, "materialization_ledger_state") === "APPLIED"
    && safeString(record?.bound_candidate_fingerprint, 180) !== ""
    && attestation?.result === "PASS"
    && ACCEPTED_STRICT_VALIDATOR_CONTRACT_IDS.includes(
      attestation?.validator_contract_id,
    )
    && attestation?.candidate_fingerprint === record.bound_candidate_fingerprint;
}

export function isBusinessEffectActive(record) {
  return isDirectBusinessEffectActive(record)
    || isOwnerReviewBusinessEffectActive(record);
}

export const ACCEPTED_OWNER_REVIEW_CONTRACT_LIMITS = Object.freeze({
  max_depth: MAX_DEPTH,
  max_nodes: MAX_NODES,
  max_string_length: MAX_STRING_LENGTH,
  max_serialized_bytes: MAX_SERIALIZED_BYTES,
});
