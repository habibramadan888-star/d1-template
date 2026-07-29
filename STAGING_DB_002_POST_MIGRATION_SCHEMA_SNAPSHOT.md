# STAGING-DB-002 Post-Migration Schema Snapshot

Date: 2026-05-25, Asia/Dubai

Read-only verification command:

```powershell
npx wrangler d1 execute homelink-finance-staging --remote --command "SELECT name, type, sql FROM sqlite_schema WHERE type IN ('table','index','view') ORDER BY type, name;"
```

Read-only result:

- `changes=0`
- `changed_db=false`
- `rows_written=0`
- `rows_read=102`

Current table list:

- `_cf_KV`
- `active_sessions`
- `app_settings`
- `arrear_tasks`
- `arrears`
- `audit_logs`
- `deposit_ledger`
- `employee_users`
- `entry_events`
- `handover_audit_events`
- `handover_commit_rows`
- `handover_commits`
- `handover_idempotency_keys`
- `sessions`
- `transactions`

| Required Object             | Exists | Source Migration                  | Notes                                    |
| --------------------------- | ------ | --------------------------------- | ---------------------------------------- |
| `active_sessions`           | yes    | `001_clean_legacy_bootstrap.sql`  | Auth/session support.                    |
| `employee_users`            | yes    | `001_clean_legacy_bootstrap.sql`  | Staging test accounts still not created. |
| `audit_logs`                | yes    | `001_clean_legacy_bootstrap.sql`  | Audit table exists.                      |
| `app_settings`              | yes    | `001_clean_legacy_bootstrap.sql`  | Current system settings table.           |
| `sessions`                  | yes    | `001_clean_legacy_bootstrap.sql`  | Legacy session table exists.             |
| `transactions`              | yes    | `001_clean_legacy_bootstrap.sql`  | Legacy transaction table exists.         |
| `deposit_ledger`            | yes    | `001_clean_legacy_bootstrap.sql`  | Legacy deposit ledger exists.            |
| `arrears`                   | yes    | `001_clean_legacy_bootstrap.sql`  | Legacy arrears table exists.             |
| `arrear_tasks`              | yes    | `001_clean_legacy_bootstrap.sql`  | Legacy arrear tasks table exists.        |
| `entry_events`              | yes    | `001_clean_legacy_bootstrap.sql`  | Entry event audit table exists.          |
| `handover_commits`          | yes    | `002_handover_atomic_staging.sql` | Staging handover endpoint table exists.  |
| `handover_commit_rows`      | yes    | `002_handover_atomic_staging.sql` | Staging handover rows table exists.      |
| `handover_idempotency_keys` | yes    | `002_handover_atomic_staging.sql` | Staging idempotency table exists.        |
| `handover_audit_events`     | yes    | `002_handover_atomic_staging.sql` | Staging handover audit table exists.     |

Conclusion:

- Core schema objects are present.
- Handover staging schema objects are present.
- Schema bootstrap is complete for staging preflight.
- Real staging write QA remains blocked until secrets, accounts, rollback exercise, production URL exclusion, and explicit human approval are complete.
