import { parseRawEventArchive } from '../canonical/raw-event-archive.mjs';

const clean = value => String(value ?? '').trim().toLowerCase();
const number = value => Number(value || 0) || 0;
const type = entry => clean(entry?.event_type || entry?.type);
const payment = entry => {
  const value = clean(entry?.payment_method || entry?.pay_type || entry?.cat);
  if (value === 'b' || value === 'bank') return 'bank';
  if (value === 'mixed' || value === 'm') return 'mixed';
  return 'cash';
};
const firstAmount = (entry, fields) => {
  for (const field of fields) {
    if (entry?.[field] !== undefined && entry?.[field] !== null && String(entry[field]).trim() !== '') return number(entry[field]);
  }
  return 0;
};
const eventType = entry => ({ r: 'rent', ap: 'arrears_payment', d: 'deposit_in', dr: 'deposit_out', e: 'expense', tf: 'bed_transfer' }[type(entry)] || type(entry));

export function projectRawHeldSessionReadModel(session = {}) {
  if (clean(session.source) !== 'employee_entry_raw_held') return null;
  const parsed = parseRawEventArchive(session.entries_json || session.entries || []);
  if (!parsed.ok) return { ok: false, error_code: parsed.error_code, entry_count: Number(session.entries_count || 0) || 0 };
  const entries = parsed.entries;
  let cashReceived = 0;
  let bankReceived = 0;
  let depositIncluded = 0;
  let depositRefund = 0;
  let otherExpense = 0;
  let outstanding = 0;
  for (const entry of entries) {
    const kind = eventType(entry);
    const method = payment(entry);
    let incoming = 0;
    if (kind === 'rent') {
      incoming = firstAmount(entry, ['paid_amount', 'paid', 'amount']);
      const due = firstAmount(entry, ['expected_rent', 'period_due', 'due']);
      outstanding += number(entry.arrears_amount ?? Math.max(0, due - incoming));
    } else if (kind === 'arrears_payment') incoming = firstAmount(entry, ['payment_amount', 'amount']);
    else if (kind === 'deposit_in') {
      incoming = firstAmount(entry, ['deposit_amount', 'amount']);
      depositIncluded += incoming;
    } else if (kind === 'bed_transfer') incoming = firstAmount(entry, ['fee_amount_aed', 'fee_amount', 'amount']);
    else if (kind === 'deposit_out') depositRefund += firstAmount(entry, ['actual_refund_amount', 'refund_amount', 'amount']);
    else if (kind === 'expense') otherExpense += firstAmount(entry, ['expense_amount', 'amount']);
    if (method === 'bank') bankReceived += incoming;
    else if (method === 'mixed') {
      cashReceived += number(entry.cash_amount || entry?.payment_legs?.find?.(leg => clean(leg?.method) === 'cash')?.amount);
      bankReceived += number(entry.bank_amount || entry?.payment_legs?.find?.(leg => clean(leg?.method) === 'bank')?.amount);
    } else cashReceived += incoming;
  }
  const totalReceived = cashReceived + bankReceived;
  const totalOutflow = depositRefund + otherExpense;
  return {
    ok: true,
    source: 'sessions.entries_json',
    interpretation: 'raw_held_read_only',
    entry_count: entries.length,
    cash_received: cashReceived,
    bank_received: bankReceived,
    total_received: totalReceived,
    deposit_included: depositIncluded,
    deposit_refund: depositRefund,
    other_expense: otherExpense,
    total_outflow: totalOutflow,
    net_funds: totalReceived - totalOutflow,
    cash_net: cashReceived - depositRefund - otherExpense,
    bank_net: bankReceived,
    outstanding,
    projection_status: 'HELD_FOR_REVIEW',
    business_totals_applied: false
  };
}
