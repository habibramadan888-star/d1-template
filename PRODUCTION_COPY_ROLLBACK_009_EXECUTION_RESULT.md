# Production Copy Rollback 009 Execution Result

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Production original D1: `homelink` was not targeted.

Execution command:

`npx wrangler d1 execute homelink-finance-production-copy-dryrun --remote --yes --file .tmp\review-009-copy-rollback.sql`

Wrangler execution summary:

| Metric                 |                                                         Value |
| ---------------------- | ------------------------------------------------------------: |
| Queries processed      |                                                            12 |
| Rows read              |                                                           739 |
| Rows written           |                                          972 D1 internal rows |
| Changes                |                                                           740 |
| Database size          |                                                       0.57 MB |
| Final bookmark         | `00000005-00000006-00005078-d9ca65296b1e540f7309ab4d8dde7770` |
| Changed DB             |                                    true, production-copy only |
| Production D1 targeted |                                                            no |
| Staging D1 targeted    |                                                            no |

| Rollback Area       | Method                 | Target            | Result            | Rows Affected / Reverted | Notes                                                 |
| ------------------- | ---------------------- | ----------------- | ----------------- | -----------------------: | ----------------------------------------------------- |
| Money `*_fils`      | reverse update to NULL | `transactions`    | PASS              |                      232 | Reviewed money compatibility columns cleared.         |
| Money `remain_fils` | reverse update to NULL | `arrears`         | PASS              |                        6 | `remain_fils` cleared.                                |
| Money task fils     | reverse update to NULL | `arrear_tasks`    | PASS              |                        1 | Task fils columns cleared.                            |
| Tenant scope        | reverse update to NULL | `sessions`        | PASS_WITH_WARNING |                       25 | Compatibility scope cleared; legacy fields preserved. |
| Tenant scope        | reverse update to NULL | `transactions`    | PASS_WITH_WARNING |                      232 | Compatibility scope cleared; legacy fields preserved. |
| Tenant scope        | reverse update to NULL | `arrears`         | PASS_WITH_WARNING |                        6 | Compatibility scope cleared; legacy fields preserved. |
| Tenant scope        | reverse update to NULL | `arrear_tasks`    | PASS_WITH_WARNING |                        1 | Compatibility scope cleared; legacy fields preserved. |
| Tenant scope        | reverse update to NULL | `employee_users`  | PASS_WITH_WARNING |                        1 | `company_id` compatibility cleared.                   |
| Tenant scope        | reverse update to NULL | `active_sessions` | PASS_WITH_WARNING |                      118 | Company/actor compatibility cleared.                  |
| Tenant scope        | reverse update to NULL | `app_settings`    | PASS_WITH_WARNING |                        1 | Settings scope compatibility cleared.                 |
| Audit/event scope   | reverse update to NULL | `audit_logs`      | PASS_WITH_WARNING |                      108 | Audit compatibility scope cleared.                    |
| Audit/event scope   | reverse update to NULL | `entry_events`    | PASS_WITH_WARNING |                        8 | Event compatibility scope cleared.                    |

Conclusion: copy-only reverse-update rollback rehearsal executed successfully.
Production remains untouched and `PRODUCTION_NO_GO`.
