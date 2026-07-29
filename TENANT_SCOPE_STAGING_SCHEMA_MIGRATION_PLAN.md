# Tenant Scope Staging Schema Migration Plan

Date: 2026-05-26, Asia/Dubai

Scope: draft only. This plan does not execute `CREATE`, `ALTER`, `UPDATE`,
`INSERT`, `DELETE`, migration apply, deploy, or D1 write commands.

## Target

| Item                           | Value                                  |
| ------------------------------ | -------------------------------------- |
| Target environment             | staging/local only                     |
| Target D1 for future execution | `homelink-finance-staging`             |
| Target D1 id                   | `4ff78bfc-3855-436b-aefb-6b492145d79c` |
| Production migration           | forbidden                              |
| Data backfill in schema task   | forbidden                              |
| Live dashboard behavior        | unchanged                              |

## Draft File

The draft schema file is:

`migration-drafts/tenant_scope_staging_compatibility_columns_draft.sql`

An active `migrations/local/004_tenant_scope_staging_compatibility.sql` file was
not created in this gate. Promotion to an active local/staging migration should
happen only in a later human-approved schema task.

## Compatibility Column Scope

| Table             | Nullable Columns In Draft                              | Why                                                                                        |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `active_sessions` | `company_id`, `owner_id`, `employee_id`                | Preserve session actor/company compatibility while keeping property access in memberships. |
| `employee_users`  | `company_id`                                           | Prevent employee id collisions across companies.                                           |
| `app_settings`    | `company_id`, `property_id`, `owner_id`                | Allow reviewed company/property settings migration if the legacy table is retained.        |
| `sessions`        | `company_id`, `property_id`, `employee_id`             | Prepare dashboard/history session rows for scoped comparison.                              |
| `transactions`    | `company_id`, `property_id`, `employee_id`             | Prepare money rows for scoped comparison without changing amounts.                         |
| `deposit_ledger`  | `company_id`, `property_id`, `employee_id`             | Prepare deposit liability rows for scoped comparison.                                      |
| `arrears`         | `company_id`, `property_id`, `employee_id`             | Prepare legacy arrears rows for receivables/property comparison.                           |
| `arrear_tasks`    | `company_id`, `property_id`, `employee_id`             | Prepare follow-up tasks for property and assignee scope.                                   |
| `audit_logs`      | `company_id`, `property_id`, `owner_id`, `employee_id` | Preserve actor and target-scope compatibility for review.                                  |
| `entry_events`    | `company_id`, `property_id`, `employee_id`             | Prepare referenced entry evidence for scoped audit lineage.                                |

## Not Included

- No `tenant_id` column is added because no tenant registry is approved.
- No `corp_id` column is added because legacy `corpid` already exists and must
  remain a compatibility field, not a duplicated authority.
- No indexes are added in this draft; index design should follow the reviewed
  backfill/query plan.
- No values are populated.

## Future Execution Preconditions

1. Human approval for staging-only schema compatibility migration.
2. Confirm target D1 name and id.
3. Export staging D1 backup.
4. Confirm rollback method.
5. Review the exact SQL draft.
6. Confirm no production migration or production deploy.
7. Confirm data backfill is not part of the schema task.

## Current Decision

- GO candidate for future staging schema compatibility migration: yes, after
  human approval and backup.
- GO for staging backfill write: no.
- GO for production: no.
