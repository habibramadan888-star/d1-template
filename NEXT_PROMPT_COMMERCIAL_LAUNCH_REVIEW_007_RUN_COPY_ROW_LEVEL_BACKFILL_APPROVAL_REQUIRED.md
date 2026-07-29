# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-007 Run Copy Row-Level Backfill Approval Required

Use this prompt only after reviewing:

- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_APPROVAL_PACKET.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_MAPPING_MATRIX.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_SQL_APPROVAL_REQUIREMENTS.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_GO_NO_GO.md`

## Required Human Approval

The user must explicitly approve all of these flags:

- `--confirm-copy-row-backfill`
- `--confirm-copy-d1-target`
- `--confirm-copy-backup`
- `--confirm-row-counts-reviewed`
- `--confirm-money-conversion-reviewed`
- `--confirm-top25-money-risks-reviewed`
- `--confirm-tenant-mapping-reviewed`
- `--confirm-receivables-mapping-reviewed`
- `--confirm-audit-event-scope-reviewed`
- `--confirm-rollback-reviewed`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`
- `--confirm-no-production-cutover`

## Allowed Target

Only:

`homelink-finance-production-copy-dryrun`

## Forbidden Targets

- `homelink`
- `homelink-finance-staging`
- `d1-template-database`
- Any production D1
- Any staging D1
- Any non-copy D1

## Required Work

1. Confirm copy D1 target.
2. Export fresh copy backup.
3. Review exact row-level SQL file.
4. Execute only approved copy row-level dry-run SQL.
5. Capture before/after counts.
6. Run money, tenant scope, receivables, backend totals, and audit/event reconciliation.
7. Do not execute production deploy.
8. Do not execute production migration.
9. Do not write production D1.
10. Keep commercial launch gate as `PRODUCTION_NO_GO`.

## Required Output

- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_EXECUTION_RESULT.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_AFTER_SNAPSHOT.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_RECONCILIATION_RESULT.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_ROLLBACK_REVIEW.md`
- `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_COMMERCIAL_GATE_RESULT.md`

Production cutover must remain `PRODUCTION_NO_GO`.
