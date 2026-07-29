# Production Copy Row Backfill 007 Backup Result

Date: 2026-05-27, Asia/Dubai

Backup target: `homelink-finance-production-copy-dryrun`

Production original D1: `homelink` was not targeted.

| Item                  | Value                                                                                  | Result |
| --------------------- | -------------------------------------------------------------------------------------- | ------ |
| Backup command        | `npx wrangler d1 export homelink-finance-production-copy-dryrun --remote --output ...` | PASS   |
| Target D1             | `homelink-finance-production-copy-dryrun`                                              | PASS   |
| Target D1 id          | `c461c7f1-47bc-40cf-bbfd-1c03101943bd`                                                 | PASS   |
| Output path           | `./backups/production-copy-before-row-level-backfill-dryrun.sql`                       | PASS   |
| Backup file exists    | yes                                                                                    | PASS   |
| Backup committed      | no; `backups/` is ignored                                                              | PASS   |
| Production touched    | no                                                                                     | PASS   |
| Staging touched       | no                                                                                     | PASS   |
| Production-copy write | backup/export only at this step                                                        | PASS   |

Do not commit the backup file.
