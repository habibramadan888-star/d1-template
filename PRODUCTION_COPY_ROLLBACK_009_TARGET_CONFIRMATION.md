# Production Copy Rollback 009 Target Confirmation

Date: 2026-05-27, Asia/Dubai

Command:

`npx wrangler d1 info homelink-finance-production-copy-dryrun`

| Item                    | Expected                                  | Actual                                    | Result |
| ----------------------- | ----------------------------------------- | ----------------------------------------- | ------ |
| Target D1               | `homelink-finance-production-copy-dryrun` | `homelink-finance-production-copy-dryrun` | PASS   |
| Target D1 id            | isolated production-copy D1 id            | `c461c7f1-47bc-40cf-bbfd-1c03101943bd`    | PASS   |
| Is original production? | no                                        | no, original production is `homelink`     | PASS   |
| Is staging?             | no                                        | no, staging is `homelink-finance-staging` | PASS   |
| Is isolated copy?       | yes                                       | yes                                       | PASS   |

Wrangler reported 27 tables, APAC region, and database size 573 kB.

Safety result:

- Production D1 `homelink` was not targeted.
- Staging D1 `homelink-finance-staging` was not targeted.
- No production deploy, migration, or cutover was executed.
