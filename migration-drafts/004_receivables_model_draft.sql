-- Homelink receivables model draft.
-- Status: DRAFT ONLY. Do not apply to production.
-- This draft is not included in local clean bootstrap.
-- Money columns use integer AED fils only.

CREATE TABLE IF NOT EXISTS receivables (
  receivable_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  bed_id TEXT,
  bed_code_snapshot TEXT NOT NULL,
  tenant_card_id TEXT,
  tenant_snapshot TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT,
  period_start TEXT,
  period_end TEXT,
  due_date TEXT NOT NULL,
  amount_due_fils INTEGER NOT NULL,
  amount_paid_fils INTEGER NOT NULL DEFAULT 0,
  amount_remaining_fils INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_receivables_scope_status
  ON receivables(company_id, property_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_receivables_bed_period
  ON receivables(company_id, property_id, bed_code_snapshot, period_start, period_end);

CREATE TABLE IF NOT EXISTS receivable_events (
  event_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  receivable_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  delta_fils INTEGER NOT NULL DEFAULT 0,
  before_remaining_fils INTEGER,
  after_remaining_fils INTEGER,
  reason_code TEXT,
  note TEXT,
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_receivable_events_receivable
  ON receivable_events(company_id, property_id, receivable_id, created_at);

CREATE TABLE IF NOT EXISTS payment_allocations (
  allocation_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  receivable_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount_fils INTEGER NOT NULL,
  allocation_status TEXT NOT NULL DEFAULT 'POSTED',
  idempotency_key TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_allocations_idempotency
  ON payment_allocations(company_id, property_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_receivable
  ON payment_allocations(company_id, property_id, receivable_id, allocation_status);

CREATE TABLE IF NOT EXISTS receivable_adjustments (
  adjustment_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  receivable_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  amount_fils INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_receivable_adjustments_receivable
  ON receivable_adjustments(company_id, property_id, receivable_id, created_at);
