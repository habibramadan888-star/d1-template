-- P0-001C money minor-unit dual-write draft.
-- Status: DRAFT ONLY. Do not apply to production or remote D1.
-- Purpose: add nullable integer-fils companion columns beside legacy decimal
-- fields so new writes can dual-write without breaking legacy readers.
--
-- Execution requirements before promotion:
-- 1. Human approval.
-- 2. Staging backup and rollback plan.
-- 3. Reconciliation report between legacy decimal values and *_fils fields.
-- 4. P0-003 backend totals authority gate reviewed.
-- 5. P0-002 handover atomic endpoint staging/manual validation completed.
--
-- Note: D1/SQLite ALTER TABLE ADD COLUMN is not idempotent in all versions.
-- A migration runner must check column existence before applying, or this draft
-- must be converted into an approved one-time migration.

ALTER TABLE sessions ADD COLUMN cash_handover_fils INTEGER;
ALTER TABLE sessions ADD COLUMN bank_transfer_total_fils INTEGER;
ALTER TABLE sessions ADD COLUMN gross_received_fils INTEGER;

ALTER TABLE transactions ADD COLUMN amount_fils INTEGER;
ALTER TABLE transactions ADD COLUMN due_fils INTEGER;
ALTER TABLE transactions ADD COLUMN paid_fils INTEGER;
ALTER TABLE transactions ADD COLUMN deficit_fils INTEGER;
ALTER TABLE transactions ADD COLUMN dep_due_fils INTEGER;
ALTER TABLE transactions ADD COLUMN dep_paid_fils INTEGER;
ALTER TABLE transactions ADD COLUMN dep_def_fils INTEGER;
ALTER TABLE transactions ADD COLUMN list_price_fils INTEGER;
ALTER TABLE transactions ADD COLUMN period_due_fils INTEGER;
ALTER TABLE transactions ADD COLUMN excess_fils INTEGER;
ALTER TABLE transactions ADD COLUMN deposit_held_fils INTEGER;
ALTER TABLE transactions ADD COLUMN deposit_amt_fils INTEGER;
ALTER TABLE transactions ADD COLUMN deposit_deduction_fils INTEGER;
ALTER TABLE transactions ADD COLUMN promise_amount_fils INTEGER;

ALTER TABLE deposit_ledger ADD COLUMN amount_fils INTEGER;
ALTER TABLE deposit_ledger ADD COLUMN delta_fils INTEGER;
ALTER TABLE deposit_ledger ADD COLUMN balance_after_fils INTEGER;

ALTER TABLE arrears ADD COLUMN remain_fils INTEGER;

ALTER TABLE arrear_tasks ADD COLUMN arrear_amount_fils INTEGER;
ALTER TABLE arrear_tasks ADD COLUMN promise_amount_fils INTEGER;
ALTER TABLE arrear_tasks ADD COLUMN actual_received_fils INTEGER;

CREATE INDEX IF NOT EXISTS idx_transactions_amount_fils
  ON transactions(corpid, session_id, amount_fils);

CREATE INDEX IF NOT EXISTS idx_deposit_ledger_balance_fils
  ON deposit_ledger(corpid, tenant_card_id, balance_after_fils);

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_amount_fils
  ON arrear_tasks(corpid, followup_status, arrear_amount_fils);
