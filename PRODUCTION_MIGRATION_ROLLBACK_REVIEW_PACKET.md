# Production Migration / Rollback Review Packet

Date: 2026-05-26, Asia/Dubai

Status: `MANUAL_REQUIRED`

Production cutover: `NO-GO`

This packet is a review artifact only. It does not create a production
migration, execute a production migration, deploy production, write production
D1, write staging D1, or execute rollback.

## Required Before Any Production Migration

1. Production D1 target must be confirmed by exact database name and id.
2. Production D1 backup is required before schema or data changes.
3. Production migration dry-run on a production copy is required.
4. Production rollback method is required and must be reviewed before write.
5. Exact row counts are required for every planned production data update.
6. Exact SQL/update plan is required for schema and row-level data changes.
7. No production write is allowed without explicit human approval.
8. Restore procedure must be documented before migration.
9. Verification after restore must be documented before migration.
10. A cutover freeze window is recommended before any production write.

## Production D1 Target Confirmation

| Requirement                                        | Status          |
| -------------------------------------------------- | --------------- |
| Production D1 name confirmed                       | MANUAL_REQUIRED |
| Production D1 id confirmed                         | MANUAL_REQUIRED |
| Staging/template/local targets explicitly excluded | MANUAL_REQUIRED |
| Operator confirms command targets                  | MANUAL_REQUIRED |

## Backup Requirements

| Requirement                            | Status          |
| -------------------------------------- | --------------- |
| Full D1 export before schema migration | MANUAL_REQUIRED |
| Backup path recorded                   | MANUAL_REQUIRED |
| Backup not committed to git            | REQUIRED        |
| Restore command reviewed               | MANUAL_REQUIRED |
| Backup integrity verified              | MANUAL_REQUIRED |

## Migration Dry-Run On Copy

The recommended next production-facing step is not direct production. It is a
production-copy dry-run with an approved backup/copy target.

| Step                             | Requirement                                                     | Status          |
| -------------------------------- | --------------------------------------------------------------- | --------------- |
| Create/confirm production copy   | Explicitly approved copy, not live production                   | MANUAL_REQUIRED |
| Apply schema migration to copy   | Reviewed SQL only                                               | MANUAL_REQUIRED |
| Apply row-level backfill to copy | Exact mapping and row counts only                               | MANUAL_REQUIRED |
| Run verification on copy         | Cross-tenant, dashboard/history, audit/event, accounting checks | MANUAL_REQUIRED |
| Document rollback on copy        | Restore or reverse-update proof                                 | MANUAL_REQUIRED |

## Rollback Method Requirements

| Rollback Method            | Required Evidence                                               |
| -------------------------- | --------------------------------------------------------------- |
| Restore from backup        | Backup path, restore command, restore verification queries      |
| Reverse updates            | Exact reverse SQL with `WHERE`, row counts, and affected fields |
| Feature flag rollback      | Disable auth/route/query/receivables/totals production switches |
| Legacy fallback            | Legacy CORPID fallback preserved during rollback                |
| Post-rollback verification | No cross-tenant leakage, dashboard unchanged, gate controlled   |

## Cutover Freeze Window Recommendation

Recommended freeze before any approved production write:

1. Pause non-emergency deploys.
2. Freeze schema changes outside the reviewed migration.
3. Export production D1 and verify backup integrity.
4. Confirm rollback operator and decision owner.
5. Run production-copy dry-run and compare row counts.
6. Require explicit GO from engineering, accounting, data owner, and business owner.

Conclusion: production migration and rollback are not approved. The only safe
next production-facing route is an approved production-copy dry-run.
