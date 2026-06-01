-- Migration 005: Bed Transfer event closure schema
-- Scope: staging-only unless separately approved for production.
-- Purpose: persist Bed Transfer from_bed -> to_bed events with accounting,
-- TTLock, audit, traceability, and QA rollback anchors.

CREATE TABLE IF NOT EXISTS bed_transfer_events (
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
  waiver_reason TEXT,
  category TEXT DEFAULT 'bed_transfer_fee',
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
  CHECK (fee_mode <> 'waived' OR COALESCE(waiver_reason,'') <> '')
);

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
