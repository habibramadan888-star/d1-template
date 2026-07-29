# Production Copy Row Backfill 007 Before Snapshot

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

All queries in this snapshot were read-only SELECT statements.

| Table                  | Row Count | Scoped Rows | Missing Fils Rows | Missing Tenant Scope Rows | Notes                                           |
| ---------------------- | --------: | ----------: | ----------------: | ------------------------: | ----------------------------------------------- |
| `sessions`             |        25 |           0 |                 0 |                        25 | Scope columns empty before row-level dry-run.   |
| `transactions`         |       232 |           0 |               232 |                       232 | Money `*_fils` and scope columns empty.         |
| `deposit_ledger`       |         0 |           0 |                 0 |                         0 | No rows.                                        |
| `arrears`              |         6 |           0 |                 6 |                         6 | Legacy `remain` only before dry-run.            |
| `arrear_tasks`         |         1 |           0 |                 1 |                         1 | Legacy follow-up money only before dry-run.     |
| `employee_users`       |         1 |           0 |                 0 |                         1 | `company_id` missing before dry-run.            |
| `active_sessions`      |       118 |           0 |                 0 |                       118 | Company/actor compatibility fields empty.       |
| `app_settings`         |         1 |           0 |                 0 |                         1 | Settings scope fields empty.                    |
| `audit_logs`           |       108 |           0 |                 0 |                       108 | Audit scope fields empty.                       |
| `entry_events`         |         8 |           0 |                 0 |                         8 | Entry event scope fields empty.                 |
| `handover_commits`     |         0 |           0 |                 0 |                         0 | Future table exists, no rows.                   |
| `handover_commit_rows` |         0 |           0 |                 0 |                         0 | Future table exists, no rows.                   |
| `receivables`          |         0 |           0 |                 0 |                         0 | Future table exists, no row-level backfill yet. |
| `receivable_events`    |         0 |           0 |                 0 |                         0 | Future table exists, no row-level backfill yet. |
| `payment_allocations`  |         0 |           0 |                 0 |                         0 | Future table exists, no row-level backfill yet. |

Unsafe decimal precheck:

- `transactions`: 0 unsafe values across reviewed money fields.
- `sessions`: 0 unsafe values across reviewed handover total fields.
- `arrears`: 0 unsafe values for `remain`.
- `arrear_tasks`: 0 unsafe values for reviewed task money fields.
