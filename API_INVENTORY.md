# API Inventory

Date: 2026-05-23  
Source: `deploy-worker/src/index.js` static route scan + manual review  
Production calls: none

## Summary

- Total routes found by scan: 27
- Auth model: public auth routes, then `requireAuth`, then staff allowlist / manager checks
- Tenant scope currently uses `corpid`
- Future SaaS scope still needs `tenant_id/company_id/property_id`

## Inventory

| Method | Path                            | Purpose                       | Login             | Roles                           | Tenant Scope              | Reads                                                            | Writes                                                                                                   | Financial | Delete | Audit                            | Risk |
| ------ | ------------------------------- | ----------------------------- | ----------------- | ------------------------------- | ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------- | ------ | -------------------------------- | ---- |
| POST   | `/auth/login`                   | owner/staff password login    | No                | public                          | creates `corpid` from env | credentials env                                                  | `active_sessions`                                                                                        | No        | No     | No                               | P1   |
| POST   | `/auth/employee-login`          | employee PIN login            | No                | public                          | creates `corpid` from env | `employee_users`                                                 | `active_sessions`                                                                                        | No        | No     | No                               | P1   |
| POST   | `/auth/confirm-manager`         | confirm manager credential    | No                | public                          | env-based                 | env password hash                                                | none                                                                                                     | No        | No     | No                               | P2   |
| POST   | `/auth/logout`                  | revoke current browser cookie | No token required | public                          | none                      | cookie                                                           | cookie only                                                                                              | No        | No     | No                               | P2   |
| GET    | `/favicon.ico`                  | browser favicon               | No                | public                          | none                      | none                                                             | none                                                                                                     | No        | No     | No                               | P3   |
| GET    | `/api/me`                       | current user identity         | Yes               | owner, employee                 | `corpid` in session       | session                                                          | none                                                                                                     | No        | No     | No                               | P1   |
| GET    | `/api/employee/lock/cards`      | staff TTLock context          | Yes               | employee, owner                 | `corpid` in session       | TTLock API                                                       | `audit_logs`                                                                                             | Indirect  | No     | Yes                              | P1   |
| GET    | `/api/employee/deposit`         | deposit balance by CID        | Yes               | employee, owner                 | `corpid` query filter     | `deposit_ledger`                                                 | none                                                                                                     | Yes       | No     | No                               | P1   |
| POST   | `/api/employee/entry`           | staff transaction entry       | Yes               | employee, owner                 | `corpid` write            | `transactions`, `arrear_tasks`, `deposit_ledger`, `app_settings` | `sessions`, `transactions`, `arrear_tasks`, `deposit_ledger`, `entry_events`, `audit_logs`               | Yes       | No     | Yes                              | P0   |
| POST   | `/api/employee/migrate`         | employee schema migration     | Yes               | owner only                      | `corpid`                  | schema                                                           | schema                                                                                                   | Yes       | No     | Yes                              | P1   |
| GET    | `/api/arrear_tasks`             | list arrear tasks             | Yes               | employee, owner                 | `corpid` filter           | `arrear_tasks`, legacy `arrears`                                 | none                                                                                                     | Yes       | No     | No                               | P1   |
| POST   | `/api/arrear_tasks/update`      | update arrear follow-up       | Yes               | employee limited, owner broader | `corpid` filter           | `arrear_tasks`, legacy `arrears`                                 | `arrear_tasks`, `entry_events`, `audit_logs`                                                             | Yes       | No     | Yes                              | P0   |
| GET    | `/api/rent_config`              | read rent config              | Yes               | employee, owner                 | `corpid` filter           | `app_settings`                                                   | none                                                                                                     | Yes       | No     | No                               | P1   |
| POST   | `/api/rent_config`              | update rent config            | Yes               | owner                           | `corpid` filter           | request body                                                     | `app_settings`, `audit_logs`                                                                             | Yes       | No     | Yes                              | P0   |
| POST   | `/api/security/revoke_sessions` | revoke other sessions         | Yes               | owner                           | `corpid` filter           | `active_sessions`                                                | `active_sessions`, `audit_logs`                                                                          | No        | No     | Yes                              | P1   |
| GET    | `/api/lock/cards`               | owner TTLock load             | Yes               | owner                           | `corpid` session          | TTLock API                                                       | `audit_logs`                                                                                             | Indirect  | No     | Yes                              | P1   |
| GET    | `/api/wifi/accounts`            | read WiFi accounts            | Yes               | owner                           | `corpid` filter           | `app_settings`                                                   | possible encrypted migration to `app_settings`, `audit_logs`                                             | No        | No     | Yes if migration                 | P1   |
| POST   | `/api/wifi/accounts`            | save WiFi accounts            | Yes               | owner                           | `corpid` filter           | request body                                                     | `app_settings`, `audit_logs`                                                                             | No        | No     | Yes                              | P1   |
| GET    | `/api/arrears`                  | owner arrears view            | Yes               | owner                           | `corpid` filter           | arrear sources                                                   | none                                                                                                     | Yes       | No     | review needed                    | P1   |
| GET    | `/api/customers`                | read customer credit data     | Yes               | owner                           | `corpid` filter           | `app_settings`                                                   | none                                                                                                     | Indirect  | No     | No                               | P1   |
| POST   | `/api/customers`                | save customer credit data     | Yes               | owner                           | `corpid` filter           | request body                                                     | `app_settings`, `audit_logs`                                                                             | Indirect  | No     | Yes                              | P1   |
| POST   | `/api/save_session`             | owner legacy session save     | Yes               | owner                           | `corpid` write            | request body                                                     | `sessions`, `transactions`, legacy `arrears`                                                             | Yes       | No     | No direct audit visible in route | P0   |
| POST   | `/api/delete_session`           | delete session                | Yes               | owner                           | `corpid` filter           | `sessions`, `transactions`                                       | hard deletes `deposit_ledger`, `transactions`, `arrears`, `sessions`; voids `arrear_tasks`; `audit_logs` | Yes       | Yes    | Yes                              | P0   |
| POST   | `/api/clear_arrear`             | manager clear arrear          | Yes               | owner                           | `corpid` filter           | arrear sources                                                   | `arrears`, `arrear_tasks`, `audit_logs`                                                                  | Yes       | No     | Yes                              | P0   |
| ANY    | `/api/history`                  | list sessions                 | Yes               | owner                           | `corpid` filter           | `sessions`                                                       | none                                                                                                     | Yes       | No     | No                               | P1   |
| GET    | `/api/session_detail`           | session transaction detail    | Yes               | owner                           | `corpid` filter           | `transactions`                                                   | none                                                                                                     | Yes       | No     | No                               | P1   |

## P0 API Risks

- `/api/employee/entry`: financial write path accepts per-entry upload and stores some frontend-provided handover totals. Needs backend atomic handover and recomputed totals.
- `/api/arrear_tasks/update`: financial follow-up path is role-limited, but needs stronger lifecycle tests and audit coverage.
- `/api/rent_config POST`: rent config directly affects all future receivables. Needs versioned effective dates.
- `/api/save_session`: legacy owner save writes financial rows without the newer employee anchors and without clear atomic report validation.
- `/api/delete_session`: hard deletes commercial financial data.
- `/api/clear_arrear`: clearing receivables requires full before/after audit and manager reason.

## P1 API Risks

- Auth routes depend on environment secrets; local validation fails without `.dev.vars`.
- `corpid` is static env-derived and not enough for future multi-tenant SaaS.
- Several read APIs return business data with `corpid` filtering but no `property_id` isolation.
- Some routes create tables/settings during request handling.
- API docs are not yet generated from source and may drift.

## Next API Work

1. Add route-level tests for unauthenticated, employee, owner, and future admin cases.
2. Replace hard delete route behavior with void workflow after database audit.
3. Introduce tenant/property scope model before multi-customer SaaS rollout.
4. Keep frontend hidden buttons as UX only; server checks remain mandatory.
