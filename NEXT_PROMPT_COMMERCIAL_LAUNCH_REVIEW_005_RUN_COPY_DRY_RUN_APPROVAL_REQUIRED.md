# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-005 Run Production-Copy Dry-Run Approval Required

Use this prompt only after human approval.

Target D1 must be exactly:

- `homelink-finance-production-copy-dryrun`
- `c461c7f1-47bc-40cf-bbfd-1c03101943bd`

Required approval flags:

- `--confirm-production-copy-dry-run`
- `--confirm-copy-d1-target`
- `--confirm-copy-backup`
- `--confirm-sql-reviewed`
- `--confirm-rollback-reviewed`
- `--confirm-money-reconciliation-reviewed`
- `--confirm-tenant-mapping-reviewed`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`
- `--confirm-no-production-cutover`

Strictly forbidden:

1. Production D1 write.
2. Production migration.
3. Production deploy.
4. Production cutover.
5. Production feature flag enablement.
6. Running any SQL against `homelink`.
7. Running any SQL against `homelink-finance-staging`.
8. Committing backups or secrets.
9. Printing password / token / cookie values.

Allowed after approval:

1. Export pre-dry-run backup of production-copy D1.
2. Execute reviewed schema SQL against production-copy D1 only.
3. Execute reviewed backfill SQL against production-copy D1 only.
4. Run reconciliation against production-copy D1 only.
5. Run rollback rehearsal against production-copy D1 only.
6. Generate final copy dry-run decision report.

Required outputs:

- `PRODUCTION_COPY_PRE_DRY_RUN_SNAPSHOT.md`
- `PRODUCTION_COPY_SCHEMA_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_BACKFILL_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_RECONCILIATION_RESULT.md`
- `PRODUCTION_COPY_ROLLBACK_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_DRY_RUN_FINAL_DECISION.md`

Completion rule:

- Commercial launch must remain `PRODUCTION_NO_GO`.
- P0-001, P0-002, P0-003, P0-006, and P0-008 must remain Partial unless a
  separate production verification task explicitly changes them.
- Stop immediately if any target is not the production-copy D1.
