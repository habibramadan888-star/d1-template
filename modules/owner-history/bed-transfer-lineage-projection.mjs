const clean = value => String(value ?? '').trim();

const inactiveStates = new Set(['void', 'voided', 'deleted', 'reversed', 'cancelled', 'inactive']);
const asArray = value => Array.isArray(value) ? value : [];
const unique = values => [...new Set(asArray(values).map(clean).filter(Boolean))];
const eventType = row => clean(row?.event_type || row?.type).toLowerCase();
const anchorRef = row => clean(
  row?.transfer_anchor_id || row?.anchor_ref || row?.anchor_id ||
  row?.event_id || row?.entry_ref || row?.entry_id || row?.id
);
const acceptedAt = row => clean(
  row?.canonical_accepted_at || row?.accepted_at || row?.transfer_at ||
  row?.created_at || row?.updated_at
);
const originalBed = row => clean(row?.original_bed || row?.bed || row?.room || row?.to_bed);
const effectiveState = row => {
  const state = clean(row?.effective_status || row?.archive_state || row?.status || 'active').toLowerCase();
  return inactiveStates.has(state) ? state : (state === 'corrected' ? 'corrected' : 'active');
};
const targetTransferRef = row => clean(
  row?.target_transfer_anchor_id || row?.reversal_of_transfer_anchor_id ||
  row?.voids_transfer_anchor_id || row?.original_transfer_anchor_id || row?.original_event_id
);
const replacementTargetRef = row => clean(
  row?.replacement_for_transfer_anchor_id || row?.replaces_transfer_anchor_id ||
  row?.corrects_transfer_anchor_id
);
const stableSort = rows => [...rows].sort((left, right) => {
  const time = acceptedAt(left).localeCompare(acceptedAt(right));
  return time || anchorRef(left).localeCompare(anchorRef(right));
});

function errorProjection(code, requestedBed, warnings = []) {
  return {
    ok: false,
    error_code: code,
    status: 'fail_closed',
    transfer_lineage_id: '',
    requested_bed: requestedBed,
    effective_current_bed: '',
    historical_beds: [],
    active_transfer_anchor_ids: [],
    raw_transfer_events: [],
    effective_transfer_events: [],
    canonical_history_entries: [],
    source_context_anchor_refs: [],
    current_leg_anchor_refs: [],
    warnings: unique([code, ...warnings])
  };
}

function lineageView(row) {
  return {
    session_ref: clean(row?.session_ref || row?.session_id),
    entry_ref: clean(row?.entry_ref || row?.entry_id || row?.event_id || row?.id),
    anchor_ref: anchorRef(row),
    event_type: eventType(row),
    original_bed: originalBed(row),
    effective_status: effectiveState(row),
    canonical_accepted_at: acceptedAt(row),
    corpid: clean(row?.corpid),
    transfer_anchor_id: clean(row?.transfer_anchor_id),
    transfer_lineage_id: clean(row?.transfer_lineage_id),
    previous_transfer_anchor_id: clean(row?.previous_transfer_anchor_id) || null,
    from_bed: clean(row?.from_bed),
    to_bed: clean(row?.to_bed),
    source_context_anchor_refs: unique(row?.source_context_anchor_refs),
    stay_context_id: clean(row?.stay_context_id),
    property_id: clean(row?.property_id),
    amount: row?.amount ?? null,
    paid_amount: row?.paid_amount ?? null,
    deposit_amount: row?.deposit_amount ?? null,
    arrears_amount: row?.arrears_amount ?? null,
    fee_amount: row?.fee_amount ?? row?.fee_amount_aed ?? null
  };
}

function logicalLineage(rawTransfers, archiveEntries) {
  const replacementByOriginal = new Map();
  for (const row of rawTransfers) {
    const target = replacementTargetRef(row);
    if (target) replacementByOriginal.set(target, anchorRef(row));
  }
  const inactiveTargets = new Set();
  for (const row of archiveEntries) {
    const type = eventType(row);
    if (['void', 'void_transfer', 'transfer_void', 'reversal', 'transfer_reversal'].includes(type)) {
      const target = targetTransferRef(row);
      if (!target) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY' };
      inactiveTargets.add(target);
    }
  }
  for (const row of rawTransfers) {
    if (inactiveStates.has(effectiveState(row))) inactiveTargets.add(anchorRef(row));
    if (replacementByOriginal.has(anchorRef(row))) inactiveTargets.add(anchorRef(row));
  }

  const allById = new Map();
  for (const row of rawTransfers) {
    const id = anchorRef(row);
    if (!id || allById.has(id)) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS' };
    allById.set(id, row);
  }
  const active = rawTransfers.filter(row => !inactiveTargets.has(anchorRef(row)));
  const activeById = new Map(active.map(row => [anchorRef(row), row]));
  const resolvePrevious = row => {
    let previous = clean(row?.previous_transfer_anchor_id);
    const visited = new Set();
    while (previous && replacementByOriginal.has(previous) && !visited.has(previous)) {
      visited.add(previous);
      previous = replacementByOriginal.get(previous);
    }
    return previous;
  };

  if (!active.length) {
    const logicalRoots = rawTransfers.filter(row => !clean(row?.previous_transfer_anchor_id) && !replacementTargetRef(row));
    if (logicalRoots.length !== 1) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS' };
    return {
      ordered: [],
      current_bed: clean(logicalRoots[0].from_bed),
      historical_beds: [clean(logicalRoots[0].from_bed)].filter(Boolean),
      inactiveTargets
    };
  }

  const roots = active.filter(row => !resolvePrevious(row));
  if (roots.length !== 1) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY' };
  const ordered = [];
  const visited = new Set();
  let current = roots[0];
  while (current) {
    const id = anchorRef(current);
    if (visited.has(id)) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY' };
    visited.add(id);
    ordered.push(current);
    const next = active.filter(row => resolvePrevious(row) === id);
    if (next.length > 1) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS' };
    if (next.length && clean(current.to_bed) !== clean(next[0].from_bed)) {
      return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY' };
    }
    current = next[0] || null;
  }
  if (visited.size !== activeById.size) return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY' };
  return {
    ordered,
    current_bed: clean(ordered.at(-1).to_bed),
    historical_beds: [clean(ordered[0].from_bed), ...ordered.map(row => clean(row.to_bed))].filter(Boolean),
    inactiveTargets
  };
}

function currentLeg(entries, lineage, requestedCorpid) {
  if (!lineage.ordered.length) return { rows: [], refs: [] };
  const lastTransfer = lineage.ordered.at(-1);
  const cutoff = acceptedAt(lastTransfer);
  const currentBed = clean(lineage.current_bed);
  const transferContext = clean(lastTransfer?.stay_context_id || lastTransfer?.context_id);
  const activeTransferIds = new Set(lineage.ordered.map(anchorRef));
  const timeline = stableSort(entries.filter(row => {
    if (clean(row?.corpid) !== requestedCorpid) return false;
    if (acceptedAt(row) <= cutoff) return false;
    if (eventType(row) === 'bed_transfer') return clean(row?.from_bed) === currentBed;
    if (['void', 'void_transfer', 'transfer_void', 'correction', 'transfer_correction', 'reversal', 'transfer_reversal'].includes(eventType(row))) {
      return activeTransferIds.has(targetTransferRef(row)) || clean(row?.transfer_lineage_id) === clean(lastTransfer.transfer_lineage_id);
    }
    if (originalBed(row) !== currentBed) return false;
    return effectiveState(row) === 'active' || effectiveState(row) === 'corrected';
  }));
  const candidates = timeline.filter(row => eventType(row) !== 'bed_transfer');
  const contexts = unique(candidates.map(row => row?.stay_context_id || row?.context_id));
  if (!transferContext && contexts.length > 1) {
    return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS' };
  }
  const selectedContext = transferContext || contexts[0] || '';
  const rows = [];
  for (const row of timeline) {
    const context = clean(row?.stay_context_id || row?.context_id);
    if (selectedContext && context && context !== selectedContext) continue;
    const type = eventType(row);
    if (type === 'bed_transfer') {
      if (lineage.inactiveTargets?.has(anchorRef(row))) break;
      return { error_code: 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS' };
    }
    if (['void', 'void_transfer', 'transfer_void', 'correction', 'transfer_correction', 'reversal', 'transfer_reversal'].includes(type)) break;
    rows.push(row);
    if (['checkout', 'left_with_arrears', 'customer_left_with_arrears'].includes(type)) break;
  }
  return { rows, refs: unique(rows.map(anchorRef)) };
}

export function projectOwnerHistoryTransferLineage(input = {}) {
  const requestedBed = clean(input.requested_bed);
  const requestedCorpid = clean(input.corpid);
  const requestedLineageId = clean(input.transfer_lineage_id);
  const archiveEntries = asArray(input.archive_entries);
  const rawTransfers = archiveEntries.filter(row => eventType(row) === 'bed_transfer');
  if (!requestedBed || !rawTransfers.length) {
    return {
      ok: true,
      status: 'not_applicable',
      transfer_lineage_id: '',
      requested_bed: requestedBed,
      effective_current_bed: requestedBed,
      historical_beds: [],
      active_transfer_anchor_ids: [],
      raw_transfer_events: [],
      effective_transfer_events: [],
      canonical_history_entries: [],
      source_context_anchor_refs: [],
      current_leg_anchor_refs: [],
      warnings: []
    };
  }
  if (!requestedCorpid || archiveEntries.some(row => clean(row?.corpid) && clean(row.corpid) !== requestedCorpid)) {
    return errorProjection('OWNER_HISTORY_TRANSFER_LINEAGE_CORPID_MISMATCH', requestedBed);
  }
  if (archiveEntries.some(row => ['reversal', 'transfer_reversal'].includes(eventType(row)) && !targetTransferRef(row))) {
    return errorProjection('OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY', requestedBed);
  }

  const groups = new Map();
  for (const row of rawTransfers) {
    const id = clean(row?.transfer_lineage_id);
    if (!id) return errorProjection('OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS', requestedBed);
    const rows = groups.get(id) || [];
    rows.push(row);
    groups.set(id, rows);
  }
  const candidates = [];
  for (const [id, rows] of groups) {
    if (requestedLineageId && id !== requestedLineageId) continue;
    const relatedRefs = new Set(rows.flatMap(row => [anchorRef(row), ...asArray(row.source_context_anchor_refs)]).map(clean));
    const relatedEntries = archiveEntries.filter(row => {
      const lineageId = clean(row?.transfer_lineage_id);
      return lineageId === id || relatedRefs.has(anchorRef(row)) || relatedRefs.has(targetTransferRef(row));
    });
    const projected = logicalLineage(rows, relatedEntries);
    if (projected.error_code) return errorProjection(projected.error_code, requestedBed);
    if (projected.current_bed === requestedBed) candidates.push({ id, rows, relatedEntries, projected });
  }
  if (candidates.length > 1) return errorProjection('OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS', requestedBed);
  if (!candidates.length) {
    if (requestedLineageId && groups.has(requestedLineageId)) {
      return errorProjection('OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY', requestedBed);
    }
    return projectOwnerHistoryTransferLineage({ corpid: requestedCorpid, requested_bed: requestedBed, archive_entries: [] });
  }

  const candidate = candidates[0];
  const sourceRefs = unique((candidate.projected.ordered.length ? candidate.projected.ordered : candidate.rows)
    .flatMap(row => row.source_context_anchor_refs));
  const sourceRows = archiveEntries.filter(row => sourceRefs.includes(anchorRef(row)) &&
    (effectiveState(row) === 'active' || effectiveState(row) === 'corrected'));
  const leg = currentLeg(archiveEntries, candidate.projected, requestedCorpid);
  if (leg.error_code) return errorProjection(leg.error_code, requestedBed);
  const effectiveTransfers = candidate.projected.ordered;
  const canonicalRowsByRef = new Map();
  for (const row of stableSort([...sourceRows, ...effectiveTransfers, ...leg.rows])) {
    const ref = anchorRef(row);
    if (ref && !canonicalRowsByRef.has(ref)) canonicalRowsByRef.set(ref, lineageView(row));
  }
  return {
    ok: true,
    status: 'projected',
    transfer_lineage_id: candidate.id,
    requested_bed: requestedBed,
    effective_current_bed: candidate.projected.current_bed,
    lineage_display_current_bed: candidate.projected.current_bed,
    historical_beds: candidate.projected.historical_beds,
    active_transfer_anchor_ids: effectiveTransfers.map(anchorRef),
    raw_transfer_events: stableSort(candidate.rows).map(lineageView),
    effective_transfer_events: effectiveTransfers.map(lineageView),
    canonical_history_entries: [...canonicalRowsByRef.values()],
    source_context_anchor_refs: sourceRefs,
    current_leg_anchor_refs: leg.refs,
    warnings: []
  };
}

// Backward-compatible projection retained for the Phase 1 source resolver and its tests.
export function projectBedTransferLineage(input = {}) {
  const transfers = asArray(input.transfer_anchors).filter(row => eventType(row) === 'bed_transfer');
  const voided = new Set(asArray(input.void_anchors).map(targetTransferRef).filter(Boolean));
  if (!transfers.length) return { ok: false, error_code: 'BED_TRANSFER_LINEAGE_MISSING' };
  const archiveEntries = [
    ...transfers.map(row => ({ ...row, corpid: clean(row.corpid || 'legacy-projection') })),
    ...asArray(input.void_anchors).map(row => ({ ...row, corpid: clean(row.corpid || 'legacy-projection'), event_type: row.event_type || 'void_transfer' }))
  ];
  const legacyLineage = logicalLineage(archiveEntries.filter(row => eventType(row) === 'bed_transfer'), archiveEntries);
  if (legacyLineage.error_code) {
    return {
      ok: false,
      error_code: legacyLineage.error_code
        .replace('OWNER_HISTORY_TRANSFER_LINEAGE_', 'BED_TRANSFER_LINEAGE_')
        .replace('DISCONTINUITY', 'DISCONTINUOUS')
    };
  }
  const requestedBed = legacyLineage.current_bed || '';
  const projected = projectOwnerHistoryTransferLineage({
    corpid: clean(transfers[0]?.corpid || 'legacy-projection'),
    requested_bed: requestedBed,
    archive_entries: archiveEntries
  });
  if (!projected.ok) {
    return {
      ok: false,
      error_code: projected.error_code
        .replace('OWNER_HISTORY_TRANSFER_LINEAGE_', 'BED_TRANSFER_LINEAGE_')
        .replace('DISCONTINUITY', 'DISCONTINUOUS')
    };
  }
  return {
    ok: true,
    transfer_lineage_id: projected.transfer_lineage_id,
    current_bed: projected.effective_current_bed,
    bed_history: projected.historical_beds,
    source_context_anchor_refs: projected.source_context_anchor_refs,
    carried_arrears_refs: unique(transfers.flatMap(row => row.carried_arrears_refs)),
    active_transfer_anchor_ids: projected.active_transfer_anchor_ids,
    voided_transfer_anchor_ids: [...voided],
    original_events_mutated: false
  };
}
