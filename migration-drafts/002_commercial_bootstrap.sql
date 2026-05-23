-- Homelink commercial bootstrap schema draft.
-- Status: DRAFT ONLY. Do not apply to production.
-- This file intentionally lives in migration-drafts/, not migrations/.
-- Convert to an executable migration only after review, local clean bootstrap tests,
-- and legacy reconciliation planning.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  company_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  property_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
  currency TEXT NOT NULL DEFAULT 'AED',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_properties_company ON properties(company_id, status);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role, status);

CREATE TABLE IF NOT EXISTS property_memberships (
  membership_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_memberships_unique
  ON property_memberships(company_id, property_id, user_id, role);

CREATE TABLE IF NOT EXISTS beds (
  bed_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  bed_code TEXT NOT NULL,
  room_code TEXT,
  ttlock_remark_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  source TEXT NOT NULL DEFAULT 'OWNER',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_property_code
  ON beds(company_id, property_id, bed_code);

CREATE TABLE IF NOT EXISTS bed_rent_config_versions (
  config_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  monthly_rent_fils INTEGER NOT NULL,
  half_month_rent_fils INTEGER NOT NULL DEFAULT 40000,
  daily_rent_fils INTEGER NOT NULL DEFAULT 4000,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bed_rent_versions_active
  ON bed_rent_config_versions(company_id, property_id, bed_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS handover_sessions (
  session_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  business_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  cash_handover_fils INTEGER NOT NULL DEFAULT 0,
  bank_transfer_total_fils INTEGER NOT NULL DEFAULT 0,
  bank_transfer_count INTEGER NOT NULL DEFAULT 0,
  gross_received_fils INTEGER NOT NULL DEFAULT 0,
  export_text TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_handover_idempotency
  ON handover_sessions(company_id, property_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_handover_property_date
  ON handover_sessions(company_id, property_id, business_date, status);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  bed_id TEXT,
  bed_code_snapshot TEXT,
  tenant_card_id TEXT,
  tenant_name_snapshot TEXT,
  event_type TEXT NOT NULL,
  payment_method TEXT,
  amount_fils INTEGER NOT NULL DEFAULT 0,
  due_fils INTEGER NOT NULL DEFAULT 0,
  paid_fils INTEGER NOT NULL DEFAULT 0,
  deficit_fils INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AED',
  period_start TEXT,
  period_end TEXT,
  cycle TEXT,
  period_days INTEGER,
  reason_code TEXT,
  source TEXT NOT NULL DEFAULT 'EMP',
  operator_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_session
  ON transactions(company_id, property_id, session_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency
  ON transactions(company_id, property_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_transactions_bed_period
  ON transactions(company_id, property_id, bed_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_transactions_card_period
  ON transactions(company_id, property_id, tenant_card_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS receivables (
  receivable_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  tenant_card_id TEXT,
  source_transaction_id TEXT NOT NULL,
  amount_due_fils INTEGER NOT NULL DEFAULT 0,
  amount_paid_fils INTEGER NOT NULL DEFAULT 0,
  amount_remaining_fils INTEGER NOT NULL DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_receivables_status
  ON receivables(company_id, property_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_receivables_bed_period
  ON receivables(company_id, property_id, bed_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  receivable_id TEXT,
  amount_fils INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_receivable
  ON payments(company_id, property_id, receivable_id, created_at);

CREATE TABLE IF NOT EXISTS arrear_tasks (
  task_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  receivable_id TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  tenant_card_id TEXT,
  remaining_fils INTEGER NOT NULL DEFAULT 0,
  followup_status TEXT NOT NULL DEFAULT 'PENDING',
  promise_date TEXT,
  promise_amount_fils INTEGER,
  staff_note TEXT,
  owner_note TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status
  ON arrear_tasks(company_id, property_id, followup_status, promise_date);

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_receivable
  ON arrear_tasks(company_id, property_id, receivable_id);

CREATE TABLE IF NOT EXISTS deposit_ledger (
  ledger_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  tenant_card_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  delta_fils INTEGER NOT NULL DEFAULT 0,
  balance_after_fils INTEGER NOT NULL DEFAULT 0,
  movement_type TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_deposit_ledger_card
  ON deposit_ledger(company_id, property_id, tenant_card_id, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
  ON audit_events(company_id, property_id, entity_type, entity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor
  ON audit_events(company_id, actor_id, created_at);
