# P0-006Q2 Backup Result

Date: 2026-05-26, Asia/Dubai

| Item               | Result                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Command            | `npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-audit-event-evidence.sql` |
| Database           | `homelink-finance-staging`                                                                                                             |
| Database id        | `4ff78bfc-3855-436b-aefb-6b492145d79c`                                                                                                 |
| Output path        | `./backups/homelink-finance-staging-before-audit-event-evidence.sql`                                                                   |
| Timestamp          | 2026-05-26T15:40Z                                                                                                                      |
| File exists        | yes                                                                                                                                    |
| `backups/` ignored | yes                                                                                                                                    |
| Committed to git   | no                                                                                                                                     |

Safety notes:

- Backup was taken before staging-only audit/event evidence write.
- Backup file is intentionally ignored and must not be committed.
- No production D1 backup/export was executed.
- No production D1 write was executed.
