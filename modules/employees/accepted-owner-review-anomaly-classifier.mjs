import {
  CANONICAL_EMPLOYEE_EVENT_TYPES,
} from "./accepted-owner-review-contract.mjs";

export const ANOMALY_CLASSIFICATIONS = Object.freeze([
  "CLEAN",
  "BUSINESS_ANOMALY",
  "SECURITY_REJECTION",
  "SYSTEM_UNAVAILABLE",
]);

const SECURITY_CODES = new Set([
  "AUTHENTICATION_REQUIRED",
  "AUTHORIZATION_DENIED",
  "CROSS_COMPANY_SCOPE",
  "REQUEST_TAMPERED",
  "PAYLOAD_PARSE_FAILED",
  "PAYLOAD_LIMIT_EXCEEDED",
  "SERVER_MANAGED_FIELD_INJECTION",
  "FORBIDDEN_IDENTITY_FIELD",
  "ILLEGAL_EVENT_TYPE",
  "IDEMPOTENCY_SCOPE_CONFLICT",
]);

const SYSTEM_UNAVAILABLE_CODES = new Set([
  "REQUEST_NOT_DELIVERED",
  "NETWORK_UNAVAILABLE",
  "SERVER_UNAVAILABLE",
  "SERVER_RESPONSE_UNAVAILABLE",
]);

const CORRECTION_REQUIRED_CODES = new Set([
  "BED_334",
  "TARGET_NOT_VACANT_E",
  "SOURCE_NOT_OCCUPIED",
  "MULTIPLE_OPEN_ARREARS_INCOMPLETE",
  "UNRESOLVED_D_CONFLICT",
  "UNRESOLVED_OCCUPANCY_CONFLICT",
  "ARREARS_REF_UNKNOWN",
  "ARREARS_AMOUNT_MISMATCH",
  "AMOUNT_CONFLICT",
  "PAYMENT_VECTOR_CONFLICT",
  "RENT_PERIOD_UNKNOWN",
  "CHECKOUT_MODE_CONFLICT",
]);

const BUSINESS_CODES = new Set([
  "BUSINESS_FIELD_INCOMPLETE",
  "D_CONFLICT",
  "UNRESOLVED_D_CONFLICT",
  "ARREARS_UNKNOWN",
  "ARREARS_LOOKUP_UNAVAILABLE",
  "TTLOCK_READ_FAILED",
  "AMOUNT_CONFLICT",
  "PAYMENT_VECTOR_CONFLICT",
  "OCCUPANCY_CONFLICT",
  "UNRESOLVED_OCCUPANCY_CONFLICT",
  "BED_334",
  "TARGET_NOT_VACANT_E",
  "SOURCE_NOT_OCCUPIED",
  "MULTIPLE_OPEN_ARREARS_INCOMPLETE",
  "ARREARS_REF_UNKNOWN",
  "ARREARS_AMOUNT_MISMATCH",
  "RENT_PERIOD_UNKNOWN",
  "CHECKOUT_MODE_CONFLICT",
  "EMPLOYEE_EXPLANATION_MISSING",
]);

function normalizeCode(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/[^A-Z0-9_]/gu, "_").slice(0, 120)
    : "";
}

function normalizeCodes(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  return Object.freeze([...new Set(values.map((value) =>
    normalizeCode(
      typeof value === "object" && value !== null ? value.code : value,
    )
  ).filter(Boolean))]);
}

function result(classification, codes, extra = {}) {
  return Object.freeze({
    classification,
    codes,
    accepted_result:
      classification === "CLEAN"
        ? "ACCEPTED_EFFECTIVE"
        : classification === "BUSINESS_ANOMALY"
        ? "ACCEPTED_OWNER_REVIEW"
        : classification === "SECURITY_REJECTION"
        ? "REJECTED_SECURITY"
        : null,
    strict_validator_required:
      classification === "CLEAN" || classification === "BUSINESS_ANOMALY",
    strict_validator_passed: false,
    ...extra,
  });
}

export function classifyAcceptedOwnerReviewAnomaly(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return result(
      "SECURITY_REJECTION",
      Object.freeze(["PAYLOAD_PARSE_FAILED"]),
    );
  }
  if (input.request_reached_server === false) {
    return result(
      "SYSTEM_UNAVAILABLE",
      Object.freeze(["REQUEST_NOT_DELIVERED"]),
      { retry_local_draft_only: true },
    );
  }
  const eventType = typeof input.event_type === "string"
    ? input.event_type.trim().toLowerCase()
    : "";
  if (!CANONICAL_EMPLOYEE_EVENT_TYPES.includes(eventType)) {
    return result(
      "SECURITY_REJECTION",
      Object.freeze(["ILLEGAL_EVENT_TYPE"]),
    );
  }

  const codes = normalizeCodes(input.diagnostics);
  if (codes.some((code) => SECURITY_CODES.has(code))) {
    return result("SECURITY_REJECTION", codes);
  }
  if (codes.some((code) => SYSTEM_UNAVAILABLE_CODES.has(code))) {
    return result("SYSTEM_UNAVAILABLE", codes, {
      retry_local_draft_only: true,
    });
  }
  if (codes.length === 0) {
    return result("CLEAN", codes, {
      direct_approve_candidate: false,
      requires_correction_before_approve: false,
    });
  }

  const correctionCodes = codes.filter((code) =>
    CORRECTION_REQUIRED_CODES.has(code)
  );
  const knownBusiness = codes.filter((code) => BUSINESS_CODES.has(code));
  const unclassified = codes.filter((code) =>
    !BUSINESS_CODES.has(code)
    && !CORRECTION_REQUIRED_CODES.has(code)
  );
  return result("BUSINESS_ANOMALY", codes, {
    anomaly_codes: codes,
    known_business_codes: Object.freeze(knownBusiness),
    unclassified_anomaly_codes: Object.freeze(unclassified),
    requires_correction_before_approve: correctionCodes.length > 0,
    correction_required_codes: Object.freeze(correctionCodes),
    direct_approve_candidate:
      correctionCodes.length === 0
      && input.business_fields_complete === true
      && input.employee_explanation_complete === true
      && input.unresolved_unknown_count === 0,
    owner_review_required: true,
  });
}

export function acceptedOwnerReviewDirectApprovePolicy(classification) {
  if (
    typeof classification !== "object"
    || classification === null
    || classification.classification !== "BUSINESS_ANOMALY"
  ) {
    return Object.freeze({
      eligible_candidate: false,
      strict_validator_required: true,
      strict_validator_passed: false,
    });
  }
  return Object.freeze({
    eligible_candidate: classification.direct_approve_candidate === true,
    strict_validator_required: true,
    strict_validator_passed: false,
    requires_correction_before_approve:
      classification.requires_correction_before_approve === true,
  });
}
