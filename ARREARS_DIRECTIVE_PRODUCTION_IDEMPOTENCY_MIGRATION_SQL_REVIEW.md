# Arrears Directive Production Idempotency Migration SQL Review

Date: 2026-05-31

## SQL Content

Migration file: `migrations/003_arrears_directive_idempotency_keys.sql`

```sql
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
```

## Why It Is Needed

The production Worker directive write path reads and writes `request_idempotency_keys`. Without this table, a production-linked owner directive or employee follow-up write smoke would fail before idempotency replay/conflict handling can work.

The unique index on `(scope, action, idempotency_key)` is required to ensure duplicate requests replay safely and conflicting requests can be detected by the application.

## Nullable Safety

| Field             | Nullable | Reason                                                   |
| ----------------- | -------: | -------------------------------------------------------- |
| `id`              |       no | primary key                                              |
| `scope`           |       no | replay scope                                             |
| `idempotency_key` |       no | request key                                              |
| `actor_user_id`   |      yes | requested migration scope allows nullable actor metadata |
| `actor_role`      |      yes | requested migration scope allows nullable role metadata  |
| `action`          |       no | replay action namespace                                  |
| `request_hash`    |      yes | requested migration scope allows nullable request hash   |
| `response_hash`   |      yes | response may not exist for failed/partial records        |
| `response_body`   |      yes | response replay body optional by operation               |
| `resource_type`   |      yes | not every idempotent action targets one resource         |
| `resource_id`     |      yes | not every idempotent action targets one resource         |
| `status`          |      yes | defaults to `RECORDED`                                   |
| `created_at`      |       no | default timestamp                                        |
| `expires_at`      |      yes | expiration may be unset                                  |

## Existing Data Impact

- Existing business rows are not modified.
- `arrear_tasks` is not modified.
- `audit_logs` is not modified.
- `source_type` / `source_ref` are not touched.
- Financial formula and dashboard calculation are not touched.

## Rollback SQL

Only run rollback before any production write uses this table, or after separate explicit approval.

```sql
DROP INDEX IF EXISTS idx_request_idempotency_expires_at;
DROP INDEX IF EXISTS idx_request_idempotency_resource;
DROP INDEX IF EXISTS idx_request_idempotency_actor_action;
DROP INDEX IF EXISTS idx_request_idempotency_scope_action_key;
DROP TABLE IF EXISTS request_idempotency_keys;
```

## Scope Confirmation

| Check                                | Result             |
| ------------------------------------ | ------------------ |
| Only idempotency schema              | yes                |
| Touches `source_type` / `source_ref` | no                 |
| Business data write                  | no                 |
| Rollback SQL prepared                | yes                |
| Production cutover                   | `PRODUCTION_NO_GO` |
