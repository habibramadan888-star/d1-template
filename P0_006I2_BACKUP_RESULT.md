# P0-006I2 Backup Result

Date: 2026-05-26, Asia/Dubai

Command executed:

```powershell
npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-tenant-scope-backfill.sql
```

| Item             | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Database         | `homelink-finance-staging`                                            |
| Database id      | `4ff78bfc-3855-436b-aefb-6b492145d79c`                                |
| Output path      | `./backups/homelink-finance-staging-before-tenant-scope-backfill.sql` |
| File exists      | yes                                                                   |
| Committed to Git | no                                                                    |
| Ignored by Git   | yes, `backups/`                                                       |

Safety:

- Backup completed before staging backfill write.
- Backup file is local and ignored.
- No production D1 backup or export was executed.
- No temporary signed export URL is recorded in this report.
