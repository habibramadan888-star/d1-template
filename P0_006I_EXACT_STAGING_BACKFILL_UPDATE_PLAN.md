# P0-006I Exact Staging Backfill Update Plan

Date: 2026-05-26, Asia/Dubai

Scope: exact update planning package only. No SQL in this document was executed.
No staging or production D1 write occurred.

## Current Schema Finding

The 9 legacy warning tables currently have `corpid` but do not have direct
`tenant_id`, `property_id`, `corp_id`, `owner_id`, or `employee_id` fields.
Therefore, no executable `UPDATE` statement is safe to run against the current
staging schema.

Every future update must be generated only after:

1. Target schema columns are approved and present.
2. Row-level mapping has been reviewed.
3. Backup is complete.
4. Rollback is accepted.
5. Human approval flags are supplied.

## Planned Updates

| Table             | Planned Update                                                                  | WHERE Clause                                                                                       | Estimated Rows | Rollback Method                                                                     | Risk                                                                  |
| ----------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------: | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `active_sessions` | No executable update now; future session scope should be claims/membership led. | Future write must target reviewed `sid` values: `WHERE sid IN (:reviewed_sid_list) AND corpid=:c`. |              4 | Prefer session expiry/re-login; otherwise restore backup or inverse reviewed patch. | High auth risk; do not infer property scope from `corpid`.            |
| `app_settings`    | No executable update now; future settings split to company/property tables.     | Future write must target reviewed keys: `WHERE corpid=:c AND key IN (:reviewed_key_list)`.         |              0 | Restore backup or delete/revert exact inserted scoped settings rows.                | Config risk; row count is currently 0 but defaults still need review. |
| `arrear_tasks`    | No executable update now; future update needs approved scope columns.           | Future write must target reviewed tasks: `WHERE task_id IN (:reviewed_task_ids) AND corpid=:c`.    |              7 | Restore backup or inverse update each reviewed `task_id`.                           | High collection/privacy risk; bed/CID collisions require review.      |
| `arrears`         | No executable update now; future update needs source transaction mapping.       | Future write must target reviewed arrears: `WHERE id IN (:reviewed_arrear_ids) AND corpid=:c`.     |              0 | Restore backup or inverse update each reviewed `id`.                                | Accounting risk if free-text room is used as authority.               |
| `audit_logs`      | No executable update now; future scoped audit should not rewrite blindly.       | Future write must target reviewed logs: `WHERE id IN (:reviewed_audit_ids) AND corpid=:c`.         |              7 | Preserve originals; restore backup or inverse annotation only.                      | Audit/legal risk; entity scope must be derived from target entity.    |
| `deposit_ledger`  | No executable update now; future update needs source transaction mapping.       | Future write must target reviewed ledger rows: `WHERE ledger_id IN (:reviewed_ids) AND corpid=:c`. |              0 | Restore backup or inverse update each reviewed `ledger_id`.                         | Deposit liability risk; do not map by tenant card alone.              |
| `entry_events`    | No executable update now; future update needs `ref_type` / `ref_id` joins.      | Future write must target reviewed events: `WHERE event_id IN (:reviewed_event_ids) AND corpid=:c`. |              5 | Restore backup or inverse update each reviewed `event_id`.                          | Audit lineage risk; unmatched refs must block.                        |
| `sessions`        | No executable update now; future update needs session/operator/property map.    | Future write must target reviewed sessions: `WHERE id IN (:reviewed_session_ids) AND corpid=:c`.   |              1 | Restore backup or inverse update each reviewed `id`; verify dashboard/history diff. | Dashboard/history risk; totals visibility can change.                 |
| `transactions`    | No executable update now; future update needs transaction/session/bed mapping.  | Future write must target reviewed rows: `WHERE id IN (:reviewed_transaction_ids) AND corpid=:c`.   |              3 | Restore backup or inverse update each reviewed `id`; verify accounting diffs.       | Highest financial risk; no bulk update allowed.                       |

## Non-Executable Template For Future Reviewed Schema

SAFE_TO_RUN_NOW: no

NEEDS_HUMAN_APPROVAL: yes

WRITES_DATA: yes, only in a future task

PRODUCTION_FORBIDDEN: yes

```sql
-- Template only. Do not run in this task.
UPDATE <reviewed_table>
SET
  <approved_scope_column_1> = :reviewed_scope_value_1,
  <approved_scope_column_2> = :reviewed_scope_value_2
WHERE <primary_key_column> IN (:reviewed_primary_key_list)
  AND corpid = :legacy_corpid;
```

Rules:

- No full-table update is allowed.
- Every update must use reviewed primary keys.
- Every update must include a legacy `corpid` guard.
- Every update must have before/after row counts.
- Every update must have an inverse rollback plan.
- Production D1 is forbidden.
- Deleting data is forbidden.
