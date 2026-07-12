const clean = value => String(value ?? '').trim();
const money = value => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
};
const asArray = value => Array.isArray(value) ? value : [];
const unique = values => [...new Set(asArray(values).map(clean).filter(Boolean))];
const typeOf = row => clean(row?.event_type || row?.type).toLowerCase();
const anchorRef = row => clean(row?.transfer_anchor_id || row?.anchor_ref || row?.anchor_id || row?.event_id || row?.entry_id || row?.id);
const targetRef = row => clean(row?.target_transfer_anchor_id || row?.reversal_of_transfer_anchor_id || row?.original_transfer_anchor_id || row?.original_event_id);
const replacementRef = row => clean(row?.replacement_for_transfer_anchor_id || row?.replaces_transfer_anchor_id || row?.corrects_transfer_anchor_id);
const acceptedAt = row => clean(row?.canonical_accepted_at || row?.accepted_at || row?.transfer_at || row?.created_at);
const inactive = row => ['void', 'voided', 'deleted', 'reversed', 'cancelled', 'inactive'].includes(clean(row?.effective_status || row?.archive_state || row?.status).toLowerCase());
const roundTotals = totals => Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, typeof value === 'number' ? Math.round(value * 100) / 100 : value]));

export function bedTransferDerivedArrearsRef(kind, transferAnchorId) {
  const id = anchorRef({ transfer_anchor_id: transferAnchorId });
  if (!id) return '';
  if (kind === 'fee') return `bed-transfer-fee:${id}`;
  if (kind === 'difference') return `bed-price-difference:${id}`;
  return '';
}

function zeroFinance() {
  return {
    cash_received: 0,
    bank_received: 0,
    gross_received: 0,
    rent_income: 0,
    bed_transfer_fee_income: 0,
    bed_price_difference_income: 0,
    arrears_opened_amount: 0,
    arrears_opened_count: 0
  };
}

function failure(error_code, detail = {}) {
  return {
    ok: false,
    error_code,
    finance: zeroFinance(),
    derived_arrears: [],
    carried_arrears: [],
    raw_transfer_events: [],
    effective_transfer_events: [],
    reconciliation_warnings: [],
    ...detail
  };
}

function paymentMethod(value) {
  const method = clean(value).toLowerCase();
  if (!method || method === 'none') return '';
  return method.includes('bank') || method.includes('transfer') ? 'bank' : 'cash';
}

function validateFee(anchor) {
  const mode = clean(anchor?.fee_mode).toLowerCase();
  const amount = money(anchor?.fee_amount_aed ?? 0);
  const due = clean(anchor?.fee_due_date);
  const method = paymentMethod(anchor?.payment_method);
  const partial = money(anchor?.fee_paid_amount_aed ?? anchor?.fee_partial_amount_aed ?? 0) || 0;
  if (partial > 0) return { ok: false, error_code: 'BED_TRANSFER_FEE_PARTIAL_PAYMENT_FORBIDDEN' };
  if (mode === 'paid') {
    if (amount !== 50) return { ok: false, error_code: 'BED_TRANSFER_FEE_AMOUNT_INVALID' };
    if (!method) return { ok: false, error_code: 'BED_TRANSFER_PAYMENT_METHOD_REQUIRED' };
    if (due) return { ok: false, error_code: 'BED_TRANSFER_FEE_MODE_CONFLICT' };
  } else if (mode === 'waived') {
    if (amount !== 0) return { ok: false, error_code: 'BED_TRANSFER_FEE_AMOUNT_INVALID' };
    if (!clean(anchor?.fee_waiver_reason)) return { ok: false, error_code: 'BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED' };
  } else if (mode === 'unpaid') {
    if (amount !== 50) return { ok: false, error_code: 'BED_TRANSFER_FEE_AMOUNT_INVALID' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { ok: false, error_code: 'BED_TRANSFER_FEE_DUE_DATE_REQUIRED' };
    if (method) return { ok: false, error_code: 'BED_TRANSFER_FEE_MODE_CONFLICT' };
  } else {
    return { ok: false, error_code: 'BED_TRANSFER_FEE_MODE_INVALID' };
  }
  return { ok: true, mode, amount, due, method };
}

function validateDifference(anchor) {
  const mode = clean(anchor?.bed_price_difference_mode || 'none').toLowerCase();
  const amount = money(anchor?.bed_price_difference_amount_aed ?? 0);
  const due = clean(anchor?.bed_price_difference_due_date);
  const method = paymentMethod(anchor?.bed_price_difference_payment_method);
  const partial = money(anchor?.bed_price_difference_paid_amount_aed ?? anchor?.bed_price_difference_unpaid_amount_aed ?? 0) || 0;
  if (partial > 0) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_PARTIAL_PAYMENT_FORBIDDEN' };
  if (mode === 'none') {
    if (amount !== 0 || due || method) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_MODE_CONFLICT' };
  } else if (mode === 'paid') {
    if (!(amount > 0)) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_AMOUNT_INVALID' };
    if (!method) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_PAYMENT_METHOD_REQUIRED' };
    if (due) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_MODE_CONFLICT' };
  } else if (mode === 'unpaid') {
    if (!(amount > 0)) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_AMOUNT_INVALID' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED' };
    if (method) return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_MODE_CONFLICT' };
  } else {
    return { ok: false, error_code: 'BED_PRICE_DIFFERENCE_MODE_INVALID' };
  }
  return { ok: true, mode, amount, due, method };
}

function effectiveTransferState(entries) {
  const raw = entries.filter(row => typeOf(row) === 'bed_transfer');
  const byId = new Map();
  for (const row of raw) {
    const id = anchorRef(row);
    if (!id) return { error_code: 'BED_TRANSFER_FINANCE_ANCHOR_REF_REQUIRED' };
    if (byId.has(id)) {
      const prior = byId.get(id);
      if (clean(prior?.canonical_request_fingerprint) !== clean(row?.canonical_request_fingerprint)) {
        return { error_code: 'BED_TRANSFER_FINANCE_ANCHOR_CONFLICT' };
      }
      continue;
    }
    byId.set(id, row);
  }
  const replacements = new Map();
  for (const row of byId.values()) if (replacementRef(row)) replacements.set(replacementRef(row), anchorRef(row));
  const inactiveIds = new Set([...replacements.keys()]);
  for (const row of entries) {
    if (['void', 'void_transfer', 'transfer_void', 'reversal', 'transfer_reversal'].includes(typeOf(row))) {
      const target = targetRef(row);
      if (!target) return { error_code: 'BED_TRANSFER_FINANCE_REVERSAL_REF_REQUIRED' };
      inactiveIds.add(target);
    }
  }
  for (const row of byId.values()) if (inactive(row)) inactiveIds.add(anchorRef(row));
  return { raw: [...byId.values()], effective: [...byId.values()].filter(row => !inactiveIds.has(anchorRef(row))), inactiveIds, replacements };
}

function lineageTerminals(effective, replacements) {
  const terminals = new Map();
  const groups = new Map();
  for (const row of effective) {
    const id = clean(row?.transfer_lineage_id);
    if (!id) return { error_code: 'BED_TRANSFER_FINANCE_LINEAGE_ID_REQUIRED' };
    const rows = groups.get(id) || [];
    rows.push(row);
    groups.set(id, rows);
  }
  for (const [lineageId, rows] of groups) {
    const byId = new Map(rows.map(row => [anchorRef(row), row]));
    const resolvePrevious = row => {
      let ref = clean(row?.previous_transfer_anchor_id);
      const seen = new Set();
      while (ref && replacements.has(ref) && !seen.has(ref)) {
        seen.add(ref);
        ref = replacements.get(ref);
      }
      return ref;
    };
    const roots = rows.filter(row => !resolvePrevious(row));
    if (roots.length !== 1) return { error_code: 'BED_TRANSFER_FINANCE_LINEAGE_DISCONTINUITY' };
    const ordered = [];
    let current = roots[0];
    while (current) {
      ordered.push(current);
      const next = rows.filter(row => resolvePrevious(row) === anchorRef(current));
      if (next.length > 1) return { error_code: 'BED_TRANSFER_FINANCE_LINEAGE_AMBIGUOUS' };
      if (next.length && clean(current.to_bed) !== clean(next[0].from_bed)) return { error_code: 'BED_TRANSFER_FINANCE_LINEAGE_DISCONTINUITY' };
      current = next[0] || null;
    }
    if (ordered.length !== byId.size) return { error_code: 'BED_TRANSFER_FINANCE_LINEAGE_DISCONTINUITY' };
    terminals.set(lineageId, { current_bed: clean(ordered.at(-1).to_bed), ordered });
  }
  return { terminals };
}

function derivedArrears(anchor, kind, amount, dueDate, currentBed) {
  const id = anchorRef(anchor);
  const fee = kind === 'fee';
  const ref = bedTransferDerivedArrearsRef(kind, id);
  return {
    task_id: ref,
    id: ref,
    arrears_ref: ref,
    corpid: clean(anchor.corpid),
    source_event_type: fee ? 'bed_transfer_fee_unpaid' : 'bed_price_difference_unpaid',
    source_type: fee ? 'bed_transfer_fee_unpaid' : 'bed_price_difference_unpaid',
    source_anchor_ref: id,
    source_event_id: id,
    transfer_lineage_id: clean(anchor.transfer_lineage_id),
    original_bed: clean(anchor.from_bed),
    bed: clean(anchor.from_bed),
    effective_current_bed: currentBed,
    original_amount: amount,
    original_arrears_amount: amount,
    arrear_amount: amount,
    remaining_arrears: amount,
    actual_received: 0,
    already_paid_amount: 0,
    due_date: dueDate,
    promise_date: dueDate,
    status: 'open',
    accounting_status: 'open',
    payment_policy: 'FULL_PAYMENT_ONLY',
    partial_payment_allowed: false,
    materialized_from: 'sessions.entries_json',
    projection_source: 'canonical_bed_transfer_anchor'
  };
}

function transferAuditView(anchor, effective) {
  return {
    transfer_anchor_id: anchorRef(anchor),
    transfer_lineage_id: clean(anchor?.transfer_lineage_id),
    previous_transfer_anchor_id: clean(anchor?.previous_transfer_anchor_id) || null,
    corpid: clean(anchor?.corpid),
    from_bed: clean(anchor?.from_bed),
    to_bed: clean(anchor?.to_bed),
    canonical_accepted_at: acceptedAt(anchor),
    fee_mode: clean(anchor?.fee_mode),
    fee_amount_aed: money(anchor?.fee_amount_aed ?? 0),
    bed_price_difference_mode: clean(anchor?.bed_price_difference_mode || 'none'),
    bed_price_difference_amount_aed: money(anchor?.bed_price_difference_amount_aed ?? 0),
    effective
  };
}

export function projectBedTransferFinanceAndArrears(input = {}) {
  const corpid = clean(input.corpid);
  const entries = asArray(input.archive_entries);
  if (!corpid || entries.some(row => clean(row?.corpid) && clean(row.corpid) !== corpid)) return failure('BED_TRANSFER_FINANCE_CORPID_MISMATCH');
  const state = effectiveTransferState(entries);
  if (state.error_code) return failure(state.error_code);
  if (!state.raw.length) return { ...failure('', { ok: true }), error_code: '', finance: zeroFinance() };
  const lineages = lineageTerminals(state.effective, state.replacements);
  if (lineages.error_code) return failure(lineages.error_code);
  const finance = zeroFinance();
  const derived = new Map();
  const warnings = [];
  for (const raw of state.raw) {
    if (!state.inactiveIds.has(anchorRef(raw))) continue;
    const fee = validateFee(raw);
    const difference = validateDifference(raw);
    if ((fee.ok && fee.mode === 'paid' && fee.amount > 0) || (difference.ok && difference.mode === 'paid' && difference.amount > 0)) {
      warnings.push({ code: 'TRANSFER_VOID_FINANCIAL_RECONCILIATION_REQUIRED', transfer_anchor_id: anchorRef(raw), message: 'Raw paid transfer amount remains visible; effective income is zero and no automatic refund is created.' });
    }
  }
  for (const anchor of state.effective.sort((a, b) => acceptedAt(a).localeCompare(acceptedAt(b)) || anchorRef(a).localeCompare(anchorRef(b)))) {
    const fee = validateFee(anchor);
    if (!fee.ok) return failure(fee.error_code, { raw_transfer_events: state.raw.map(row => transferAuditView(row, state.effective.includes(row))), effective_transfer_events: state.effective.map(row => transferAuditView(row, true)), reconciliation_warnings: warnings });
    const difference = validateDifference(anchor);
    if (!difference.ok) return failure(difference.error_code, { raw_transfer_events: state.raw.map(row => transferAuditView(row, state.effective.includes(row))), effective_transfer_events: state.effective.map(row => transferAuditView(row, true)), reconciliation_warnings: warnings });
    const terminal = lineages.terminals.get(clean(anchor.transfer_lineage_id));
    const currentBed = terminal?.current_bed || clean(anchor.to_bed);
    if (fee.mode === 'paid') {
      finance.bed_transfer_fee_income += fee.amount;
      finance.gross_received += fee.amount;
      finance[fee.method === 'bank' ? 'bank_received' : 'cash_received'] += fee.amount;
    } else if (fee.mode === 'unpaid') {
      const item = derivedArrears(anchor, 'fee', fee.amount, fee.due, currentBed);
      derived.set(item.arrears_ref, item);
    }
    if (difference.mode === 'paid') {
      finance.bed_price_difference_income += difference.amount;
      finance.gross_received += difference.amount;
      finance[difference.method === 'bank' ? 'bank_received' : 'cash_received'] += difference.amount;
    } else if (difference.mode === 'unpaid') {
      const item = derivedArrears(anchor, 'difference', difference.amount, difference.due, currentBed);
      derived.set(item.arrears_ref, item);
    }
  }
  finance.arrears_opened_amount = [...derived.values()].reduce((sum, item) => sum + item.remaining_arrears, 0);
  finance.arrears_opened_count = derived.size;

  const existing = new Map(asArray(input.existing_arrears).map(item => [clean(item?.arrears_ref || item?.task_id || item?.id), item]));
  const carried = new Map();
  for (const anchor of state.effective) {
    const terminal = lineages.terminals.get(clean(anchor.transfer_lineage_id));
    for (const ref of unique(anchor.carried_arrears_refs)) {
      const item = existing.get(ref);
      if (!item) {
        warnings.push({ code: 'CARRIED_ARREARS_REF_MISSING', arrears_ref: ref, transfer_anchor_id: anchorRef(anchor) });
        continue;
      }
      if (clean(item.corpid) && clean(item.corpid) !== corpid) {
        warnings.push({ code: 'CARRIED_ARREARS_CORPID_MISMATCH', arrears_ref: ref, transfer_anchor_id: anchorRef(anchor) });
        continue;
      }
      const status = clean(item.status || item.accounting_status || item.close_status).toLowerCase();
      if (['settled', 'closed', 'paid', 'void', 'voided', 'cleared'].includes(status) || Number(item.remaining_arrears || 0) <= 0) {
        warnings.push({ code: 'CARRIED_ARREARS_NOT_OPEN', arrears_ref: ref, transfer_anchor_id: anchorRef(anchor), status });
        continue;
      }
      const expected = asArray(anchor.carried_arrears).find(row => clean(row?.arrears_ref) === ref);
      if (expected && money(expected.remaining_arrears) !== money(item.remaining_arrears)) {
        warnings.push({ code: 'CARRIED_ARREARS_AMOUNT_MISMATCH', arrears_ref: ref, transfer_anchor_id: anchorRef(anchor) });
        continue;
      }
      carried.set(ref, {
        ...item,
        arrears_ref: ref,
        original_bed: clean(item.original_bed || item.bed),
        effective_current_bed: terminal?.current_bed || clean(anchor.to_bed),
        carried_by_transfer_lineage_id: clean(anchor.transfer_lineage_id),
        carried_by_transfer_anchor_id: anchorRef(anchor)
      });
    }
  }
  return {
    ok: true,
    error_code: '',
    finance: roundTotals(finance),
    derived_arrears: [...derived.values()],
    carried_arrears: [...carried.values()],
    raw_transfer_events: state.raw.map(row => transferAuditView(row, state.effective.includes(row))),
    effective_transfer_events: state.effective.map(row => transferAuditView(row, true)),
    reconciliation_warnings: warnings,
    canonical_anchor_dedup_count: state.raw.length,
    readonly: true,
    no_write: true
  };
}
