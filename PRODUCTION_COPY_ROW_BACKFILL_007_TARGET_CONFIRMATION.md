# Production Copy Row Backfill 007 Target Confirmation

Date: 2026-05-27, Asia/Dubai

Command:

`npx wrangler d1 info homelink-finance-production-copy-dryrun`

| Item                    | Expected                                  | Actual                                    | Result |
| ----------------------- | ----------------------------------------- | ----------------------------------------- | ------ |
| Target D1               | `homelink-finance-production-copy-dryrun` | `homelink-finance-production-copy-dryrun` | PASS   |
| Target D1 id            | `c461c7f1-47bc-40cf-bbfd-1c03101943bd`    | `c461c7f1-47bc-40cf-bbfd-1c03101943bd`    | PASS   |
| Is original production? | no                                        | no; original production is `homelink`     | PASS   |
| Is staging?             | no                                        | no; staging is `homelink-finance-staging` | PASS   |
| Is isolated copy?       | yes                                       | yes                                       | PASS   |

Note: the first `d1 info` call returned a transient Cloudflare API authentication
error. `d1 list` and a retry of `d1 info` succeeded before any backup or write.

Safety result: target confirmed as isolated production-copy D1 only.
