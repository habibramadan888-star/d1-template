-- Migration 003: Arrears directive idempotency keys
-- Scope: request_idempotency_keys schema only.
-- No business data writes.
-- Does not modify arrear_tasks source_type/source_ref.

CREATE TABLE IF NOT EXISTS request_idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_user_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  request_hash TEXT,
  response_hash TEXT,
  response_body TEXT,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT DEFAULT 'RECORDED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  CHECK(length(scope) > 0),
  CHECK(length(idempotency_key) > 0),
  CHECK(length(action) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_request_idempotency_scope_action_key
  ON request_idempotency_keys(scope, action, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_actor_action
  ON request_idempotency_keys(actor_user_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_resource
  ON request_idempotency_keys(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_expires_at
  ON request_idempotency_keys(expires_at);

