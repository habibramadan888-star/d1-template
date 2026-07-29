CREATE TABLE IF NOT EXISTS qa_environment_identity (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_acceptance_runs (
  qa_run_id TEXT PRIMARY KEY,
  corpid TEXT NOT NULL,
  mode TEXT NOT NULL,
  matrix_version TEXT NOT NULL,
  scenario_count INTEGER NOT NULL,
  employee_record_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  artifact_commit TEXT NOT NULL,
  qa_worker_version TEXT,
  matrix_json TEXT NOT NULL,
  expected_json TEXT NOT NULL,
  automation_json TEXT,
  upload_json TEXT,
  reconciliation_json TEXT,
  employee_accepted_by TEXT,
  employee_accepted_at TEXT,
  owner_accepted_by TEXT,
  owner_accepted_at TEXT,
  cleanup_status TEXT DEFAULT 'NOT_RUN',
  cleanup_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qa_acceptance_runs_created
  ON qa_acceptance_runs(corpid, created_at DESC);

INSERT OR REPLACE INTO qa_environment_identity (key,value,created_at) VALUES
  ('app_env','qa','2026-07-16T00:00:00.000Z'),
  ('corpid','HL-QA','2026-07-16T00:00:00.000Z'),
  ('d1_database_id','44bacad0-9de9-4a27-a6ca-9f74d40db1ba','2026-07-16T00:00:00.000Z'),
  ('kv_namespace_id','4fba90660a0f4c02ad6e4114f179e929','2026-07-16T00:00:00.000Z'),
  ('binding_contract_sha256','7a3b133331e698544c819aa314f33a7d28aa98c53256c86ff8e3277544f47ebd','2026-07-16T00:00:00.000Z');
