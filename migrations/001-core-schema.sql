-- Migration 001: Core production companion schema.
--
-- This migration is intended to be applied once by the D1 migrations flow.
-- It avoids runtime DDL and creates the companion tables required by the
-- backend totals, receivables state machine, handover idempotency, and audit
-- trail work.

CREATE TABLE IF NOT EXISTS receivables_ledger (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  receivable_id TEXT NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  payment_id TEXT,
  allocated_amount INTEGER,
  reason TEXT,
  approved_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receivable_id) REFERENCES receivables(id) ON DELETE CASCADE,
  CHECK (allocated_amount IS NULL OR allocated_amount > 0),
  CHECK (
    old_status IN (
      'CREATED',
      'PENDING',
      'PARTIAL',
      'PAID',
      'VOIDED',
      'ADJUSTED',
      'WRITTEN_OFF'
    )
  ),
  CHECK (
    new_status IN (
      'CREATED',
      'PENDING',
      'PARTIAL',
      'PAID',
      'VOIDED',
      'ADJUSTED',
      'WRITTEN_OFF'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_receivables_ledger_receivable_id
  ON receivables_ledger(receivable_id);

CREATE INDEX IF NOT EXISTS idx_receivables_ledger_created_at
  ON receivables_ledger(created_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  expires_at TEXT DEFAULT (datetime('now', '+24 hours')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
  ON idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  operation_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  user_id TEXT,
  user_role TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_fields TEXT,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id
  ON audit_logs(resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type
  ON audit_logs(operation_type);

-- D1/SQLite does not support idempotent ADD COLUMN syntax.
-- Keep these ALTER statements in a one-time migration and verify columns
-- before applying to environments that may already contain partial schema.
ALTER TABLE receivables ADD COLUMN status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_receivables_status
  ON receivables(status)
  WHERE status != 'PAID';

ALTER TABLE entries ADD COLUMN computed_total_cash INTEGER;
ALTER TABLE entries ADD COLUMN computed_total_bank INTEGER;
ALTER TABLE entries ADD COLUMN computation_timestamp TEXT;
