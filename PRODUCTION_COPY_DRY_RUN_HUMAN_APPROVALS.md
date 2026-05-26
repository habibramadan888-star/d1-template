# Production Copy Dry-Run Human Approvals

Date: 2026-05-26, Asia/Dubai

Status: `MANUAL_REQUIRED`

| Approval Item                | Owner                          | Required Before                               | Current Status  | Notes                                                        |
| ---------------------------- | ------------------------------ | --------------------------------------------- | --------------- | ------------------------------------------------------------ |
| Production D1 identification | Engineering / operations owner | Any production discovery/export/import        | MANUAL_REQUIRED | Must include exact name and id.                              |
| Production backup            | Engineering / operations owner | Creating or importing production copy         | MANUAL_REQUIRED | Backup path must be outside git.                             |
| Production copy creation     | Engineering / operations owner | Any copy dry-run                              | MANUAL_REQUIRED | Recommended name: `homelink-finance-production-copy-dryrun`. |
| Backup storage               | Engineering / operations owner | Backup command execution                      | MANUAL_REQUIRED | Retention and access policy required.                        |
| Migration dry-run            | Engineering + data owner       | Applying SQL to production copy               | MANUAL_REQUIRED | Copy only, not live production.                              |
| Backfill dry-run             | Engineering + data owner       | Applying row-level updates to production copy | MANUAL_REQUIRED | Exact mapping and row counts required.                       |
| Rollback dry-run             | Engineering / operations owner | Any cutover consideration                     | MANUAL_REQUIRED | Restore or reverse-update rehearsal required.                |
| Tenant mapping               | Business owner + engineering   | Tenant/property backfill dry-run              | MANUAL_REQUIRED | Mapping cannot rely on legacy CORPID as final authority.     |
| Accounting reconciliation    | Accounting owner               | Money/receivables/totals dry-run              | MANUAL_REQUIRED | Includes P0-001 and P0-008 review.                           |
| TOP_25 money risks           | Accounting + engineering       | Any production money migration                | MANUAL_REQUIRED | Must be closed or explicitly accepted.                       |
| Deploy approval              | Engineering + business owner   | Production Worker deploy                      | MANUAL_REQUIRED | Out of scope for copy dry-run prep.                          |
| Cutover approval             | Business owner                 | Production cutover                            | MANUAL_REQUIRED | Commercial launch remains NO-GO.                             |

Required future approval flags for a copy dry-run task:

- `--confirm-production-d1-name-id`
- `--confirm-production-backup-path`
- `--confirm-create-production-copy-d1`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`
- `--confirm-no-production-cutover`

Conclusion: no human approval has been granted in this task. The next step
must request explicit approval before any Cloudflare/D1 operation.
