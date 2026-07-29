-- Homelink employee workflow anchors
-- Run once against the existing D1 database.
-- The live Worker stores ledger rows in transactions, not entries.
-- These columns are nullable/defaulted, so old index.html data remains compatible.

ALTER TABLE transactions ADD COLUMN period_start TEXT;
ALTER TABLE transactions ADD COLUMN period_end   TEXT;
ALTER TABLE transactions ADD COLUMN cycle        TEXT;
ALTER TABLE transactions ADD COLUMN reason_code  TEXT;
ALTER TABLE transactions ADD COLUMN operator_id  TEXT;
ALTER TABLE transactions ADD COLUMN src          TEXT DEFAULT 'EMP';
ALTER TABLE transactions ADD COLUMN tenant_name  TEXT;
ALTER TABLE transactions ADD COLUMN clr          TEXT;
ALTER TABLE transactions ADD COLUMN reason       TEXT;

CREATE TABLE IF NOT EXISTS arrear_tasks (
  task_id          TEXT PRIMARY KEY,
  corpid           TEXT,
  userid           TEXT,
  entry_id         TEXT,
  bed              TEXT,
  tenant_name      TEXT,
  arrear_amount    REAL,
  arrear_reason    TEXT,
  created_at       TEXT,
  followup_status  TEXT DEFAULT '待跟进',
  promise_date     TEXT,
  promise_amount   REAL,
  actual_received  REAL DEFAULT 0,
  close_status     TEXT,
  close_reason     TEXT,
  owner_note       TEXT,
  staff_note       TEXT,
  last_followup_at TEXT,
  updated_by       TEXT,
  updated_at       TEXT
);

CREATE TABLE IF NOT EXISTS entry_events (
  event_id    TEXT PRIMARY KEY,
  corpid      TEXT,
  userid      TEXT,
  ref_id      TEXT,
  ref_type    TEXT,
  event_type  TEXT,
  field_name  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  operator_id TEXT,
  ts          TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id);
CREATE INDEX IF NOT EXISTS idx_arrear_tasks_bed ON arrear_tasks(corpid, bed);
CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date);
CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts);
