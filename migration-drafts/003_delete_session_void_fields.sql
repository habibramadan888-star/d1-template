-- Draft only. Do not apply to production without review.
-- Purpose: preserve financial rows when /api/delete_session voids a session.

ALTER TABLE sessions ADD COLUMN voided_at TEXT;
ALTER TABLE sessions ADD COLUMN voided_by TEXT;
ALTER TABLE sessions ADD COLUMN void_reason TEXT;
ALTER TABLE sessions ADD COLUMN void_source TEXT;

ALTER TABLE transactions ADD COLUMN voided_at TEXT;
ALTER TABLE transactions ADD COLUMN voided_by TEXT;
ALTER TABLE transactions ADD COLUMN void_reason TEXT;
ALTER TABLE transactions ADD COLUMN void_source TEXT;

ALTER TABLE deposit_ledger ADD COLUMN voided_at TEXT;
ALTER TABLE deposit_ledger ADD COLUMN voided_by TEXT;
ALTER TABLE deposit_ledger ADD COLUMN void_reason TEXT;
ALTER TABLE deposit_ledger ADD COLUMN void_source TEXT;

ALTER TABLE arrears ADD COLUMN voided_at TEXT;
ALTER TABLE arrears ADD COLUMN voided_by TEXT;
ALTER TABLE arrears ADD COLUMN void_reason TEXT;
ALTER TABLE arrears ADD COLUMN void_source TEXT;

ALTER TABLE arrear_tasks ADD COLUMN voided_at TEXT;
ALTER TABLE arrear_tasks ADD COLUMN voided_by TEXT;
ALTER TABLE arrear_tasks ADD COLUMN void_reason TEXT;
ALTER TABLE arrear_tasks ADD COLUMN void_source TEXT;
