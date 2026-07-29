-- P0-008C receivables local/staging rehearsal draft.
-- Status: DRAFT ONLY. Do not apply to production.
-- Intended scope: local/staging schema rehearsal after explicit human approval.
-- This file is not a production migration and must not be applied to production D1.
-- No seed data, business data, or destructive operations are included.
-- All money authority columns use integer AED fils.

CREATE TABLE IF NOT EXISTS receivables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receivable_id TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_id TEXT,
  customer_id TEXT,
  tenant_id TEXT,
  property_id TEXT,
  room_id TEXT,
  amount_fils INTEGER NOT NULL,
  paid_fils INTEGER NOT NULL DEFAULT 0,
  outstanding_fils INTEGER NOT NULL,
  status TEXT NOT NULL,
  due_date TEXT NOT NULL,
  overdue_at TEXT,
  currency TEXT NOT NULL DEFAULT 'AED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  voided_at TEXT,
  void_reason TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_receivables_status_due
  ON receivables(status, due_date);

CREATE INDEX IF NOT EXISTS idx_receivables_scope_due
  ON receivables(property_id, tenant_id, room_id, due_date);

CREATE TABLE IF NOT EXISTS receivable_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receivable_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount_fils INTEGER NOT NULL,
  source_type TEXT,
  source_id TEXT,
  event_at TEXT NOT NULL,
  created_by TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_receivable_events_receivable
  ON receivable_events(receivable_id, event_at);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  allocation_id TEXT NOT NULL UNIQUE,
  receivable_id TEXT NOT NULL,
  payment_source_type TEXT NOT NULL,
  payment_source_id TEXT NOT NULL,
  allocated_fils INTEGER NOT NULL,
  allocated_at TEXT NOT NULL,
  voided_at TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_receivable
  ON payment_allocations(receivable_id, allocated_at);

CREATE TABLE IF NOT EXISTS receivable_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receivable_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  amount_fils INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  voided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_receivable_adjustments_receivable
  ON receivable_adjustments(receivable_id, created_at);
