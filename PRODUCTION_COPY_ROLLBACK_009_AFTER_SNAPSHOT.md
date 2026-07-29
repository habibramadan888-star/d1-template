# Production Copy Rollback 009 After Snapshot

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

All after-snapshot queries were read-only.

## Row Counts

| Table                    | Before Rollback | After Rollback | Result |
| ------------------------ | --------------: | -------------: | ------ |
| `sessions`               |              25 |             25 | PASS   |
| `transactions`           |             232 |            232 | PASS   |
| `deposit_ledger`         |               0 |              0 | PASS   |
| `arrears`                |               6 |              6 | PASS   |
| `arrear_tasks`           |               1 |              1 | PASS   |
| `employee_users`         |               1 |              1 | PASS   |
| `active_sessions`        |             118 |            118 | PASS   |
| `app_settings`           |               1 |              1 | PASS   |
| `audit_logs`             |             108 |            108 | PASS   |
| `entry_events`           |               8 |              8 | PASS   |
| `handover_commits`       |               0 |              0 | PASS   |
| `handover_commit_rows`   |               0 |              0 | PASS   |
| `receivables`            |               0 |              0 | PASS   |
| `receivable_events`      |               0 |              0 | PASS   |
| `payment_allocations`    |               0 |              0 | PASS   |
| `receivable_adjustments` |               0 |              0 | PASS   |

## Remaining Populated Compatibility Fields

| Area              | Table             | Before Rollback | After Rollback | Result |
| ----------------- | ----------------- | --------------: | -------------: | ------ |
| Money             | `transactions`    |             232 |              0 | PASS   |
| Money             | `arrears`         |               6 |              0 | PASS   |
| Money             | `arrear_tasks`    |               1 |              0 | PASS   |
| Tenant scope      | `sessions`        |              25 |              0 | PASS   |
| Tenant scope      | `transactions`    |             232 |              0 | PASS   |
| Tenant scope      | `arrears`         |               6 |              0 | PASS   |
| Tenant scope      | `arrear_tasks`    |               1 |              0 | PASS   |
| Tenant scope      | `employee_users`  |               1 |              0 | PASS   |
| Tenant scope      | `active_sessions` |             118 |              0 | PASS   |
| Tenant scope      | `app_settings`    |               1 |              0 | PASS   |
| Audit/event scope | `audit_logs`      |             108 |              0 | PASS   |
| Audit/event scope | `entry_events`    |               8 |              0 | PASS   |

Schema state:

- Schema objects remain present.
- Nullable compatibility columns remain present.
- No table was dropped.
- No row was deleted.
- Receivables and handover future tables remain empty.

Production remains untouched.
