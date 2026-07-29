# P0-006I Staging Backfill Write Approval Packet

Date: 2026-05-26, Asia/Dubai

Scope: approval packet only. This packet does not authorize or execute a
staging backfill write. It documents what must be reviewed before any future
tenant-scope write task.

## Target

| Item                    | Value                                  | Approval Status                       |
| ----------------------- | -------------------------------------- | ------------------------------------- |
| Target D1               | `homelink-finance-staging`             | Must be confirmed again before write. |
| Target D1 id            | `4ff78bfc-3855-436b-aefb-6b492145d79c` | Must be confirmed again before write. |
| Absolutely forbidden D1 | production D1                          | Not allowed.                          |
| Production deploy       | forbidden                              | Not approved.                         |
| Production migration    | forbidden                              | Not approved.                         |
| Production cutover      | forbidden                              | Not approved.                         |

## Tables Requiring Human Review

The current warning tables do not have direct `tenant_id`, `property_id`,
`corp_id`, `owner_id`, or `employee_id` fields. They have legacy `corpid` and
mixed user/operator/reference fields. Therefore, a data backfill write is not
safe until the target schema and mapping strategy are approved.

| Table             | Estimated Rows | Existing Scope Columns                                                    | Backfill Fields Present Now                                  | Proposed Future Scope                                               | Write Approval Status |
| ----------------- | -------------: | ------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- | --------------------- |
| `active_sessions` |              4 | `corpid`, `userid`, `role`                                                | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | session company + membership-derived property access                | MANUAL_REQUIRED       |
| `app_settings`    |              0 | `corpid`, `key`                                                           | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property settings split                                     | MANUAL_REQUIRED       |
| `arrear_tasks`    |              7 | `corpid`, `userid`, `entry_id`, `bed`, `tenant_card_id`                   | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property + receivable/source transaction + assignee mapping | MANUAL_REQUIRED       |
| `arrears`         |              0 | `corpid`, `userid`, `session_id`, `entry_id`                              | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property + receivable/source transaction mapping            | MANUAL_REQUIRED       |
| `audit_logs`      |              7 | `corpid`, `userid`, `role`, `target`                                      | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | scoped audit events with actor and target entity ids                | MANUAL_REQUIRED       |
| `deposit_ledger`  |              0 | `corpid`, `userid`, `tenant_card_id`, `bed`, `entry_id`                   | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property + source transaction/deposit mapping               | MANUAL_REQUIRED       |
| `entry_events`    |              5 | `corpid`, `userid`, `ref_id`, `ref_type`, `operator_id`                   | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property from referenced entity and actor mapping           | MANUAL_REQUIRED       |
| `sessions`        |              1 | `corpid`, `created_by`, `operator_id`                                     | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property + operator mapping and dashboard diff evidence     | MANUAL_REQUIRED       |
| `transactions`    |              3 | `corpid`, `userid`, `session_id`, `room`, `operator_id`, `tenant_card_id` | none of `tenant_id/property_id/corp_id/owner_id/employee_id` | company/property + session/bed/tenant-card/accounting mapping       | MANUAL_REQUIRED       |

## Required Approval Inputs

| Requirement                      | Required | Current Status                       | Notes                                                                        |
| -------------------------------- | -------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Staging D1 backup                | Yes      | Not executed in this review          | Must be completed before any write.                                          |
| Rollback method                  | Yes      | Drafted only                         | Use backup restore or exact inverse update plan.                             |
| Legacy CORPID warning acceptance | Yes      | Review completed, acceptance pending | Human must accept each table-specific risk.                                  |
| Target schema columns            | Yes      | Missing in warning tables            | Schema migration/compatibility-column task is required before direct update. |
| Exact row-level mapping          | Yes      | Not available yet                    | Must be produced from reviewed source joins and row counts.                  |
| Dashboard/history diff evidence  | Yes      | Not executed in this review          | Required before and after any write.                                         |
| Production exclusion             | Yes      | Confirmed by task constraints        | Must be reconfirmed before write.                                            |

## Rollback Method

Preferred rollback:

1. Export staging D1 backup before write.
2. Apply exact reviewed staging-only update plan.
3. Verify row counts and dashboard/history diff.
4. If failed, restore from backup or execute the reviewed inverse update plan.

No production rollback is defined here because production is not in scope.

## Approval Decision

Can enter P0-006I: `MANUAL_REQUIRED`.

Reason: P0-006I may proceed as a human approval gate, but not as an immediate
write task. The current warning tables lack direct target scope fields, so a
staging schema/compatibility-column approval step and exact row-level mapping
are required before `--confirm-staging-backfill-write` can be safely accepted.
