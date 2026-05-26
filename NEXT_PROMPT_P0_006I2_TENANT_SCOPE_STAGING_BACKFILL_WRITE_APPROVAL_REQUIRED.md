# NEXT PROMPT: P0-006I2 Tenant Scope Staging Backfill Write Approval Required

Use this prompt only after compatibility schema has been applied to staging and
verified.

## Goal

Execute a reviewed staging-only tenant scope backfill write against
`homelink-finance-staging`.

## Preconditions

1. Compatibility schema applied to `homelink-finance-staging`.
2. Target D1 id confirmed as `4ff78bfc-3855-436b-aefb-6b492145d79c`.
3. Staging backup completed.
4. Rollback accepted.
5. Exact row-level mapping reviewed.
6. Legacy CORPID warnings reviewed and accepted for staging rehearsal only.
7. Production URL/D1 excluded.
8. `gate:commercial-launch` remains `PRODUCTION_NO_GO`.
9. Post-schema dry-run reviewed and accepted.

## Required Human Approval Flags

- `--confirm-staging-backfill-write`
- `--confirm-backup`
- `--confirm-rollback`
- `--confirm-legacy-corpid-warnings-reviewed`
- `--confirm-exact-mapping-reviewed`

## Strictly Forbidden

1. Production deploy.
2. Production migration.
3. Production D1 write.
4. Production URL call.
5. Production cutover.
6. Secret commit.
7. Unconditional full-table update.
8. Deleting legacy fields or tables.
9. P0-006 Verified.

## Required Evidence

1. Before/after row counts by table.
2. Exact primary keys updated.
3. Dashboard/history diff evidence.
4. Audit/log evidence where applicable.
5. Rollback verification.
6. Final dry-run QA result with no write confirmation flags.
7. Confirmation that `active_sessions` remains membership-derived and is not
   property-backfilled by guesswork.

## Expected End State

- Staging-only backfill write either passed or blocked with evidence.
- Production remains NO-GO.
- P0-006 remains Partial.
