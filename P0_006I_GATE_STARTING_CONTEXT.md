# P0-006I Gate Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: staging schema compatibility gate only. This task does not execute
staging schema migration, staging backfill write, production deploy,
production migration, production D1 write, or any business-data mutation.

## Prior Result

P0-006H reviewed the staging backfill dry-run output and found 9 legacy
`CORPID` warning tables. The common blocker is that these tables have legacy
`corpid` scope but do not currently expose direct nullable compatibility
columns for the future tenant/property model.

## Legacy CORPID Warning Tables

|   # | Table             | Current Scope Fields                                                                | Missing Scope Fields                  | Compatibility Column Candidates                        | Mapping That Cannot Be Inferred                                                         |
| --: | ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
|   1 | `active_sessions` | `sid`, `corpid`, `userid`, `role`                                                   | company and actor claims              | `company_id`, `owner_id`, `employee_id`                | Property access must come from memberships, not a single guessed column.                |
|   2 | `app_settings`    | `corpid`, `key`, `updated_by`                                                       | company/property settings scope       | `company_id`, `property_id`, `owner_id`                | Whether a setting is company-wide or property-specific needs review.                    |
|   3 | `arrear_tasks`    | `corpid`, `userid`, `entry_id`, `bed`, `tenant_card_id`, `created_by`, `updated_by` | company/property and assignee scope   | `company_id`, `property_id`, `employee_id`             | Bed/CID alone cannot prove property. Source transaction/receivable mapping is required. |
|   4 | `arrears`         | `corpid`, `userid`, `room`, `session_id`, `entry_id`                                | company/property and receivable scope | `company_id`, `property_id`, `employee_id`             | Free-text `room` cannot be authority; use source session/entry or block.                |
|   5 | `audit_logs`      | `corpid`, `userid`, `role`, `target`                                                | entity and actor scope                | `company_id`, `property_id`, `owner_id`, `employee_id` | Audit target scope cannot be guessed from actor alone.                                  |
|   6 | `deposit_ledger`  | `corpid`, `userid`, `tenant_card_id`, `bed`, `entry_id`, `operator_id`              | company/property scope                | `company_id`, `property_id`, `employee_id`             | Deposit liability must map through source transaction/property evidence.                |
|   7 | `entry_events`    | `corpid`, `userid`, `ref_id`, `ref_type`, `operator_id`                             | referenced entity and actor scope     | `company_id`, `property_id`, `employee_id`             | `ref_type` / `ref_id` joins must be explicit; unmatched refs block.                     |
|   8 | `sessions`        | `corpid`, `created_by`, `operator_id`                                               | company/property and operator scope   | `company_id`, `property_id`, `employee_id`             | Dashboard/history impact requires row-level review and diff evidence.                   |
|   9 | `transactions`    | `corpid`, `userid`, `session_id`, `room`, `operator_id`, `tenant_card_id`           | company/property and operator scope   | `company_id`, `property_id`, `employee_id`             | Money rows must not be mapped by `corpid`, room, bed, or CID alone.                     |

## Why Backfill Cannot Run Now

1. The warning tables do not yet contain approved target compatibility columns.
2. The only common scope signal is deployment-wide `corpid`.
3. Several mappings require property membership, room/bed map, source
   transaction, receivable, or audit target joins that are not approved.
4. A direct `UPDATE` would either have no target columns or would require
   unsafe inference from legacy text fields.
5. Backup, rollback, schema migration approval, and row-level mapping approval
   are not complete for a write task.

## Minimum Safe Scope For This Task

- Convert the 9 warnings into a staging/local schema compatibility plan.
- Produce a migration draft that only adds nullable compatibility columns.
- Produce a revised row-level mapping plan that still does not execute writes.
- Keep production, staging data backfill, live dashboard, and live financial
  formulas unchanged.

## Current Decision

- Staging compatibility schema migration: eligible for a future
  human-approved task after backup and target confirmation.
- Staging backfill write: still NO-GO.
- Production: still NO-GO.
