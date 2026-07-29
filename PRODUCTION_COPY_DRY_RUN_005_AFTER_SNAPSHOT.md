# Production Copy Dry-Run 005 After Snapshot

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

## Row Counts After Dry-Run

| Table                       | Row Count | Before |           Delta | Notes                                |
| --------------------------- | --------: | -----: | --------------: | ------------------------------------ |
| `sessions`                  |        25 |     25 |               0 | Business row count unchanged.        |
| `transactions`              |       232 |    232 |               0 | Business row count unchanged.        |
| `deposit_ledger`            |         0 |      0 |               0 | Unchanged.                           |
| `arrears`                   |         6 |      6 |               0 | Business row count unchanged.        |
| `arrear_tasks`              |         1 |      1 |               0 | Business row count unchanged.        |
| `employee_users`            |         1 |      1 |               0 | Business row count unchanged.        |
| `audit_logs`                |       108 |    108 |               0 | Business row count unchanged.        |
| `entry_events`              |         8 |      8 |               0 | Business row count unchanged.        |
| `active_sessions`           |       118 |    118 |               0 | Business row count unchanged.        |
| `app_settings`              |         1 |      1 |               0 | Business row count unchanged.        |
| `handover_commits`          |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `handover_commit_rows`      |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `handover_idempotency_keys` |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `handover_audit_events`     |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `receivables`               |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `receivable_events`         |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `payment_allocations`       |         0 | absent | new empty table | Created by copy-only schema dry-run. |
| `receivable_adjustments`    |         0 | absent | new empty table | Created by copy-only schema dry-run. |

## Schema After Dry-Run

| Area                                  | After State                                                                      | Result |
| ------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| Void columns                          | Added to `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks` | PASS   |
| Money fils columns                    | Added to `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks` | PASS   |
| Tenant/property compatibility columns | Added to legacy compatibility tables                                             | PASS   |
| Handover atomic tables                | Created empty tables                                                             | PASS   |
| Receivables tables                    | Created empty tables                                                             | PASS   |

Notes:

- Business row counts were unchanged.
- New tables are empty by design.
- No production D1 was targeted.
- No staging D1 was targeted.
