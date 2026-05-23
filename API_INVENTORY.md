# API Inventory

Date: 2026-05-23
Source: generated from `deploy-worker/src/index.js` by `scripts/audit-api.mjs`
Production calls: none

## Summary

- Total routes found by scan: 27
- Method counts: GET=11, POST=14, ANY=2
- Auth model: public auth routes, then `requireAuth`, then staff allowlist / manager checks
- Tenant scope currently uses `corpid`
- Future SaaS scope still needs `tenant_id/company_id/property_id`
- Drift gate: `npm run audit:api:check` fails if route metadata does not match Worker source

## Inventory

| Method | Path                            | Purpose                                        | Login | Roles                           | Tenant Scope     | Reads                                                            | Writes                                                                                                          | Financial | Delete | Audit                 | Risk | Notes                                                                  |
| ------ | ------------------------------- | ---------------------------------------------- | ----- | ------------------------------- | ---------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- | ------ | --------------------- | ---- | ---------------------------------------------------------------------- |
| GET    | `/api/arrear_tasks`             | list arrear follow-up tasks                    | Yes   | employee, owner                 | `corpid` filter  | `arrear_tasks`, legacy `arrears`                                 | none                                                                                                            | Yes       | No     | No                    | P1   | Receivables model is still missing.                                    |
| POST   | `/api/arrear_tasks/update`      | update arrear follow-up task                   | Yes   | employee limited, owner broader | `corpid` filter  | `arrear_tasks`, legacy `arrears`                                 | `arrear_tasks`, `entry_events`, `audit_logs`                                                                    | Yes       | No     | Yes                   | P0   | Needs stricter lifecycle tests and receivable linkage.                 |
| GET    | `/api/arrears`                  | owner arrears view                             | Yes   | owner                           | `corpid` filter  | arrear sources                                                   | none                                                                                                            | Yes       | No     | No                    | P1   | Must be backed by receivables before commercial reporting.             |
| POST   | `/api/clear_arrear`             | manager clear arrear                           | Yes   | owner                           | `corpid` filter  | arrear sources                                                   | `arrears`, `arrear_tasks`, `audit_logs`                                                                         | Yes       | No     | Yes                   | P0   | Requires full before/after audit and receivable application.           |
| GET    | `/api/customers`                | read customer credit data                      | Yes   | owner                           | `corpid` filter  | `app_settings`                                                   | runtime schema creation in request path                                                                         | Indirect  | No     | No                    | P1   | JSON settings store is not enough for SaaS analytics.                  |
| POST   | `/api/customers`                | save customer credit data                      | Yes   | owner                           | `corpid` filter  | request body                                                     | `app_settings`, `audit_logs`                                                                                    | Indirect  | No     | Yes                   | P1   | Needs normalized customer model before commercial multi-property use.  |
| POST   | `/api/delete_session`           | delete session                                 | Yes   | owner                           | `corpid` filter  | `sessions`, `transactions`                                       | hard deletes `deposit_ledger`, `transactions`, `arrears`, `sessions`; voids `arrear_tasks`; writes `audit_logs` | Yes       | Yes    | Yes                   | P0   | Commercial data must become void/soft-delete, not hard delete.         |
| GET    | `/api/employee/deposit`         | employee deposit balance lookup                | Yes   | employee, owner                 | `corpid` filter  | `deposit_ledger`                                                 | none                                                                                                            | Yes       | No     | No                    | P1   | Deposit ledger is not yet integer-fils commercial schema.              |
| POST   | `/api/employee/entry`           | employee transaction entry                     | Yes   | employee, owner                 | `corpid` write   | `transactions`, `arrear_tasks`, `deposit_ledger`, `app_settings` | `sessions`, `transactions`, `arrear_tasks`, `deposit_ledger`, `entry_events`, `audit_logs`                      | Yes       | No     | Yes                   | P0   | Needs backend atomic handover commit and recomputed totals.            |
| GET    | `/api/employee/lock/cards`      | employee TTLock context                        | Yes   | employee, owner                 | session `corpid` | TTLock API                                                       | `audit_logs`                                                                                                    | Indirect  | No     | Yes                   | P1   | External lock-card data becomes an accounting anchor.                  |
| POST   | `/api/employee/migrate`         | employee schema migration endpoint             | Yes   | owner                           | `corpid`         | schema                                                           | schema                                                                                                          | Yes       | No     | Yes                   | P1   | Request-path migration must move to migration pipeline.                |
| ANY    | `/api/history`                  | list sessions                                  | Yes   | owner                           | `corpid` filter  | `sessions`                                                       | none                                                                                                            | Yes       | No     | No                    | P1   | Source currently accepts any HTTP method for this path.                |
| GET    | `/api/lock/cards`               | owner TTLock load                              | Yes   | owner                           | session `corpid` | TTLock API                                                       | `audit_logs`                                                                                                    | Indirect  | No     | Yes                   | P1   | External data should be snapshotted before accounting use.             |
| ANY    | `/api/me`                       | current user identity                          | Yes   | owner, employee                 | session `corpid` | session                                                          | none                                                                                                            | No        | No     | No                    | P1   | Source currently accepts any HTTP method for this path.                |
| GET    | `/api/me`                       | staff allowlist declaration for identity route | Yes   | employee, owner                 | session `corpid` | session                                                          | none                                                                                                            | No        | No     | No                    | P2   | Allowlist says GET, but route handler also contains `ANY /api/me`.     |
| GET    | `/api/rent_config`              | read rent reference config                     | Yes   | employee, owner                 | `corpid` filter  | `app_settings`                                                   | runtime schema creation in request path                                                                         | Yes       | No     | No                    | P1   | Rent config needs versioning and migration-owned schema.               |
| POST   | `/api/rent_config`              | update rent reference config                   | Yes   | owner                           | `corpid` filter  | request body                                                     | `app_settings`, `audit_logs`                                                                                    | Yes       | No     | Yes                   | P0   | Affects future receivables; requires effective-date model before SaaS. |
| POST   | `/api/save_session`             | owner legacy session save                      | Yes   | owner                           | `corpid` write   | request body                                                     | `sessions`, `transactions`, legacy `arrears`                                                                    | Yes       | No     | No direct route audit | P0   | Legacy financial write path lacks backend-owned handover validation.   |
| POST   | `/api/security/revoke_sessions` | revoke other sessions                          | Yes   | owner                           | `corpid` filter  | `active_sessions`                                                | `active_sessions`, `audit_logs`                                                                                 | No        | No     | Yes                   | P1   | Runtime schema creation remains in request path.                       |
| GET    | `/api/session_detail`           | session transaction detail                     | Yes   | owner                           | `corpid` filter  | `transactions`                                                   | none                                                                                                            | Yes       | No     | No                    | P1   | Reads legacy decimal transaction rows.                                 |
| GET    | `/api/wifi/accounts`            | read WiFi accounts                             | Yes   | owner                           | `corpid` filter  | `app_settings`                                                   | possible encrypted migration to `app_settings`, `audit_logs`                                                    | No        | No     | Conditional           | P1   | Read path can mutate encrypted storage.                                |
| POST   | `/api/wifi/accounts`            | save WiFi accounts                             | Yes   | owner                           | `corpid` filter  | request body                                                     | `app_settings`, `audit_logs`                                                                                    | No        | No     | Yes                   | P1   | Sensitive secrets require production key rotation process.             |
| POST   | `/auth/confirm-manager`         | confirm manager credential                     | Yes   | authenticated                   | session `corpid` | environment manager secret                                       | none                                                                                                            | No        | No     | No                    | P2   | Requires authenticated session before manager confirmation.            |
| POST   | `/auth/employee-login`          | employee PIN login                             | No    | public                          | env `CORPID`     | `employee_users`                                                 | `active_sessions`                                                                                               | No        | No     | No                    | P1   | Employee identity is not tenant/property-scoped enough for SaaS.       |
| POST   | `/auth/login`                   | owner/staff password login                     | No    | public                          | env `CORPID`     | environment credentials                                          | `active_sessions`                                                                                               | No        | No     | No                    | P1   | Public credential route; production secret management required.        |
| POST   | `/auth/logout`                  | clear browser session cookie                   | No    | public                          | none             | cookie                                                           | cookie only                                                                                                     | No        | No     | No                    | P2   | Does not revoke server-side session by itself.                         |
| GET    | `/favicon.ico`                  | favicon response                               | No    | public                          | none             | none                                                             | none                                                                                                            | No        | No     | No                    | P3   | Static browser route.                                                  |

## P0 API Risks

- `POST /api/arrear_tasks/update`: Needs stricter lifecycle tests and receivable linkage.
- `POST /api/clear_arrear`: Requires full before/after audit and receivable application.
- `POST /api/delete_session`: Commercial data must become void/soft-delete, not hard delete.
- `POST /api/employee/entry`: Needs backend atomic handover commit and recomputed totals.
- `POST /api/rent_config`: Affects future receivables; requires effective-date model before SaaS.
- `POST /api/save_session`: Legacy financial write path lacks backend-owned handover validation.

## P1 API Risks

- `GET /api/arrear_tasks`: Receivables model is still missing.
- `GET /api/arrears`: Must be backed by receivables before commercial reporting.
- `GET /api/customers`: JSON settings store is not enough for SaaS analytics.
- `POST /api/customers`: Needs normalized customer model before commercial multi-property use.
- `GET /api/employee/deposit`: Deposit ledger is not yet integer-fils commercial schema.
- `GET /api/employee/lock/cards`: External lock-card data becomes an accounting anchor.
- `POST /api/employee/migrate`: Request-path migration must move to migration pipeline.
- `ANY /api/history`: Source currently accepts any HTTP method for this path.
- `GET /api/lock/cards`: External data should be snapshotted before accounting use.
- `ANY /api/me`: Source currently accepts any HTTP method for this path.
- `GET /api/rent_config`: Rent config needs versioning and migration-owned schema.
- `POST /api/security/revoke_sessions`: Runtime schema creation remains in request path.
- `GET /api/session_detail`: Reads legacy decimal transaction rows.
- `GET /api/wifi/accounts`: Read path can mutate encrypted storage.
- `POST /api/wifi/accounts`: Sensitive secrets require production key rotation process.
- `POST /auth/employee-login`: Employee identity is not tenant/property-scoped enough for SaaS.
- `POST /auth/login`: Public credential route; production secret management required.

## Next API Work

1. Add route-level tests for unauthenticated, employee, owner, and future admin cases.
2. Replace hard delete route behavior with void workflow after database audit.
3. Introduce tenant/property scope model before multi-customer SaaS rollout.
4. Keep frontend hidden buttons as UX only; server checks remain mandatory.
