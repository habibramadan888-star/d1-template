# Staging Backup Rollback Procedure

Generated: 2026-05-25

This task did not execute backup, restore, migration, D1 execute, or staging write QA. The procedure below is for a future human-approved write QA task.

## Backup Before Write QA

Recommended command:

```powershell
npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-qa.sql
```

The `backups/` directory is ignored by Git in this branch because exported D1 files can contain real staging data.

Backup evidence template:

| Field              | Value                      |
| ------------------ | -------------------------- |
| Command            | MANUAL_REQUIRED            |
| Database           | `homelink-finance-staging` |
| Output file        | MANUAL_REQUIRED            |
| Timestamp          | MANUAL_REQUIRED            |
| Operator           | MANUAL_REQUIRED            |
| Stored outside Git | MANUAL_REQUIRED            |

## Rollback Method

1. Disable staging feature flags:
   - `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=false`
   - `ENABLE_HANDOVER_ATOMIC_STAGING=false`
2. Verify legacy behavior in staging.
3. If D1 restore is needed, restore from the approved backup using the Cloudflare D1 restore/import procedure.
4. If Worker rollback is needed, redeploy the previous known-good staging version.
5. Rerun staging smoke/dry-run validation before any further write QA.

Rollback evidence template:

| Field                           | Value           |
| ------------------------------- | --------------- |
| Disable feature flag evidence   | MANUAL_REQUIRED |
| Restore Worker version evidence | MANUAL_REQUIRED |
| Restore D1 backup evidence      | MANUAL_REQUIRED |
| Verification command            | MANUAL_REQUIRED |
| Operator                        | MANUAL_REQUIRED |

Status: procedure documented, not exercised.
