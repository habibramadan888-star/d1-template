# Production Copy Dry-Run 005 Before Snapshot

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Backup before copy SQL:

| Item                    | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| Backup path             | `./backups/production-copy-before-review-005-dryrun.sql` |
| Backup committed to git | no                                                       |
| Backup target           | production-copy only                                     |
| Production backup/write | no                                                       |

Wrangler emitted a temporary download URL during export. That URL is not recorded in this report and must not be committed or shared.

## Row Counts Before Dry-Run

| Table             | Row Count | Notes                                 |
| ----------------- | --------: | ------------------------------------- |
| `sessions`        |        25 | Existing legacy production-copy rows. |
| `transactions`    |       232 | Existing legacy production-copy rows. |
| `deposit_ledger`  |         0 | Empty in production-copy baseline.    |
| `arrears`         |         6 | Existing legacy arrears rows.         |
| `arrear_tasks`    |         1 | Existing legacy arrear task row.      |
| `employee_users`  |         1 | Existing employee account row.        |
| `audit_logs`      |       108 | Existing legacy audit rows.           |
| `entry_events`    |         8 | Existing legacy entry event rows.     |
| `active_sessions` |       118 | Existing legacy active session rows.  |
| `app_settings`    |         1 | Existing legacy settings row.         |

## Schema Before Dry-Run

| Area                                  | Before State                    | Notes                                                             |
| ------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Void columns                          | absent on core financial tables | `003_delete_session_void_fields.sql` candidate.                   |
| Money fils columns                    | absent on core money tables     | `005_money_minor_units_dual_write_draft.sql` candidate.           |
| Tenant/property compatibility columns | absent on legacy core tables    | `tenant_scope_staging_compatibility_columns_draft.sql` candidate. |
| Handover atomic tables                | absent                          | `handover_atomic_commit_draft.sql` candidate.                     |
| Receivables tables                    | absent                          | `004_receivables_model_draft.sql` candidate.                      |

Safety:

- Snapshot queries were read-only.
- The first attempted compound count query hit a D1 `too many terms in compound SELECT` limit and made no writes.
- No production D1 was targeted.
