# Production Copy D1 Import Result

Date: 2026-05-27, Asia/Dubai

Scope: import approved production backup into isolated production-copy D1 only.
No SQL was executed against the source production D1.

## Preconditions

| Check                | Expected                                      | Actual                                  | Result |
| -------------------- | --------------------------------------------- | --------------------------------------- | ------ |
| Source backup path   | `./backups/production-before-copy-dryrun.sql` | exists, 498453 bytes                    | PASS   |
| Target copy D1 name  | homelink-finance-production-copy-dryrun       | homelink-finance-production-copy-dryrun | PASS   |
| Target copy D1 id    | c461c7f1-47bc-40cf-bbfd-1c03101943bd          | c461c7f1-47bc-40cf-bbfd-1c03101943bd    | PASS   |
| Target is production | no                                            | no                                      | PASS   |
| Production D1 write  | forbidden                                     | not executed                            | PASS   |

## Import Execution

| Step | Command                                                                                                                       | Target             | Result | Notes                                    |
| ---: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ | ---------------------------------------- |
|    1 | `npx wrangler d1 info homelink-finance-production-copy-dryrun`                                                                | production-copy D1 | PASS   | Confirmed empty copy before import.      |
|    2 | `npx wrangler d1 execute homelink-finance-production-copy-dryrun --remote --file ./backups/production-before-copy-dryrun.sql` | production-copy D1 | PASS   | Processed 603 queries against copy only. |
|    3 | `npx wrangler d1 info homelink-finance-production-copy-dryrun`                                                                | production-copy D1 | PASS   | Copy reports 19 tables and 393 kB.       |

Import summary:

- Total queries executed: 603.
- Rows read: 2750.
- Rows written: 2481.
- Target database: `homelink-finance-production-copy-dryrun`.
- Source production database write: no.

Conclusion: production backup was imported into the isolated production-copy D1.
This is not a production migration and does not change production data.
