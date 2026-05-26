# NEXT PROMPT: P0-006I1 Apply Staging Compatibility Schema

Use this prompt only after explicit human approval.

## Goal

Apply the tenant-scope nullable compatibility-column schema migration to
staging only.

## Required Human Approval

The operator must explicitly approve:

- `--confirm-staging-compatibility-schema`
- `--confirm-backup`
- `--confirm-rollback`
- target D1 name: `homelink-finance-staging`
- target D1 id: `4ff78bfc-3855-436b-aefb-6b492145d79c`

## Strictly Forbidden

1. Production deploy.
2. Production migration.
3. Remote production D1 migration.
4. Production D1 write.
5. Production URL call.
6. Production cutover.
7. Data backfill write.
8. Legacy `CORPID` removal.
9. Secret commit.
10. P0-006 Verified.

## Required Steps

1. Confirm current branch and clean worktree.
2. Confirm target D1 name/id with a read-only command.
3. Export staging backup before migration.
4. Confirm backup file is ignored by Git.
5. Review `migration-drafts/tenant_scope_staging_compatibility_columns_draft.sql`.
6. Promote or apply the reviewed staging-only schema migration to
   `homelink-finance-staging`.
7. Do not run data backfill.
8. Verify staging schema with read-only `sqlite_schema` SELECT.
9. Run `npm run check`.
10. Run `npm run qa:employee-entry-staging` without write confirmation flags.
11. Run `npm run gate:commercial-launch` and confirm `PRODUCTION_NO_GO`.
12. Update reports without marking P0-006 Verified.

## Expected End State

- Staging compatibility columns applied.
- No data backfill executed.
- Production untouched.
- P0-006 remains Partial.
- Next step may be a separate P0-006I2 backfill approval task.
