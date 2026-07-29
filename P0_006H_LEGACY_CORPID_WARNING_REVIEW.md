# P0-006H Legacy CORPID Warning Review

Date: 2026-05-26, Asia/Dubai

Scope: documentation and human approval package only. This review reads the
P0-006H dry-run evidence and local/staging schema sources. It does not execute
staging backfill writes, production commands, migration commands, or any
`INSERT` / `UPDATE` / `DELETE`.

## Summary

P0-006H found 9 legacy `CORPID` warning tables in
`homelink-finance-staging`. The common issue is that these tables use `corpid`
as the only tenant-like scope marker and do not currently have direct
`tenant_id`, `property_id`, `corp_id`, `owner_id`, or `employee_id` columns to
backfill.

Current warning count:

- Legacy `CORPID` warning tables: 9.
- Blocked tables: 0.
- Manual-required tables in the dry-run script: 0.
- Staging write executed: no.
- Production write executed: no.

## Warning Review

| #   | Table             | Column / Area                                                             | Current CORPID Behavior                                         | Proposed tenant/property scope                                                                                      | Risk                                                                                             | Recommended Action                                                                                                     | Human Approval                                                 |
| --- | ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `active_sessions` | `corpid`, `userid`, `role`, session auth metadata                         | Session scope is deployment-wide `corpid`; no property claims.  | Resolve `company_id` from authenticated user; resolve property access from `property_memberships`, not one column.  | Wrong backfill can grant cross-company or cross-property access.                                 | Do not data-backfill this table first; add session claim/membership design and expire old sessions after cutover.      | Required for auth/session model and rollback.                  |
| 2   | `app_settings`    | `corpid`, `key`, `value`, `updated_by`                                    | Settings are keyed by `(corpid, key)` only.                     | Split to `company_settings` and `property_settings`; map existing rows to a reviewed company/property default.      | Incorrect mapping can apply rent/system config to the wrong property.                            | Do not update in-place until settings split/mapping is reviewed; current staging row count is 0.                       | Required for settings ownership and default property behavior. |
| 3   | `arrear_tasks`    | `corpid`, `userid`, `entry_id`, `bed`, `tenant_card_id`, period anchors   | Follow-up tasks are scoped by `corpid` and bed/card fields.     | Add `company_id`, `property_id`, and assignee/actor mapping from receivable/source transaction where available.     | Same bed/CID can exist across properties; wrong mapping creates collection leakage.              | Require row-level reconciliation through `entry_id`, `original_entry_id`, `tenant_card_id`, and reviewed property map. | Required for arrears ownership and employee assignment.        |
| 4   | `arrears`         | `corpid`, `userid`, `room`, `session_id`, `entry_id`                      | Legacy arrears are scoped by `corpid`; current staging rows 0.  | Add `company_id`, `property_id`, and receivable linkage after P0-008/P0-006 mapping review.                         | Future non-empty rows could be mapped from ambiguous `room` if no source transaction exists.     | Do not infer from free text; if rows appear, map through `session_id` / `entry_id` or block for manual review.         | Required before any non-empty arrears backfill.                |
| 5   | `audit_logs`      | `corpid`, `userid`, `role`, `target`, `detail`                            | Audit trail records deployment `corpid`, not entity scope.      | Future `audit_events` should use `company_id`, optional `property_id`, `actor_id`, `actor_role`, target entity ids. | Audit evidence can become misleading if entity and actor scope are guessed.                      | Preserve legacy logs; add scoped audit events going forward; only annotate legacy logs after target entity review.     | Required for audit semantics and legal/compliance review.      |
| 6   | `deposit_ledger`  | `corpid`, `userid`, `tenant_card_id`, `bed`, `entry_id`, `operator_id`    | Deposit balances are scoped by `corpid` plus tenant card/bed.   | Add `company_id`, `property_id`, and transaction/tenant-card linkage from source transaction and reviewed bed map.  | Deposit liability can be assigned to wrong property if CID/bed collides.                         | Current staging row count is 0; require source transaction mapping and backup before any future non-empty update.      | Required for deposit accounting review.                        |
| 7   | `entry_events`    | `corpid`, `userid`, `ref_id`, `ref_type`, `operator_id`                   | Entry event evidence is scoped by `corpid` and referenced row.  | Add `company_id`, `property_id`, and actor mapping from referenced `sessions`, `transactions`, or handover records. | Events may point to multiple entity types; wrong join can corrupt audit lineage.                 | Backfill only through an explicit `ref_type`/`ref_id` join plan with unmatched refs reported, not silently skipped.    | Required for audit lineage review.                             |
| 8   | `sessions`        | `corpid`, `created_by`, `operator_id`, session totals and void metadata   | Session/handover rows are scoped by legacy deployment `corpid`. | Add `company_id`, `property_id`, `operator_id` authority from user membership and linked transactions/commit rows.  | Session totals feed dashboard/history; wrong scope can change owner reporting.                   | Require before/after dashboard/history diff evidence and row-count reconciliation before any staging write.            | Required for reporting and dashboard owner review.             |
| 9   | `transactions`    | `corpid`, `userid`, `session_id`, `room`, `operator_id`, `tenant_card_id` | Financial rows are scoped by `corpid`; no property field.       | Add `company_id`, `property_id`, and operator/user mapping from `session_id`, membership, room/bed map, and source. | Highest risk table: wrong backfill can move money, rent, deposits, arrears, and history records. | Require exact row-level update plan, accounting review, dashboard/history diff, backup, and rollback before any write. | Required; cannot proceed on `corpid` alone.                    |

## Review Decision

The 9 warnings are reviewed, but not accepted for automatic write execution.
Current schema is not ready for a direct staging backfill write because the
target scope columns are missing from the warning tables. A future P0-006I task
can proceed only as an approval gate unless it first includes an approved
staging schema migration / compatibility-column task.

## Safety Confirmation

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging D1 write: no.
- Staging backfill write: no.
- Legacy `CORPID` fallback removed: no.
- P0-006 marked Verified: no.
- Production cutover: NO-GO.
