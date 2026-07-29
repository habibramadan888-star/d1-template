# P0-006I2 Before Snapshot

Date: 2026-05-26, Asia/Dubai

Scope: read-only snapshot before staging tenant-scope backfill write.

| Table             | Target Fields                                          | Rows Total | Rows Already Scoped | Rows To Backfill |
| ----------------- | ------------------------------------------------------ | ---------: | ------------------: | ---------------: |
| `active_sessions` | `company_id`, `owner_id`, `employee_id`                |          4 |                   0 |                0 |
| `sessions`        | `company_id`, `property_id`, `employee_id`             |          1 |                   0 |                1 |
| `transactions`    | `company_id`, `property_id`, `employee_id`             |          3 |                   0 |                1 |
| `entry_events`    | `company_id`, `property_id`, `employee_id`             |          5 |                   0 |                3 |
| `audit_logs`      | `company_id`, `property_id`, `owner_id`, `employee_id` |          7 |                   0 |                3 |
| `arrear_tasks`    | `company_id`, `property_id`, `employee_id`             |          7 |                   0 |                0 |
| `employee_users`  | `company_id`                                           |          1 |                   0 |                0 |

Financial guard snapshot:

| Metric                     | Value |
| -------------------------- | ----: |
| `transactions` row count   |     3 |
| `transactions.amount` sum  |   780 |
| `transactions.due` sum     |   780 |
| `transactions.paid` sum    |   780 |
| `transactions.deficit` sum |     0 |

Notes:

- `Rows To Backfill` includes only rows classified as `READY_TO_WRITE`.
- `MANUAL_REQUIRED` rows are excluded from this write.
- No staging write had been executed when this snapshot was taken.
