# Production Copy Rollback 009 Plan Review

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Approved rollback rehearsal scope:

- Copy-only rollback rehearsal.
- No production D1 write.
- No staging D1 write.
- No deploy.
- No migration.
- No cutover.

## Rollback Method Decision

Selected method: `REVERSE_UPDATE_ON_COPY`

Rationale:

- REVIEW-007 changed only row-level compatibility columns on the isolated copy.
- The reviewed backup exists and remains available for full restore if needed.
- Reverse update is narrower than full restore and can validate whether row-level
  changes are reversible with explicit `WHERE` clauses.
- This task is a rehearsal, not production rollback approval.

## SQL Safety Review

Rollback SQL file:

`./.tmp/review-009-copy-rollback.sql`

| Safety Check                   | Result            | Notes                                                                                  |
| ------------------------------ | ----------------- | -------------------------------------------------------------------------------------- |
| Target is production-copy only | PASS              | Command will target `homelink-finance-production-copy-dryrun`.                         |
| Contains `UPDATE` only         | PASS              | No `INSERT`, `DELETE`, or `DROP`.                                                      |
| Every `UPDATE` has `WHERE`     | PASS              | Each statement filters to populated rollback target fields.                            |
| Production target excluded     | PASS              | No command targets `homelink`.                                                         |
| Staging target excluded        | PASS              | No command targets `homelink-finance-staging`.                                         |
| Reversible strategy exists     | PASS_WITH_WARNING | Backup restore remains preferred for production; reverse update is copy-only evidence. |

## Planned Reverse Updates

| Rollback Area       | Method                                 | Target Table      | WHERE Clause Summary                 | Expected Rows |
| ------------------- | -------------------------------------- | ----------------- | ------------------------------------ | ------------: |
| Money `*_fils`      | set reviewed fils fields to NULL       | `transactions`    | any reviewed `*_fils` is not null    |           232 |
| Money `remain_fils` | set `remain_fils` to NULL              | `arrears`         | `remain_fils IS NOT NULL`            |             6 |
| Money task fils     | set task `*_fils` fields to NULL       | `arrear_tasks`    | any task fils field is not null      |             1 |
| Tenant scope        | set compatibility scope fields to NULL | `sessions`        | any scope field is not null          |            25 |
| Tenant scope        | set compatibility scope fields to NULL | `transactions`    | any scope field is not null          |           232 |
| Tenant scope        | set compatibility scope fields to NULL | `arrears`         | any scope field is not null          |             6 |
| Tenant scope        | set compatibility scope fields to NULL | `arrear_tasks`    | any scope field is not null          |             1 |
| Tenant scope        | set `company_id` to NULL               | `employee_users`  | `company_id IS NOT NULL`             |             1 |
| Tenant scope        | set company/actor scope fields to NULL | `active_sessions` | any company/actor field is not null  |           118 |
| Tenant scope        | set settings scope fields to NULL      | `app_settings`    | any settings scope field is not null |             1 |
| Audit/event scope   | set audit scope fields to NULL         | `audit_logs`      | any audit scope field is not null    |           108 |
| Audit/event scope   | set event scope fields to NULL         | `entry_events`    | any event scope field is not null    |             8 |

Production suitability:

- This reverse update proves copy rollback feasibility only.
- If the same changes occurred on production, backup restore remains the
  preferred rollback path unless exact primary-key reverse-update lists are
  separately approved.
