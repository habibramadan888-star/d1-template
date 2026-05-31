# Arrears Directive Production Schema Gap Review

Date: 2026-05-31

## Scope

This review is based on a production read-only schema metadata check plus repository migrations. No production D1 write, migration, deploy, write gate enablement, or production smoke was executed.

Live check evidence: `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_LIVE_CHECK_RESULT.md`

## Schema Readiness Conclusion

`SCHEMA_MIGRATION_REQUIRED_BEFORE_WRITE_SMOKE`

Production has the `arrear_tasks` boss directive fields from migration 002 and has core `audit_logs` fields. Production does not have the `request_idempotency_keys` table or idempotency indexes required by the directive write path.

## Final Schema Gap Matrix

| Schema Item                                | Production Live Status | Required For Production Write Smoke |                                      Migration Required | Risk                                                                 | Rollback                                                                     |
| ------------------------------------------ | ---------------------- | ----------------------------------: | ------------------------------------------------------: | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `request_idempotency_keys` table           | missing                |                                 yes |                                                     yes | medium; write smoke replay/conflict safety is unavailable without it | Drop only before any write; preserve after writes unless separately approved |
| `idx_request_idempotency_scope_action_key` | missing                |                                 yes |                                                     yes | medium; duplicate keys cannot be enforced                            | Drop only with idempotency rollback approval                                 |
| `idx_request_idempotency_actor_action`     | missing                |                         recommended |                                          yes with table | low/medium; audit lookup slower                                      | Drop with table/index rollback approval                                      |
| `idx_request_idempotency_resource`         | missing                |                         recommended |                                          yes with table | low/medium; rollback lookup slower                                   | Drop with table/index rollback approval                                      |
| `arrear_tasks.boss_requested_at`           | present                |                                 yes |                                                      no | low                                                                  | Leave nullable                                                               |
| `arrear_tasks.boss_requested_by`           | present                |                                 yes |                                                      no | low                                                                  | Leave nullable                                                               |
| `arrear_tasks.boss_requested_due_date`     | present                |                                 yes |                                                      no | low                                                                  | Leave nullable                                                               |
| `arrear_tasks.directive_status`            | present                |                                 yes |                                                      no | low                                                                  | Leave nullable/default `none`                                                |
| `arrear_tasks.staff_promised_at`           | present                |                                 yes |                                                      no | low                                                                  | Leave nullable                                                               |
| `idx_arrear_tasks_directive`               | present                |                         recommended |                                                      no | low                                                                  | Keep index                                                                   |
| `arrear_tasks.promise_date`                | present                |                                 yes |                                                      no | low                                                                  | Pre-smoke snapshot can restore field values                                  |
| `arrear_tasks.promise_amount`              | present                |                                 yes |                                                      no | low                                                                  | Pre-smoke snapshot can restore field values                                  |
| `arrear_tasks.staff_note`                  | present                |                                 yes |                                                      no | low                                                                  | Pre-smoke snapshot can restore field values                                  |
| `arrear_tasks.last_followup_at`            | present                |                                 yes |                                                      no | low                                                                  | Pre-smoke snapshot can restore field values                                  |
| `arrear_tasks.source_type`                 | missing                |                         conditional | optional unless ttlock persistent row smoke is approved | low/medium; ttlock source cannot be persisted cleanly without it     | Leave nullable if added                                                      |
| `arrear_tasks.source_ref`                  | missing                |                         conditional | optional unless ttlock persistent row smoke is approved | low/medium; ttlock traceability weaker without it                    | Leave nullable if added                                                      |
| `audit_logs` core table/fields             | present                |                                 yes |                                                      no | low                                                                  | Do not delete audit rows by default                                          |

## Required Migration Before Write Smoke

The idempotency table migration is required before any production-linked owner directive or employee follow-up write smoke.

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
```

## Optional Migration If TTLock Persistent Row Smoke Is Approved

Only include these if Ramadan explicitly approves a persisted `ttlock_expired_unpaid` production smoke row and the implementation must store ttlock source metadata in `arrear_tasks`.

```sql
ALTER TABLE arrear_tasks ADD COLUMN source_type TEXT;
ALTER TABLE arrear_tasks ADD COLUMN source_ref TEXT;
```

If Ramadan approves only an `existing_arrears_record` production smoke, do not add `source_type` / `source_ref` in that smoke approval.

## Rollback Completeness

Rollback is complete for selected task field restoration through pre-smoke snapshots. For idempotency migration rollback:

- Before any production writes, the idempotency table and indexes can be dropped if rollback is approved.
- After production writes, do not delete idempotency or audit rows by default because they protect replay safety and traceability.

## Production Safety Status

- Production D1 write: `No`
- Production migration: `No`
- Production write gate: `No`
- Production deploy: `No`
- Production cutover: `PRODUCTION_NO_GO`
