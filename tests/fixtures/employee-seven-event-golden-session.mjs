const CREATED_AT = "2026-07-16T08:00:00.000Z";

function scenario(definition) {
  return Object.freeze({
    expected_validation: Object.freeze({ ok: true, error_code: "" }),
    expected_owner_projection: Object.freeze({ visible: true, standalone_void: false }),
    expected_arrears_delta: Object.freeze({ opened: 0, repaid: 0 }),
    expected_todo_delta: Object.freeze({ minimum: 0 }),
    expected_ttlock_calls: 0,
    ...definition,
    input: Object.freeze(definition.input),
    expected_finance_delta: Object.freeze(definition.expected_finance_delta),
  });
}

export const GOLDEN_CORPID = "golden-session-corp";
export const GOLDEN_LOGICAL_SESSION_ID = "GOLDEN-SEVEN-EVENT-20260716";

export const EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS = Object.freeze([
  scenario({
    case_id: "rent-cash-full",
    event_type: "rent",
    session_id: "GOLDEN-S01-RENT-CASH-FULL",
    entry_id: "GOLDEN-E01",
    input: { id: "GOLDEN-E01", type: "R", event_type: "rent", room: "201", bed: "201", amount: 700, due: 700, paid: 700, expected_rent: 700, paid_amount: 700, payment_method: "cash", pay_type: "cash", period_start: "2026-07-16", period_end: "2026-08-16", rent_period_start: "2026-07-16", rent_period_end: "2026-08-16", cycle: "1M", arrears_amount: 0, arrears_due_date: "", arrears_note: "", short_paid: false, operator: "golden-staff", created_at: CREATED_AT, ttlock_context: "", note: "golden rent cash full" },
    expected_anchor_type: "rent",
    expected_finance_delta: { cash_received: 700, bank_received: 0, rent_income: 700 },
  }),
  scenario({
    case_id: "rent-bank-short",
    event_type: "rent",
    session_id: "GOLDEN-S02-RENT-BANK-SHORT",
    entry_id: "GOLDEN-E02",
    input: { id: "GOLDEN-E02", type: "R", event_type: "rent", room: "202", bed: "202", amount: 700, due: 770, paid: 700, expected_rent: 770, paid_amount: 700, payment_method: "bank", pay_type: "bank", period_start: "2026-07-16", period_end: "2026-08-16", rent_period_start: "2026-07-16", rent_period_end: "2026-08-16", cycle: "1M", arrear_handling: "ARREAR", arrear_promise_date: "2026-07-20", arrear_reason_detail: "golden short payment", arrears_amount: 70, arrears_due_date: "2026-07-20", arrears_note: "golden short payment", short_paid: true, operator: "golden-staff", created_at: CREATED_AT, ttlock_context: "", note: "golden short payment" },
    expected_anchor_type: "rent",
    expected_finance_delta: { cash_received: 0, bank_received: 700, rent_income: 700, arrears_opened: 70, outstanding: 70 },
    expected_arrears_delta: { opened: 70, repaid: 0 },
  }),
  scenario({
    case_id: "rent-cash-excess",
    event_type: "rent",
    session_id: "GOLDEN-S03-RENT-CASH-EXCESS",
    entry_id: "GOLDEN-E03",
    input: { id: "GOLDEN-E03", type: "R", event_type: "rent", room: "203", bed: "203", amount: 730, due: 700, paid: 730, expected_rent: 700, paid_amount: 730, payment_method: "cash", pay_type: "cash", period_start: "2026-07-16", period_end: "2026-08-16", rent_period_start: "2026-07-16", rent_period_end: "2026-08-16", cycle: "1M", excess: 30, excess_to: "MANAGER", arrears_amount: 0, arrears_due_date: "", arrears_note: "", short_paid: false, operator: "golden-staff", created_at: CREATED_AT, ttlock_context: "", note: "golden excess handling" },
    expected_anchor_type: "rent",
    expected_finance_delta: { cash_received: 730, bank_received: 0, rent_income: 730 },
  }),
  scenario({
    case_id: "arrears-payment-cash-cloud",
    event_type: "arrears_payment",
    session_id: "GOLDEN-S04-AP-CASH-CLOUD",
    entry_id: "GOLDEN-E04",
    input: { id: "GOLDEN-E04", type: "AP", event_type: "arrears_payment", room: "204", bed: "204", amount: 40, payment_amount: 40, payment_method: "cash", pay_type: "cash", linked_task_id: "GOLDEN-CLOUD-ARREARS-1", arrears_ref: "GOLDEN-CLOUD-ARREARS-1", original_arrears_id: "GOLDEN-CLOUD-ARREARS-1", original_arrears_amount: 100, already_paid_amount: 60, remaining_arrears_before_payment: 40, remaining_arrears_after_payment: 0, remaining_arrears: 0, settlement_status: "settled", note: "golden formal cloud arrears payment", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "arrears_payment",
    expected_finance_delta: { cash_received: 40, bank_received: 0, arrears_repaid: 40 },
    expected_arrears_delta: { opened: 0, repaid: 40 },
  }),
  scenario({
    case_id: "arrears-payment-bank-legacy",
    event_type: "arrears_payment",
    session_id: "GOLDEN-S05-AP-BANK-LEGACY",
    entry_id: "GOLDEN-E05",
    input: { id: "GOLDEN-E05", type: "AP", event_type: "arrears_payment", room: "205", bed: "205", amount: 30, payment_amount: 30, payment_method: "bank", pay_type: "bank", linked_task_id: "legacy-manual-GOLDEN-S05-AP-BANK-LEGACY-GOLDEN-E05", arrears_ref: "legacy-manual-GOLDEN-S05-AP-BANK-LEGACY-GOLDEN-E05", original_arrears_id: "legacy-manual-GOLDEN-S05-AP-BANK-LEGACY-GOLDEN-E05", original_arrears_amount: 30, already_paid_amount: 0, remaining_arrears_before_payment: 30, remaining_arrears_after_payment: 0, remaining_arrears: 0, settlement_status: "settled", arrears_source: "legacy_manual", note: "golden legacy manual arrears payment", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "arrears_payment",
    expected_finance_delta: { cash_received: 0, bank_received: 30, arrears_repaid: 30 },
    expected_arrears_delta: { opened: 0, repaid: 30 },
  }),
  scenario({
    case_id: "deposit-in-cash",
    event_type: "deposit_in",
    session_id: "GOLDEN-S06-DEPOSIT-IN-CASH",
    entry_id: "GOLDEN-E06",
    input: { id: "GOLDEN-E06", type: "D", event_type: "deposit_in", room: "206", bed: "206", amount: 100, deposit_amount: 100, deposit_required_total: 200, previous_deposit_recorded_amount: 0, deposit_paid_amount: 100, expected_deposit_after_payment: 100, deposit_remaining_after_payment: 100, deposit_remaining: 100, payment_method: "cash", pay_type: "cash", linked_tenant: "golden-context-206", note: "golden deposit in cash", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "deposit_in",
    expected_finance_delta: { cash_received: 100, bank_received: 0, deposit_included: 100 },
  }),
  scenario({
    case_id: "deposit-in-bank",
    event_type: "deposit_in",
    session_id: "GOLDEN-S07-DEPOSIT-IN-BANK",
    entry_id: "GOLDEN-E07",
    input: { id: "GOLDEN-E07", type: "D", event_type: "deposit_in", room: "207", bed: "207", amount: 100, deposit_amount: 100, deposit_required_total: 200, previous_deposit_recorded_amount: 0, deposit_paid_amount: 100, expected_deposit_after_payment: 100, deposit_remaining_after_payment: 100, deposit_remaining: 100, payment_method: "bank", pay_type: "bank", linked_tenant: "golden-context-207", note: "golden deposit in bank", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "deposit_in",
    expected_finance_delta: { cash_received: 0, bank_received: 100, deposit_included: 100 },
  }),
  scenario({
    case_id: "deposit-out-cash",
    event_type: "deposit_out",
    session_id: "GOLDEN-S08-DEPOSIT-OUT-CASH",
    entry_id: "GOLDEN-E08",
    input: { id: "GOLDEN-E08", type: "DR", event_type: "deposit_out", room: "208", bed: "208", amount: 100, deposit_balance: 100, actual_refund_amount: 100, refund_amount: 100, refund_difference: 0, deposit_remaining_after_refund: 0, payment_method: "cash", pay_type: "cash", refund_method: "cash", refund_date: "2026-07-16", refund_reason: "golden deposit refund", difference_reason: "none", owner_approval_required: false, owner_approval_status: "not_required", note: "golden deposit out cash", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "deposit_out",
    expected_finance_delta: { cash_out: 100, bank_out: 0, deposit_refund: 100, expense: 0 },
  }),
  scenario({
    case_id: "deposit-out-bank",
    event_type: "deposit_out",
    session_id: "GOLDEN-S09-DEPOSIT-OUT-BANK",
    entry_id: "GOLDEN-E09",
    input: { id: "GOLDEN-E09", type: "DR", event_type: "deposit_out", room: "209", bed: "209", amount: 100, deposit_balance: 100, actual_refund_amount: 100, refund_amount: 100, refund_difference: 0, deposit_remaining_after_refund: 0, payment_method: "bank", pay_type: "bank", refund_method: "bank", refund_date: "2026-07-16", refund_reason: "golden deposit refund", difference_reason: "none", owner_approval_required: false, owner_approval_status: "not_required", note: "golden deposit out bank", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "deposit_out",
    expected_finance_delta: { cash_out: 0, bank_out: 100, deposit_refund: 100, expense: 0 },
  }),
  scenario({
    case_id: "checkout-clear",
    event_type: "checkout",
    session_id: "GOLDEN-S10-CHECKOUT-CLEAR",
    entry_id: "GOLDEN-E10",
    input: { id: "GOLDEN-E10", type: "CO", event_type: "checkout", room: "210", bed: "210", amount: 0, checkout_date: "2026-07-16", checkout_type: "normal", checkout_mode: "normal", left_with_arrears: false, customer_left: false, deposit_refund: 0, outstanding_arrears: 0, open_arrears_amount: 0, owner_approval_required: false, owner_approval_status: "not_required", final_note: "golden clear checkout", ttlock_context: "", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "checkout",
    expected_finance_delta: { cash_received: 0, bank_received: 0, cash_out: 0, bank_out: 0 },
  }),
  scenario({
    case_id: "checkout-left-with-arrears",
    event_type: "left_with_arrears",
    session_id: "GOLDEN-S11-LEFT-WITH-ARREARS",
    entry_id: "GOLDEN-E11",
    input: { id: "GOLDEN-E11", type: "CO", event_type: "left_with_arrears", room: "211", bed: "211", amount: 0, checkout_date: "2026-07-16", checkout_type: "left_with_arrears", checkout_mode: "left_with_arrears", left_with_arrears: true, customer_left: true, deposit_refund: 0, outstanding_arrears: 80, open_arrears_amount: 80, arrears_amount: 80, left_arrears_amount: 80, owner_approval_required: false, owner_approval_status: "not_required", belongings_held: false, final_note: "golden left with arrears", ttlock_context: "", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "left_with_arrears",
    expected_finance_delta: { cash_received: 0, bank_received: 0, arrears_opened: 80 },
    expected_arrears_delta: { opened: 80, repaid: 0 },
  }),
  scenario({
    case_id: "expense-cash-99",
    event_type: "expense",
    session_id: "GOLDEN-S12-EXPENSE-CASH",
    entry_id: "GOLDEN-E12",
    input: { id: "GOLDEN-E12", type: "E", event_type: "expense", room: "401", target_bed: "401", amount: 99, expense_amount: 99, expense_category: "EXPENSE", expense_description: "golden air conditioner repair", expense_desc: "golden air conditioner repair", reason: "golden air conditioner repair", payment_method: "cash", pay_type: "cash", note: "golden air conditioner repair", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "expense",
    expected_finance_delta: { cash_out: 99, bank_out: 0, expense: 99 },
  }),
  scenario({
    case_id: "expense-bank-500",
    event_type: "expense",
    session_id: "GOLDEN-S13-EXPENSE-BANK",
    entry_id: "GOLDEN-E13",
    input: { id: "GOLDEN-E13", type: "E", event_type: "expense", room: "402", target_bed: "402", amount: 500, expense_amount: 500, expense_category: "EXPENSE", expense_description: "golden maintenance invoice", expense_desc: "golden maintenance invoice", reason: "golden maintenance invoice", payment_method: "bank", pay_type: "bank", note: "golden maintenance invoice", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "expense",
    expected_finance_delta: { cash_out: 0, bank_out: 500, expense: 500 },
  }),
  scenario({
    case_id: "bed-transfer-paid-cash",
    event_type: "bed_transfer",
    session_id: "GOLDEN-S14-TRANSFER-CASH",
    entry_id: "GOLDEN-E14",
    input: { id: "GOLDEN-E14", type: "TF", event_type: "bed_transfer", source: "employee_entry", from_bed: "301", to_bed: "302", transfer_reason: "golden controlled transfer cash", fee_mode: "paid", fee_amount_aed: 50, fee_due_date: "", payment_method: "cash", fee_waiver_reason: "", bed_price_difference_mode: "none", bed_price_difference_amount_aed: 0, bed_price_difference_due_date: "", bed_price_difference_payment_method: "", bed_price_difference_reason: "", note: "golden transfer cash", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "bed_transfer",
    expected_finance_delta: { cash_received: 50, bank_received: 0, bed_transfer_fee: 50 },
    expected_todo_delta: { minimum: 1 },
  }),
  scenario({
    case_id: "bed-transfer-paid-bank",
    event_type: "bed_transfer",
    session_id: "GOLDEN-S15-TRANSFER-BANK",
    entry_id: "GOLDEN-E15",
    input: { id: "GOLDEN-E15", type: "TF", event_type: "bed_transfer", source: "employee_entry", from_bed: "303", to_bed: "304", transfer_reason: "golden controlled transfer bank", fee_mode: "paid", fee_amount_aed: 50, fee_due_date: "", payment_method: "bank", fee_waiver_reason: "", bed_price_difference_mode: "none", bed_price_difference_amount_aed: 0, bed_price_difference_due_date: "", bed_price_difference_payment_method: "", bed_price_difference_reason: "", note: "golden transfer bank", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "bed_transfer",
    expected_finance_delta: { cash_received: 0, bank_received: 50, bed_transfer_fee: 50 },
    expected_todo_delta: { minimum: 1 },
  }),
  scenario({
    case_id: "bed-transfer-waived",
    event_type: "bed_transfer",
    session_id: "GOLDEN-S16-TRANSFER-WAIVED",
    entry_id: "GOLDEN-E16",
    input: { id: "GOLDEN-E16", type: "TF", event_type: "bed_transfer", source: "employee_entry", from_bed: "305", to_bed: "306", transfer_reason: "golden controlled transfer waived", fee_mode: "waived", fee_amount_aed: 0, fee_due_date: "", payment_method: "none", fee_waiver_reason: "golden approved waiver", bed_price_difference_mode: "none", bed_price_difference_amount_aed: 0, bed_price_difference_due_date: "", bed_price_difference_payment_method: "", bed_price_difference_reason: "", note: "golden transfer waived", operator: "golden-staff", created_at: CREATED_AT },
    expected_anchor_type: "bed_transfer",
    expected_finance_delta: { cash_received: 0, bank_received: 0, bed_transfer_fee: 0 },
    expected_todo_delta: { minimum: 1 },
  }),
]);

export const GOLDEN_ENTRY_IDS = Object.freeze(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.map(row => row.entry_id));

export function goldenScenarioSession(scenarioRow) {
  return {
    id: scenarioRow.session_id,
    session_id: scenarioRow.session_id,
    date: "2026-07-16",
    anchor_id: `ANCHOR-${scenarioRow.session_id}`,
    entries_count: 1,
    entries: [structuredClone(scenarioRow.input)],
    cash_handover: 0,
    bank_transfer_total: 0,
    bank_transfer_count: 0,
    gross_received: 0,
    handover_status: "COMPLETED",
    exported_at: CREATED_AT,
    export_text: `GOLDEN SESSION ${scenarioRow.case_id}`,
    source: "employee_entry",
  };
}

export function goldenValidationRequests(scenarios = EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS) {
  return scenarios.map((row, event_index) => ({
    entry_identity: row.entry_id,
    entry: structuredClone(row.input),
    session: goldenScenarioSession(row),
    event_index,
    dry_run: true,
    validate_only: true,
    no_write: true,
  }));
}

export function goldenNegativeExpenseRequests() {
  const rows = goldenValidationRequests();
  const expense = rows.find(row => row.entry_identity === "GOLDEN-E12");
  delete expense.entry.expense_description;
  delete expense.entry.expense_desc;
  delete expense.entry.reason;
  delete expense.entry.note;
  expense.session.entries = [structuredClone(expense.entry)];
  return rows;
}

export const GOLDEN_TTLOCK_SNAPSHOT = Object.freeze({
  roomsData: {
    GOLDEN: [
      { room: "GOLDEN", cardName: "301 D100 0716 exp 0816", remark: "301 D100 0716 exp 0816", endDate: 0 },
      { room: "GOLDEN", cardName: "302 E", remark: "302 E", endDate: 0 },
      { room: "GOLDEN", cardName: "303 D100 0716 exp 0816", remark: "303 D100 0716 exp 0816", endDate: 0 },
      { room: "GOLDEN", cardName: "304 E", remark: "304 E", endDate: 0 },
      { room: "GOLDEN", cardName: "305 D100 0716 exp 0816", remark: "305 D100 0716 exp 0816", endDate: 0 },
      { room: "GOLDEN", cardName: "306 E", remark: "306 E", endDate: 0 },
    ],
  },
  locksCount: 1,
  snapshot_fingerprint: "golden-sanitized-snapshot-v1",
});
