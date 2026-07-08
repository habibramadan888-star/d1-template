const CORRECTION_BLOCK_RE = /====\s*CORRECTION ANCHORS JSON\s*====\s*([\s\S]*?)\s*====\s*END CORRECTION ANCHORS JSON\s*====/i;

const MONEY_FIELDS = [
  "cash_delta",
  "bank_delta",
  "gross_delta",
  "rent_income_delta",
  "deposit_liability_delta",
  "arrears_repaid_delta",
  "arrears_open_delta",
  "expense_delta",
  "transfer_fee_delta"
];

const FORBIDDEN_IDENTITY_KEYS = [
  "card_id",
  "tenant_card_id",
  "hardware_card_id",
  "provider_phone",
  "access_card_metadata_phone",
  "old_ttlock_ref",
  "identity_card_id",
  "identity_tenant_card_id",
  "identity_provider_phone"
];

function stableValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function money(value) {
  const num = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

function addIssue(target, code, message, detail = {}) {
  target.push({ code, message, ...detail });
}

export function parseCorrectionAnchorJsonBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return { ok: false, correction: null, errors: [{ code: "EMPTY_CORRECTION_BLOCK", message: "Correction anchor JSON block is empty." }] };
  }
  try {
    const parsed = JSON.parse(raw);
    return { ok: true, correction: parsed, errors: [] };
  } catch (error) {
    return {
      ok: false,
      correction: null,
      errors: [{ code: "CORRECTION_JSON_PARSE_FAILED", message: "Correction anchor JSON block could not be parsed.", safe_message: error?.message || "parse failed" }]
    };
  }
}

export function parseOwnerCorrectionAnchorText(text) {
  const raw = String(text || "");
  const match = raw.match(CORRECTION_BLOCK_RE);
  if (!match) {
    return { ok: true, found: false, correction: null, errors: [], warnings: [] };
  }
  const parsed = parseCorrectionAnchorJsonBlock(match[1]);
  if (!parsed.ok) return { ok: false, found: true, correction: null, errors: parsed.errors, warnings: [] };
  const validation = validateCorrectionAnchorContract(parsed.correction);
  return { found: true, correction: parsed.correction, ...validation };
}

function containsForbiddenIdentity(value, path = "") {
  const issues = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => issues.push(...containsForbiddenIdentity(item, `${path}[${index}]`)));
    return issues;
  }
  if (!value || typeof value !== "object") {
    const text = String(value ?? "");
    if (/99099/.test(text)) {
      issues.push({ path, key: "phone_99099", value: text });
    }
    return issues;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const lower = key.toLowerCase();
    if (FORBIDDEN_IDENTITY_KEYS.includes(lower) && child !== false && child !== "" && child !== null && typeof child !== "undefined") {
      issues.push({ path: childPath, key, value: child });
    }
    if ((lower.includes("phone") || lower.includes("contact")) && /99099/.test(String(child ?? ""))) {
      issues.push({ path: childPath, key: "phone_99099", value: child });
    }
    issues.push(...containsForbiddenIdentity(child, childPath));
  }
  return issues;
}

function normalizedFinancialEffect(effect) {
  const source = asObject(effect);
  return Object.fromEntries(MONEY_FIELDS.map((field) => [field, money(source[field])]));
}

function validateFinancialEffectMatchesOriginal(event, originalEventsById, errors) {
  const original = originalEventsById?.get?.(event.original_event_id);
  if (!original) return;
  const amount = Math.abs(money(original.amount ?? original.paid_amount ?? original.refund_amount ?? original.deposit_amount ?? original.fee_amount));
  if (!amount) return;
  const effect = normalizedFinancialEffect(event.financial_effect);
  const expectedFields = [];
  if (event.correction_event_type === "void_duplicate_event" && event.affected_event_type === "rent") {
    expectedFields.push("gross_delta", "rent_income_delta");
    if (money(original.bank_amount || 0) > 0 || String(original.payment_method || original.pay_type || "").toLowerCase() === "bank") expectedFields.push("bank_delta");
    else expectedFields.push("cash_delta");
  }
  for (const field of expectedFields) {
    if (Math.abs(Math.abs(effect[field]) - amount) > 0.01) {
      addIssue(errors, "FINANCIAL_EFFECT_AMOUNT_MISMATCH", `${field} does not match original event amount.`, {
        original_event_id: event.original_event_id,
        field,
        expected_amount: amount,
        actual_amount: effect[field]
      });
    }
  }
}

export function validateCorrectionAnchorContract(correction, options = {}) {
  const errors = [];
  const warnings = [];
  const root = asObject(correction);
  const events = asArray(root.correction_events);
  const originalEventsById = new Map(asArray(options.original_events).map((event) => [event.id || event.event_id || event.original_event_id, event]));

  if (root.anchor_contract_version !== "owner_correction_anchor_v1") {
    addIssue(errors, "CORRECTION_CONTRACT_VERSION_INVALID", "anchor_contract_version must be owner_correction_anchor_v1.");
  }
  for (const field of ["correction_session_id", "correction_type", "target_session_anchor"]) {
    if (!String(root[field] || "").trim()) addIssue(errors, "CORRECTION_SESSION_FIELD_MISSING", `${field} is required.`, { field });
  }
  if (!Array.isArray(root.correction_events)) {
    addIssue(errors, "CORRECTION_EVENTS_REQUIRED", "correction_events array is required.");
  } else if (!root.correction_events.length) {
    addIssue(errors, "CORRECTION_EVENTS_REQUIRED", "correction_events array must not be empty.");
  }
  if (root.no_hard_delete === false || root.hard_delete === true) {
    addIssue(errors, "HARD_DELETE_FORBIDDEN", "Correction anchors must not request hard delete.");
  }
  if (root.original_events_immutable === false || root.silent_overwrite === true) {
    addIssue(errors, "SILENT_OVERWRITE_FORBIDDEN", "Correction anchors must not silently overwrite original events.");
  }

  const rootForbidden = containsForbiddenIdentity(root);
  for (const issue of rootForbidden) {
    addIssue(errors, "FORBIDDEN_IDENTITY_INPUT", "Correction must not use card/provider identity fields.", issue);
  }

  const seenOriginal = new Set();
  events.forEach((eventValue, index) => {
    const event = asObject(eventValue);
    if (!String(event.original_event_id || "").trim()) {
      addIssue(errors, "ORIGINAL_EVENT_ID_REQUIRED", "Correction event requires original_event_id.", { event_index: index });
    } else if (seenOriginal.has(event.original_event_id)) {
      addIssue(errors, "DUPLICATE_CORRECTION_EVENT", "Duplicate correction event for the same original_event_id.", { event_index: index, original_event_id: event.original_event_id });
    } else {
      seenOriginal.add(event.original_event_id);
    }
    if (!String(event.correction_reason || root.correction_reason || "").trim()) {
      addIssue(errors, "CORRECTION_REASON_REQUIRED", "Correction reason is required.", { event_index: index });
    }
    if (!event.financial_effect || typeof event.financial_effect !== "object" || Array.isArray(event.financial_effect)) {
      addIssue(errors, "FINANCIAL_EFFECT_REQUIRED", "Correction event requires financial_effect.", { event_index: index });
    }
    if (event.hard_delete === true) {
      addIssue(errors, "HARD_DELETE_FORBIDDEN", "Correction event must not request hard delete.", { event_index: index });
    }
    if (event.silent_overwrite === true) {
      addIssue(errors, "SILENT_OVERWRITE_FORBIDDEN", "Correction event must not silently overwrite original events.", { event_index: index });
    }
    for (const issue of containsForbiddenIdentity(event, `correction_events[${index}]`)) {
      addIssue(errors, "FORBIDDEN_IDENTITY_INPUT", "Correction event must not use card/provider identity fields.", issue);
    }
    const originalExists = !String(event.original_event_id || "").trim() || originalEventsById.has(event.original_event_id);
    if (options.require_original_event_match && !originalExists) {
      addIssue(errors, "ORIGINAL_EVENT_ID_NOT_FOUND", "original_event_id was not found in the target session.", {
        event_index: index,
        original_event_id: event.original_event_id
      });
    }
    validateFinancialEffectMatchesOriginal(event, originalEventsById, errors);
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    correction: root
  };
}

function correctionTotalsWithDeltaKeys(correctionTotals = {}) {
  return {
    cash_delta: money(correctionTotals.cash),
    bank_delta: money(correctionTotals.bank),
    gross_delta: money(correctionTotals.gross),
    rent_income_delta: money(correctionTotals.rent_income),
    deposit_liability_delta: money(correctionTotals.deposit_liability),
    arrears_repaid_delta: money(correctionTotals.arrears_repaid),
    arrears_open_delta: money(correctionTotals.arrears_open),
    expense_delta: money(correctionTotals.expense),
    transfer_fee_delta: money(correctionTotals.transfer_fee)
  };
}

export function hashCorrectionStablePayload(payload = {}) {
  return `och_${hashString(stableStringify(payload))}`;
}

export function buildCorrectionRequestFingerprint(correction = {}) {
  const root = asObject(correction);
  return hashCorrectionStablePayload({
    target_session_anchor: root.target_session_anchor || "",
    target_session_id: root.target_session_id || "",
    correction_type: root.correction_type || "",
    correction_events: asArray(root.correction_events).map((event) => ({
      correction_event_type: event?.correction_event_type || "",
      original_event_id: event?.original_event_id || "",
      affected_bed: event?.affected_bed || "",
      affected_event_type: event?.affected_event_type || "",
      financial_effect: normalizedFinancialEffect(event?.financial_effect)
    }))
  });
}

export function buildOwnerCorrectionPreviewHash(preview = {}, correction = {}, options = {}) {
  return hashCorrectionStablePayload({
    target_session_anchor: preview.target_session_anchor || correction.target_session_anchor || "",
    target_session_id: preview.target_session_id || correction.target_session_id || "",
    correction_type: correction.correction_type || "",
    correction_events: asArray(correction.correction_events).map((event) => ({
      correction_event_id: event?.correction_event_id || "",
      correction_event_type: event?.correction_event_type || "",
      original_event_id: event?.original_event_id || "",
      affected_bed: event?.affected_bed || "",
      affected_event_type: event?.affected_event_type || "",
      financial_effect: normalizedFinancialEffect(event?.financial_effect)
    })),
    original_totals: preview.original_totals || {},
    correction_totals: preview.correction_totals || {},
    adjusted_totals: preview.adjusted_totals || {},
    target_session_content_hash: options.target_session_content_hash || "",
    owner_identity: options.owner_identity || "",
    preview_window: options.preview_window || ""
  });
}

function negativeTotalErrors(adjustedTotals = {}, allowNegativeTotals = false) {
  if (allowNegativeTotals) return [];
  const errors = [];
  for (const [field, value] of Object.entries(adjustedTotals || {})) {
    if (money(value) < 0) {
      addIssue(errors, "ADJUSTED_TOTAL_NEGATIVE", "Correction would make an adjusted total negative.", {
        field,
        adjusted_value: money(value)
      });
    }
  }
  return errors;
}

export function buildOwnerCorrectionDryRunPreview(originalSession = {}, correctionInput = {}, options = {}) {
  const correction = asObject(correctionInput);
  const originalEvents = asArray(originalSession.events);
  const validation = validateCorrectionAnchorContract(correction, {
    original_events: originalEvents,
    require_original_event_match: true
  });
  const totals = calculateCorrectionAdjustedTotals(originalSession.totals || {}, validation.ok ? correction.correction_events : []);
  const negativeErrors = negativeTotalErrors(totals.adjusted_totals, Boolean(correction.allow_negative_totals_owner_override || options.allow_negative_totals_owner_override));
  const invalidCorrections = [...validation.errors, ...negativeErrors];
  const ok = invalidCorrections.length === 0;
  const appliedEvents = ok ? correction.correction_events : [];
  const appliedTotals = ok ? totals : calculateCorrectionAdjustedTotals(originalSession.totals || {}, []);

  return {
    ok,
    mode: "owner_correction_dry_run_preview_only",
    no_write: true,
    target_session_anchor: correction.target_session_anchor || originalSession.anchor || "",
    target_session_id: originalSession.id || originalSession.session_id || "",
    original_totals: appliedTotals.original_totals,
    correction_totals: correctionTotalsWithDeltaKeys(appliedTotals.correction_totals),
    adjusted_totals: appliedTotals.adjusted_totals,
    original_events_visible: true,
    original_events_count: originalEvents.length,
    correction_events_count: asArray(correction.correction_events).length,
    correction_events: appliedEvents,
    invalid_corrections: invalidCorrections,
    warnings: validation.warnings,
    audit_view: {
      raw_mode_available: true,
      adjusted_mode_available: true,
      audit_mode_available: true,
      original_events_immutable: true,
      hard_delete: false,
      silent_overwrite: false,
      original_events: originalEvents,
      correction_events: appliedEvents
    },
    no_write_proof: {
      dry_run: true,
      write_endpoints_called: [],
      d1_write_count: 0,
      session_write_attempted: false,
      transaction_write_attempted: false,
      correction_write_attempted: false,
      arrear_task_write_attempted: false,
      deposit_write_attempted: false,
      owner_history_write_attempted: false,
      real_apply_called: false,
      write_guard_mode: "route_level_no_write",
      proof_limitations: "D1 write count is reported by route contract; preview route does not call write functions."
    }
  };
}

export function validateOwnerCorrectionApplyRequest(body = {}, preview = {}, options = {}) {
  const errors = [];
  const request = asObject(body);
  const confirmation = asObject(request.explicit_owner_confirmation);
  const expectedPreviewHash = options.expected_preview_hash || preview.preview_hash || "";
  const correctionGrossDelta = money(preview?.correction_totals?.gross_delta);
  const adjustedGross = money(preview?.adjusted_totals?.gross);

  for (const field of ["target_session_anchor", "target_session_id", "correction_type", "correction_reason", "evidence_summary", "preview_hash", "idempotency_key"]) {
    if (!String(request[field] || "").trim()) addIssue(errors, "APPLY_REQUIRED_FIELD_MISSING", `${field} is required.`, { field });
  }
  if (!Array.isArray(request.correction_events) || request.correction_events.length === 0) {
    addIssue(errors, "CORRECTION_EVENTS_REQUIRED", "correction_events array must not be empty.", { field: "correction_events" });
  }
  if (expectedPreviewHash && request.preview_hash && request.preview_hash !== expectedPreviewHash) {
    addIssue(errors, "PREVIEW_HASH_INVALID", "preview_hash does not match the recomputed preview.", {
      expected_preview_hash: expectedPreviewHash,
      received_preview_hash: request.preview_hash
    });
  }
  if (!confirmation.confirmed) addIssue(errors, "OWNER_CONFIRMATION_REQUIRED", "explicit_owner_confirmation.confirmed is required.", { field: "explicit_owner_confirmation.confirmed" });
  for (const field of ["understands_original_events_immutable", "understands_no_hard_delete", "understands_correction_is_additive"]) {
    if (confirmation[field] !== true) addIssue(errors, "OWNER_CONFIRMATION_REQUIRED", `${field} must be true.`, { field: `explicit_owner_confirmation.${field}` });
  }
  if (String(confirmation.confirmed_target_session_anchor || "") !== String(request.target_session_anchor || "")) {
    addIssue(errors, "OWNER_CONFIRMATION_MISMATCH", "confirmed_target_session_anchor does not match target_session_anchor.", {
      field: "explicit_owner_confirmation.confirmed_target_session_anchor"
    });
  }
  if (Math.abs(money(confirmation.confirmed_adjusted_gross) - adjustedGross) > 0.01) {
    addIssue(errors, "OWNER_CONFIRMATION_MISMATCH", "confirmed_adjusted_gross does not match preview adjusted gross.", {
      field: "explicit_owner_confirmation.confirmed_adjusted_gross",
      expected: adjustedGross,
      actual: money(confirmation.confirmed_adjusted_gross)
    });
  }
  if (Math.abs(money(confirmation.confirmed_correction_gross_delta) - correctionGrossDelta) > 0.01) {
    addIssue(errors, "OWNER_CONFIRMATION_MISMATCH", "confirmed_correction_gross_delta does not match preview correction gross delta.", {
      field: "explicit_owner_confirmation.confirmed_correction_gross_delta",
      expected: correctionGrossDelta,
      actual: money(confirmation.confirmed_correction_gross_delta)
    });
  }
  for (const error of asArray(preview.invalid_corrections)) errors.push(error);
  return { ok: errors.length === 0, errors };
}

export function buildOwnerCorrectionSessionAnchor(input = {}) {
  const preview = asObject(input.preview);
  const correction = asObject(input.correction);
  const now = input.created_at || new Date().toISOString();
  const correctionAnchorId = input.correction_anchor_id || `CORR-${now.slice(0, 10).replace(/-/g, "")}-owner-${hashString(`${preview.target_session_anchor}|${input.idempotency_key || ""}`)}`;
  const correctionSessionId = input.correction_session_id || `CORR-S${now.slice(0, 10).replace(/-/g, "")}-${hashString(correctionAnchorId)}`;
  const payload = {
    anchor_contract_version: "owner_correction_anchor_v1",
    correction_session_id: correctionSessionId,
    correction_anchor_id: correctionAnchorId,
    correction_anchor_contract_version: "owner_correction_anchor_v1",
    correction_type: correction.correction_type || "",
    target_session_anchor: preview.target_session_anchor || correction.target_session_anchor || "",
    target_session_id: preview.target_session_id || correction.target_session_id || "",
    target_employee_userid: input.target_employee_userid || "",
    target_business_date: input.target_business_date || "",
    correction_reason: correction.correction_reason || "",
    evidence_summary: correction.evidence_summary || "",
    created_by: input.created_by || "",
    created_by_role: input.created_by_role || "",
    authorized_by: input.authorized_by || input.created_by || "",
    authorized_role: input.authorized_role || input.created_by_role || "",
    created_at: now,
    effective_date: input.effective_date || now.slice(0, 10),
    applied_at: now,
    status: "applied",
    preview_hash: input.preview_hash || preview.preview_hash || "",
    idempotency_key: input.idempotency_key || "",
    correction_request_fingerprint: input.correction_request_fingerprint || buildCorrectionRequestFingerprint(correction),
    original_totals: preview.original_totals || {},
    correction_totals: preview.correction_totals || {},
    adjusted_totals: preview.adjusted_totals || {},
    no_hard_delete: true,
    original_events_immutable: true,
    production_write_scope: "correction_anchor_only",
    correction_events: asArray(correction.correction_events).map((event) => ({
      ...event,
      status: event.status || "applied",
      audit_note: event.audit_note || correction.evidence_summary || correction.correction_reason || ""
    }))
  };
  const exportText = [
    "HOMELINK OWNER CORRECTION",
    `Correction Anchor ID: ${correctionAnchorId}`,
    `Target Session: ${payload.target_session_anchor}`,
    `Reason: ${payload.correction_reason}`,
    "",
    "==== CORRECTION ANCHORS JSON ====",
    JSON.stringify(payload),
    "==== END CORRECTION ANCHORS JSON ===="
  ].join("\n");
  return {
    correction_session_id: correctionSessionId,
    correction_anchor_id: correctionAnchorId,
    payload,
    export_text: exportText
  };
}

export function calculateCorrectionAdjustedTotals(originalTotals = {}, correctionEvents = []) {
  const original = {
    cash: money(originalTotals.cash),
    bank: money(originalTotals.bank),
    gross: money(originalTotals.gross),
    rent_income: money(originalTotals.rent_income),
    deposit_liability: money(originalTotals.deposit_liability),
    arrears_repaid: money(originalTotals.arrears_repaid),
    arrears_open: money(originalTotals.arrears_open),
    expense: money(originalTotals.expense),
    transfer_fee: money(originalTotals.transfer_fee)
  };
  const correction = {
    cash: 0,
    bank: 0,
    gross: 0,
    rent_income: 0,
    deposit_liability: 0,
    arrears_repaid: 0,
    arrears_open: 0,
    expense: 0,
    transfer_fee: 0
  };
  for (const event of asArray(correctionEvents)) {
    const effect = normalizedFinancialEffect(event.financial_effect);
    correction.cash += effect.cash_delta;
    correction.bank += effect.bank_delta;
    correction.gross += effect.gross_delta;
    correction.rent_income += effect.rent_income_delta;
    correction.deposit_liability += effect.deposit_liability_delta;
    correction.arrears_repaid += effect.arrears_repaid_delta;
    correction.arrears_open += effect.arrears_open_delta;
    correction.expense += effect.expense_delta;
    correction.transfer_fee += effect.transfer_fee_delta;
  }
  for (const key of Object.keys(correction)) correction[key] = money(correction[key]);
  const adjusted = Object.fromEntries(Object.keys(original).map((key) => [key, money(original[key] + correction[key])]));
  return { original_totals: original, correction_totals: correction, adjusted_totals: adjusted };
}

export function applyCorrectionEffectsInMemory(originalSession = {}, correction = {}) {
  const validation = validateCorrectionAnchorContract(correction, { original_events: originalSession.events || [] });
  const events = validation.ok ? correction.correction_events : [];
  const totals = calculateCorrectionAdjustedTotals(originalSession.totals || {}, events);
  return {
    ok: validation.ok,
    target_session_anchor: correction.target_session_anchor || originalSession.anchor || "",
    ...totals,
    original_events_visible: true,
    original_events: originalSession.events || [],
    correction_events: events,
    invalid_corrections: validation.errors,
    warnings: validation.warnings
  };
}

export function buildCorrectionAuditView(originalSession = {}, correction = {}, mode = "audit") {
  const applied = applyCorrectionEffectsInMemory(originalSession, correction);
  if (mode === "raw") {
    return {
      mode,
      target_session_anchor: applied.target_session_anchor,
      totals: applied.original_totals,
      original_events_visible: true,
      original_events: applied.original_events,
      correction_events: [],
      invalid_corrections: applied.invalid_corrections,
      warnings: applied.warnings
    };
  }
  if (mode === "adjusted") {
    return {
      mode,
      target_session_anchor: applied.target_session_anchor,
      totals: applied.adjusted_totals,
      original_events_visible: true,
      correction_events_visible: false,
      invalid_corrections: applied.invalid_corrections,
      warnings: applied.warnings
    };
  }
  return {
    mode: "audit",
    target_session_anchor: applied.target_session_anchor,
    original_totals: applied.original_totals,
    correction_totals: applied.correction_totals,
    adjusted_totals: applied.adjusted_totals,
    original_events_visible: true,
    correction_events: applied.correction_events,
    original_events: applied.original_events,
    invalid_corrections: applied.invalid_corrections,
    warnings: applied.warnings
  };
}
