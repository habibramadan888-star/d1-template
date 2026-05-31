# Arrears Directive Production Schema Gap Review

Date: 2026-05-31

## Scope

This is a documentation-only review for manual production approval. No production D1 query, production D1 write, production migration, production deploy, or production write gate enablement was executed.

Production status below is inferred from repository migrations and current Worker code. A live production schema check requires separate explicit approval because this task forbids production D1 execute.

## Schema Gap Matrix

| Schema Item                                | Staging                                                                                  | Production                                                                                      | Required For Production                                                     | Migration Required                                                            | Rollback                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `request_idempotency_keys` table           | Present in staging from `migration-drafts/003_arrears_directive_idempotency_staging.sql` | Not live-verified; not part of committed production migrations                                  | Required before any production owner directive or employee follow-up write  | Yes, unless production already has equivalent table after separate live check | `DROP TABLE request_idempotency_keys` only before production writes; after writes, preserve for audit/replay unless separately approved |
| `idx_request_idempotency_scope_action_key` | Present in staging                                                                       | Not live-verified                                                                               | Required to prevent duplicate scoped action keys                            | Yes with idempotency table                                                    | `DROP INDEX idx_request_idempotency_scope_action_key` only if table rollback approved                                                   |
| `idx_request_idempotency_actor_action`     | Present in staging                                                                       | Not live-verified                                                                               | Recommended for actor/action audit lookup                                   | Yes with idempotency table                                                    | `DROP INDEX idx_request_idempotency_actor_action` if rollback approved                                                                  |
| `idx_request_idempotency_resource`         | Present in staging                                                                       | Not live-verified                                                                               | Recommended for resource rollback/audit lookup                              | Yes with idempotency table                                                    | `DROP INDEX idx_request_idempotency_resource` if rollback approved                                                                      |
| `arrear_tasks.boss_requested_at`           | Present in staging                                                                       | Migration exists in `migrations/002_add_boss_directive_fields.sql`; live production not queried | Required for owner directive timestamp                                      | Apply/confirm migration 002 before write smoke                                | `ALTER TABLE DROP COLUMN` is not recommended after writes; instead leave nullable                                                       |
| `arrear_tasks.boss_requested_by`           | Present in staging                                                                       | Migration exists; live production not queried                                                   | Required for owner/audit trace                                              | Apply/confirm migration 002 before write smoke                                | Leave nullable; do not destructive rollback after writes                                                                                |
| `arrear_tasks.boss_requested_due_date`     | Present in staging                                                                       | Migration exists; live production not queried                                                   | Required if owner due-date instruction is used                              | Apply/confirm migration 002 before write smoke                                | Leave nullable                                                                                                                          |
| `arrear_tasks.directive_status`            | Present in staging                                                                       | Migration exists; live production not queried                                                   | Required for assigned/followed-up lifecycle                                 | Apply/confirm migration 002 before write smoke                                | Leave nullable/default `none`                                                                                                           |
| `arrear_tasks.staff_promised_at`           | Present in staging                                                                       | Migration exists; live production not queried                                                   | Required for employee receipt timestamp                                     | Apply/confirm migration 002 before write smoke                                | Leave nullable                                                                                                                          |
| `arrear_tasks.source_type`                 | Added in staging as nullable fixture support                                             | Not in production migrations reviewed                                                           | Required only if production must persist ttlock task rows in `arrear_tasks` | Yes for persisted ttlock rows; not required for existing_arrears_record smoke | Leave nullable; can remain harmless for existing rows                                                                                   |
| `arrear_tasks.source_ref`                  | Added in staging as nullable fixture support                                             | Not in production migrations reviewed                                                           | Required only for traceable persisted ttlock source refs                    | Yes for persisted ttlock rows                                                 | Leave nullable; can remain harmless for existing rows                                                                                   |

## Proposed Production Migration Draft

Do not run without explicit approval.

```sql
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

ALTER TABLE arrear_tasks ADD COLUMN source_type TEXT;
ALTER TABLE arrear_tasks ADD COLUMN source_ref TEXT;
```

If production already has migration 002 fields, do not re-add them. If not, apply `migrations/002_add_boss_directive_fields.sql` first.

## Impact

- All proposed columns are nullable except idempotency table required columns.
- Existing `arrear_tasks` rows are not modified by the schema-only migration.
- No financial formula, dashboard calculation, money logic, receivable logic, handover logic, or tenant-scope logic is changed.

## Required Human Decision

Production schema migration is not approved by this document. It requires explicit Ramadan approval in the next step.
