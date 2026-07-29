# STAGING-DB-002 Backup Result

Date: 2026-05-25, Asia/Dubai

Scope: staging D1 export before schema bootstrap. This task did not execute production export, production migration, staging deploy, or business data write.

| Field                        | Value                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Backup command               | `npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-schema-bootstrap.sql` |
| Database name                | `homelink-finance-staging`                                                                                                         |
| Database id                  | `4ff78bfc-3855-436b-aefb-6b492145d79c`                                                                                             |
| Output path                  | `./backups/homelink-finance-staging-before-schema-bootstrap.sql`                                                                   |
| Timestamp                    | 2026-05-25T13:39:15+04:00                                                                                                          |
| File exists                  | yes                                                                                                                                |
| File committed to git        | no; `backups/` is ignored                                                                                                          |
| File size                    | 32 bytes                                                                                                                           |
| Production touched           | no                                                                                                                                 |
| Signed download URL recorded | no; omitted intentionally                                                                                                          |

`.gitignore` was hardened for backup artifacts:

- `backups/`
- `*.sqlite`
- `*.sqlite3`
- `*.db`
- `*.sql.backup`
- `homelink-finance-staging-before-*.sql`

Backup result: PASS.
