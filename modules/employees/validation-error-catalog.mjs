const VALIDATION_CODES = Object.freeze([
  "AGGREGATE_PREFLIGHT_EMPTY",
  "ANCHOR_CONTRACT_MISSING_FIELDS",
  "ARREAR_PAYMENT_AMOUNT_INVALID",
  "ARREAR_PROMISE_DATE_IN_PAST",
  "ARREAR_REASON_REQUIRED",
  "ARREAR_TASK_REQUIRED_FOR_SHORTFALL",
  "ARREARS_PAYMENT_FORBIDDEN_IDENTITY_FIELD",
  "ARREARS_PAYMENT_REMAINING_STATUS_MISMATCH",
  "ARREARS_PAYMENT_REQUIRED_FIELD_MISSING",
  "ARREARS_PAYMENT_SERVER_FIELD_INJECTION",
  "ARREARS_REF_STALE_REFRESH_REQUIRED",
  "BED_TRANSFER_CANONICAL_FINGERPRINT_CONFLICT",
  "BED_TRANSFER_FEE_FIELD_MISSING",
  "BED_TRANSFER_REQUIRED_FIELD_MISSING",
  "BED_TRANSFER_SAME_BED_NOT_ALLOWED",
  "BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY",
  "BED_TRANSFER_WAIVER_REASON_REQUIRED",
  "CHECKOUT_OPEN_ARREARS_LEFT_WITH_ARREARS_REQUIRED",
  "CLOUD_ARREARS_NOT_OPEN",
  "DEPOSIT_DEDUCTION_EXCEEDS_BALANCE",
  "DEPOSIT_IN_REQUIRED_FIELD_MISSING",
  "DEPOSIT_OUT_REQUIRED_FIELD_MISSING",
  "EXCESS_TO_REQUIRED",
  "EXPENSE_REQUIRED_FIELD_MISSING",
  "EXPORT_TEXT_BUILD_FAILED",
  "LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING",
  "LEGACY_ARREARS_CANONICAL_REF_INVALID",
  "LEGACY_ARREARS_REMARK_REQUIRED",
  "LINKED_TASK_REQUIRED",
  "OWNER_DECODER_CONTRACT_REJECTED",
  "PAYLOAD_PARSE_FAILED",
  "RENT_CONFIG_MISSING",
  "RENT_PERIOD_INVALID",
  "RENT_REQUIRED_FIELD_MISSING",
  "ROOM_AMOUNT_REQUIRED",
  "SESSION_ANCHOR_CONTRACT_MISSING_FIELDS",
  "SHORT_PAID_DUE_DATE_REQUIRED",
  "TRANSFER_FEE_CHOICE_REQUIRED",
  "UNKNOWN_EVENT_TYPE",
  "VALIDATION_EXCEPTION",
  "UNREGISTERED_VALIDATION_ERROR",
]);

function eventTypesFor(code) {
  if (code.startsWith("BED_TRANSFER") || code === "TRANSFER_FEE_CHOICE_REQUIRED") return ["bed_transfer"];
  if (code.startsWith("ARREARS_PAYMENT") || code.startsWith("LEGACY_ARREARS") || code.startsWith("CLOUD_ARREARS") || code === "LINKED_TASK_REQUIRED") return ["arrears_payment"];
  if (code.startsWith("CHECKOUT") || code.startsWith("LEFT_WITH_ARREARS")) return ["checkout", "left_with_arrears"];
  if (code.startsWith("DEPOSIT_IN")) return ["deposit_in"];
  if (code.startsWith("DEPOSIT_OUT") || code.startsWith("DEPOSIT_DEDUCTION")) return ["deposit_out"];
  if (code.startsWith("EXPENSE")) return ["expense"];
  if (code.startsWith("RENT") || code.startsWith("ARREAR_") || code.startsWith("SHORT_PAID") || code === "EXCESS_TO_REQUIRED") return ["rent"];
  return ["session", "rent", "arrears_payment", "deposit_in", "deposit_out", "checkout", "left_with_arrears", "expense", "bed_transfer"];
}

function baseEntry(code) {
  return {
    code,
    event_types: eventTypesFor(code),
    stage: code === "AGGREGATE_PREFLIGHT_EMPTY" ? "aggregate_preflight" : "employee_entry_validation",
    category: code.includes("STALE") ? "stale_context" : code.includes("EXCEPTION") ? "internal" : "business_contract",
    severity: code.includes("EXCEPTION") ? "error" : "warning",
    retryable: code.includes("STALE") || code.includes("EXCEPTION"),
    employee_message: "This record could not be validated. Review the highlighted fields and retry.",
    operator_message: `${code} was emitted by the Employee entry validation boundary.`,
    engineering_cause: "The normalized Employee entry did not satisfy the registered validation contract.",
    required_fields: [],
    invalid_fields: [],
    expected_action: "Correct the record if the diagnostic is current; otherwise revalidate the scoped QA Run.",
    safe_context_schema: ["qa_run_id", "entry_id", "event_type", "missing_fields", "invalid_fields", "validator_stage"],
    owning_validator: "validateEmployeeEntryUploadPayload",
    first_introduced_version: "pre-qa-provenance-v1",
  };
}

const overrides = {
  LEGACY_ARREARS_CANONICAL_REF_INVALID: {
    stage: "arrears_payment_reference",
    category: "canonical_reference",
    retryable: false,
    employee_message: "The legacy arrears reference does not match this Session and Entry.",
    operator_message: "Compare qa_run_id, session_id, entry_id and arrears_ref before changing business rules.",
    engineering_cause: "The legacy-manual reference was not derived from the exact immutable Session ID and Entry ID.",
    required_fields: ["session_id", "entry_id", "arrears_ref"],
    invalid_fields: ["arrears_ref"],
    expected_action: "Reload the authoritative QA Run draft and revalidate without editing the fixture.",
    owning_validator: "validateEmployeeEntryUploadPayload:legacy_arrears_reference",
  },
  LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING: {
    stage: "left_with_arrears_contract",
    category: "required_fields",
    retryable: false,
    employee_message: "Left With Arrears requires the amount and note fields.",
    operator_message: "Compare the scenario manifest through hydration, request serialization and validator input.",
    engineering_cause: "At least one required Left With Arrears field was absent at the validator boundary.",
    required_fields: ["checkout_type", "left_arrears_amount", "note"],
    invalid_fields: [],
    expected_action: "Reload the authoritative QA Run draft and revalidate if the saved manifest is complete.",
    owning_validator: "validateEmployeeEntryUploadPayload:left_with_arrears",
  },
  UNREGISTERED_VALIDATION_ERROR: {
    stage: "diagnostic_catalog_guard",
    category: "unregistered_error",
    severity: "error",
    retryable: false,
    employee_message: "Validation returned an unregistered error. No write was attempted.",
    operator_message: "Register the validator error code before treating it as a business failure.",
    engineering_cause: "The runtime emitted a non-string or unknown validation error code.",
    expected_action: "Copy the bounded diagnostic bundle and escalate to engineering.",
    owning_validator: "validationErrorCatalogGuard",
    first_introduced_version: "qa-validation-provenance-v1",
  },
};

export const EMPLOYEE_VALIDATION_ERROR_CATALOG = Object.freeze(Object.fromEntries(
  VALIDATION_CODES.map(code => [code, Object.freeze({ ...baseEntry(code), ...(overrides[code] || {}) })]),
));

export function normalizeEmployeeValidationErrorCode(value) {
  if (value === "" || value == null) return "";
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return code && EMPLOYEE_VALIDATION_ERROR_CATALOG[code] ? code : "UNREGISTERED_VALIDATION_ERROR";
}

export function employeeValidationErrorCatalogEntry(value) {
  const code = normalizeEmployeeValidationErrorCode(value) || "UNREGISTERED_VALIDATION_ERROR";
  return EMPLOYEE_VALIDATION_ERROR_CATALOG[code];
}

export const EMPLOYEE_VALIDATION_ERROR_CODE_COUNT = Object.keys(EMPLOYEE_VALIDATION_ERROR_CATALOG).length;

