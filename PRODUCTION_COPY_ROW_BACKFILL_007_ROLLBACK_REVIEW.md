# Production Copy Row Backfill 007 Rollback Review

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Rollback execution: not performed.

Reason: copy-only row-level dry-run completed without deterministic failure.
This task requires rollback review, not automatic rollback.

| Area              | Rollback Method                                                                          | Feasible on Copy | Production Suitability | Human Approval Needed    |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------- | ---------------------- | ------------------------ |
| Money `*_fils`    | Reverse update target `*_fils` fields to NULL by primary key or restore copy backup      | yes              | restore preferred      | Accounting + engineering |
| Tenant scope      | Reverse update compatibility scope columns to NULL by primary key or restore copy backup | yes              | restore preferred      | Tenant scope owner       |
| Audit/event scope | Reverse update compatibility scope columns to NULL by primary key or restore copy backup | yes              | restore preferred      | Business + engineering   |
| Receivables       | no row inserts executed                                                                  | n/a              | n/a                    | Accounting               |
| Handover          | no row inserts executed                                                                  | n/a              | n/a                    | Engineering              |

Backup available:

`./backups/production-copy-before-row-level-backfill-dryrun.sql`

If these operations happened on production:

- Restore from a production backup would be the safest rollback path.
- Reverse updates are possible only with exact primary-key row lists and
  approval.
- Production should not proceed until copy rollback rehearsal is executed and
  verified.

Rollback conclusion: rollback is feasible on the copy by restore or reverse
update, but rollback execution still requires a separate approval task.
Production remains `PRODUCTION_NO_GO`.
