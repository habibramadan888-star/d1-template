# Tenant Isolation And CORPID Scope Audit

Status: P0-006A audit only. Production deployment: not executed. Production database migration: not executed.

## Summary

The current Worker has real server-side auth checks, but SaaS tenant isolation is not complete. The runtime uses `env.CORPID || "homelink"` as a deployment-wide scope. That is acceptable for a single internal property deployment, but it is not sufficient for a subscription product serving multiple owners, companies, or properties.

## Scope Findings

| Area             | File/Table/API                                                        | Current Scope                                     | Static CORPID? | Tenant Risk                                                                      | Required Future Scope                                                       |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------- | -------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Owner login      | `deploy-worker/src/index.js` `/auth/login`                            | Manager/staff role, `corpid` from env/session     | Yes            | All owners would share one deployment scope.                                     | Resolve `company_id` from account/user membership, not env.                 |
| Employee login   | `deploy-worker/src/index.js` `/auth/employee-login`, `employee_users` | `employee_id` only; session receives env `corpid` | Yes            | Same employee id can collide across companies; no property assignment.           | `employee_users(company_id, user_id)` plus `property_memberships`.          |
| Session store    | `active_sessions`                                                     | `sid`, `corpid`, `userid`, `role`                 | Yes            | Session cannot prove property-level authorization.                               | Add company/property membership claims or lookup on each request.           |
| Legacy sessions  | `sessions`                                                            | `corpid`, no `property_id`                        | Yes            | Dashboard/history cannot isolate multiple properties under one company.          | Add `company_id`, `property_id`, legacy `corpid` fallback during migration. |
| Transactions     | `transactions`                                                        | `corpid`, `userid`, `session_id`                  | Yes            | Financial records can mix properties; employee access cannot be property-scoped. | Require `company_id`, `property_id`, `operator_id`, immutable snapshots.    |
| Deposit ledger   | `deposit_ledger`                                                      | `corpid`, tenant card fields                      | Yes            | Deposit balances can mix tenants/properties if CID repeats.                      | Scope by company/property/tenant card; link to transaction ids.             |
| Arrears tasks    | `arrear_tasks`                                                        | `corpid`, bed, tenant snapshot                    | Yes            | Staff could see follow-up tasks outside assigned property.                       | Scope by company/property; assign tasks to employee/team.                   |
| App settings     | `app_settings`                                                        | `corpid`, JSON blobs                              | Yes            | Rent/system config cannot be safely different per property.                      | Split `company_settings` and `property_settings` with effective dates.      |
| Rent config      | `/api/rent_config`                                                    | Current API allows owner and employee reads       | Yes            | Employee can read all config for the deployment, not property assignment.        | Read only scoped property config. Owner write requires membership.          |
| Owner APIs       | `/api/history`, `/api/arrears`, `/api/customers`, lock/wifi APIs      | Manager guard and legacy `corpid` filters         | Yes            | Owner A/B isolation not provable without company_id and property_id.             | Server must enforce company and property scope on every query.              |
| Employee APIs    | `/api/employee/*`, `/api/arrear_tasks`, `/api/rent_config`            | Staff allowlist; limited owner API denial tests   | Yes            | Staff routes are role-scoped but not property-scoped.                            | Staff request must be resolved to allowed property set.                     |
| Audit logs       | `audit_logs`, `entry_events`                                          | `corpid`, `userid`                                | Yes            | Audit cannot prove which property/company context caused mutation.               | Add `company_id`, `property_id`, `actor_user_id`, `actor_role`.             |
| Commercial draft | `migration-drafts/002_commercial_bootstrap.sql`                       | Has `company_id` and `property_id`                | No             | Draft is not live.                                                               | Use as reviewed target model after migration planning.                      |

## P0 Risk

Static `CORPID` is not a commercial tenant boundary. It can support a single-customer deployment, but it cannot support a SaaS model where multiple owners share the same Worker/D1 environment.

## Current Safe Boundary

- Current auth smoke proves role boundaries for selected routes.
- Current tests do not prove cross-tenant denial.
- This stage does not change login behavior, table schema, or query filters.
- P0-006 remains Partial until server-side company/property scope exists in live API queries and tests.
