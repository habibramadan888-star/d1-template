# Arrears Directive Production Schema Live Check Result

Date: 2026-05-31

## Scope

This was a read-only production schema metadata check. No production data write, migration, export/import, deploy, write gate enablement, or production smoke was executed.

Query type: `read-only schema check`

Commands were limited to:

- `SELECT ... FROM sqlite_master`
- `PRAGMA table_info(...)`
- `PRAGMA index_list(...)`

All production D1 query metadata reported:

- `changes=0`
- `rows_written=0`
- `changed_db=false`

## Production Schema Matrix

| Schema Item                                             | Production Exists |    Required | Gap                                    |                               Migration Needed |
| ------------------------------------------------------- | ----------------: | ----------: | -------------------------------------- | ---------------------------------------------: |
| `request_idempotency_keys` table                        |                no |         yes | Missing table                          |                                            yes |
| `idx_request_idempotency_scope_action_key` unique index |                no |         yes | Missing unique replay/conflict index   |                                            yes |
| `idx_request_idempotency_actor_action` index            |                no | recommended | Missing audit lookup index             |                 yes with idempotency migration |
| `idx_request_idempotency_resource` index                |                no | recommended | Missing resource lookup index          |                 yes with idempotency migration |
| `request_idempotency_keys.id`                           |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.scope`                        |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.idempotency_key`              |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.actor_user_id`                |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.actor_role`                   |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.action`                       |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.request_hash`                 |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.response_hash`                |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.resource_type`                |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.resource_id`                  |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.status`                       |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.created_at`                   |                no |         yes | Table missing                          |                                            yes |
| `request_idempotency_keys.expires_at`                   |                no |         yes | Table missing                          |                                            yes |
| `arrear_tasks` table                                    |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.boss_requested_at`                        |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.boss_requested_by`                        |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.boss_requested_due_date`                  |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.directive_status`                         |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.staff_promised_at`                        |               yes |         yes | none                                   |                                             no |
| `idx_arrear_tasks_directive`                            |               yes | recommended | none                                   |                                             no |
| `arrear_tasks.promise_date`                             |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.promise_amount`                           |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.staff_note`                               |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.last_followup_at`                         |               yes |         yes | none                                   |                                             no |
| `arrear_tasks.source_type`                              |                no | conditional | Missing ttlock source metadata column  | yes only if persisted ttlock rows are approved |
| `arrear_tasks.source_ref`                               |                no | conditional | Missing ttlock source reference column | yes only if persisted ttlock rows are approved |
| `audit_logs` table                                      |               yes |         yes | none                                   |                                             no |
| `audit_logs.id`                                         |               yes |         yes | none                                   |                                             no |
| `audit_logs.corpid`                                     |               yes |         yes | none                                   |                                             no |
| `audit_logs.userid`                                     |               yes |         yes | none                                   |                                             no |
| `audit_logs.role`                                       |               yes |         yes | none                                   |                                             no |
| `audit_logs.action`                                     |               yes |         yes | none                                   |                                             no |
| `audit_logs.target`                                     |               yes |         yes | none                                   |                                             no |
| `audit_logs.detail`                                     |               yes |         yes | none                                   |                                             no |
| `audit_logs.created_at`                                 |               yes |         yes | none                                   |                                             no |

## Production vs Staging Difference

| Area                         | Production | Staging | Difference                                          |
| ---------------------------- | ---------- | ------- | --------------------------------------------------- |
| Idempotency table            | absent     | present | production blocker before write smoke               |
| Idempotency indexes          | absent     | present | production blocker before write smoke               |
| Boss directive fields        | present    | present | aligned                                             |
| Employee follow-up fields    | present    | present | aligned                                             |
| `source_type` / `source_ref` | absent     | present | required only for persisted ttlock production smoke |
| `audit_logs` core fields     | present    | present | aligned for directive audit                         |

## Conclusion

Schema readiness conclusion: `SCHEMA_MIGRATION_REQUIRED_BEFORE_WRITE_SMOKE`

Production can support the `arrear_tasks` directive/follow-up fields and audit logging, but it cannot safely run production-linked directive write smoke until the idempotency table and indexes are added or otherwise confirmed by an approved migration.

If Ramadan approves only an `existing_arrears_record` smoke, `source_type` and `source_ref` are not required. If Ramadan approves a persisted `ttlock_expired_unpaid` production smoke row, `source_type` and `source_ref` should be included in the production migration.

## Safety Status

- Production D1 write: `No`
- Production migration: `No`
- Production write gate: `No`
- Production deploy: `No`
- Business write: `No`
- Production cutover: `PRODUCTION_NO_GO`
