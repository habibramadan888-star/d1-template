# P0-006J Tenant Scope Staging Verification Result

Date: 2026-05-26, Asia/Dubai

Scope: staging verification after P0-006I2 approved compatibility-column
backfill. This task used read-only staging D1 `SELECT` queries and local/staging
policy gates only.

Target D1:

| Item              | Expected                               | Actual                                 | Result |
| ----------------- | -------------------------------------- | -------------------------------------- | ------ |
| D1 name           | `homelink-finance-staging`             | `homelink-finance-staging`             | PASS   |
| D1 id             | `4ff78bfc-3855-436b-aefb-6b492145d79c` | `4ff78bfc-3855-436b-aefb-6b492145d79c` | PASS   |
| Production target | no                                     | no                                     | PASS   |

Scoped staging data:

| Table          | Scoped Rows Verified | Remaining READY_TO_WRITE Unscoped Rows | Result | Notes                                                                                                                              |
| -------------- | -------------------: | -------------------------------------: | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `sessions`     |                    1 |                                      0 | PASS   | Approved staging QA session has `company_id=homelink-staging`, `property_id=HL-STAGING-QA`, and `employee_id=employee_stg_qa_001`. |
| `transactions` |                    1 |                                      0 | PASS   | Approved staging QA transaction has matching company/property/employee scope.                                                      |
| `entry_events` |                    3 |                                      0 | PASS   | Transaction-backed and handover-commit-backed events are scoped. Invalid/empty prevalidation events remain manual-required.        |
| `audit_logs`   |                    3 |                                      0 | PASS   | Transaction-backed and handover-commit-backed audit logs are scoped. Generic or invalid targets remain manual-required.            |

Manual-required rows left untouched:

| Table             | Rows | Scope Columns Touched | Result | Notes                                                                           |
| ----------------- | ---: | --------------------: | ------ | ------------------------------------------------------------------------------- |
| `active_sessions` |    4 |                     0 | PASS   | Session claims require membership-derived property access and were not guessed. |
| `arrear_tasks`    |    7 |                     0 | PASS   | P0-008E receivables rehearsal rows require source/receivable mapping review.    |
| `employee_users`  |    1 |                     0 | PASS   | Account/company membership mapping remains a separate review item.              |

Legacy `corpid` preservation:

| Table          | Rows | Legacy `corpid` Rows | Result |
| -------------- | ---: | -------------------: | ------ |
| `sessions`     |    1 |                    1 | PASS   |
| `transactions` |    3 |                    3 | PASS   |
| `entry_events` |    5 |                    5 | PASS   |
| `audit_logs`   |    7 |                    7 | PASS   |

Financial guard:

| Metric                     | Value | Result |
| -------------------------- | ----: | ------ |
| `transactions` row count   |     3 | PASS   |
| `transactions.amount` sum  |   780 | PASS   |
| `transactions.due` sum     |   780 | PASS   |
| `transactions.paid` sum    |   780 | PASS   |
| `transactions.deficit` sum |     0 | PASS   |

Post-backfill dry-run:

| Metric                 | Value |
| ---------------------- | ----: |
| Overall                |  PASS |
| Tables reviewed        |    13 |
| Blocked tables         |     0 |
| Manual-required tables |     4 |
| Legacy-warning tables  |     1 |

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging schema migration: no.
- Staging row-level backfill write in P0-006J: no.
- Legacy `corpid` fallback removed: no.
- Dashboard/history live result changed: no.
- Live financial formula changed: no.
- Secret/password/token/cookie printed: no.

Decision:

- P0-006J verification result: PASS.
- P0-006 remains Partial, not Verified.
- Production cutover remains NO-GO.
