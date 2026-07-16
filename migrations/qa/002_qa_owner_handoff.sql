CREATE TABLE IF NOT EXISTS qa_owner_handoff_codes (
  handoff_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  qa_run_id TEXT NOT NULL,
  corpid TEXT NOT NULL,
  owner_userid TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'MANUAL_EMPLOYEE_ACCEPTANCE',
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_qa_owner_handoff_run
  ON qa_owner_handoff_codes(corpid, qa_run_id, created_at DESC);
