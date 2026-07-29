# P0-006I2 Backfill Write Result

Date: 2026-05-26, Asia/Dubai

Scope: approved staging-only compatibility-column backfill against
`homelink-finance-staging`.

| Step | Table          | Rows Updated | Result | Notes                                                                                                                                               |
| ---- | -------------- | -----------: | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `sessions`     |            1 | PASS   | Scoped one staging employee-entry QA session. Initial multiline CLI invocation was rejected before mutation; the single-line SQL command succeeded. |
| 2    | `transactions` |            1 | PASS   | Scoped one staging employee-entry QA transaction from its scoped session.                                                                           |
| 3    | `entry_events` |            2 | PASS   | Scoped transaction-backed employee-entry audit events.                                                                                              |
| 4    | `entry_events` |            1 | PASS   | Scoped one handover commit event from `handover_commits`.                                                                                           |
| 5    | `audit_logs`   |            2 | PASS   | Scoped transaction-backed audit logs.                                                                                                               |
| 6    | `audit_logs`   |            1 | PASS   | Scoped one handover commit audit log.                                                                                                               |

Summary:

- Total rows updated: 8.
- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging backfill write: yes, only approved compatibility scope columns.
- `DELETE` executed: no.
- `INSERT` executed: no.
- `DROP` executed: no.
- UPDATE without WHERE: no.
- Legacy `corpid` changed: no.
- Financial amount fields changed: no.
- Dashboard logic changed: no.
