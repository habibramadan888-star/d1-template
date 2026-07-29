# Staging D1 Backup Before Migration Plan

Generated: 2026-05-25

This is a plan only. Backup was not executed and no backup file was created.

## Backup Command Draft

```powershell
npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-migration.sql
```

## Expected Output Path

`./backups/homelink-finance-staging-before-migration.sql`

`backups/` is ignored by Git. Do not commit backup files because they may contain staging data.

## Confirmation Checklist

| Check                                                  | Required | Status          |
| ------------------------------------------------------ | -------: | --------------- |
| Target DB name is `homelink-finance-staging`           |      Yes | MANUAL_REQUIRED |
| Target DB id is `4ff78bfc-3855-436b-aefb-6b492145d79c` |      Yes | MANUAL_REQUIRED |
| Backup command completed                               |      Yes | MANUAL_REQUIRED |
| Backup file stored outside Git                         |      Yes | MANUAL_REQUIRED |
| Operator recorded                                      |      Yes | MANUAL_REQUIRED |
| Timestamp recorded                                     |      Yes | MANUAL_REQUIRED |
| Restore/rollback method reviewed                       |      Yes | MANUAL_REQUIRED |

## Where Not To Store Backup

- Do not store backup files in Git.
- Do not attach backup files to public tickets.
- Do not paste backup contents into Markdown.
- Do not upload backup files to non-approved storage.

## Restore / Rollback Concept

1. Disable staging feature flags.
2. Restore the previous Worker version if needed.
3. Restore D1 from the approved backup if schema/data rollback is required.
4. Run schema SELECT verification.
5. Run `npm run qa:employee-entry-staging` without write confirmations.

Production restore/rollback is out of scope and forbidden for this task.
