# Production Copy Dry-Run 005 Rollback Review

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Rollback execution: not performed.

Reason: copy-only schema dry-run completed without deterministic failure. Row-level backfill was not executed. The task requires rollback review, not automatic rollback.

## If These Operations Had Been Production

| Area                                  | Rollback Method                                                  | Feasible        | Approval Needed                  | Notes                                                                |
| ------------------------------------- | ---------------------------------------------------------------- | --------------- | -------------------------------- | -------------------------------------------------------------------- |
| Void/session nullable columns         | Restore production backup or forward-only compatibility decision | Yes via restore | Yes                              | SQLite/D1 does not make column removal a low-risk routine operation. |
| Money `*_fils` nullable columns       | Restore backup or leave nullable columns unused                  | Yes via restore | Accounting + engineering         | Production should not proceed until conversion is reviewed.          |
| Tenant compatibility nullable columns | Restore backup or leave nullable columns unused                  | Yes via restore | Tenant scope owner + engineering | Data backfill is the higher-risk step and was not run.               |
| Handover atomic empty tables          | Restore backup or drop only with explicit approval               | Yes via restore | Engineering + accounting         | Copy-only tables have 0 rows.                                        |
| Receivables empty tables              | Restore backup or drop only with explicit approval               | Yes via restore | Accounting + engineering         | Copy-only tables have 0 rows.                                        |
| Money row backfill                    | Not executed                                                     | N/A             | Accounting required              | Would require reverse update or restore.                             |
| Tenant row backfill                   | Not executed                                                     | N/A             | Business owner required          | Would require reviewed inverse update by primary keys.               |
| Receivables data backfill             | Not executed                                                     | N/A             | Accounting required              | Would require ledger/allocation rollback rules.                      |

## Copy Backup Available

| Item                          | Value                                                    |
| ----------------------------- | -------------------------------------------------------- |
| Backup path                   | `./backups/production-copy-before-review-005-dryrun.sql` |
| Backup committed              | no                                                       |
| Restore target allowed        | production-copy only                                     |
| Restore to production allowed | no                                                       |

Rollback conclusion:

- Restore-from-backup is feasible for the copy.
- Reverse SQL is not recommended for production until exact row-level backfill SQL exists.
- Production remains `PRODUCTION_NO_GO`.
- A future rollback rehearsal on copy should be separately approved before any production migration approval.
