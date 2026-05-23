-- Homelink clean local D1 bootstrap.
-- Scope: local/dev/test only. Do not apply to production without review.
-- Purpose: create the minimum legacy-compatible tables required by the
-- current Worker, auth smoke, employee entry smoke, owner read smoke,
-- and delete-session void behavior.
--
-- Accounting note: this file intentionally preserves the current legacy
-- REAL money columns so P0-005 can verify bootstrap without changing
-- financial formulas. P0-001 must migrate commercial money to integer
-- minor units before production SaaS launch.

CREATE TABLE IF NOT EXISTS active_sessions (
  sid TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  role TEXT,
  user_agent TEXT,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER,
  revoked INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user
  ON active_sessions(corpid, userid, revoked, expires_at);

CREATE TABLE IF NOT EXISTS employee_users (
  employee_id TEXT PRIMARY KEY,
  corpid TEXT,
  employee_name TEXT,
  pin_hash TEXT,
  role TEXT DEFAULT 'staff',
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  role TEXT,
  action TEXT,
  target TEXT,
  detail TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON audit_logs(corpid, target, created_at);

CREATE TABLE IF NOT EXISTS app_settings (
  corpid TEXT,
  key TEXT,
  value TEXT,
  updated_by TEXT,
  updated_at TEXT,
  PRIMARY KEY (corpid, key)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  anchor_id TEXT,
  date TEXT,
  entries_count INTEGER,
  created_by TEXT,
  created_at TEXT,
  operator_id TEXT,
  operator_name TEXT,
  cash_handover REAL,
  bank_transfer_total REAL,
  bank_transfer_count INTEGER,
  gross_received REAL,
  handover_status TEXT,
  exported_at TEXT,
  export_text TEXT,
  source TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  void_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_corpid_created
  ON sessions(corpid, created_at);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  session_id TEXT,
  cat TEXT,
  room TEXT,
  amount REAL,
  due REAL,
  paid REAL,
  deficit REAL,
  tag TEXT,
  note TEXT,
  room_to TEXT,
  start_date TEXT,
  dep_due REAL,
  dep_paid REAL,
  dep_def REAL,
  due_date TEXT,
  dep_date TEXT,
  pay_type TEXT,
  discount_reason TEXT,
  deposit_collection INTEGER,
  period_start TEXT,
  period_end TEXT,
  cycle TEXT,
  reason_code TEXT,
  operator_id TEXT,
  src TEXT DEFAULT 'EMP',
  tenant_name TEXT,
  clr TEXT,
  reason TEXT,
  created_at TEXT,
  type TEXT,
  tenant_card_id TEXT,
  list_price REAL,
  period_day_count INTEGER,
  period_due REAL,
  custom_reason TEXT,
  entry_clr TEXT,
  excess REAL,
  excess_to TEXT,
  bank_ref TEXT,
  status TEXT DEFAULT 'ACTIVE',
  ts TEXT,
  checkout_date TEXT,
  deposit_held REAL,
  deposit_return TEXT,
  deposit_amt REAL,
  deposit_deduction REAL,
  ded_reason TEXT,
  ded_days INTEGER,
  ded_rate REAL,
  ded_note TEXT,
  early_days INTEGER,
  arrear_handling TEXT,
  bed_from TEXT,
  bed_to TEXT,
  fee_paid TEXT,
  fee_waiver_reason TEXT,
  expense_category TEXT,
  expense_desc TEXT,
  linked_task_id TEXT,
  original_period_start TEXT,
  original_period_end TEXT,
  arrear_promise_date TEXT,
  arrear_reason_detail TEXT,
  promise_amount REAL,
  operator_name TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  void_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_session
  ON transactions(corpid, session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_period
  ON transactions(corpid, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_transactions_operator
  ON transactions(corpid, operator_id);

CREATE INDEX IF NOT EXISTS idx_transactions_cid_period
  ON transactions(corpid, tenant_card_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS arrears (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  room TEXT,
  note TEXT,
  remain REAL,
  due_date TEXT,
  type TEXT,
  session_id TEXT,
  entry_id TEXT,
  cleared INTEGER DEFAULT 0,
  cleared_by TEXT,
  cleared_at TEXT,
  created_at TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  void_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_arrears_open
  ON arrears(corpid, cleared, due_date);

CREATE TABLE IF NOT EXISTS arrear_tasks (
  task_id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  entry_id TEXT,
  bed TEXT,
  tenant_name TEXT,
  arrear_amount REAL,
  arrear_reason TEXT,
  created_at TEXT,
  followup_status TEXT DEFAULT '待跟进',
  promise_date TEXT,
  promise_amount REAL,
  actual_received REAL DEFAULT 0,
  close_status TEXT,
  close_reason TEXT,
  owner_note TEXT,
  staff_note TEXT,
  last_followup_at TEXT,
  updated_by TEXT,
  updated_at TEXT,
  tenant_card_id TEXT,
  original_entry_id TEXT,
  original_period_start TEXT,
  original_period_end TEXT,
  created_by TEXT,
  write_off_authorized TEXT,
  write_off_reason TEXT,
  write_off_at TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  void_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_bed
  ON arrear_tasks(corpid, bed);

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status
  ON arrear_tasks(corpid, followup_status, promise_date);

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period
  ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end);

CREATE TABLE IF NOT EXISTS entry_events (
  event_id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  ref_id TEXT,
  ref_type TEXT,
  event_type TEXT,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  operator_id TEXT,
  ts TEXT
);

CREATE INDEX IF NOT EXISTS idx_entry_events_ref
  ON entry_events(corpid, ref_type, ref_id, ts);

CREATE TABLE IF NOT EXISTS deposit_ledger (
  ledger_id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  tenant_card_id TEXT,
  tenant_name TEXT,
  bed TEXT,
  entry_id TEXT,
  type TEXT,
  amount REAL,
  delta REAL,
  balance_after REAL,
  note TEXT,
  operator_id TEXT,
  ts TEXT,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  void_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid
  ON deposit_ledger(corpid, tenant_card_id, ts);
