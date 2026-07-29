# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-002 Production Dry-Run On Copy

Enter TASK COMMERCIAL-LAUNCH-REVIEW-002: Production dry-run on copy, approval
required.

Prerequisite:

- COMMERCIAL-LAUNCH-REVIEW-001 completed.
- Commercial launch remains `PRODUCTION_NO_GO`.
- Human approval must explicitly identify the production copy target.

Strictly forbidden:

1. No direct production write.
2. No production deploy.
3. No production migration on live production.
4. No production D1 write.
5. No production URL call.
6. No production feature flag enablement.
7. No production cutover.
8. No secret commit.

Allowed only with explicit approval:

1. Confirm production copy target.
2. Backup first.
3. Run schema/backfill dry-run on production copy only.
4. Generate exact row counts.
5. Generate rollback plan.
6. Verify restore or reverse-update plan on copy.
7. Keep commercial launch gate `PRODUCTION_NO_GO`.

Required outputs:

- `PRODUCTION_COPY_DRY_RUN_TARGET_CONFIRMATION.md`
- `PRODUCTION_COPY_BACKUP_RESULT.md`
- `PRODUCTION_COPY_MIGRATION_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_BACKFILL_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_ROLLBACK_REHEARSAL_RESULT.md`
- `PRODUCTION_COPY_VERIFICATION_SUMMARY.md`

Completion rule:

- Stop after copy dry-run evidence.
- Do not enter production cutover.
