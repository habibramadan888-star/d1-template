# P0-006I Exact Staging Backfill Update Plan V2

Date: 2026-05-26, Asia/Dubai

Scope: planning only. No staging write, production write, migration, deploy, or
row-level update was executed.

This plan assumes the nullable compatibility columns from
`migration-drafts/tenant_scope_staging_compatibility_columns_draft.sql` have
not yet been applied. Therefore the current task remains NO-GO for data
backfill writes.

| Table                       | Target Field                                           | Source Field / Rule                                                                                                                        | WHERE Clause                                                                | Estimated Rows | Rollback                                                                                      | Status          |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------: | --------------------------------------------------------------------------------------------- | --------------- |
| `active_sessions`           | `company_id`, `owner_id`, `employee_id`                | `company_id` from reviewed user/session company; owner/employee from `role` + `userid`; property via membership lookup, not direct column. | `WHERE sid IN (:reviewed_sid_list) AND corpid = :legacy_corpid`             |              4 | Prefer session expiry/re-login; otherwise restore backup or inverse reviewed update by `sid`. | MANUAL_REQUIRED |
| `app_settings`              | `company_id`, `property_id`, `owner_id`                | Current row count is 0; future rows require settings ownership review.                                                                     | `WHERE corpid = :legacy_corpid AND key IN (:reviewed_key_list)`             |              0 | Restore backup or inverse reviewed update by `(corpid, key)`.                                 | NOT_REQUIRED    |
| `arrear_tasks`              | `company_id`, `property_id`, `employee_id`             | Map through reviewed `entry_id` / `original_entry_id`, receivable/source transaction, and assignee fields.                                 | `WHERE task_id IN (:reviewed_task_ids) AND corpid = :legacy_corpid`         |              7 | Restore backup or inverse reviewed update by `task_id`.                                       | MANUAL_REQUIRED |
| `arrears`                   | `company_id`, `property_id`, `employee_id`             | Current row count is 0; if rows appear, map through `session_id` / `entry_id`, never free-text room alone.                                 | `WHERE id IN (:reviewed_arrear_ids) AND corpid = :legacy_corpid`            |              0 | Restore backup or inverse reviewed update by `id`.                                            | NOT_REQUIRED    |
| `audit_logs`                | `company_id`, `property_id`, `owner_id`, `employee_id` | Map from reviewed target entity and actor role; actor alone is not target scope.                                                           | `WHERE id IN (:reviewed_audit_ids) AND corpid = :legacy_corpid`             |              7 | Preserve originals; restore backup or inverse reviewed annotation by `id`.                    | MANUAL_REQUIRED |
| `deposit_ledger`            | `company_id`, `property_id`, `employee_id`             | Current row count is 0; future rows require source transaction/deposit mapping.                                                            | `WHERE ledger_id IN (:reviewed_ledger_ids) AND corpid = :legacy_corpid`     |              0 | Restore backup or inverse reviewed update by `ledger_id`.                                     | NOT_REQUIRED    |
| `entry_events`              | `company_id`, `property_id`, `employee_id`             | Map through explicit `ref_type` / `ref_id` joins to sessions, transactions, or handover tables.                                            | `WHERE event_id IN (:reviewed_event_ids) AND corpid = :legacy_corpid`       |              5 | Restore backup or inverse reviewed update by `event_id`.                                      | MANUAL_REQUIRED |
| `sessions`                  | `company_id`, `property_id`, `employee_id`             | Map from reviewed operator/session and linked transactions/commit rows; verify dashboard/history diff.                                     | `WHERE id IN (:reviewed_session_ids) AND corpid = :legacy_corpid`           |              1 | Restore backup or inverse reviewed update by `id`; verify dashboard/history diff.             | MANUAL_REQUIRED |
| `transactions`              | `company_id`, `property_id`, `employee_id`             | Map from reviewed `session_id`, room/bed map, operator, and accounting review.                                                             | `WHERE id IN (:reviewed_transaction_ids) AND corpid = :legacy_corpid`       |              3 | Restore backup or inverse reviewed update by `id`; verify accounting diff.                    | MANUAL_REQUIRED |
| `employee_users`            | `company_id`                                           | Map employee account to reviewed company; property scope requires future membership rows.                                                  | `WHERE employee_id IN (:reviewed_employee_ids) AND corpid = :legacy_corpid` |              3 | Restore backup or inverse reviewed update by `employee_id`.                                   | MANUAL_REQUIRED |
| `handover_commits`          | none                                                   | Already has `company_id`, `property_id`, and `employee_id` in staging schema.                                                              | none                                                                        |              1 | No update.                                                                                    | NOT_REQUIRED    |
| `handover_commit_rows`      | none                                                   | Already has `company_id` and `property_id`; employee derives from commit.                                                                  | none                                                                        |              2 | No update.                                                                                    | NOT_REQUIRED    |
| `handover_idempotency_keys` | none                                                   | Already has `company_id`, `property_id`, and `employee_id`.                                                                                | none                                                                        |              1 | No update.                                                                                    | NOT_REQUIRED    |
| `handover_audit_events`     | none                                                   | Already has `company_id`, `property_id`, and `employee_id`.                                                                                | none                                                                        |              3 | No update.                                                                                    | NOT_REQUIRED    |

## Rules For Any Future Update

- No full-table unguarded `UPDATE`.
- Every update must use reviewed primary keys and `corpid` guard where the
  table has legacy `corpid`.
- Every update must include before/after row counts.
- Every update must have an inverse rollback plan or backup restore plan.
- Static `homelink` / legacy `CORPID` is acceptable only as a staging
  rehearsal guard, not as the final production tenant authority.
- Production is forbidden.

## Current Decision

- Staging schema compatibility migration: future approval candidate.
- Staging data backfill write: NO-GO.
- Production data backfill write: NO-GO.
