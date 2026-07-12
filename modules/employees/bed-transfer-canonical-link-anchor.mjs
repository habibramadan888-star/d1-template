const SERVER_FIELDS = new Set(["transferanchorid", "transferlineageid", "previoustransferanchorid", "sourcecontextanchorrefs", "carriedarrearsrefs", "rentcoverageref", "depositcontextref", "expirycontextref", "snapshotfingerprint", "snapshotprovenance", "currentbed", "corpid", "companyscope", "staycontextid", "lifecycle", "lifecyclestatus", "status", "void", "voided", "voidedat", "voidstatus", "reversalstatus"]);
const IDENTITY_FIELDS = new Set([
  "tenantcardid", "cardid", "oldttlockref", "providerphone", "phone99099",
  "creatorphone", "creatortime", "cardcreationtime", "providermetadata",
  "ttlockprovidermetadata", "localcache", "uitext", "preview", "whatsapptext"
]);

const clean = value => String(value ?? "").trim();
const key = value => clean(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
const bed = value => clean(value).replace(/^#+/, "");
const money = value => value === "" || value == null ? null : Number(value);
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];

function collectForbidden(value, output = new Set(), seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return output;
  seen.add(value);
  if (Array.isArray(value)) value.forEach(item => collectForbidden(item, output, seen));
  else Object.entries(value).forEach(([name, child]) => {
    if (SERVER_FIELDS.has(key(name)) || IDENTITY_FIELDS.has(key(name))) output.add(name);
    collectForbidden(child, output, seen);
  });
  return output;
}

export function findCanonicalTransferLinkForbiddenFields(value) {
  return [...collectForbidden(value)].sort((a, b) => a.localeCompare(b));
}

function fail(error_code, invalid_fields = [], missing_fields = []) {
  return { ok: false, error_code, invalid_fields, missing_fields, no_write: true };
}

function exactOpaque(value) {
  return clean(value).length >= 16;
}

function validateFee(input) {
  const mode = clean(input.fee_mode).toLowerCase();
  const amount = money(input.fee_amount_aed);
  if (!['paid', 'waived', 'unpaid'].includes(mode)) return fail('BED_TRANSFER_FEE_MODE_INVALID', ['fee_mode']);
  if (mode === 'paid' && amount !== 50) return fail('BED_TRANSFER_FEE_AMOUNT_INVALID', ['fee_amount_aed']);
  if (mode === 'waived' && amount !== 0) return fail('BED_TRANSFER_FEE_AMOUNT_INVALID', ['fee_amount_aed']);
  if (mode === 'waived' && !clean(input.fee_waiver_reason)) return fail('BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED', [], ['fee_waiver_reason']);
  if (mode === 'unpaid' && amount !== 50) return fail('BED_TRANSFER_FEE_AMOUNT_INVALID', ['fee_amount_aed']);
  if (mode === 'unpaid' && !/^\d{4}-\d{2}-\d{2}$/.test(clean(input.fee_due_date))) return fail('BED_TRANSFER_FEE_DUE_DATE_REQUIRED', [], ['fee_due_date']);
  return { ok: true, mode, amount };
}

export function buildBedTransferCanonicalLinkAnchor(input = {}, options = {}) {
  const forbidden = findCanonicalTransferLinkForbiddenFields(input.client_payload || {});
  if (forbidden.length) return { ...fail(SERVER_FIELDS.has(key(forbidden[0])) ? 'BED_TRANSFER_SERVER_MANAGED_FIELD_FORBIDDEN' : 'BED_TRANSFER_FORBIDDEN_IDENTITY_FIELD', forbidden), forbidden_fields: forbidden, before_db: true };
  const fromBed = bed(input.from_bed);
  const toBed = bed(input.to_bed);
  if (!fromBed || !toBed) return fail('BED_TRANSFER_REQUIRED_FIELD_MISSING', [], [!fromBed ? 'from_bed' : '', !toBed ? 'to_bed' : ''].filter(Boolean));
  if (fromBed === '334' || toBed === '334') return fail('BED_TRANSFER_334_FORBIDDEN', ['from_bed', 'to_bed']);
  if (fromBed === toBed) return fail('BED_TRANSFER_SAME_BED_NOT_ALLOWED', ['from_bed', 'to_bed']);
  const corpid = clean(input.corpid);
  const source = input.canonical_source_context || {};
  const target = input.canonical_target_context || {};
  if (!corpid || clean(source.corpid) !== corpid || clean(target.corpid) !== corpid) return fail('BED_TRANSFER_COMPANY_SCOPE_MISMATCH', ['corpid']);
  if (source.physical_bed_status === 'vacant' || source.parsed_vacancy_marker === true) return fail('BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT', ['canonical_source_context']);
  if (target.physical_bed_status !== 'vacant' || target.parsed_vacancy_marker !== true) return fail('BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT', ['canonical_target_context']);
  if (!['confirmed','resolved'].includes(source.resolution_status) || Number(source.candidate_count??source.candidate_group_count) !== 1) return fail('BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS', ['canonical_source_context']);
  const refs = unique(source.source_context_anchor_refs);
  if (!refs.length || refs.length !== (source.source_context_anchor_refs || []).length) return fail('BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS', ['source_context_anchor_refs']);
  for (const field of ['rent_coverage_ref', 'deposit_context_ref', 'expiry_context_ref']) if (!exactOpaque(source[field])) return fail(`BED_TRANSFER_${field.toUpperCase()}_UNAVAILABLE`, [field]);
  const arrears = Array.isArray(source.open_arrears) ? source.open_arrears : [];
  const carried = arrears.map(row => clean(row.arrears_ref || row.cloud_arrears_ref));
  if (carried.some(ref => !ref) || unique(carried).length !== carried.length) return fail('BED_TRANSFER_ARREARS_REFS_INVALID', ['open_arrears']);
  const fee = validateFee(input);
  if (!fee.ok) return fee;
  const active = input.active_lineage || null;
  if (active && bed(active.current_bed) !== fromBed) return fail('BED_TRANSFER_LINEAGE_DISCONTINUOUS', ['from_bed']);
  if (active && (!exactOpaque(active.transfer_lineage_id) || !exactOpaque(active.last_active_transfer_anchor_id))) return fail('BED_TRANSFER_PREVIOUS_ANCHOR_INVALID', ['active_lineage']);
  const idFactory = options.idFactory || (() => null);
  const transferAnchorId = idFactory('transfer_anchor_id');
  const lineageId = active ? clean(active.transfer_lineage_id) : idFactory('transfer_lineage_id');
  return {
    ok: true, event_type: 'bed_transfer', type: 'TF',
    transfer_anchor_id: transferAnchorId,
    transfer_lineage_id: lineageId,
    previous_transfer_anchor_id: active ? clean(active.last_active_transfer_anchor_id) : null,
    from_bed: fromBed, to_bed: toBed, transfer_at: clean(input.transfer_at), corpid,
    source_context_anchor_refs: refs,
    carried_arrears_refs: carried,
    rent_coverage_ref: clean(source.rent_coverage_ref),
    deposit_context_ref: clean(source.deposit_context_ref),
    expiry_context_ref: clean(source.expiry_context_ref),
    fee_mode: fee.mode, fee_amount_aed: fee.amount,
    fee_due_date: fee.mode === 'unpaid' ? clean(input.fee_due_date) : '',
    fee_waiver_reason: fee.mode === 'waived' ? clean(input.fee_waiver_reason) : '',
    finance_effect: { rent_income: 0, deposit_received: 0, deposit_refund: 0, arrears_repaid: 0, expense: 0 },
    id_generation: transferAnchorId && lineageId ? 'server_generated_preview' : 'server_generated_on_write',
    readonly: true, no_write: true
  };
}
