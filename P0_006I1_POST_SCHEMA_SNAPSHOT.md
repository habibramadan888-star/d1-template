# P0-006I1 Post Schema Snapshot

Date: 2026-05-26, Asia/Dubai

Read-only verification command:

```sql
SELECT name, type, sql FROM sqlite_schema WHERE type IN ('table','index','view') ORDER BY type, name;
```

Target:

- D1: `homelink-finance-staging`
- D1 id: `4ff78bfc-3855-436b-aefb-6b492145d79c`

| Table                       | Expected Compatibility Columns                         | Exists | Notes                                                                     |
| --------------------------- | ------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| `active_sessions`           | `company_id`, `owner_id`, `employee_id`                | yes    | Property scope remains membership-derived; no direct `property_id` added. |
| `app_settings`              | `company_id`, `property_id`, `owner_id`                | yes    | Current staging row count is 0 in dry-run evidence.                       |
| `arrear_tasks`              | `company_id`, `property_id`, `employee_id`             | yes    | Still requires row-level mapping before backfill.                         |
| `arrears`                   | `company_id`, `property_id`, `employee_id`             | yes    | Current staging row count is 0 in dry-run evidence.                       |
| `audit_logs`                | `company_id`, `property_id`, `owner_id`, `employee_id` | yes    | Still requires target-entity mapping before backfill.                     |
| `deposit_ledger`            | `company_id`, `property_id`, `employee_id`             | yes    | Current staging row count is 0 in dry-run evidence.                       |
| `entry_events`              | `company_id`, `property_id`, `employee_id`             | yes    | Still requires `ref_type` / `ref_id` mapping before backfill.             |
| `sessions`                  | `company_id`, `property_id`, `employee_id`             | yes    | Still requires session/operator/property mapping before backfill.         |
| `transactions`              | `company_id`, `property_id`, `employee_id`             | yes    | Still requires accounting-reviewed row mapping before backfill.           |
| `employee_users`            | `company_id`                                           | yes    | Property access remains future membership scope.                          |
| `handover_commits`          | existing `company_id`, `property_id`, `employee_id`    | yes    | No schema change required.                                                |
| `handover_commit_rows`      | existing `company_id`, `property_id`                   | yes    | Employee scope derives from commit.                                       |
| `handover_idempotency_keys` | existing `company_id`, `property_id`, `employee_id`    | yes    | No schema change required.                                                |
| `handover_audit_events`     | existing `company_id`, `property_id`, `employee_id`    | yes    | No schema change required.                                                |

Result: compatibility columns are present in staging schema.

Backfill status: not executed.

Production status: untouched.
