const clean = value => String(value ?? '').trim();
const bed = value => clean(value).replace(/^#+/, '');
const asArray = value => Array.isArray(value) ? value : [];
const typeOf = row => clean(row?.event_type || row?.type).toLowerCase();
const transferRef = row => clean(row?.transfer_anchor_id || row?.anchor_ref || row?.anchor_id || row?.event_id || row?.id);
const targetRef = row => clean(row?.target_transfer_anchor_id || row?.reversal_of_transfer_anchor_id || row?.original_transfer_anchor_id || row?.original_event_id);
const replacementRef = row => clean(row?.replacement_for_transfer_anchor_id || row?.replaces_transfer_anchor_id || row?.corrects_transfer_anchor_id);
const inactive = row => ['void','voided','deleted','reversed','cancelled','inactive'].includes(clean(row?.effective_status || row?.archive_state || row?.status).toLowerCase());
const acceptedAt = row => clean(row?.canonical_accepted_at || row?.accepted_at || row?.transfer_at || row?.created_at);
const key = value => clean(value).replace(/[^a-z0-9]/gi, '').toLowerCase();

export const BED_TRANSFER_TODO_CODES = Object.freeze({
  TTLOCK: 'BED_TRANSFER_TTLOCK_MOVE_REQUIRED',
  WAIVER: 'BED_TRANSFER_FEE_WAIVER_REVIEW_REQUIRED',
  FINANCIAL: 'BED_TRANSFER_VOID_FINANCIAL_RECONCILIATION_REQUIRED'
});

function effectiveState(entries) {
  const raw = asArray(entries).filter(row => typeOf(row) === 'bed_transfer');
  const byId = new Map();
  const warnings = [];
  for (const row of raw) {
    const id = transferRef(row);
    if (!id) { warnings.push({ code: 'BED_TRANSFER_TODO_ANCHOR_REF_REQUIRED' }); continue; }
    if (byId.has(id)) { warnings.push({ code: 'BED_TRANSFER_TODO_ANCHOR_CONFLICT', transfer_anchor_id: id }); continue; }
    byId.set(id, row);
  }
  const inactiveIds = new Set();
  const voidsByTarget = new Map();
  for (const row of byId.values()) {
    if (inactive(row)) inactiveIds.add(transferRef(row));
    if (replacementRef(row)) inactiveIds.add(replacementRef(row));
  }
  for (const row of entries) {
    if (['void','void_transfer','transfer_void','reversal','transfer_reversal'].includes(typeOf(row))) {
      const target = targetRef(row);
      if (target) {
        inactiveIds.add(target);
        const list = voidsByTarget.get(target) || [];
        list.push(row);
        voidsByTarget.set(target, list);
      }
    }
  }
  return { raw: [...byId.values()], effective: [...byId.values()].filter(row => !inactiveIds.has(transferRef(row))), inactiveIds, voidsByTarget, warnings };
}

export function findEffectiveBedTransferAnchor(entries, transferAnchorId) {
  const state = effectiveState(asArray(entries));
  return state.effective.find(row => transferRef(row) === clean(transferAnchorId)) || null;
}

function snapshotView(snapshot) {
  if (!snapshot) return { status: 'missing', physical_bed_status: 'unknown', warnings: ['TTLOCK_SNAPSHOT_MISSING'] };
  return {
    status: clean(snapshot.parse_status || 'unknown'),
    snapshot_fingerprint: clean(snapshot.snapshot_fingerprint),
    physical_bed_status: clean(snapshot.physical_bed_status || (snapshot.parsed_vacancy_marker ? 'vacant' : 'not_marked_vacant')),
    parsed_vacancy_marker: snapshot.parsed_vacancy_marker === true,
    parsed_deposit_amount: snapshot.parsed_deposit_amount ?? null,
    parsed_checkin_mmdd: clean(snapshot.parsed_checkin_mmdd),
    normalized_expiry_value: clean(snapshot.normalized_expiry_value || snapshot.parsed_valid_until_mmdd),
    warnings: asArray(snapshot.warnings).map(clean).filter(Boolean)
      .concat(snapshot.ambiguous === true || Number(snapshot.candidate_count || 1) !== 1 ? ['TTLOCK_SNAPSHOT_AMBIGUOUS'] : [])
  };
}

function ttlockResolution(anchor, snapshots) {
  const source = snapshotView(snapshots[bed(anchor.from_bed)]);
  const target = snapshotView(snapshots[bed(anchor.to_bed)]);
  const warnings = [...source.warnings, ...target.warnings];
  const sourceInvalid = ['missing','ambiguous','invalid','unparsed','unavailable','stale','conflict'].includes(source.status.toLowerCase()) || source.warnings.includes('TTLOCK_SNAPSHOT_AMBIGUOUS');
  const targetInvalid = ['missing','ambiguous','invalid','unparsed','unavailable','stale','conflict'].includes(target.status.toLowerCase()) || target.warnings.includes('TTLOCK_SNAPSHOT_AMBIGUOUS');
  const sourceVacant = source.parsed_vacancy_marker && source.physical_bed_status === 'vacant';
  const targetVacant = target.parsed_vacancy_marker && target.physical_bed_status === 'vacant';
  if (source.status === 'missing' || target.status === 'missing') warnings.push('BED_TRANSFER_TTLOCK_CONTEXT_MISSING');
  if (sourceInvalid || targetInvalid) warnings.push('BED_TRANSFER_TTLOCK_CONTEXT_AMBIGUOUS_OR_INVALID');
  if (!sourceVacant && !targetVacant) warnings.push('BED_TRANSFER_TTLOCK_BOTH_OCCUPIED');
  if (sourceVacant && targetVacant) warnings.push('BED_TRANSFER_TTLOCK_BOTH_VACANT');
  if (target.parsed_deposit_amount === null) warnings.push('BED_TRANSFER_TARGET_D_MISSING');
  if (!target.parsed_checkin_mmdd) warnings.push('BED_TRANSFER_TARGET_MMDD_MISSING');
  if (!target.normalized_expiry_value) warnings.push('BED_TRANSFER_TARGET_EXPIRY_MISSING');
  const expected = clean(anchor.expected_checkin_mmdd || anchor.continuity_checks?.expected_checkin_mmdd);
  if (expected && target.parsed_checkin_mmdd && expected !== target.parsed_checkin_mmdd) warnings.push('BED_TRANSFER_TARGET_MMDD_CONTINUITY_MISMATCH');
  const resolved = !sourceInvalid && !targetInvalid && sourceVacant && !targetVacant && target.parsed_deposit_amount !== null && !!target.parsed_checkin_mmdd && !!target.normalized_expiry_value && (!expected || expected === target.parsed_checkin_mmdd);
  return { resolved, source, target, warnings: [...new Set(warnings)] };
}

function todo(code, anchor, fields = {}) {
  const id = transferRef(anchor);
  return {
    task_id: `${code}__${id}`,
    task_type: code,
    category: fields.category || 'bed_transfer_reconciliation',
    severity: fields.severity || 'high',
    bed: bed(anchor.to_bed || anchor.from_bed),
    event_id: id,
    transfer_anchor_id: id,
    transfer_lineage_id: clean(anchor.transfer_lineage_id),
    from_bed: bed(anchor.from_bed),
    to_bed: bed(anchor.to_bed),
    corpid: clean(anchor.corpid),
    transfer_at: acceptedAt(anchor),
    status: fields.status || 'open',
    title: fields.title || code,
    description: fields.description || '',
    recommended_action: fields.recommended_action || '',
    auto_resolve_condition: fields.auto_resolve_condition || '',
    warnings: fields.warnings || [],
    source_gateway: fields.source_gateway || 'canonical_event_archive',
    source_proof: {
      source_layer: 'canonical_event_archive_and_gateways',
      canonical_anchor_id: id,
      derived_queue: true,
      source_of_truth: false,
      provider_identity_excluded: true,
      ...(fields.source_proof || {})
    },
    ...(fields.extra || {})
  };
}

export function projectBedTransferOwnerTodos(input = {}) {
  const corpid = clean(input.corpid);
  const entries = asArray(input.archive_entries);
  if (!corpid || entries.some(row => clean(row?.corpid) && clean(row.corpid) !== corpid)) return { ok: false, error_code: 'BED_TRANSFER_TODO_CORPID_MISMATCH', todos: [], warnings: [], readonly: true, no_write: true };
  const state = effectiveState(entries);
  const acknowledgments = new Set(entries.filter(row => typeOf(row) === 'owner_review_acknowledgment' && clean(row.action) === 'acknowledged' && clean(row.review_code) === BED_TRANSFER_TODO_CODES.WAIVER).map(row => clean(row.target_transfer_anchor_id)));
  const todos = [];
  for (const anchor of state.effective.sort((a,b) => acceptedAt(a).localeCompare(acceptedAt(b)) || transferRef(a).localeCompare(transferRef(b)))) {
    if (bed(anchor.from_bed) === '334' || bed(anchor.to_bed) === '334') continue;
    if (clean(anchor.ttlock_sequence) === 'employee_first_pre_move' && anchor.reconciliation_required === true) {
      const resolution = ttlockResolution(anchor, input.access_snapshots || {});
      if (!resolution.resolved) todos.push(todo(BED_TRANSFER_TODO_CODES.TTLOCK, anchor, {
        title: 'TTLock move required after Bed Transfer',
        description: 'Canonical transfer is effective but current TTLock physical state has not reached the valid post-move state.',
        recommended_action: `Move TTLock physical state from bed ${bed(anchor.from_bed)} to bed ${bed(anchor.to_bed)}; do not submit another employee event.`,
        auto_resolve_condition: 'Source is E/e vacant; target is occupied with valid D, MMDD and expiry; known MMDD continuity matches.',
        warnings: resolution.warnings,
        source_gateway: 'canonical_event_archive + access_snapshot_gateway',
        source_proof: { source_snapshot_fingerprint: clean(anchor.source_snapshot_fingerprint), target_snapshot_fingerprint: clean(anchor.target_snapshot_fingerprint) },
        extra: { source_snapshot_fingerprint: clean(anchor.source_snapshot_fingerprint), target_snapshot_fingerprint: clean(anchor.target_snapshot_fingerprint), current_source_physical_state: resolution.source, current_target_physical_state: resolution.target, expected_action_summary: 'Complete the physical TTLock move and verify D/MMDD/expiry continuity.' }
      }));
    }
    if (clean(anchor.fee_mode) === 'waived' && Number(anchor.fee_amount_aed ?? 0) === 0 && clean(anchor.fee_waiver_reason) && !acknowledgments.has(transferRef(anchor))) {
      todos.push(todo(BED_TRANSFER_TODO_CODES.WAIVER, anchor, {
        category: 'owner_review', severity: 'medium', title: 'Review Bed Transfer fee waiver',
        description: 'A Bed Transfer fee was waived with an employee-entered reason and has not been acknowledged by an owner.',
        recommended_action: 'Review the waiver reason and acknowledge that it was seen. This is not an approval or rejection.',
        auto_resolve_condition: 'An effective owner acknowledgment anchor exists, or the transfer is voided/corrected out/reversed.',
        extra: { fee_waiver_reason: clean(anchor.fee_waiver_reason), operator_reference: clean(anchor.operator_reference || anchor.operator), acknowledgment_action: 'acknowledged' }
      }));
    }
  }
  for (const anchor of state.raw.filter(row => state.inactiveIds.has(transferRef(row)))) {
    if (bed(anchor.from_bed) === '334' || bed(anchor.to_bed) === '334') continue;
    if ((state.voidsByTarget.get(transferRef(anchor)) || []).some(row => clean(row?.financial_disposition) === 'retain_earned_income')) continue;
    const paidFee = clean(anchor.fee_mode) === 'paid' && Number(anchor.fee_amount_aed || 0) > 0;
    const paidDifference = clean(anchor.bed_price_difference_mode) === 'paid' && Number(anchor.bed_price_difference_amount_aed || 0) > 0;
    if (!paidFee && !paidDifference) continue;
    todos.push(todo(BED_TRANSFER_TODO_CODES.FINANCIAL, anchor, {
      category: 'finance_reconciliation', severity: 'high',
      title: 'Reconcile cash after voided Bed Transfer',
      description: 'The transfer is no longer effective and effective income is zero, but canonical facts do not prove whether collected cash was refunded.',
      recommended_action: 'Perform manual financial reconciliation. No refund or income restoration is generated automatically.',
      auto_resolve_condition: 'Remains active until an existing formally defined reconciliation/correction contract proves resolution.',
      warnings: ['NO_FORMAL_REFUND_RECONCILIATION_EVIDENCE'],
      source_gateway: 'canonical_event_archive + canonical_finance_projection_gateway',
      extra: { paid_transfer_fee_amount: paidFee ? Number(anchor.fee_amount_aed) : 0, paid_bed_price_difference_amount: paidDifference ? Number(anchor.bed_price_difference_amount_aed) : 0, automatic_refund_created: false, effective_income_amount: 0 }
    }));
  }
  const deduped = [...new Map(todos.map(row => [row.task_id, row])).values()];
  return { ok: true, error_code: '', todos: deduped, warnings: state.warnings, raw_transfer_count: state.raw.length, effective_transfer_count: state.effective.length, readonly: true, no_write: true };
}

const ACK_FORBIDDEN = new Set(['corpid','transferlineageid','frombed','tobed','feeamount','feemode','feewaiverreason','sourceeventtype','sourceanchorref','staycontextid','tenantcardid','cardid','providerphone','phone99099','providermetadata','ttlockmetadata','status','void','voidedat']);
export function findOwnerReviewAcknowledgmentForbiddenFields(value) {
  const found = new Set();
  const visit = (node, path = '') => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((row,index) => visit(row, `${path}[${index}]`));
    for (const [field, child] of Object.entries(node)) {
      const next = path ? `${path}.${field}` : field;
      if (ACK_FORBIDDEN.has(key(field)) && child !== '' && child != null) found.add(next);
      if (child && typeof child === 'object') visit(child, next);
    }
  };
  visit(value);
  return [...found].sort();
}

export function prepareOwnerReviewAcknowledgment(input = {}, options = {}) {
  const request = input.request || {};
  const forbidden = findOwnerReviewAcknowledgmentForbiddenFields(request);
  if (forbidden.length) return { ok: false, error_code: 'OWNER_REVIEW_ACK_SERVER_FIELD_FORBIDDEN', invalid_fields: forbidden, no_write: true };
  const transfer = input.effective_transfer || {};
  if (clean(request.review_code) !== BED_TRANSFER_TODO_CODES.WAIVER || clean(request.action) !== 'acknowledged') return { ok: false, error_code: 'OWNER_REVIEW_ACK_CONTRACT_INVALID', no_write: true };
  if (!clean(request.transfer_anchor_id) || clean(request.transfer_anchor_id) !== transferRef(transfer)) return { ok: false, error_code: 'OWNER_REVIEW_ACK_TRANSFER_NOT_EFFECTIVE', no_write: true };
  if (clean(input.corpid) !== clean(transfer.corpid)) return { ok: false, error_code: 'OWNER_REVIEW_ACK_CORPID_MISMATCH', no_write: true };
  if (clean(transfer.fee_mode) !== 'waived' || Number(transfer.fee_amount_aed ?? 0) !== 0 || !clean(transfer.fee_waiver_reason)) return { ok: false, error_code: 'OWNER_REVIEW_ACK_NOT_APPLICABLE', no_write: true };
  const acceptedAt = clean(input.accepted_at);
  const fingerprint = [clean(input.corpid), transferRef(transfer), BED_TRANSFER_TODO_CODES.WAIVER, 'acknowledged'].join('|');
  const idFactory = options.idFactory || (() => '');
  const anchorId = idFactory('acknowledgment_anchor_id');
  const sessionId = idFactory('acknowledgment_session_id');
  const entry = { id: anchorId, event_id: anchorId, anchor_id: anchorId, event_type: 'owner_review_acknowledgment', type: 'OWNER_ACK', acknowledgment_anchor_id: anchorId, target_transfer_anchor_id: transferRef(transfer), review_code: BED_TRANSFER_TODO_CODES.WAIVER, action: 'acknowledged', corpid: clean(input.corpid), acknowledged_at: acceptedAt, acknowledged_by: clean(input.owner_reference), canonical_fingerprint: fingerprint, source: 'owner_canonical_acknowledgment', finance_effect: { gross_received: 0, rent_income: 0, bed_transfer_fee_income: 0, bed_price_difference_income: 0 }, transfer_status_mutated: false };
  return { ok: true, entry, acknowledgment_anchor_id: anchorId, acknowledgment_session_id: sessionId, canonical_fingerprint: fingerprint, entries_json: JSON.stringify({ anchor_contract_version: 'owner_review_acknowledgment_v1', entries: [entry] }) };
}
