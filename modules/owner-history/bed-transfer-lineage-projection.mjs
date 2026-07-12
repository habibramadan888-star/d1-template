const clean = value => String(value ?? '').trim();

export function projectBedTransferLineage(input = {}) {
  const transfers = (input.transfer_anchors || []).filter(row => row?.event_type === 'bed_transfer');
  const voided = new Set((input.void_anchors || []).map(row => clean(row?.target_transfer_anchor_id)).filter(Boolean));
  if (!transfers.length) return { ok: false, error_code: 'BED_TRANSFER_LINEAGE_MISSING' };
  const byId = new Map(transfers.map(row => [clean(row.transfer_anchor_id), row]));
  const roots = transfers.filter(row => row.previous_transfer_anchor_id == null);
  if (roots.length !== 1) return { ok: false, error_code: 'BED_TRANSFER_LINEAGE_AMBIGUOUS' };
  const root = roots[0];
  const active = transfers.filter(row => !voided.has(clean(row.transfer_anchor_id)));
  for (const row of active) {
    const previous = clean(row.previous_transfer_anchor_id);
    if (previous && (!byId.has(previous) || voided.has(previous))) return { ok: false, error_code: 'BED_TRANSFER_LINEAGE_DISCONTINUOUS' };
  }
  const ordered = [];
  let current = active.find(row => row.previous_transfer_anchor_id == null) || null;
  while (current) {
    ordered.push(current);
    const next = active.filter(row => clean(row.previous_transfer_anchor_id) === clean(current.transfer_anchor_id));
    if (next.length > 1) return { ok: false, error_code: 'BED_TRANSFER_LINEAGE_AMBIGUOUS' };
    current = next[0] || null;
  }
  if (ordered.length !== active.length) return { ok: false, error_code: 'BED_TRANSFER_LINEAGE_DISCONTINUOUS' };
  return {
    ok: true,
    transfer_lineage_id: clean(root.transfer_lineage_id),
    current_bed: ordered.length ? clean(ordered.at(-1).to_bed) : clean(root.from_bed),
    bed_history: [clean(root.from_bed), ...ordered.map(row => clean(row.to_bed))],
    source_context_anchor_refs: [...new Set(transfers.flatMap(row => row.source_context_anchor_refs || []).map(clean).filter(Boolean))],
    carried_arrears_refs: [...new Set(transfers.flatMap(row => row.carried_arrears_refs || []).map(clean).filter(Boolean))],
    active_transfer_anchor_ids: ordered.map(row => clean(row.transfer_anchor_id)),
    voided_transfer_anchor_ids: [...voided],
    original_events_mutated: false
  };
}
