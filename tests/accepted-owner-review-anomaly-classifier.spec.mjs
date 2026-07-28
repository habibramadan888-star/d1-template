import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  acceptedOwnerReviewDirectApprovePolicy,
  ANOMALY_CLASSIFICATIONS,
  classifyAcceptedOwnerReviewAnomaly,
} from "../modules/employees/accepted-owner-review-anomaly-classifier.mjs";

const moduleUrl =
  new URL("../modules/employees/accepted-owner-review-anomaly-classifier.mjs", import.meta.url);

function classify(diagnostics = [], overrides = {}) {
  return classifyAcceptedOwnerReviewAnomaly({
    event_type: "expense",
    request_reached_server: true,
    diagnostics,
    business_fields_complete: true,
    employee_explanation_complete: true,
    unresolved_unknown_count: 0,
    ...overrides,
  });
}

test("classifier exposes clean, business, security and unavailable boundaries", () => {
  assert.deepEqual(ANOMALY_CLASSIFICATIONS, [
    "CLEAN",
    "BUSINESS_ANOMALY",
    "SECURITY_REJECTION",
    "SYSTEM_UNAVAILABLE",
  ]);
  const clean = classify();
  assert.equal(clean.classification, "CLEAN");
  assert.equal(clean.accepted_result, "ACCEPTED_EFFECTIVE");
  assert.equal(clean.strict_validator_required, true);
  assert.equal(clean.strict_validator_passed, false);
});

test("all seven canonical events can reach clean classification", () => {
  for (const event_type of [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "expense",
    "bed_transfer",
  ]) {
    assert.equal(classify([], { event_type }).classification, "CLEAN");
  }
  assert.equal(
    classify([], { event_type: "left_with_arrears" }).classification,
    "SECURITY_REJECTION",
  );
});

test("authentication, authorization, tampering and identity injection are security rejections", () => {
  for (const code of [
    "AUTHENTICATION_REQUIRED",
    "AUTHORIZATION_DENIED",
    "CROSS_COMPANY_SCOPE",
    "REQUEST_TAMPERED",
    "PAYLOAD_LIMIT_EXCEEDED",
    "SERVER_MANAGED_FIELD_INJECTION",
    "FORBIDDEN_IDENTITY_FIELD",
  ]) {
    const result = classify([code]);
    assert.equal(result.classification, "SECURITY_REJECTION", code);
    assert.equal(result.accepted_result, "REJECTED_SECURITY");
  }
});

test("security takes precedence when diagnostics also contain unavailability", () => {
  const result = classify([
    "SERVER_UNAVAILABLE",
    "AUTHORIZATION_DENIED",
  ]);
  assert.equal(result.classification, "SECURITY_REJECTION");
});

test("request-not-delivered and unavailable response never masquerade as accepted", () => {
  const notDelivered = classify([], { request_reached_server: false });
  assert.equal(notDelivered.classification, "SYSTEM_UNAVAILABLE");
  assert.equal(notDelivered.accepted_result, null);
  assert.equal(notDelivered.retry_local_draft_only, true);

  for (const code of [
    "NETWORK_UNAVAILABLE",
    "SERVER_UNAVAILABLE",
    "SERVER_RESPONSE_UNAVAILABLE",
  ]) {
    const result = classify([code]);
    assert.equal(result.classification, "SYSTEM_UNAVAILABLE");
    assert.equal(result.accepted_result, null);
  }
});

test("business anomalies are accepted only for Owner review and preserve unknown codes", () => {
  for (const code of [
    "D_CONFLICT",
    "ARREARS_UNKNOWN",
    "ARREARS_LOOKUP_UNAVAILABLE",
    "TTLOCK_READ_FAILED",
    "AMOUNT_CONFLICT",
    "OCCUPANCY_CONFLICT",
    "BUSINESS_FIELD_INCOMPLETE",
  ]) {
    const result = classify([code]);
    assert.equal(result.classification, "BUSINESS_ANOMALY", code);
    assert.equal(result.accepted_result, "ACCEPTED_OWNER_REVIEW");
    assert.equal(result.owner_review_required, true);
  }
  const unknown = classify(["NEW_UNCLASSIFIED_BUSINESS_FACT"]);
  assert.deepEqual(
    unknown.unclassified_anomaly_codes,
    ["NEW_UNCLASSIFIED_BUSINESS_FACT"],
  );
  assert.equal(unknown.accepted_result, "ACCEPTED_OWNER_REVIEW");
});

test("hard guards require correction before approval or rejection", () => {
  for (const code of [
    "BED_334",
    "TARGET_NOT_VACANT_E",
    "SOURCE_NOT_OCCUPIED",
    "UNRESOLVED_D_CONFLICT",
    "MULTIPLE_OPEN_ARREARS_INCOMPLETE",
  ]) {
    const result = classify([code]);
    assert.equal(result.classification, "BUSINESS_ANOMALY", code);
    assert.equal(result.requires_correction_before_approve, true, code);
    assert.equal(result.direct_approve_candidate, false, code);
    assert.deepEqual(result.correction_required_codes, [code]);
  }
});

test("direct approve candidate never substitutes for strict validator attestation", () => {
  const result = classify(["ARREARS_UNKNOWN"]);
  assert.equal(result.direct_approve_candidate, true);
  assert.equal(result.strict_validator_required, true);
  assert.equal(result.strict_validator_passed, false);
  const policy = acceptedOwnerReviewDirectApprovePolicy(result);
  assert.equal(policy.eligible_candidate, true);
  assert.equal(policy.strict_validator_required, true);
  assert.equal(policy.strict_validator_passed, false);
});

test("incomplete explanation or unresolved unknown disables direct approve candidate", () => {
  assert.equal(classify(["ARREARS_UNKNOWN"], {
    employee_explanation_complete: false,
  }).direct_approve_candidate, false);
  assert.equal(classify(["ARREARS_UNKNOWN"], {
    unresolved_unknown_count: 1,
  }).direct_approve_candidate, false);
});

test("classifier has no TTLock, arrears, D1, Worker, network or environment access", async () => {
  const source = await readFile(moduleUrl, "utf8");
  assert.doesNotMatch(source, /fetch\s*\(|node:|process\.env|cloudflare|wrangler|D1Database|KVNamespace|SELECT\s+|api\/|https?:\/\//iu);
});
