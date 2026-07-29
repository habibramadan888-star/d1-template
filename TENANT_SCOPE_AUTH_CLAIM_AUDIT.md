# Tenant Scope Auth Claim Audit

Date: 2026-05-26, Asia/Dubai

Scope: source-level auth/session/JWT claim audit. No production deploy, production
migration, production D1 write, staging D1 write, dashboard mutation, live financial formula
change, or secret exposure occurred.

| Area                 | Current Claim                                            | Missing Claim                                    | Risk   | Required Future Claim                                  | Notes                                                             |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------ | ------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| user_id              | `userid` in JWT, session, and `/api/me`                  | stable `sub` alias                               | medium | `sub` plus legacy `userid` compatibility               | Current value can feed a future `sub` claim.                      |
| username             | `userid` and `employee_name`                             | explicit display/login separation                | low    | `username`, `display_name` optional                    | Do not use display name as authority.                             |
| role                 | `manager` or `staff`                                     | normalized owner/employee/manager/admin contract | medium | `role=employee/owner/manager/admin`                    | Helper maps `staff` to `employee` for claim rehearsal only.       |
| employee_id          | employee PIN login uses `employee_id`; JWT uses `userid` | explicit `employee_id` claim                     | high   | `employee_id`                                          | Required for employee route/query scope.                          |
| owner_id             | not distinct; manager login uses `userid`                | explicit `owner_id`                              | high   | `owner_id`                                             | Required before owner SaaS tenant authority.                      |
| tenant_id            | not present                                              | future SaaS authority                            | high   | `tenant_id`                                            | Production tenant-scoped access must not rely on static `CORPID`. |
| corp_id              | static `corpid` in JWT/session                           | tenant authority separation                      | high   | `corp_id` compatibility only                           | Legacy fallback preserved but warning-only.                       |
| property_id          | not present in auth/session                              | property constraint                              | high   | `allowed_property_ids`                                 | Required before cross-property enforcement.                       |
| allowed_property_ids | not present                                              | property membership list                         | high   | `allowed_property_ids` or `*` for reviewed owner scope | Frontend-submitted property lists are not authority.              |
| session_id           | `sid` in JWT/session                                     | tenant/property claim binding                    | medium | `sid` plus tenant/property claim snapshot              | Existing `active_sessions` remains compatibility table.           |
| auth source          | password/PIN plus `USER_ACCOUNTS`                        | source claim metadata                            | medium | `auth_source`                                          | Useful for audit and staged rollout.                              |
| APP_ENV behavior     | production disables tenant gates in helpers              | explicit production block for missing tenant     | high   | production missing `tenant_id` = blocked               | Staging can warn on legacy fallback; production cannot.           |

## Conclusion

Current auth/session is sufficient for legacy role checks but not sufficient for production
SaaS tenant isolation. P0-006M adds a non-invasive claim helper and tests to define the
future claim contract without changing live login behavior.
