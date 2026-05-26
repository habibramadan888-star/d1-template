# P0-006I2 After Snapshot And Verification

Date: 2026-05-26, Asia/Dubai

Scope: read-only verification after approved staging compatibility-column
backfill write.

| Table          | Expected Updated | Actual Updated |        Remaining Unscoped | Result |
| -------------- | ---------------: | -------------: | ------------------------: | ------ |
| `sessions`     |                1 |              1 |                         0 | PASS   |
| `transactions` |                1 |              1 | 0 for READY_TO_WRITE rows | PASS   |
| `entry_events` |                3 |              3 | 0 for READY_TO_WRITE rows | PASS   |
| `audit_logs`   |                3 |              3 | 0 for READY_TO_WRITE rows | PASS   |

Manual-required rows left untouched:

| Table             | Rows Total | Scope Columns Touched | Result | Notes                                                                                                                  |
| ----------------- | ---------: | --------------------: | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `active_sessions` |          4 |                     0 | PASS   | Left untouched because property access is membership-derived and cannot be safely guessed.                             |
| `arrear_tasks`    |          7 |                     0 | PASS   | Left untouched because current rows are P0-008E receivables rehearsal rows requiring receivable/source mapping review. |
| `employee_users`  |          1 |                     0 | PASS   | Left untouched because employee/company mapping was outside the 13-table dry-run set and needs account scope review.   |

Financial guard verification:

| Metric                     | Before | After | Result |
| -------------------------- | -----: | ----: | ------ |
| `transactions` row count   |      3 |     3 | PASS   |
| `transactions.amount` sum  |    780 |   780 | PASS   |
| `transactions.due` sum     |    780 |   780 | PASS   |
| `transactions.paid` sum    |    780 |   780 | PASS   |
| `transactions.deficit` sum |      0 |     0 | PASS   |

Verification notes:

- Expected rows were updated.
- No unexpected READY_TO_WRITE rows remain unscoped.
- Manual-required tables remain untouched.
- Legacy `corpid` fields were preserved.
- No financial amount changed.
- No business data was deleted.
- No production target was used.
