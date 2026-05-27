# Production Copy Row Backfill 007 After Snapshot

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

All queries in this snapshot were read-only SELECT statements after the
copy-only row-level dry-run.

| Table                  | Row Count | Scoped Rows | Missing Fils Rows | Missing Tenant Scope Rows | Result            |
| ---------------------- | --------: | ----------: | ----------------: | ------------------------: | ----------------- |
| `sessions`             |        25 |          25 |                 0 |                         0 | PASS              |
| `transactions`         |       232 |         232 |                 0 |                         0 | PASS              |
| `deposit_ledger`       |         0 |           0 |                 0 |                         0 | NOT_APPLICABLE    |
| `arrears`              |         6 |           6 |                 0 |                         0 | PASS              |
| `arrear_tasks`         |         1 |           1 |                 0 |                         0 | PASS              |
| `employee_users`       |         1 |           1 |                 0 |                         0 | PASS_WITH_WARNING |
| `active_sessions`      |       118 |         118 |                 0 |                         0 | PASS_WITH_WARNING |
| `app_settings`         |         1 |           1 |                 0 |                         0 | PASS_WITH_WARNING |
| `audit_logs`           |       108 |         108 |                 0 |                         0 | PASS_WITH_WARNING |
| `entry_events`         |         8 |           8 |                 0 |                         0 | PASS_WITH_WARNING |
| `handover_commits`     |         0 |           0 |                 0 |                         0 | NOT_APPLICABLE    |
| `handover_commit_rows` |         0 |           0 |                 0 |                         0 | NOT_APPLICABLE    |
| `receivables`          |         0 |           0 |                 0 |                         0 | MANUAL_REQUIRED   |
| `receivable_events`    |         0 |           0 |                 0 |                         0 | MANUAL_REQUIRED   |
| `payment_allocations`  |         0 |           0 |                 0 |                         0 | MANUAL_REQUIRED   |

Money aggregate checks:

| Metric               | Legacy AED | Fils Value | Mismatch Count |
| -------------------- | ---------: | ---------: | -------------: |
| Transaction amount   |   123850.5 |   12385050 |              0 |
| Transaction due      |      43800 |    4380000 |              0 |
| Transaction paid     |      37570 |    3757000 |              0 |
| Transaction deficit  |       6230 |     623000 |              0 |
| Arrears remaining    |        860 |      86000 |              0 |
| Arrear task amount   |         50 |       5000 |              0 |
| Arrear task received |          0 |          0 |              0 |

Conclusion: executed copy-only compatibility updates produced no detected
money mismatch and no remaining missing scope/fils rows in the updated legacy
tables.
