# Production Copy Row Backfill 007 Execution Result

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Production original D1: `homelink` was not targeted.

Execution command:

`npx wrangler d1 execute homelink-finance-production-copy-dryrun --remote --yes --file .tmp/review-007-copy-row-level-backfill.sql`

Wrangler execution summary:

| Metric         | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Queries        | 12                                                            |
| Rows read      | 985                                                           |
| Rows written   | 972 D1 internal rows                                          |
| Changes        | 740                                                           |
| Final bookmark | `00000003-00000007-00005078-9a117287383e83cf748134e734df1bbf` |
| Changed DB     | true, production-copy only                                    |
| Production D1  | not targeted                                                  |
| Staging D1     | not targeted                                                  |

| Area              | Table             | Rows Updated / Populated | Result            | Notes                                                         |
| ----------------- | ----------------- | -----------------------: | ----------------- | ------------------------------------------------------------- |
| Money             | `transactions`    |                      232 | PASS              | Populated reviewed legacy money `*_fils` columns.             |
| Money             | `arrears`         |                        6 | PASS              | Populated `remain_fils`.                                      |
| Money             | `arrear_tasks`    |                        1 | PASS              | Populated task money `*_fils` columns.                        |
| Tenant scope      | `sessions`        |                       25 | PASS_WITH_WARNING | Legacy compatibility scope only.                              |
| Tenant scope      | `transactions`    |                      232 | PASS_WITH_WARNING | Legacy compatibility scope only.                              |
| Tenant scope      | `arrears`         |                        6 | PASS_WITH_WARNING | Legacy compatibility scope only.                              |
| Tenant scope      | `arrear_tasks`    |                        1 | PASS_WITH_WARNING | Legacy compatibility scope only.                              |
| Tenant scope      | `employee_users`  |                        1 | PASS_WITH_WARNING | Company compatibility only; property membership still future. |
| Tenant scope      | `active_sessions` |                      118 | PASS_WITH_WARNING | Company/actor compatibility only.                             |
| Tenant scope      | `app_settings`    |                        1 | PASS_WITH_WARNING | Settings ownership still needs production policy review.      |
| Audit/event scope | `audit_logs`      |                      108 | PASS_WITH_WARNING | Legacy visibility compatibility only.                         |
| Audit/event scope | `entry_events`    |                        8 | PASS_WITH_WARNING | Legacy visibility compatibility only.                         |
| Receivables       | future tables     |                        0 | MANUAL_REQUIRED   | No receivables inserts; lifecycle mapping remains manual.     |

Conclusion: copy-only row-level compatibility backfill executed. It improves
copy reconciliation evidence but does not approve production cutover.
