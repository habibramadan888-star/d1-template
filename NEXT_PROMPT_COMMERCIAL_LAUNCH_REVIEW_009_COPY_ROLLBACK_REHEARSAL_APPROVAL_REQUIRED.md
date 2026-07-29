# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-009 Copy Rollback Rehearsal Approval Required

Use only after COMMERCIAL-LAUNCH-REVIEW-008 confirms manual reconciliation
review is complete and production remains `PRODUCTION_NO_GO`.

Goal:

Run rollback rehearsal on the isolated production-copy D1 only.

Target D1:

`homelink-finance-production-copy-dryrun`

Required human approvals:

- `--confirm-copy-rollback-rehearsal`
- `--confirm-copy-d1-target`
- `--confirm-copy-backup-available`
- `--confirm-restore-or-reverse-update-reviewed`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`
- `--confirm-no-production-cutover`

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No production D1 write.
4. No production cutover.
5. No staging D1 write.
6. No secret commit.
7. Do not mark commercial launch GO.
8. Do not mark Partial P0 items Verified.

Required outputs:

1. `PRODUCTION_COPY_ROLLBACK_009_TARGET_CONFIRMATION.md`
2. `PRODUCTION_COPY_ROLLBACK_009_PLAN_REVIEW.md`
3. `PRODUCTION_COPY_ROLLBACK_009_EXECUTION_RESULT.md`
4. `PRODUCTION_COPY_ROLLBACK_009_AFTER_SNAPSHOT.md`
5. `PRODUCTION_COPY_ROLLBACK_009_COMMERCIAL_LAUNCH_GATE_RESULT.md`
6. Next prompt for receivables copy dry-run or remediation.

Commercial launch gate must remain `PRODUCTION_NO_GO`.
