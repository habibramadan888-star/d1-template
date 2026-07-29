const clean = value => String(value ?? '').trim();
const money = value => Math.round((Number(String(value ?? 0).replace(/,/g, '')) || 0) * 100) / 100;
const key = value => clean(value).replace(/[^a-z0-9]/gi, '').toLowerCase();

const forbidden = new Set([
  'sourceeventtype', 'sourceanchorref', 'transferanchorid', 'transferlineageid',
  'originalbed', 'effectivecurrentbed', 'lineagedisplaycurrentbed', 'originalamount',
  'paymentpolicy', 'sourcearrestype', 'sourcearrearstype', 'feetype', 'differenceclassification',
  'staycontextid', 'lifecyclestatus', 'effectivestatus', 'archivestate', 'voidedat',
  'cardid', 'tenantcardid', 'oldttlockref', 'providerphone', 'ttlockphone', 'phone99099',
  'providermetadata', 'ttlockmetadata'
]);

export function findDerivedArrearsPaymentForbiddenFields(value) {
  const found = new Set();
  const visit = (node, path = '') => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((row, index) => visit(row, `${path}[${index}]`));
    for (const [field, child] of Object.entries(node)) {
      const fieldPath = path ? `${path}.${field}` : field;
      if (forbidden.has(key(field)) && child !== '' && child != null) found.add(fieldPath);
      if (child && typeof child === 'object') visit(child, fieldPath);
    }
  };
  visit(value);
  return [...found].sort();
}

export function parseBedTransferDerivedArrearsRef(ref) {
  const value = clean(ref);
  if (value.startsWith('bed-transfer-fee:')) return { kind: 'fee', source_anchor_ref: value.slice(17), source_arrears_type: 'bed_transfer_fee_unpaid' };
  if (value.startsWith('bed-price-difference:')) return { kind: 'difference', source_anchor_ref: value.slice(21), source_arrears_type: 'bed_price_difference_unpaid' };
  return null;
}

export function prepareDerivedArrearsPayment(input = {}) {
  const item = input.arrears_item || {};
  const parsed = parseBedTransferDerivedArrearsRef(input.arrears_ref || item.arrears_ref);
  if (!parsed) return { ok: true, derived: false, server_fields: {} };
  const status = clean(item.status || item.accounting_status).toLowerCase();
  const remaining = money(item.remaining_arrears);
  const payment = money(input.payment_amount);
  if (input.source_effective === false) return { ok: false, error_code: 'ARREARS_SOURCE_VOIDED' };
  if (!['open', 'partial'].includes(status) || remaining <= 0) return { ok: false, error_code: 'ARREARS_REF_NOT_OPEN' };
  if (payment > remaining) return { ok: false, error_code: 'ARREARS_PAYMENT_OVERPAY_NOT_ALLOWED' };
  if (payment !== remaining) return { ok: false, error_code: parsed.kind === 'fee' ? 'BED_TRANSFER_FEE_ARREARS_FULL_PAYMENT_REQUIRED' : 'BED_PRICE_DIFFERENCE_ARREARS_FULL_PAYMENT_REQUIRED' };
  const acceptedAt = clean(input.accepted_at);
  const eventId = clean(input.event_id);
  const canonicalFingerprint = [clean(input.corpid), clean(item.arrears_ref), payment.toFixed(2), clean(input.payment_method).toLowerCase(), eventId].join('|');
  return {
    ok: true,
    derived: true,
    server_fields: {
      arrears_ref: clean(item.arrears_ref),
      linked_task_id: clean(item.arrears_ref),
      original_arrears_id: clean(item.arrears_ref),
      source_arrears_type: clean(item.source_event_type || parsed.source_arrears_type),
      source_anchor_ref: clean(item.source_anchor_ref || parsed.source_anchor_ref),
      original_arrears_amount: money(item.original_arrears_amount || item.original_amount),
      already_paid_amount: money(item.already_paid_amount),
      remaining_arrears_before_payment: remaining,
      remaining_arrears_after_payment: 0,
      remaining_arrears: 0,
      settlement_status: 'settled',
      original_bed: clean(item.original_bed || item.bed),
      lineage_display_current_bed: clean(item.effective_current_bed || item.bed),
      transfer_lineage_id: clean(item.transfer_lineage_id),
      payment_policy: 'FULL_PAYMENT_ONLY',
      payment_date: clean(input.payment_date || acceptedAt).slice(0, 10),
      canonical_accepted_at: acceptedAt,
      operator_reference: clean(input.operator_reference),
      canonical_fingerprint: canonicalFingerprint
    }
  };
}
