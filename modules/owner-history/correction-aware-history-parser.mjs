import {
  calculateCorrectionAdjustedTotals,
  parseOwnerCorrectionAnchorText,
  validateCorrectionAnchorContract
} from "../owner-corrections/correction-anchor-parser.mjs";

const TOTAL_FIELDS = [
  "cash",
  "bank",
  "gross",
  "rent_income",
  "deposit_liability",
  "arrears_repaid",
  "arrears_open",
  "expense",
  "transfer_fee"
];

const DELTA_FIELDS = TOTAL_FIELDS.map((field) => `${field}_delta`);
const NON_APPLIED_STATUSES = new Set(["pending", "rejected", "reversed", "voided"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function money(value) {
  const num = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

function zeroTotals() {
  return Object.fromEntries(TOTAL_FIELDS.map((field) => [field, 0]));
}

function zeroDeltaTotals() {
  return Object.fromEntries(DELTA_FIELDS.map((field) => [field, 0]));
}

function normalizeTotals(totals = {}) {
  const source = asObject(totals);
  return Object.fromEntries(TOTAL_FIELDS.map((field) => [field, money(source[field])]));
}

function normalizeDeltaTotals(totals = {}) {
  const source = asObject(totals);
  return Object.fromEntries(DELTA_FIELDS.map((field) => [field, money(source[field])]));
}

function totalsToDeltaTotals(totals = {}) {
  const source = normalizeTotals(totals);
  return {
    cash_delta: source.cash,
    bank_delta: source.bank,
    gross_delta: source.gross,
    rent_income_delta: source.rent_income,
    deposit_liability_delta: source.deposit_liability,
    arrears_repaid_delta: source.arrears_repaid,
    arrears_open_delta: source.arrears_open,
    expense_delta: source.expense,
    transfer_fee_delta: source.transfer_fee
  };
}

function addTotals(left = {}, right = {}) {
  return Object.fromEntries(TOTAL_FIELDS.map((field) => [field, money(money(left[field]) + money(right[field]))]));
}

function addDeltaTotals(left = {}, right = {}) {
  return Object.fromEntries(DELTA_FIELDS.map((field) => [field, money(money(left[field]) + money(right[field]))]));
}

function deltaToTotals(delta = {}) {
  return {
    cash: money(delta.cash_delta),
    bank: money(delta.bank_delta),
    gross: money(delta.gross_delta),
    rent_income: money(delta.rent_income_delta),
    deposit_liability: money(delta.deposit_liability_delta),
    arrears_repaid: money(delta.arrears_repaid_delta),
    arrears_open: money(delta.arrears_open_delta),
    expense: money(delta.expense_delta),
    transfer_fee: money(delta.transfer_fee_delta)
  };
}

function sessionAnchor(session = {}) {
  return String(session.anchor || session.session_anchor || session.target_session_anchor || "").trim();
}

function sessionId(session = {}) {
  return String(session.session_id || session.id || session.row_id || "").trim();
}

function sessionDate(session = {}) {
  return String(session.date || session.business_date || session.created_at || "").slice(0, 10);
}

function sessionEmployee(session = {}) {
  return String(session.employee || session.operator || session.staff || session.created_by || "unknown").trim() || "unknown";
}

function eventId(event = {}) {
  return String(event.event_id || event.id || event.original_event_id || "").trim();
}

function sessionEvents(session = {}) {
  return asArray(session.events || session.entries || session.entries_json || session.anchors).map((event) => clone(event));
}

function sessionRawTotals(session = {}) {
  return normalizeTotals(session.raw_totals || session.totals || session.summary || session);
}

function warning(code, message, detail = {}) {
  return { code, message, ...detail };
}

function invalidCorrection(code, message, detail = {}) {
  return { code, message, ...detail };
}

function isCorrectionSession(session = {}) {
  const text = String(session.export_text || session.text || "");
  if (/HOMELINK OWNER CORRECTION/i.test(text) || /CORRECTION ANCHORS JSON/i.test(text)) return true;
  return Boolean(session.correction || session.owner_correction_anchor);
}

function extractCorrection(session = {}) {
  const direct = session.correction || session.owner_correction_anchor;
  if (direct && typeof direct === "object") {
    const validation = validateCorrectionAnchorContract(direct);
    return {
      found: true,
      ok: validation.ok,
      correction: validation.correction,
      errors: validation.errors,
      warnings: validation.warnings,
      source_session: clone(session)
    };
  }
  const parsed = parseOwnerCorrectionAnchorText(session.export_text || session.text || "");
  return { ...parsed, source_session: clone(session) };
}

function targetKeyFor(correction = {}) {
  return String(correction.target_session_anchor || correction.target_session_id || "").trim();
}

function targetMatches(correction = {}, target = {}) {
  const targetAnchor = sessionAnchor(target);
  const targetId = sessionId(target);
  if (correction.target_session_anchor && correction.target_session_anchor !== targetAnchor) return false;
  if (correction.target_session_id && correction.target_session_id !== targetId) return false;
  return Boolean(targetAnchor || targetId);
}

function applyableCorrectionStatus(correction = {}) {
  const status = String(correction.status || "").toLowerCase();
  if (!status) return { ok: false, error: invalidCorrection("CORRECTION_STATUS_REQUIRED", "Correction status must be applied.") };
  if (NON_APPLIED_STATUSES.has(status)) {
    return { ok: false, error: invalidCorrection("CORRECTION_STATUS_NOT_APPLIED", "Correction status is not applied.", { status }) };
  }
  if (status !== "applied") {
    return { ok: false, error: invalidCorrection("CORRECTION_STATUS_UNSUPPORTED", "Correction status is unsupported.", { status }) };
  }
  return { ok: true };
}

function correctionFlagsAreSafe(correction = {}) {
  if (correction.no_hard_delete !== true) {
    return { ok: false, error: invalidCorrection("NO_HARD_DELETE_REQUIRED", "no_hard_delete must be true.") };
  }
  if (correction.original_events_immutable !== true) {
    return { ok: false, error: invalidCorrection("ORIGINAL_EVENTS_IMMUTABLE_REQUIRED", "original_events_immutable must be true.") };
  }
  return { ok: true };
}

function eventStatusIsApplied(event = {}, event_index = 0) {
  const status = String(event.status || "").toLowerCase();
  if (status !== "applied") {
    return {
      ok: false,
      error: invalidCorrection("CORRECTION_EVENT_STATUS_NOT_APPLIED", "Correction event status is not applied.", {
        event_index,
        original_event_id: event.original_event_id || "",
        status: status || "missing"
      })
    };
  }
  return { ok: true };
}

function financialEffectIsValid(event = {}, event_index = 0) {
  if (!event.financial_effect || typeof event.financial_effect !== "object" || Array.isArray(event.financial_effect)) {
    return {
      ok: false,
      error: invalidCorrection("FINANCIAL_EFFECT_REQUIRED", "Correction event requires financial_effect.", {
        event_index,
        original_event_id: event.original_event_id || ""
      })
    };
  }
  const normalized = normalizeDeltaTotals(event.financial_effect);
  const hasAnyEffect = DELTA_FIELDS.some((field) => money(normalized[field]) !== 0);
  if (!hasAnyEffect) {
    return {
      ok: false,
      error: invalidCorrection("FINANCIAL_EFFECT_EMPTY", "Correction event financial_effect must contain a non-zero delta.", {
        event_index,
        original_event_id: event.original_event_id || ""
      })
    };
  }
  return { ok: true, normalized };
}

export function parseOwnerCorrectionSessions(sessions = []) {
  const corrections = [];
  const invalid_corrections = [];

  for (const session of asArray(sessions)) {
    if (!isCorrectionSession(session)) continue;
    const parsed = extractCorrection(session);
    if (!parsed.found) continue;
    if (!parsed.ok && parsed.correction) {
      corrections.push({
        correction: clone(parsed.correction),
        source_session: clone(session),
        warnings: asArray(parsed.warnings),
        prevalidation_errors: asArray(parsed.errors)
      });
      continue;
    }
    if (!parsed.ok) {
      invalid_corrections.push(...asArray(parsed.errors).map((error) => ({
        ...error,
        source_session_anchor: sessionAnchor(session),
        source_session_id: sessionId(session)
      })));
      continue;
    }
    corrections.push({
      correction: clone(parsed.correction),
      source_session: clone(session),
      warnings: asArray(parsed.warnings),
      prevalidation_errors: []
    });
  }

  return { corrections, invalid_corrections };
}

export const discoverCorrectionAnchorSessions = parseOwnerCorrectionSessions;

export function linkCorrectionsToTargetSessions(sessions = [], correctionSessions = null) {
  const originals = asArray(sessions).filter((session) => !isCorrectionSession(session));
  const byAnchor = new Map(originals.map((session) => [sessionAnchor(session), session]));
  const byId = new Map(originals.map((session) => [sessionId(session), session]));
  const parsed = correctionSessions || parseOwnerCorrectionSessions(sessions);
  const links = [];
  const unresolved_corrections = [];

  for (const item of asArray(parsed.corrections || parsed)) {
    const correction = item.correction || item;
    const target = byAnchor.get(correction.target_session_anchor) || byId.get(correction.target_session_id);
    if (!target || !targetMatches(correction, target)) {
      unresolved_corrections.push({
        code: "TARGET_SESSION_NOT_FOUND",
        message: "Correction target session was not found.",
        target_session_anchor: correction.target_session_anchor || "",
        target_session_id: correction.target_session_id || "",
        correction_anchor_id: correction.correction_anchor_id || correction.correction_session_id || ""
      });
      continue;
    }
    links.push({
      target_session: target,
      correction,
      source_session: item.source_session || null,
      warnings: asArray(item.warnings),
      prevalidation_errors: asArray(item.prevalidation_errors)
    });
  }

  return { links, unresolved_corrections };
}

export function calculateRawCorrectionAdjustedTotals(rawTotals = {}, correctionEvents = []) {
  const totals = calculateCorrectionAdjustedTotals(normalizeTotals(rawTotals), correctionEvents);
  return {
    raw_totals: totals.original_totals,
    correction_totals: totalsToDeltaTotals(totals.correction_totals),
    adjusted_totals: totals.adjusted_totals
  };
}

function applyLinkedCorrection({ target_session, correction, source_session = null, warnings = [], prevalidation_errors = [] }, targetState, globalAppliedOriginalEvents) {
  const invalid = asArray(prevalidation_errors);
  const localWarnings = [...warnings];
  const originalEvents = sessionEvents(target_session);
  const originalEventIds = new Set(originalEvents.map(eventId).filter(Boolean));

  const statusCheck = applyableCorrectionStatus(correction);
  if (!statusCheck.ok) invalid.push(statusCheck.error);

  const flagCheck = correctionFlagsAreSafe(correction);
  if (!flagCheck.ok) invalid.push(flagCheck.error);

  const validation = validateCorrectionAnchorContract(correction, {
    original_events: originalEvents,
    require_original_event_match: true
  });
  if (!validation.ok) invalid.push(...validation.errors);
  for (const [index, event] of asArray(correction.correction_events).entries()) {
    const effect = event?.financial_effect;
    if (effect && typeof effect === "object" && !Array.isArray(effect)) {
      const normalized = normalizeDeltaTotals(effect);
      const hasAnyEffect = DELTA_FIELDS.some((field) => money(normalized[field]) !== 0);
      if (!hasAnyEffect) {
        invalid.push(invalidCorrection("FINANCIAL_EFFECT_EMPTY", "Correction event financial_effect must contain a non-zero delta.", {
          event_index: index,
          original_event_id: event.original_event_id || ""
        }));
      }
    }
  }

  if (correction.target_session_id && correction.target_session_id !== sessionId(target_session)) {
    invalid.push(invalidCorrection("TARGET_SESSION_ID_MISMATCH", "Correction target_session_id does not match target session.", {
      expected: sessionId(target_session),
      actual: correction.target_session_id
    }));
  }

  if (invalid.length) {
    targetState.invalid_corrections.push(...invalid.map((error) => ({
      ...error,
      correction_anchor_id: correction.correction_anchor_id || correction.correction_session_id || "",
      target_session_anchor: correction.target_session_anchor || ""
    })));
    targetState.warnings.push(...localWarnings);
    targetState.correction_sessions.push(clone(source_session || correction));
    return;
  }

  for (const [index, event] of asArray(correction.correction_events).entries()) {
    const originalId = String(event.original_event_id || "").trim();
    const eventInvalid = [];
    const status = eventStatusIsApplied(event, index);
    if (!status.ok) eventInvalid.push(status.error);
    const effect = financialEffectIsValid(event, index);
    if (!effect.ok) eventInvalid.push(effect.error);
    if (!originalId || !originalEventIds.has(originalId)) {
      eventInvalid.push(invalidCorrection("ORIGINAL_EVENT_ID_NOT_FOUND", "original_event_id was not found in target session.", {
        event_index: index,
        original_event_id: originalId
      }));
    }
    if (globalAppliedOriginalEvents.has(originalId)) {
      eventInvalid.push(invalidCorrection("DUPLICATE_CORRECTION_NOT_APPLIED", "Duplicate correction would double-apply the same original_event_id.", {
        event_index: index,
        original_event_id: originalId
      }));
    }

    if (eventInvalid.length) {
      targetState.invalid_corrections.push(...eventInvalid.map((error) => ({
        ...error,
        correction_anchor_id: correction.correction_anchor_id || correction.correction_session_id || "",
        target_session_anchor: correction.target_session_anchor || ""
      })));
      continue;
    }

    globalAppliedOriginalEvents.add(originalId);
    targetState.applied_correction_events.push(clone(event));
    targetState.correction_events.push(clone(event));
    targetState.correction_totals = addDeltaTotals(targetState.correction_totals, effect.normalized);
  }

  targetState.correction_sessions.push(clone(source_session || correction));
  targetState.warnings.push(...localWarnings);
}

export function applyCorrectionAnchorsInMemory(sessions = []) {
  const originals = asArray(sessions).filter((session) => !isCorrectionSession(session));
  const parsed = parseOwnerCorrectionSessions(sessions);
  const linked = linkCorrectionsToTargetSessions(sessions, parsed);
  const states = new Map();

  for (const session of originals) {
    const rawTotals = sessionRawTotals(session);
    states.set(sessionAnchor(session), {
      session: clone(session),
      session_id: sessionId(session),
      anchor: sessionAnchor(session),
      date: sessionDate(session),
      employee: sessionEmployee(session),
      raw_totals: rawTotals,
      correction_totals: zeroDeltaTotals(),
      adjusted_totals: rawTotals,
      original_events: sessionEvents(session),
      original_events_visible: true,
      correction_events: [],
      applied_correction_events: [],
      correction_events_visible: false,
      correction_sessions: [],
      invalid_corrections: [],
      warnings: [],
      correction_applied: false
    });
  }

  const appliedByTarget = new Map();
  for (const link of linked.links) {
    const anchor = sessionAnchor(link.target_session);
    const state = states.get(anchor);
    if (!state) continue;
    if (!appliedByTarget.has(anchor)) appliedByTarget.set(anchor, new Set());
    applyLinkedCorrection(link, state, appliedByTarget.get(anchor));
  }

  for (const state of states.values()) {
    const correctionAsTotals = deltaToTotals(state.correction_totals);
    state.adjusted_totals = addTotals(state.raw_totals, correctionAsTotals);
    state.correction_applied = state.applied_correction_events.length > 0;
    state.correction_events_visible = state.correction_events.length > 0;
  }

  return {
    sessions: [...states.values()],
    correction_sessions: parsed.corrections.map((item) => clone(item.source_session || item.correction)),
    invalid_corrections: [...parsed.invalid_corrections, ...linked.unresolved_corrections],
    unresolved_corrections: linked.unresolved_corrections
  };
}

function rawModeSession(state) {
  return {
    mode: "raw",
    session_id: state.session_id,
    anchor: state.anchor,
    date: state.date,
    employee: state.employee,
    totals: clone(state.raw_totals),
    raw_totals: clone(state.raw_totals),
    original_events_visible: true,
    original_events: clone(state.original_events),
    correction_applied: false,
    correction_events: [],
    warnings: clone(state.warnings),
    invalid_corrections: clone(state.invalid_corrections)
  };
}

function adjustedModeSession(state) {
  return {
    mode: "adjusted",
    session_id: state.session_id,
    anchor: state.anchor,
    date: state.date,
    employee: state.employee,
    raw_totals: clone(state.raw_totals),
    correction_totals: clone(state.correction_totals),
    adjusted_totals: clone(state.adjusted_totals),
    totals: clone(state.adjusted_totals),
    correction_applied: state.correction_applied,
    original_events_visible: true,
    original_events: clone(state.original_events),
    correction_events_visible: false,
    warnings: clone(state.warnings),
    invalid_corrections: clone(state.invalid_corrections)
  };
}

function auditModeSession(state) {
  return {
    mode: "audit",
    session_id: state.session_id,
    anchor: state.anchor,
    date: state.date,
    employee: state.employee,
    raw_totals: clone(state.raw_totals),
    correction_totals: clone(state.correction_totals),
    adjusted_totals: clone(state.adjusted_totals),
    correction_applied: state.correction_applied,
    original_events_visible: true,
    original_events: clone(state.original_events),
    correction_events_visible: state.correction_events_visible,
    correction_events: clone(state.correction_events),
    correction_sessions: clone(state.correction_sessions),
    warnings: clone(state.warnings),
    invalid_corrections: clone(state.invalid_corrections)
  };
}

function summarizeBy(sessions, keySelector) {
  const map = new Map();
  for (const session of sessions) {
    const key = keySelector(session);
    if (!map.has(key)) {
      map.set(key, {
        key,
        raw_totals: zeroTotals(),
        correction_totals: zeroDeltaTotals(),
        adjusted_totals: zeroTotals()
      });
    }
    const bucket = map.get(key);
    bucket.raw_totals = addTotals(bucket.raw_totals, session.raw_totals);
    bucket.correction_totals = addDeltaTotals(bucket.correction_totals, session.correction_totals);
    bucket.adjusted_totals = addTotals(bucket.adjusted_totals, session.adjusted_totals);
  }
  return [...map.values()];
}

export function buildRawModeView(sessions = []) {
  const applied = applyCorrectionAnchorsInMemory(sessions);
  return {
    mode: "raw",
    sessions: applied.sessions.map(rawModeSession),
    correction_sessions: [],
    invalid_corrections: clone(applied.invalid_corrections),
    unresolved_corrections: clone(applied.unresolved_corrections),
    daily_summary: summarizeBy(applied.sessions, (session) => session.date).map((entry) => ({ date: entry.key, raw_totals: entry.raw_totals })),
    employee_summary: summarizeBy(applied.sessions, (session) => session.employee).map((entry) => ({ employee: entry.key, raw_totals: entry.raw_totals }))
  };
}

export function buildAdjustedModeView(sessions = []) {
  const applied = applyCorrectionAnchorsInMemory(sessions);
  return {
    mode: "adjusted",
    sessions: applied.sessions.map(adjustedModeSession),
    correction_sessions: [],
    invalid_corrections: clone(applied.invalid_corrections),
    unresolved_corrections: clone(applied.unresolved_corrections),
    daily_summary: summarizeBy(applied.sessions, (session) => session.date).map((entry) => ({
      date: entry.key,
      raw_totals: entry.raw_totals,
      correction_totals: entry.correction_totals,
      adjusted_totals: entry.adjusted_totals
    })),
    employee_summary: summarizeBy(applied.sessions, (session) => session.employee).map((entry) => ({
      employee: entry.key,
      raw_totals: entry.raw_totals,
      correction_totals: entry.correction_totals,
      adjusted_totals: entry.adjusted_totals
    }))
  };
}

export function buildAuditModeView(sessions = []) {
  const applied = applyCorrectionAnchorsInMemory(sessions);
  return {
    mode: "audit",
    sessions: applied.sessions.map(auditModeSession),
    correction_sessions: clone(applied.correction_sessions),
    invalid_corrections: clone(applied.invalid_corrections),
    unresolved_corrections: clone(applied.unresolved_corrections),
    daily_summary: summarizeBy(applied.sessions, (session) => session.date).map((entry) => ({
      date: entry.key,
      raw_totals: entry.raw_totals,
      correction_totals: entry.correction_totals,
      adjusted_totals: entry.adjusted_totals
    })),
    employee_summary: summarizeBy(applied.sessions, (session) => session.employee).map((entry) => ({
      employee: entry.key,
      raw_totals: entry.raw_totals,
      correction_totals: entry.correction_totals,
      adjusted_totals: entry.adjusted_totals
    }))
  };
}

export function buildCorrectionAwareOwnerHistoryView(sessions = [], options = {}) {
  const mode = String(options.mode || "audit").toLowerCase();
  if (mode === "raw") return buildRawModeView(sessions);
  if (mode === "adjusted") return buildAdjustedModeView(sessions);
  return buildAuditModeView(sessions);
}
