# TTLock Arrears Materialization Schema Plan

Date: 2026-06-01, Asia/Dubai

## Schema Requirements

| Requirement | Current Plan |
|---|---|
| `arrear_tasks.source_type` | Required; current staging already has nullable `TEXT`; runtime schema guard can add if missing before write |
| `arrear_tasks.source_ref` | Required; current staging already has nullable `TEXT`; runtime schema guard can add if missing before write |
| `arrear_tasks.source_fingerprint` | Added nullable `TEXT` |
| `arrear_tasks.materialized_from` | Added nullable `TEXT` |
| unique source index | `idx_arrear_tasks_source_unique` on `(corpid, source_type, source_ref)` with non-empty partial predicate |
| directive table FK | existing directive model uses `arrear_tasks.task_id`; no new table introduced |
| idempotency table | existing `request_idempotency_keys` |
| audit table/events | existing `entry_events` plus audit call |

## Migration

Migration file: `migrations/004_arrears_task_materialization_source.sql`.

Allowed operations:

1. Add nullable `source_fingerprint`.
2. Add nullable `materialized_from`.
3. Add source uniqueness index.
4. Do not change amount.
5. Do not change `actual_received`.
6. Do not change `accounting_status`.
7. Do not delete rows.
8. Do not backfill all historical rows.

## Runtime Compatibility

`empEnsureSchema` also adds the same nullable fields and partial unique index for Worker-controlled environments. The explicit migration remains the production/staging controlled schema path.

## Rollback Plan

If migration causes a blocker before dispatch:

1. Stop before opening write gate.
2. Do not run owner directive create.
3. Leave nullable columns unused.
4. If an index issue is confirmed, prepare a separate approved rollback migration to drop only `idx_arrear_tasks_source_unique`.
5. Keep production cutover `PRODUCTION_NO_GO`.
