# D1 Bootstrap Audit

Date: 2026-05-24  
Task: P0-005 Clean D1 Bootstrap  
Production deploy: not executed  
Production database mutation: not executed

## Finding

The clean local Worker previously failed because `/api/employee/entry` queried `transactions` before any migration created it. Runtime DDL created several support tables, but intentionally did not create `transactions`. The existing `migrations/001_employee_anchor_schema.sql` only alters `transactions`, so it cannot bootstrap an empty D1.

## Source Inventory

| Source                       | Table / Field                                                                              | Found In                                                       | Runtime DDL?                        | Required For                                        | Missing From Migrations?                                     | Risk                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Worker auth/session runtime  | `active_sessions`                                                                          | `deploy-worker/src/index.js`                                   | Yes                                 | owner/employee login, logout, revoke sessions       | Covered by `migrations/local/001_clean_legacy_bootstrap.sql` | Runtime DDL remains P1 until moved fully to migrations.                       |
| Worker employee seed runtime | `employee_users`                                                                           | `deploy-worker/src/index.js`                                   | Yes                                 | employee login                                      | Covered by local migration                                   | Seed is dev-only but table must exist for repeatable login.                   |
| Worker audit runtime         | `audit_logs`                                                                               | `deploy-worker/src/index.js`                                   | Yes                                 | auth/security/financial audit trail                 | Covered by local migration                                   | Runtime DDL remains P1.                                                       |
| Worker settings runtime      | `app_settings`                                                                             | `deploy-worker/src/index.js`                                   | Yes                                 | rent config, customers, WiFi settings               | Covered by local migration                                   | Read paths can still create table at runtime.                                 |
| Employee schema runtime      | `sessions` + P0-004 void fields                                                            | `deploy-worker/src/index.js`                                   | Yes                                 | handover history, delete-session void               | Covered by local migration                                   | Legacy money fields still use `REAL` and remain P0-001.                       |
| Employee schema runtime      | `transactions` full legacy columns                                                         | `deploy-worker/src/index.js` expects it, but did not create it | No                                  | employee entry, session detail, delete-session void | Previously missing; now covered by local migration           | This was the direct clean bootstrap blocker.                                  |
| Employee schema runtime      | `deposit_ledger` + P0-004 void fields                                                      | `deploy-worker/src/index.js`                                   | Yes                                 | deposit lookup and void cascade                     | Covered by local migration                                   | Legacy money fields remain P0-001.                                            |
| Employee schema runtime      | `arrears` legacy table + P0-004 void fields                                                | `/api/save_session`, `/api/arrears`, `/api/delete_session`     | No runtime create in current Worker | legacy owner arrears, delete-session void           | Previously missing; now covered by local migration           | Legacy table exists only for compatibility; formal receivables remain P0-008. |
| Employee schema runtime      | `arrear_tasks` + follow-up columns + void fields                                           | `deploy-worker/src/index.js`                                   | Yes                                 | short-pay task creation and follow-up               | Covered by local migration                                   | Formal receivables lifecycle remains P0-008.                                  |
| Employee schema runtime      | `entry_events`                                                                             | `deploy-worker/src/index.js`                                   | Yes                                 | audit evidence for employee entry and void          | Covered by local migration                                   | Needs unified immutable audit model later.                                    |
| Existing migration           | `ALTER TABLE transactions ...`                                                             | `migrations/001_employee_anchor_schema.sql`                    | No                                  | legacy patch for existing D1                        | Not suitable for clean bootstrap                             | It assumes `transactions` already exists.                                     |
| Commercial draft             | `companies`, `properties`, `users`, `receivables`, `payments`, integer-fils `transactions` | `migration-drafts/002_commercial_bootstrap.sql`                | No                                  | future SaaS model                                   | Draft only                                                   | Not used for P0-005 because that would become P0-001/P0-006/P0-008 scope.     |
| P0-004 draft                 | `voided_at`, `voided_by`, `void_reason`, `void_source`                                     | `migration-drafts/003_delete_session_void_fields.sql`          | No                                  | production delete-session void rollout plan         | Draft only                                                   | Local migration includes these fields from table creation.                    |
| Test fixture                 | temporary `sessions`, `transactions`, `arrears`, `deposit_ledger`                          | `scripts/test-delete-session-void.mjs`                         | Test only                           | P0-004 regression                                   | n/a                                                          | Does not bootstrap the app; local-only disposable test schema.                |

## Wrangler / D1 Binding

- Worker config: `deploy-worker/wrangler.toml`
- Embedded config: `deploy-worker/wrangler.embedded.toml`
- D1 binding: `DB`
- D1 database name: `homelink`
- D1 database id in config: `562aa079-1cca-4176-ba3b-7276a65f98fb`
- KV binding: `RATE_LIMIT`
- Local D1 flow uses `wrangler d1 execute homelink --local --persist-to <local path>`.
- No `--remote` command is used by the new bootstrap scripts.

## Clean Bootstrap Failure Evidence

Before the fix:

```text
npm run probe:clean-bootstrap
FAIL employee entry expected 200, got 500
Caused by: Error: no such table: transactions: SQLITE_ERROR
```

After the fix:

```text
npm run verify:clean-d1
PASS smoke:employee-entry
PASS transactions_count 1
PASS clean D1 bootstrap verification
```
