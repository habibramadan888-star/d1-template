# P0-006I1 Backup Result

Date: 2026-05-26, Asia/Dubai

Backup command:

```powershell
npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-tenant-scope-compatibility-schema.sql
```

| Item                  | Result                                                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| Database              | `homelink-finance-staging`                                                        |
| Database id           | `4ff78bfc-3855-436b-aefb-6b492145d79c`                                            |
| Output path           | `./backups/homelink-finance-staging-before-tenant-scope-compatibility-schema.sql` |
| Timestamp             | 2026-05-26, Asia/Dubai                                                            |
| File exists           | yes                                                                               |
| File committed to Git | no                                                                                |
| `.gitignore` coverage | `backups/`                                                                        |
| Production touched    | no                                                                                |

Notes:

- The backup file is intentionally ignored and must not be committed.
- The temporary export download URL emitted by Wrangler was not copied into
  reports.
- This task used the backup only as a rollback prerequisite before schema
  migration.
