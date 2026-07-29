# Production Copy Dry-Run Rollback Plan

Date: 2026-05-27, Asia/Dubai

Status: `ROLLBACK_APPROVAL_REQUIRED`

Target: `homelink-finance-production-copy-dryrun`

This rollback plan applies only to future production-copy dry-run work. It is
not a production rollback and does not authorize production migration.

## Rollback Options

| Option                               | Method                                                   | Target               | When To Use                                    | Risk                             | Approval |
| ------------------------------------ | -------------------------------------------------------- | -------------------- | ---------------------------------------------- | -------------------------------- | -------- |
| Restore copy from pre-dry-run export | Recreate/import copy from copy backup                    | production-copy only | schema/backfill dry-run changes are broad      | copy downtime / time cost        | required |
| Reverse SQL                          | Execute reviewed reverse updates                         | production-copy only | small scoped backfill changes with exact WHERE | incomplete reverse mapping       | required |
| Destroy and recreate copy            | Delete copy and recreate from original production export | production-copy only | copy is polluted or rollback is uncertain      | D1 delete is destructive to copy | required |

## Required Pre-Dry-Run Backup

Before any future copy SQL execution:

```powershell
npx wrangler d1 export homelink-finance-production-copy-dryrun --remote --output ./backups/production-copy-before-dryrun-sql.sql
```

This command is a draft and was not executed in COMMERCIAL-LAUNCH-REVIEW-004.

## Rollback Verification

After rollback, verify:

- Table list matches pre-dry-run snapshot.
- Key row counts match pre-dry-run snapshot.
- Money reconciliation returns to pre-dry-run baseline.
- Tenant/property scoped row counts return to baseline.
- Receivables/handover draft tables are absent or restored according to the
  approved rollback method.
- Commercial launch gate remains `PRODUCTION_NO_GO`.

## Production Safety

- Do not restore into `homelink`.
- Do not import into `homelink`.
- Do not run production D1 execute.
- Do not deploy Worker.
- Do not enable production feature flags.

Conclusion: rollback must be proven on the copy before any production migration
approval can be considered.
