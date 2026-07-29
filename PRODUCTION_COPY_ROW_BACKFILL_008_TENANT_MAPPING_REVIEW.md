# Production Copy Row Backfill 008 Tenant Mapping Review

Date: 2026-05-27, Asia/Dubai

Status: `TENANT_MAPPING_COMPATIBILITY_ONLY`

Scope: review of tenant/property and audit/event compatibility values populated
on the production-copy D1 during REVIEW-007.

## Compatibility Result

| Table             | Rows Scoped On Copy | Mapping Type                                 | Review Result        | Production Meaning                                       |
| ----------------- | ------------------: | -------------------------------------------- | -------------------- | -------------------------------------------------------- | -------------------- | ----------------------------- |
| `sessions`        |                  25 | `company_id = corpid`, `property_id = corpid |                      | ':legacy-property'`                                      | ACCEPT_FOR_COPY_ONLY | Not final property authority. |
| `transactions`    |                 232 | linked session property or legacy fallback   | ACCEPT_FOR_COPY_ONLY | Needs real property/room mapping before production SaaS. |
| `arrears`         |                   6 | linked session property or legacy fallback   | ACCEPT_FOR_COPY_ONLY | Must align with receivables.                             |
| `arrear_tasks`    |                   1 | legacy fallback                              | ACCEPT_FOR_COPY_ONLY | Needs task owner/property policy.                        |
| `employee_users`  |                   1 | company compatibility                        | ACCEPT_FOR_COPY_ONLY | Property membership model still required.                |
| `active_sessions` |                 118 | company/actor compatibility                  | ACCEPT_FOR_COPY_ONLY | Sessions should be regenerated after auth claim cutover. |
| `app_settings`    |                   1 | legacy settings scope                        | ACCEPT_FOR_COPY_ONLY | Settings ownership needs business review.                |
| `audit_logs`      |                 108 | company/property/actor compatibility         | ACCEPT_WITH_WARNING  | Visibility policy still required.                        |
| `entry_events`    |                   8 | company/property/actor compatibility         | ACCEPT_WITH_WARNING  | Visibility policy still required.                        |

## Required Manual Decisions

| Decision                | Current State                                          | Required Before Production                    |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Final company/tenant id | Legacy `corpid` compatibility used on copy             | Business owner approval.                      |
| Final property id       | `:legacy-property` compatibility fallback used         | Real property/room mapping approval.          |
| Employee membership     | Employee company populated, property membership absent | Membership model or approved constraint.      |
| Owner/manager scope     | Compatibility actor fields populated                   | Auth/session claim production plan.           |
| Audit visibility        | Scope fields populated by compatibility rule           | Policy decision for who may view audit rows.  |
| Entry event visibility  | Scope fields populated by compatibility rule           | Policy decision and query enforcement review. |

Conclusion: copy compatibility mapping is acceptable as rehearsal evidence, but
it is not sufficient for production SaaS isolation. Production remains
`PRODUCTION_NO_GO`.
