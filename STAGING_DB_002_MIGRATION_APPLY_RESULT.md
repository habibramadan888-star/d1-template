# STAGING-DB-002 Migration Apply Result

Date: 2026-05-25, Asia/Dubai

Scope: apply schema-only bootstrap SQL to `homelink-finance-staging`.

| Step | Command                                                                                                                            | Result           | Notes                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| 1    | `npx wrangler d1 info homelink-finance-staging`                                                                                    | PASS             | Target id matched `4ff78bfc-3855-436b-aefb-6b492145d79c`.                                   |
| 2    | `npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-schema-bootstrap.sql` | PASS             | Backup file created under ignored `backups/`; not committed.                                |
| 3    | `npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/001_clean_legacy_bootstrap.sql`                 | PASS             | 23 schema queries processed; D1 reported `num_tables=10`.                                   |
| 4    | `npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/002_handover_atomic_staging.sql`                | PASS             | 9 schema queries processed; D1 reported `num_tables=14`.                                    |
| 5    | `SELECT name, type, sql FROM sqlite_schema ...`                                                                                    | PASS             | Core and handover staging schema objects are present; `changed_db=false`, `rows_written=0`. |
| 6    | `npm run qa:employee-entry-staging`                                                                                                | PASS for dry-run | Result remains `MANUAL_REQUIRED`; write execution remains `DRY_RUN_ONLY`.                   |

Business data write status:

- No `INSERT`, `UPDATE`, or `DELETE` business-data SQL was executed.
- No test accounts were created.
- No feature flags were enabled.
- No real staging write QA was executed.

Note: Wrangler import metadata reports rows written while creating schema objects and SQLite metadata. This is schema bootstrap activity only, not business test data insertion.
