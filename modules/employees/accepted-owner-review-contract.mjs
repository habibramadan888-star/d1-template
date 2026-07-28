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

function safeError(code, path = "") {
  return Object.freeze({
    code,
    ...(path ? { path: path.slice(0, 240) } : {}),
  });
}

function scanJsonSafe(value, options = {}) {
  const errors = [];
  const seen = new Set();
  let nodes = 0;

  function visit(current, path, depth) {
    nodes += 1;
    if (nodes > MAX_NODES) {
      errors.push(safeError("JSON_NODE_LIMIT_EXCEEDED", path));
      return;
    }
    if (depth > MAX_DEPTH) {
      errors.push(safeError("JSON_DEPTH_LIMIT_EXCEEDED", path));
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
        errors.push(safeError("JSON_STRING_LIMIT_EXCEEDED", path));
      }
      return;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        errors.push(safeError("JSON_NON_FINITE_NUMBER", path));
      }
      return;
    }
    if (typeof current !== "object") {
      errors.push(safeError("JSON_TYPE_NOT_ALLOWED", path));
      return;
    }
    if (seen.has(current)) {
      errors.push(safeError("JSON_CIRCULAR_REFERENCE", path));
      return;
    }
    seen.add(current);
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        visit(current[index], `${path}[${index}]`, depth + 1);
      }
    } else if (isPlainObject(current)) {
      for (const [key, child] of Object.entries(current)) {
        if (key.length > 160) {
          errors.push(safeError("JSON_KEY_LIMIT_EXCEEDED", path));
          continue;
        }
        visit(child, path ? `${path}.${key}` : key, depth + 1);
      }
    } else {
      errors.push(safeError("JSON_NON_PLAIN_OBJECT", path));
    }
    seen.delete(current);
  }

  visit(value, options.rootPath ?? "$", 0);
  if (errors.length === 0) {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
      if (bytes > MAX_SERIALIZED_BYTES) {
        errors.push(safeError("JSON_SERIALIZED_LIMIT_EXCEEDED", "$"));
      }
    } catch {
      errors.push(safeError("JSON_SERIALIZATION_FAILED", "$"));
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

export function findForbiddenIdentityFields(value) {
  const paths = [];
  const seen = new Set();

  function visit(current, path) {
    if (typeof current === "string" && FORBIDDEN_VALUE_PATTERN.test(current)) {
      paths.push(path || "$");
      return;
    }
    if (typeof current !== "object" || current === null) return;
    if (seen.has(current)) {
      paths.push(path ? `${path}.[circular]` : "$.[circular]");
      return;
    }
    seen.add(current);
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, `${path}[${index}]`));
    } else if (isPlainObject(current)) {
      for (const [key, child] of Object.entries(current)) {
        const childPath = path ? `${path}.${key}` : key;
        if (forbiddenKey(key)) paths.push(childPath);
        else visit(child, childPath);
      }
    }
    seen.delete(current);
  }

  visit(value, "$");
  return Object.freeze([...new Set(paths)].sort());
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

  const jsonErrors = scanJsonSafe(value);
  errors.push(...jsonErrors);
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
  const forbidden = findForbiddenIdentityFields({
    raw_employee_input: value.raw_employee_input,
    employee_explanation: value.employee_explanation,
    system_evidence: value.system_evidence,
  });
  if (forbidden.length) {
    errors.push(...forbidden.map((path) =>
      safeError("FORBIDDEN_IDENTITY_FIELD", path)
    ));
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    ...(errors.length === 0 ? { value: cloneJson(value) } : {}),
  });
}

export function createAcceptedOwnerReviewFingerprint(input, hashPort) {
  if (typeof hashPort !== "function") {
    throw new TypeError("A synchronous deterministic hash port is required.");
  }
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
  const first = hashPort(canonical);
  const second = hashPort(canonical);
  if (
    typeof first !== "string"
    || first !== second
    || !/^[a-f0-9]{32,128}$/iu.test(first)
  ) {
    throw new Error("HASH_PORT_MUST_BE_SYNCHRONOUS_DETERMINISTIC_HEX");
  }
  return Object.freeze({
    canonical,
    fingerprint: `owner_review_${first.toLowerCase()}`,
  });
}

function statusValue(record, field) {
  return typeof record?.[field] === "string" ? record[field] : "";
}

function approvedDecision(record) {
  return ["APPROVE", "CORRECT_APPROVE"].includes(
    statusValue(record, "terminal_decision"),
  );
}

function validStrictValidatorAttestation(record) {
  const attestation = record?.strict_validator_attestation;
  return isPlainObject(attestation)
    && attestation.passed === true
    && attestation.event_type === statusValue(record, "event_type")
    && safeString(attestation.payload_fingerprint, 180) !== ""
    && safeString(attestation.validated_at, 80) !== "";
}

export function deriveAcceptedOwnerReviewCanonicalResult(record) {
  const intake = statusValue(record, "intake_status");
  const review = statusValue(record, "review_status");
  const origin = statusValue(record, "effective_origin");
  const lifecycle = statusValue(record, "lifecycle_status");

  if (intake === "REJECTED_SECURITY") return "REJECTED_SECURITY";
  if (intake !== "ACCEPTED") return "INVALID_STATE";
  if (lifecycle === "VOIDED") return "VOIDED";
  if (lifecycle === "REVERSED") return "REVERSED";
  if (lifecycle !== "ACTIVE") return "INVALID_STATE";
  if (
    review === "PENDING_OWNER_REVIEW"
    && origin === "NONE"
  ) return "ACCEPTED_OWNER_REVIEW";
  if (review === "REJECTED" && origin === "NONE") return "REJECTED_OWNER";
  if (
    review === "NOT_REQUIRED"
    && origin === "STRICT_DIRECT_ACCEPT"
  ) return "ACCEPTED_EFFECTIVE";
  if (
    review === "APPROVED"
    && origin === "OWNER_REVIEW_MATERIALIZATION"
    && statusValue(record, "terminal_decision") === "APPROVE"
  ) return "ACCEPTED_EFFECTIVE";
  if (
    review === "CORRECT_APPROVED"
    && origin === "OWNER_REVIEW_MATERIALIZATION"
    && statusValue(record, "terminal_decision") === "CORRECT_APPROVE"
  ) return "CORRECTED_EFFECTIVE";
  return "INVALID_STATE";
}

export function isDirectBusinessEffectActive(record) {
  return statusValue(record, "lifecycle_status") === "ACTIVE"
    && deriveAcceptedOwnerReviewCanonicalResult(record) === "ACCEPTED_EFFECTIVE"
    && statusValue(record, "effective_origin") === "STRICT_DIRECT_ACCEPT"
    && statusValue(record, "review_status") === "NOT_REQUIRED"
    && statusValue(record, "materialization_ledger_state") === "NOT_REQUIRED"
    && !statusValue(record, "terminal_decision");
}

export function isOwnerReviewMaterializationEligible(record) {
  const canonical = deriveAcceptedOwnerReviewCanonicalResult(record);
  return statusValue(record, "lifecycle_status") === "ACTIVE"
    && ["ACCEPTED_EFFECTIVE", "CORRECTED_EFFECTIVE"].includes(canonical)
    && statusValue(record, "effective_origin") === "OWNER_REVIEW_MATERIALIZATION"
    && approvedDecision(record)
    && statusValue(record, "materialization_ledger_state") === "NOT_APPLIED"
    && validStrictValidatorAttestation(record);
}

export function isOwnerReviewBusinessEffectActive(record) {
  const canonical = deriveAcceptedOwnerReviewCanonicalResult(record);
  return statusValue(record, "lifecycle_status") === "ACTIVE"
    && ["ACCEPTED_EFFECTIVE", "CORRECTED_EFFECTIVE"].includes(canonical)
    && statusValue(record, "effective_origin") === "OWNER_REVIEW_MATERIALIZATION"
    && approvedDecision(record)
    && statusValue(record, "materialization_ledger_state") === "APPLIED";
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
