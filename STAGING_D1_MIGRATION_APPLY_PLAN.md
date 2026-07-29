# Staging D1 Migration Apply Plan

Generated: 2026-05-25

This file contains command drafts only. No command in this plan was executed.

## Preconditions

1. Staging D1 confirmed: `homelink-finance-staging`.
2. Staging D1 id confirmed: `4ff78bfc-3855-436b-aefb-6b492145d79c`.
3. Staging D1 backup completed and evidence recorded.
4. Rollback method confirmed.
5. Production DB excluded.
6. Migration list reviewed.
7. No production migration.
8. No remote production D1 execute.
9. Human approval granted.

## Commands Draft

The project currently uses SQL files directly for local bootstrap, not a Wrangler migrations directory. For staging, the likely controlled commands are D1 execute with `--file`; they write schema and therefore are not safe to run now.

| Command Draft                                                                                                                                                                 | SAFE_TO_RUN_NOW | NEEDS_HUMAN_APPROVAL | WRITES_SCHEMA | WRITES_DATA | PRODUCTION_FORBIDDEN | Notes                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------: | ------------: | ----------: | -------------------: | -------------------------------------------------------------------------------------- |
| `npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/001_clean_legacy_bootstrap.sql`                                                            | no              |                  yes |           yes |          no |                  yes | Creates minimum legacy-compatible app schema.                                          |
| `npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/002_handover_atomic_staging.sql`                                                           | no              |                  yes |           yes |          no |                  yes | Creates staging handover atomic tables.                                                |
| `npx wrangler d1 execute homelink-finance-staging --remote --command "SELECT name, type, sql FROM sqlite_schema WHERE type IN ('table','index','view') ORDER BY type, name;"` | no in this plan |                  yes |            no |          no |                  yes | Post-migration schema verification; SELECT only.                                       |
| `npx wrangler d1 migrations apply homelink-finance-staging --remote`                                                                                                          | no              |                  yes |           yes |       maybe |                  yes | Not the current repo's active migration flow unless migrations are converted/reviewed. |

Do not run draft migrations in `migration-drafts/` as part of initial staging bootstrap.
