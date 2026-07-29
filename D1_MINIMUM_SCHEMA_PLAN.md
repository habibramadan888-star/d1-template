# D1 Minimum Schema Plan

Date: 2026-05-24  
Task: P0-005 Clean D1 Bootstrap

## Scope

This plan defines the minimum legacy-compatible schema needed for the current Worker to start from an empty local D1 and pass basic smoke/auth/employee-entry/delete-session validation.

This task does not solve:

- P0-001 money precision migration.
- P0-002 atomic employee handover commit.
- P0-003 backend recomputed totals.
- P0-006 tenant isolation model.
- P0-008 formal receivables lifecycle.

## Minimum Required Tables

| Need                          | Tables                                                                                                | Why                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Worker startup / auth         | `active_sessions`, `audit_logs`                                                                       | Owner/staff sessions and audit writes.                                 |
| Employee login                | `employee_users`                                                                                      | Dev employee seed and employee PIN login.                              |
| Owner login                   | `active_sessions`                                                                                     | Owner auth is env-secret based but persists session rows.              |
| Settings reads                | `app_settings`                                                                                        | Rent config, customers, WiFi settings, and owner read routes.          |
| Handover/session history      | `sessions`                                                                                            | Owner history and employee entry session anchors.                      |
| Employee entry                | `transactions`, `arrear_tasks`, `entry_events`, `deposit_ledger`, `sessions`, `app_settings`          | The live `/api/employee/entry` path writes all of these or reads them. |
| Owner arrears/dashboard reads | `arrears`, `arrear_tasks`, `app_settings`, `sessions`, `transactions`                                 | Owner read APIs must return stable empty arrays/objects on a clean DB. |
| Delete-session void           | `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks`, `audit_logs`, `entry_events` | P0-004 requires void metadata and audit evidence.                      |

## Legacy Compatibility

The local bootstrap schema intentionally keeps the current legacy column names used by `deploy-worker/src/index.js`, including:

- `transactions.id`, `session_id`, `room`, `amount`, `due`, `paid`, `period_start`, `period_end`, `cycle`, `tenant_card_id`, `status`.
- `sessions.id`, `cash_handover`, `bank_transfer_total`, `gross_received`, `handover_status`.
- `arrear_tasks.arrear_amount`, `promise_amount`, `actual_received`, `followup_status`.
- `deposit_ledger.amount`, `delta`, `balance_after`.

## Known Deferred Risks

| Deferred Item                      | Why Deferred                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `REAL` money columns               | Required to avoid changing legacy formulas in P0-005. P0-001 must replace commercial writes with integer fils. |
| Formal `receivables` table         | Not currently required by live Worker routes. P0-008 owns that lifecycle.                                      |
| `tenant_id/company_id/property_id` | Live Worker still scopes by `corpid`. P0-006 owns SaaS tenancy.                                                |
| Runtime DDL removal                | P1-002 owns removing request-path DDL after migration confidence.                                              |

## Fields That Must Exist For Clean Bootstrap

- `transactions`: full `EMP_TX_COLUMNS` plus legacy owner columns used by `/api/save_session`.
- `sessions`: full `EMP_SESSION_COLUMNS` plus P0-004 void fields.
- `arrear_tasks`: full `EMP_TASK_COLUMNS` plus P0-004 void fields.
- `deposit_ledger`: full `EMP_DEPOSIT_COLUMNS` plus P0-004 void fields.
- `arrears`: legacy owner arrears fields plus P0-004 void fields.

## Verification Target

Clean bootstrap is acceptable only when a disposable empty local D1 can:

1. Run local migration.
2. Run dev seed with `APP_ENV=development/local/test` and `ALLOW_DEV_SEED=true`.
3. Start Worker.
4. Pass smoke/auth/core flows.
5. Pass employee entry smoke without `no such table: transactions`.
6. Keep P0-004 delete-session test passing.
