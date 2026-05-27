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

## REVIEW-007 Approval Update

Approved flags supplied for COMMERCIAL-LAUNCH-REVIEW-007:

- `--confirm-copy-row-level-backfill`
- `--confirm-copy-d1-target`
- `--confirm-no-production-write`
- `--confirm-backup`
- `--confirm-rollback-review`
- `--confirm-money-mapping-reviewed`
- `--confirm-tenant-mapping-reviewed`
- `--confirm-receivables-mapping-reviewed`
- `--confirm-audit-event-mapping-reviewed`

Execution result:

- Copy-only money and compatibility scope backfill executed.
- Receivables row creation/allocation remains manual-required and was not
  executed.
- Rollback execution remains manual-required.
- Production approval, production migration, production D1 write, production
  deploy, and production cutover remain not approved.

## REVIEW-008 Approval Update

REVIEW-008 was documentation-only manual reconciliation review. No new D1
approval was consumed and no D1 command was executed.

Updated status:

- Accounting reconciliation: MANUAL_REQUIRED.
- TOP_25 money risks: MANUAL_REQUIRED.
- Tenant mapping: COMPATIBILITY_ONLY / MANUAL_REQUIRED for production SaaS authority.
- Receivables mapping: MANUAL_REQUIRED.
- Rollback dry-run: APPROVAL_REQUIRED.
- Production deploy approval: MANUAL_REQUIRED.
- Cutover approval: MANUAL_REQUIRED.

Next approval task:

- `NEXT_PROMPT_COMMERCIAL_LAUNCH_REVIEW_009_COPY_ROLLBACK_REHEARSAL_APPROVAL_REQUIRED.md`

## REVIEW-009 Approval Update

Approval flags supplied for COMMERCIAL-LAUNCH-REVIEW-009:

- `--confirm-copy-rollback-rehearsal`
- `--confirm-copy-d1-target`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`
- `--confirm-backup-available`
- `--confirm-rollback-review`

Execution result:

- Copy-only rollback rehearsal executed.
- Production D1 write, production migration, production deploy, and production
  cutover remain not approved.
- Final production approval packet remains documentation-only unless a later
  task provides explicit production approval.

## REVIEW-010 Approval Update

REVIEW-010 was documentation-only final production approval packet preparation.
No D1 approval was consumed and no D1 command was executed.

Updated approval status:

- Final production approval checklist: ready for signoff review.
- Production migration/backfill owner signoff: required.
- Production backup/restore approval: required.
- Accounting and TOP_25 money risk signoff: required.
- Tenant/property final mapping signoff: required.
- Receivables lifecycle/allocation signoff: required.
- Audit/event visibility policy signoff: required.
- Production deploy and cutover approval: required.

Next approval task:

- `NEXT_PROMPT_COMMERCIAL_LAUNCH_REVIEW_011_PRODUCTION_APPROVAL_SIGNOFF_REQUIRED.md`

## REVIEW-011 Approval Tracking Update

REVIEW-011 created the human signoff tracker and approval workflow.

Current signoff state:

- Total tracked signoffs: 20.
- Approved production signoffs: 0.
- Missing production-blocking signoffs: 20.
- Owner assignments: `MANUAL_REQUIRED`.
- Production deploy, migration, D1 write, feature flags, and cutover remain not
  approved.

Next approval task:

- `NEXT_PROMPT_COMMERCIAL_LAUNCH_REVIEW_012_UPDATE_SIGNOFF_STATUS.md`
