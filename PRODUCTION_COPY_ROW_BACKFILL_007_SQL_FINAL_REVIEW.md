# Production Copy Row Backfill 007 SQL Final Review

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

SQL execution file used:

`./.tmp/review-007-copy-row-level-backfill.sql`

The SQL file is ignored under `.tmp/` and was not committed.

| Area              | Planned Operation                                       | Target Table      | WHERE Clause                                               | Estimated Rows | Risk                             | Approved For Copy |
| ----------------- | ------------------------------------------------------- | ----------------- | ---------------------------------------------------------- | -------------: | -------------------------------- | ----------------- |
| Money             | Populate legacy money `*_fils` compatibility columns    | `transactions`    | source money field is not null and target `*_fils` is null |            232 | Accounting conversion risk       | YES               |
| Money             | Populate `remain_fils`                                  | `arrears`         | `remain IS NOT NULL AND remain_fils IS NULL`               |              6 | Receivables overlap risk         | YES               |
| Money             | Populate task money `*_fils`                            | `arrear_tasks`    | source money field is not null and target `*_fils` is null |              1 | Task lifecycle risk              | YES               |
| Tenant scope      | Populate legacy compatibility scope                     | `sessions`        | `corpid IS NOT NULL` and any target scope field is null    |             25 | Legacy property fallback warning | YES               |
| Tenant scope      | Populate legacy compatibility scope                     | `transactions`    | `corpid IS NOT NULL` and any target scope field is null    |            232 | Legacy property fallback warning | YES               |
| Tenant scope      | Populate legacy compatibility scope                     | `arrears`         | `corpid IS NOT NULL` and any target scope field is null    |              6 | Legacy property fallback warning | YES               |
| Tenant scope      | Populate legacy compatibility scope                     | `arrear_tasks`    | `corpid IS NOT NULL` and any target scope field is null    |              1 | Legacy property fallback warning | YES               |
| Tenant scope      | Populate company compatibility                          | `employee_users`  | `company_id IS NULL`                                       |              1 | Membership review still required | YES               |
| Tenant scope      | Populate company and actor compatibility                | `active_sessions` | `corpid IS NOT NULL` and any target scope field is null    |            118 | Auth/session collision warning   | YES               |
| Tenant scope      | Populate settings scope compatibility                   | `app_settings`    | `corpid IS NOT NULL` and any target scope field is null    |              1 | Settings ownership warning       | YES               |
| Audit/event scope | Populate legacy audit visibility compatibility          | `audit_logs`      | `corpid IS NOT NULL` and any target scope field is null    |            108 | Audit visibility policy warning  | YES               |
| Audit/event scope | Populate legacy entry event visibility compatibility    | `entry_events`    | `corpid IS NOT NULL` and any target scope field is null    |              8 | Event visibility policy warning  | YES               |
| Receivables       | Create receivable/allocation/event production-copy rows | future tables     | n/a                                                        |              0 | Lifecycle mapping not exact      | NO                |
| Handover          | Create handover commit representation                   | future tables     | n/a                                                        |              0 | Duplicate representation risk    | NO                |

SQL safety checks:

- Every executed mutation is an `UPDATE`.
- Every executed `UPDATE` has a `WHERE` clause.
- No `DELETE`.
- No `DROP`.
- No production D1 target.
- No staging D1 target.
- No receivables `INSERT` was executed.
- Money conversion precheck found 0 unsafe decimal values before execution.

Legacy compatibility warning:

The tenant/property dry-run uses legacy compatibility values such as
`company_id = corpid` and `property_id = corpid || ':legacy-property'`. This is
acceptable only as production-copy rehearsal evidence. It is not final SaaS
tenant/property authority and cannot approve production cutover.
