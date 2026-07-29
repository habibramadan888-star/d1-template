-- P0-002C local/staging-only handover atomic commit tables.
-- Do not execute against production or remote D1.
-- Purpose: allow local/staging endpoint verification without writing legacy
-- live financial tables such as transactions, deposit_ledger, or arrears.

CREATE TABLE IF NOT EXISTS handover_commits (
  commit_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  accepted_at TEXT,
  committed_at TEXT,
  rejected_at TEXT,
  backend_cash_handover_fils INTEGER NOT NULL DEFAULT 0,
  backend_bank_transfer_fils INTEGER NOT NULL DEFAULT 0,
  backend_gross_received_fils INTEGER NOT NULL DEFAULT 0,
  backend_session_total_fils INTEGER NOT NULL DEFAULT 0,
  backend_deposit_fils INTEGER NOT NULL DEFAULT 0,
  backend_rent_fils INTEGER NOT NULL DEFAULT 0,
  backend_arrears_paid_fils INTEGER NOT NULL DEFAULT 0,
  frontend_cash_handover_fils INTEGER,
  frontend_bank_transfer_fils INTEGER,
  frontend_gross_received_fils INTEGER,
  frontend_session_total_fils INTEGER,
  frontend_bank_transfer_count INTEGER,
  delta_max_fils INTEGER NOT NULL DEFAULT 0,
  delta_json TEXT,
  bank_transfer_count INTEGER NOT NULL DEFAULT 0,
  accepted_row_count INTEGER NOT NULL DEFAULT 0,
  rejected_row_count INTEGER NOT NULL DEFAULT 0,
  decision_reason TEXT,
  audit_payload_json TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  void_source TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  UNIQUE (company_id, property_id, idempotency_key),
  UNIQUE (company_id, property_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_handover_commits_company_status
  ON handover_commits(company_id, property_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_handover_commits_employee
  ON handover_commits(company_id, employee_id, created_at);

CREATE TABLE IF NOT EXISTS handover_commit_rows (
  row_id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  client_entry_id TEXT NOT NULL,
  row_index INTEGER NOT NULL DEFAULT 0,
  row_status TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  bed TEXT,
  tenant_label TEXT,
  amount_fils INTEGER NOT NULL DEFAULT 0,
  rejection_code TEXT,
  rejection_reason TEXT,
  normalized_payload_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (company_id, property_id, session_id, client_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_handover_commit_rows_commit
  ON handover_commit_rows(commit_id, row_index);

CREATE TABLE IF NOT EXISTS handover_idempotency_keys (
  key_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  commit_id TEXT,
  status TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT,
  response_digest TEXT,
  UNIQUE (company_id, property_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_handover_idempotency_fingerprint
  ON handover_idempotency_keys(company_id, property_id, request_fingerprint);

CREATE TABLE IF NOT EXISTS handover_audit_events (
  event_id TEXT PRIMARY KEY,
  commit_id TEXT,
  company_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL,
  event_payload_json TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_handover_audit_events_commit
  ON handover_audit_events(commit_id, created_at);
