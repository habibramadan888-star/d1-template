const ELIGIBILITY = new Set(["eligible_for_owner_review", "blocked", "already_has_stay_context"]);
const INACTIVE_STATES = new Set(["void", "voided", "deleted", "reversed"]);

function text(value, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function validMmdd(value) {
  const raw = text(value, 4);
  if (!/^\d{4}$/.test(raw)) return false;
  const month = Number(raw.slice(0, 2));
  const day = Number(raw.slice(2, 4));
  const maxDay = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] || 0;
  return day >= 1 && day <= maxDay;
}

function validFullDate(value) {
  const raw = text(value, 80);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maxDay = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  return day >= 1 && day <= maxDay;
}

function archiveActive(row = {}) {
  const state = text(row.archive_state || row.status, 40).toLowerCase();
  return !INACTIVE_STATES.has(state) && !row.voided_at && !row.reversed_at && !row.deleted_at;
}

function sourceView(row = {}) {
  return {
    corpid: text(row.corpid, 120),
    bed: text(row.bed || row.room, 80).replace(/^#/, ""),
    event_type: text(row.event_type, 80).toLowerCase(),
    source_session_id: text(row.source_session_id || row.session_id, 160),
    source_entry_id: text(row.source_entry_id || row.entry_id || row.id, 160),
    source_anchor_id: text(row.source_anchor_id || row.anchor_id || row.event_id || row.id, 160)
  };
}

function output(eligibility, fields = {}) {
  if (!ELIGIBILITY.has(eligibility)) throw new Error("LEGACY_STAY_BOOTSTRAP_ELIGIBILITY_INVALID");
  return {
    eligibility,
    genesis_event_type: "legacy_bootstrap",
    corpid: fields.corpid || "",
    bed: fields.bed || "",
    source_session_id: fields.source_session_id || null,
    source_entry_id: fields.source_entry_id || null,
    source_anchor_id: fields.source_anchor_id || null,
    move_in_mmdd: fields.move_in_mmdd || null,
    expiry_value: fields.expiry_value || null,
    deposit_d_amount: fields.deposit_d_amount ?? null,
    blockers: unique(fields.blockers),
    warnings: unique(fields.warnings)
  };
}

export function buildLegacyStayBootstrapCandidate(input = {}) {
  const corpid = text(input.corpid, 120);
  const bed = text(input.bed, 80).replace(/^#/, "");
  const bedContext = input.bed_context && typeof input.bed_context === "object" ? input.bed_context : {};
  const stayContext = bedContext.stay_context && typeof bedContext.stay_context === "object" ? bedContext.stay_context : {};
  const access = input.access_snapshot && typeof input.access_snapshot === "object" ? input.access_snapshot : {};
  const companyScope = typeof input.company_scope === "string" ? text(input.company_scope, 120) : text(input.company_scope?.corpid, 120);
  const rawSources = Array.isArray(input.canonical_sources) ? input.canonical_sources : [];
  const activeSources = rawSources.filter(archiveActive).map(sourceView).filter(source => ["rent", "deposit_in"].includes(source.event_type));
  const sourceKeys = unique(activeSources.map(source => [source.source_session_id, source.source_entry_id, source.source_anchor_id].join("|")));
  const source = sourceKeys.length === 1 ? activeSources.find(candidate => [candidate.source_session_id, candidate.source_entry_id, candidate.source_anchor_id].join("|") === sourceKeys[0]) : null;
  const moveInMmdd = text(access.parsed_checkin_mmdd || access.move_in_mmdd, 20);
  const expiryValue = text(access.normalized_expiry_value || access.expiry_value, 80);
  const depositProvided = access.parsed_deposit_amount !== null && access.parsed_deposit_amount !== undefined && access.parsed_deposit_amount !== "";
  const depositAmount = depositProvided && Number.isFinite(Number(access.parsed_deposit_amount)) ? Number(access.parsed_deposit_amount) : null;
  const blockers = [];
  const warningList = [];

  if (bed === "334") blockers.push("BED_334_FORBIDDEN");
  if (stayContext.status === "registry_conflict") blockers.push("STAY_CONTEXT_REGISTRY_CONFLICT");
  const existingStay = ["confirmed", "canonical_only_pending_registry"].includes(stayContext.status) && !!text(stayContext.stay_context_id, 160);
  if (existingStay && !blockers.length) {
    if (!depositProvided || depositAmount === null) warningList.push("DEPOSIT_D_MISSING");
    return output("already_has_stay_context", { corpid, bed, move_in_mmdd: moveInMmdd, expiry_value: expiryValue, deposit_d_amount: depositAmount, warnings: warningList });
  }
  if (companyScope && companyScope !== corpid) blockers.push("CORPID_MISMATCH");
  if (access.corpid && text(access.corpid, 120) !== corpid) blockers.push("CORPID_MISMATCH");
  if (access.parsed_vacancy_marker === true || access.physical_bed_status_source === "access_snapshot_E_marker") blockers.push("TTLOCK_E_VACANT");
  if (!moveInMmdd) blockers.push("MOVE_IN_MMDD_MISSING");
  else if (!validMmdd(moveInMmdd)) blockers.push("MOVE_IN_MMDD_INVALID");
  if (!expiryValue) blockers.push("EXPIRY_VALUE_MISSING");
  else if (!validFullDate(expiryValue)) blockers.push("EXPIRY_VALUE_INVALID");
  if (!sourceKeys.length) blockers.push("CANONICAL_SOURCE_ANCHOR_MISSING");
  if (sourceKeys.length > 1) blockers.push("MULTIPLE_CANONICAL_SOURCE_ANCHORS");
  if (source && source.corpid !== corpid) blockers.push("CORPID_MISMATCH");
  if (source && source.bed && source.bed !== bed) blockers.push("CANONICAL_SOURCE_ANCHOR_MISSING");
  if (!depositProvided || depositAmount === null) warningList.push("DEPOSIT_D_MISSING");

  const eligibility = blockers.length ? "blocked" : "eligible_for_owner_review";
  return output(eligibility, {
    corpid,
    bed,
    source_session_id: source?.source_session_id,
    source_entry_id: source?.source_entry_id,
    source_anchor_id: source?.source_anchor_id,
    move_in_mmdd: validMmdd(moveInMmdd) ? moveInMmdd : null,
    expiry_value: validFullDate(expiryValue) ? expiryValue : null,
    deposit_d_amount: depositAmount,
    blockers,
    warnings: warningList
  });
}
