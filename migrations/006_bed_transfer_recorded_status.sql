-- Migration 006: Bed Transfer record-only status
-- Purpose: allow record-only Bed Transfer events to use status='recorded'.
-- Existing pending_review smoke rows are preserved for traceability.

DROP TABLE IF EXISTS bed_transfer_events_recorded_migration;

CREATE TABLE bed_transfer_events_recorded_migration (
  id TEXT PRIMARY KEY,
  transfer_id TEXT UNIQUE,
  corp_id TEXT NOT NULL,
  tenant_scope TEXT,
  from_bed TEXT NOT NULL,
  to_bed TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  effective_date TEXT,
  customer_id TEXT,
  customer_code TEXT,
  customer_display_name TEXT,
  original_checkin_date TEXT,
  original_rent_period_start TEXT,
  original_rent_period_end TEXT,
  original_deposit_amount_fils INTEGER DEFAULT 0,
  current_rent_amount_fils INTEGER DEFAULT 0,
  new_bed_rent_amount_fils INTEGER DEFAULT 0,
  rent_difference_fils INTEGER DEFAULT 0,
  transfer_fee_fils INTEGER DEFAULT 0,
  amount_fils INTEGER DEFAULT 5000,
  fee_mode TEXT DEFAULT 'charged',
  fee_status TEXT DEFAULT 'paid',
  payment_method TEXT,
  waiver_reason TEXT,
  category TEXT DEFAULT 'bed_transfer_fee',
  review_flags TEXT,
  carry_over_arrears_fils INTEGER DEFAULT 0,
  old_ttlock_ref TEXT,
  new_ttlock_ref TEXT,
  old_lock_valid_from TEXT,
  old_lock_valid_until TEXT,
  new_lock_valid_from TEXT,
  new_lock_valid_until TEXT,
  reason TEXT,
  note TEXT,
  operator_employee TEXT,
  status TEXT DEFAULT 'recorded',
  audit_id TEXT,
  trace_id TEXT,
  entry_event_id TEXT,
  qa_tag TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  CHECK (from_bed <> to_bed),
  CHECK (status IN ('draft','validated','recorded','pending_review','completed','rolled_back','voided')),
  CHECK (fee_mode IN ('charged','waived')),
  CHECK (fee_status IN ('paid','waived')),
  CHECK (fee_mode <> 'waived' OR COALESCE(waiver_reason,'') <> '')
);

INSERT OR IGNORE INTO bed_transfer_events_recorded_migration (
  id, transfer_id, corp_id, tenant_scope, from_bed, to_bed, transfer_date, effective_date,
  customer_id, customer_code, customer_display_name, original_checkin_date, original_rent_period_start,
  original_rent_period_end, original_deposit_amount_fils, current_rent_amount_fils, new_bed_rent_amount_fils,
  rent_difference_fils, transfer_fee_fils, amount_fils, fee_mode, fee_status, payment_method, waiver_reason, category, review_flags,
  carry_over_arrears_fils, old_ttlock_ref, new_ttlock_ref,
  old_lock_valid_from, old_lock_valid_until, new_lock_valid_from, new_lock_valid_until, reason, note,
  operator_employee, status, audit_id, trace_id, entry_event_id, qa_tag, created_at, updated_at
)
SELECT
  id, transfer_id, corp_id, tenant_scope, from_bed, to_bed, transfer_date, effective_date,
  customer_id, customer_code, customer_display_name, original_checkin_date, original_rent_period_start,
  original_rent_period_end, original_deposit_amount_fils, current_rent_amount_fils, new_bed_rent_amount_fils,
  rent_difference_fils, transfer_fee_fils, COALESCE(transfer_fee_fils, 0),
  CASE WHEN COALESCE(transfer_fee_fils, 0) > 0 THEN 'charged' ELSE 'waived' END,
  CASE WHEN COALESCE(transfer_fee_fils, 0) > 0 THEN 'paid' ELSE 'waived' END,
  CASE WHEN COALESCE(transfer_fee_fils, 0) > 0 THEN 'cash' ELSE 'none' END,
  CASE WHEN COALESCE(transfer_fee_fils, 0) > 0 THEN '' ELSE 'legacy zero-fee transfer' END,
  'bed_transfer_fee', '[]',
  carry_over_arrears_fils, old_ttlock_ref, new_ttlock_ref,
  old_lock_valid_from, old_lock_valid_until, new_lock_valid_from, new_lock_valid_until, reason, note,
  operator_employee, COALESCE(NULLIF(status,''),'recorded'), audit_id, trace_id, trace_id, qa_tag, created_at, updated_at
FROM bed_transfer_events;

DROP TABLE bed_transfer_events;
ALTER TABLE bed_transfer_events_recorded_migration RENAME TO bed_transfer_events;

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_from_bed
  ON bed_transfer_events(from_bed);

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_to_bed
  ON bed_transfer_events(to_bed);

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_customer_id
  ON bed_transfer_events(customer_id);

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_customer_code
  ON bed_transfer_events(customer_code);

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_transfer_date
  ON bed_transfer_events(transfer_date);

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_qa_tag
  ON bed_transfer_events(qa_tag);

CREATE INDEX IF NOT EXISTS idx_bed_transfer_events_status
  ON bed_transfer_events(status);
