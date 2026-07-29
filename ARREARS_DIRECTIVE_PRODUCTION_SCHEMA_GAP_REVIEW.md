# Arrears Directive Production Schema Gap Review

Date: 2026-05-31

## Scope

This review now includes the approved production idempotency schema migration. No production business write, production smoke, write gate enablement, deploy, financial formula change, or dashboard calculation change was executed.

Live check evidence:

- `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_LIVE_CHECK_RESULT.md`
- `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_POST_MIGRATION_CHECK.md`

## Schema Readiness Conclusion

`SCHEMA_READY_FOR_EXISTING_ARREARS_WRITE_SMOKE`

Production now has the `arrear_tasks` boss directive fields, core employee follow-up fields, core `audit_logs` fields, `request_idempotency_keys`, and required idempotency indexes.

This does not authorize write smoke. It only means the schema prerequisite is ready for a separately approved one-row `existing_arrears_record` production smoke.

## Final Schema Matrix

| Schema Item                                | Production Status | Required For Existing Arrears Smoke | Gap                                    |            Migration Needed |
| ------------------------------------------ | ----------------- | ----------------------------------: | -------------------------------------- | --------------------------: |
| `request_idempotency_keys` table           | present           |                                 yes | none                                   |                          no |
| `idx_request_idempotency_scope_action_key` | present, unique   |                                 yes | none                                   |                          no |
| `idx_request_idempotency_actor_action`     | present           |                         recommended | none                                   |                          no |
| `idx_request_idempotency_resource`         | present           |                         recommended | none                                   |                          no |
| `idx_request_idempotency_expires_at`       | present           |                         recommended | none                                   |                          no |
| `arrear_tasks.boss_requested_at`           | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.boss_requested_by`           | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.boss_requested_due_date`     | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.directive_status`            | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.staff_promised_at`           | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.promise_date`                | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.promise_amount`              | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.staff_note`                  | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.last_followup_at`            | present           |                                 yes | none                                   |                          no |
| `audit_logs` core table/fields             | present           |                                 yes | none                                   |                          no |
| `arrear_tasks.source_type`                 | absent            |       no for existing_arrears smoke | needed only for persisted ttlock smoke | optional, separate approval |
| `arrear_tasks.source_ref`                  | absent            |       no for existing_arrears smoke | needed only for persisted ttlock smoke | optional, separate approval |

## TTLock Decision

`source_type` and `source_ref` were not migrated in this task.

If Ramadan later approves a persisted `ttlock_expired_unpaid` production smoke row, a separate schema decision is still required for `source_type` and `source_ref`.

## Rollback

Rollback SQL for the idempotency schema remains available in `ARREARS_DIRECTIVE_PRODUCTION_IDEMPOTENCY_MIGRATION_SQL_REVIEW.md`.

Do not rollback the idempotency table after any production smoke writes unless separately approved because idempotency rows protect replay safety and audit traceability.

## Production Safety Status

- Production business write: `No`
- Production write gate: `Off`
- Production schema migration scope: `request_idempotency_keys` only
- `source_type` / `source_ref` migration: `No`
- Production deploy: `No`
- Production cutover: `PRODUCTION_NO_GO`
