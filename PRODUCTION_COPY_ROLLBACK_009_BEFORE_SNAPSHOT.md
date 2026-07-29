# Production Copy Rollback 009 Before Snapshot

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

All snapshot queries were read-only. An attempted wide `UNION ALL` row-count
query hit D1 compound SELECT limits and was retried as multiple read-only
statements. No data changed during snapshot collection.

## Schema Summary

| Item                         | Count / Status | Notes                                      |
| ---------------------------- | -------------: | ------------------------------------------ |
| Tables reported by D1 info   |             27 | Copy schema is present.                    |
| Schema objects queried       |             73 | Tables and indexes only.                   |
| Receivables tables           |        present | Empty before rollback.                     |
| Handover tables              |        present | Empty before rollback.                     |
| Tenant compatibility columns |        present | Populated by REVIEW-007 row-level dry-run. |
| Money `*_fils` columns       |        present | Populated by REVIEW-007 row-level dry-run. |

## Row Counts

| Table                       | Row Count | Notes                       |
| --------------------------- | --------: | --------------------------- |
| `sessions`                  |        25 | Existing business rows.     |
| `transactions`              |       232 | Existing business rows.     |
| `deposit_ledger`            |         0 | No rows.                    |
| `arrears`                   |         6 | Existing business rows.     |
| `arrear_tasks`              |         1 | Existing business row.      |
| `employee_users`            |         1 | Existing user row.          |
| `active_sessions`           |       118 | Existing auth/session rows. |
| `app_settings`              |         1 | Existing settings row.      |
| `audit_logs`                |       108 | Existing audit rows.        |
| `entry_events`              |         8 | Existing event rows.        |
| `handover_commits`          |         0 | Future table empty.         |
| `handover_commit_rows`      |         0 | Future table empty.         |
| `handover_idempotency_keys` |         0 | Future table empty.         |
| `handover_audit_events`     |         0 | Future table empty.         |
| `receivables`               |         0 | Future table empty.         |
| `receivable_events`         |         0 | Future table empty.         |
| `payment_allocations`       |         0 | Future table empty.         |
| `receivable_adjustments`    |         0 | Future table empty.         |

## Rollback Target Field Counts

| Area              | Table             | Populated Rows Before Rollback | Notes                                            |
| ----------------- | ----------------- | -----------------------------: | ------------------------------------------------ |
| Money             | `transactions`    |                            232 | One or more reviewed `*_fils` columns populated. |
| Money             | `arrears`         |                              6 | `remain_fils` populated.                         |
| Money             | `arrear_tasks`    |                              1 | One or more task `*_fils` columns populated.     |
| Tenant scope      | `sessions`        |                             25 | Compatibility scope columns populated.           |
| Tenant scope      | `transactions`    |                            232 | Compatibility scope columns populated.           |
| Tenant scope      | `arrears`         |                              6 | Compatibility scope columns populated.           |
| Tenant scope      | `arrear_tasks`    |                              1 | Compatibility scope columns populated.           |
| Tenant scope      | `employee_users`  |                              1 | `company_id` populated.                          |
| Tenant scope      | `active_sessions` |                            118 | Company/actor compatibility columns populated.   |
| Tenant scope      | `app_settings`    |                              1 | Settings scope columns populated.                |
| Audit/event scope | `audit_logs`      |                            108 | Audit scope compatibility columns populated.     |
| Audit/event scope | `entry_events`    |                              8 | Event scope compatibility columns populated.     |

Backup available:

`./backups/production-copy-before-row-level-backfill-dryrun.sql`
