# Production Copy Dry-Run Human Approvals

Date: 2026-05-27, Asia/Dubai

Status: `COPY_CREATED_AND_IMPORTED`

| Approval Item                | Owner                          | Required Before                               | Current Status  | Notes                                                                          |
| ---------------------------- | ------------------------------ | --------------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| Production D1 identification | Engineering / operations owner | Any production discovery/export/import        | APPROVED_DONE   | `homelink`, `562aa079-1cca-4176-ba3b-7276a65f98fb`.                            |
| Production backup            | Engineering / operations owner | Creating or importing production copy         | APPROVED_DONE   | `./backups/production-before-copy-dryrun.sql`; not committed.                  |
| Production copy creation     | Engineering / operations owner | Any copy dry-run                              | APPROVED_DONE   | `homelink-finance-production-copy-dryrun`.                                     |
| Backup storage               | Engineering / operations owner | Backup command execution                      | APPROVED_DONE   | Stored under ignored `backups/`; retention policy still needed before cutover. |
| Migration dry-run            | Engineering + data owner       | Applying SQL to production copy               | MANUAL_REQUIRED | Copy only, not live production.                                                |
| Backfill dry-run             | Engineering + data owner       | Applying row-level updates to production copy | MANUAL_REQUIRED | Exact mapping and row counts required.                                         |
| Rollback dry-run             | Engineering / operations owner | Any cutover consideration                     | MANUAL_REQUIRED | Restore or reverse-update rehearsal required.                                  |
| Tenant mapping               | Business owner + engineering   | Tenant/property backfill dry-run              | MANUAL_REQUIRED | Mapping cannot rely on legacy CORPID as final authority.                       |
| Accounting reconciliation    | Accounting owner               | Money/receivables/totals dry-run              | MANUAL_REQUIRED | Includes P0-001 and P0-008 review.                                             |
| TOP_25 money risks           | Accounting + engineering       | Any production money migration                | MANUAL_REQUIRED | Must be closed or explicitly accepted.                                         |
| Deploy approval              | Engineering + business owner   | Production Worker deploy                      | MANUAL_REQUIRED | Out of scope for copy dry-run prep.                                            |
| Cutover approval             | Business owner                 | Production cutover                            | MANUAL_REQUIRED | Commercial launch remains NO-GO.                                               |

Approval flags used in COMMERCIAL-LAUNCH-REVIEW-003:

- `--confirm-production-d1-read`
- `--confirm-production-backup-export`
- `--confirm-create-production-copy-d1`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`

Still required for future migration/backfill dry-run on the copy:

- Exact SQL approval.
- Exact expected row counts.
- Rollback dry-run approval.
- Tenant mapping review.
- Accounting reconciliation review.
- TOP_25 money risk review.
- Confirmation that target remains `homelink-finance-production-copy-dryrun`.

Conclusion: production-copy creation/import was approved and completed. Future
migration/backfill/reconciliation dry-run still requires a new approval task.
