# Runtime DDL Status

Date: 2026-05-24  
Task: P0-005 Clean D1 Bootstrap

## Summary

Runtime DDL still exists. It was not removed in P0-005 because removing it safely belongs to P1-002 after migration coverage is proven. P0-005 adds a local migration path first, then documents which runtime DDL can later be retired.

| File                         | Line/Area             | DDL                                          | Covered By Migration                          | Runtime Still Needed?                     | Risk | Recommendation                                                                     |
| ---------------------------- | --------------------- | -------------------------------------------- | --------------------------------------------- | ----------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `deploy-worker/src/index.js` | auth session setup    | `CREATE TABLE IF NOT EXISTS active_sessions` | Yes, local migration                          | Yes for legacy compatibility until P1-002 | P1   | Keep temporarily; remove after production migration process exists.                |
| `deploy-worker/src/index.js` | employee auth setup   | `CREATE TABLE IF NOT EXISTS employee_users`  | Yes, local migration                          | Yes for dev seed and legacy compatibility | P1   | Keep temporarily; later move fully to migration.                                   |
| `deploy-worker/src/index.js` | audit setup           | `CREATE TABLE IF NOT EXISTS audit_logs`      | Yes, local migration                          | Yes for legacy compatibility              | P1   | Keep temporarily; later migrate to unified audit model.                            |
| `deploy-worker/src/index.js` | employee schema setup | `CREATE TABLE IF NOT EXISTS sessions`        | Yes, local migration                          | Yes for legacy compatibility              | P1   | Keep until production migration and schema gate exist.                             |
| `deploy-worker/src/index.js` | employee schema setup | `CREATE TABLE IF NOT EXISTS arrear_tasks`    | Yes, local migration                          | Yes for legacy compatibility              | P1   | Keep until P0-008 receivables lifecycle is implemented.                            |
| `deploy-worker/src/index.js` | employee schema setup | `CREATE TABLE IF NOT EXISTS entry_events`    | Yes, local migration                          | Yes for legacy compatibility              | P1   | Keep until audit schema is unified.                                                |
| `deploy-worker/src/index.js` | employee schema setup | `CREATE TABLE IF NOT EXISTS deposit_ledger`  | Yes, local migration                          | Yes for legacy compatibility              | P1   | Keep until P0-001/P0-008 schema is promoted.                                       |
| `deploy-worker/src/index.js` | settings setup        | `CREATE TABLE IF NOT EXISTS app_settings`    | Yes, local migration                          | Yes for legacy compatibility              | P1   | Keep temporarily; remove after app settings migration is production-owned.         |
| `deploy-worker/src/index.js` | dynamic compatibility | `ALTER TABLE ... ADD COLUMN`                 | Local migration covers current minimum fields | Yes for existing partial DB compatibility | P1   | Keep temporarily; P1-002 should replace with reviewed migrations and drift checks. |

## Decision

No runtime DDL was removed in this task. The safe improvement is that a clean local D1 no longer depends on ad hoc runtime table creation for `transactions`; migrations now create the table before Worker start.
