# Production D1 Export Backup Result

Date: 2026-05-27, Asia/Dubai

Scope: approved production D1 read/export backup only. No production D1 write,
production migration, production backfill, production deploy, or production
cutover occurred.

## Backup Command

```powershell
npx wrangler d1 export homelink --remote --output ./backups/production-before-copy-dryrun.sql
```

Wrangler produced a temporary signed download URL during export. That URL is not
recorded in this repository or this evidence file.

## Result

| Item                  | Value                                                                           | Result |
| --------------------- | ------------------------------------------------------------------------------- | ------ |
| Source D1 name        | homelink                                                                        | PASS   |
| Source D1 id          | 562aa079-1cca-4176-ba3b-7276a65f98fb                                            | PASS   |
| Output path           | `./backups/production-before-copy-dryrun.sql`                                   | PASS   |
| Local absolute path   | `C:\Users\Chinalink\Desktop\软件迭代\backups\production-before-copy-dryrun.sql` | PASS   |
| File exists           | yes                                                                             | PASS   |
| File size             | 498453 bytes                                                                    | PASS   |
| `backups/` gitignored | yes                                                                             | PASS   |
| Backup committed      | no                                                                              | PASS   |
| Production write      | no                                                                              | PASS   |

Conclusion: production D1 export backup completed. The backup file is ignored
and must not be committed.
