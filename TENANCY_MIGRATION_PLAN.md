# Tenant Isolation Migration Plan

Status: P0-006A plan only. Production database mutation: not executed. Production Worker deployment: not executed.

## Target Principle

Every commercial data row must be answerable to:

- which company owns it,
- which property it belongs to,
- which user created/updated/voided it,
- which role and membership authorized the operation.

`CORPID` can remain a legacy compatibility field during migration, but it must not be the SaaS tenant authority.

## Target Tables

| Table                  | Purpose                                   | Notes                                                           |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `companies`            | SaaS customer/company account.            | One owner organization.                                         |
| `properties`           | Property/building/hostel under a company. | Includes timezone and currency.                                 |
| `users`                | Owner, staff, admin identities.           | Password/PIN authentication should resolve user id and company. |
| `property_memberships` | User access to property and role.         | Required for employee property scoping.                         |
| `beds`                 | Bed catalog under property.               | Stores bed code and TTLock remark snapshots.                    |
| `company_settings`     | Company-level config.                     | Billing/business defaults.                                      |
| `property_settings`    | Property-level config.                    | Rent rules, TTLock/WiFi integrations, local rules.              |

## Business Table Scope Requirements

| Existing/Future Table                          | Required Scope                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `sessions` / `handover_sessions`               | `company_id`, `property_id`, `operator_id`, `status`, `voided_at`.                            |
| `transactions`                                 | `company_id`, `property_id`, `session_id`, `operator_id`, `idempotency_key`.                  |
| `receivables`                                  | `company_id`, `property_id`, bed/tenant snapshots, lifecycle status.                          |
| `payment_allocations`                          | `company_id`, `property_id`, transaction and receivable linkage.                              |
| `deposit_ledger`                               | `company_id`, `property_id`, tenant card id, transaction id, balance.                         |
| `arrears` / `arrear_tasks`                     | `company_id`, `property_id`, receivable id, assignee.                                         |
| `audit_logs` / `audit_events` / `entry_events` | `company_id`, `property_id`, actor, target entity, immutable timestamp.                       |
| `app_settings`                                 | Split or dual-write into company/property scoped settings.                                    |
| `active_sessions`                              | Session `sid`, user id, role, company id, revocation; property scopes loaded from membership. |
| `rate_limit` keys                              | Include login type and normalized account/company context where possible.                     |

## Migration Phases

| Phase   | Scope                                                                                     | Risk                         | Verification                                    | Human Approval         |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------- | ---------------------- |
| P0-006B | Add local-only commercial tenancy tests against draft schema.                             | Low; no production mutation. | Cross-tenant deny tests against local D1.       | No, if local-only.     |
| P0-006C | Add company/property fields as nullable legacy-compatible fields in draft migration plan. | Medium; schema planning.     | Migration rehearsal and backfill dry run.       | Yes before production. |
| P0-006D | Backfill legacy `corpid` rows into `company_id/property_id` in dry-run report.            | High accounting impact.      | Reconciliation report and row counts.           | Yes.                   |
| P0-006E | Enforce server-side property membership on new commercial write paths.                    | High auth impact.            | Auth regression plus cross-tenant denial tests. | Yes.                   |
| P0-006F | Move owner dashboard/history queries to company/property scope with legacy fallback.      | High reporting impact.       | Owner dashboard diff report.                    | Yes.                   |
| P0-006G | Remove static `CORPID` as tenant authority after all live rows and routes are scoped.     | Very high.                   | Production staging rehearsal and rollback plan. | Yes.                   |

## Required API Behavior

- `/auth/login` resolves an owner/staff user and returns session claims tied to `company_id`.
- `/auth/employee-login` resolves staff identity within a company/property membership.
- Every `/api/*` route authenticates first, then applies server-side company/property filters.
- Frontend hidden buttons are not security controls.
- Export/report APIs must include only authorized property rows.
- Dev seed must create local-only company/property/user records and must never run in production.

## No-Go Conditions

- Any API uses only `env.CORPID` to decide commercial data access.
- Any employee can read or update records without property membership.
- Any dashboard query lacks company/property scope.
- Any migration attempts to infer property from free text without a reconciliation report.
- Any production default user or employee PIN is generated automatically.
