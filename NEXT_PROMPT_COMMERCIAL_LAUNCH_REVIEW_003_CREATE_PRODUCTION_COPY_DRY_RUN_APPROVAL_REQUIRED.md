# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-003 Create Production Copy Dry-Run

Enter TASK COMMERCIAL-LAUNCH-REVIEW-003: Create production copy dry-run,
approval required.

Prerequisite:

- COMMERCIAL-LAUNCH-REVIEW-002 completed.
- Production cutover remains `PRODUCTION_NO_GO`.
- Human approval must explicitly confirm production D1 name/id and backup path.

Required explicit approvals:

1. `--confirm-production-d1-name-id`
2. `--confirm-production-backup-path`
3. `--confirm-create-production-copy-d1`
4. `--confirm-no-production-write`
5. `--confirm-no-production-deploy`
6. `--confirm-no-production-migration`
7. `--confirm-no-production-cutover`

Strictly forbidden:

1. No direct production write.
2. No production deploy.
3. No live production migration.
4. No production cutover.
5. No production feature flag enablement.
6. No secret commit.
7. No password/token/cookie printing.

Allowed only after approvals:

1. Confirm production D1 name/id.
2. Confirm backup path.
3. Execute approved production backup/export.
4. Create isolated production-copy D1.
5. Restore/import backup into production-copy D1.
6. Verify copy isolation.
7. Keep commercial launch gate `PRODUCTION_NO_GO`.

Required outputs:

- `PRODUCTION_COPY_DRY_RUN_TARGET_CONFIRMATION.md`
- `PRODUCTION_COPY_BACKUP_RESULT.md`
- `PRODUCTION_COPY_CREATE_RESULT.md`
- `PRODUCTION_COPY_IMPORT_RESULT.md`
- `PRODUCTION_COPY_ISOLATION_VERIFICATION.md`
- `PRODUCTION_COPY_DRY_RUN_NEXT_STEPS.md`

Stop after copy creation/import verification. Do not run migration/backfill
unless a separate approval task explicitly authorizes it.
