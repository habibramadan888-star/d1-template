-- employee_upload_attempt_v2
-- QA is the first authorized environment. Production must not apply this migration.

CREATE TABLE IF NOT EXISTS employee_upload_attempts (
  attempt_id TEXT PRIMARY KEY,
  contract_version TEXT NOT NULL,
  company_scope TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  qa_run_id TEXT,
  artifact_sha TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  validation_attempt_id TEXT NOT NULL,
  validation_result_digest TEXT NOT NULL,
  expected_entry_ids_json TEXT NOT NULL,
  expected_count INTEGER NOT NULL,
  saved_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  lease_token_hash TEXT,
  lease_expires_at TEXT,
  last_error_code TEXT,
  metrics_json TEXT,
  receipt_json TEXT,
  receipt_digest TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(company_scope, session_id, payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_employee_upload_attempts_scope_status
  ON employee_upload_attempts(company_scope, employee_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_employee_upload_attempts_qa_run
  ON employee_upload_attempts(company_scope, qa_run_id, updated_at);

CREATE TABLE IF NOT EXISTS employee_upload_attempt_entries (
  attempt_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  canonical_anchor_id TEXT,
  last_error_code TEXT,
  write_started_at TEXT,
  write_completed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(attempt_id, entry_id),
  FOREIGN KEY(attempt_id) REFERENCES employee_upload_attempts(attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_upload_attempt_entries_progress
  ON employee_upload_attempt_entries(attempt_id, status, ordinal);
