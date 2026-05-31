-- Staging-only migration for arrears directive durable idempotency.
-- Target: homelink-finance-staging (4ff78bfc-3855-436b-aefb-6b492145d79c)
-- Do not apply to production without a separate approval packet.

CREATE TABLE IF NOT EXISTS request_idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_hash TEXT,
  response_body TEXT,
  resource_type TEXT,
  resource_id TEXT,
  status TEXT NOT NULL DEFAULT 'RECORDED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  CHECK(length(idempotency_key) > 0),
  CHECK(length(scope) > 0),
  CHECK(length(action) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_request_idempotency_scope_action_key
  ON request_idempotency_keys(scope, action, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_actor_action
  ON request_idempotency_keys(actor_user_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_request_idempotency_resource
  ON request_idempotency_keys(resource_type, resource_id);
