# STAGING-DB-002 Migration Execution Method

Date: 2026-05-25, Asia/Dubai

Final method: controlled staging schema apply using Wrangler D1 execute with explicit target database and reviewed schema files.

Reason:

- The required files live under `migrations/local/`.
- They are active local/staging bootstrap SQL files, not a Wrangler migrations registry sequence.
- Applying them with `wrangler d1 migrations apply` would not clearly target only these two reviewed files.
- `wrangler d1 execute --file` allows exact target database and exact file control.

Execution commands:

```powershell
npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/001_clean_legacy_bootstrap.sql
npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/002_handover_atomic_staging.sql
```

Safety gates satisfied before execution:

| Gate                        | Result          | Evidence                                                                                       |
| --------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| Target D1 name/id confirmed | PASS            | `STAGING_DB_002_TARGET_CONFIRMATION.md`                                                        |
| Backup completed            | PASS            | `STAGING_DB_002_BACKUP_RESULT.md`                                                              |
| SQL review passed           | PASS            | `STAGING_DB_002_MIGRATION_SQL_REVIEW.md`                                                       |
| Production excluded         | PASS            | target is `homelink-finance-staging`; no command targeted `homelink` or `d1-template-database` |
| Commercial launch gate      | PASS for safety | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`                                                 |

Decision: controlled staging schema apply was selected and executed.
