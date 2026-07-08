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
  "identity_card_id",
  "identity_tenant_card_id",
  "identity_provider_phone"
];

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
    validateFinancialEffectMatchesOriginal(event, originalEventsById, errors);
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    correction: root
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
