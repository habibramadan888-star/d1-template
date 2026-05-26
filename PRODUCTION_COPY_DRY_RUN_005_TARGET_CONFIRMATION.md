# Production Copy Dry-Run 005 Target Confirmation

Date: 2026-05-27, Asia/Dubai

Scope: read-only target confirmation before running migration/backfill/reconciliation dry-run on the isolated production-copy D1.

| Item                    | Expected                                  | Actual                                                        | Result |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------- | ------ |
| Target D1               | `homelink-finance-production-copy-dryrun` | `homelink-finance-production-copy-dryrun`                     | PASS   |
| Target D1 id            | `c461c7f1-47bc-40cf-bbfd-1c03101943bd`    | `c461c7f1-47bc-40cf-bbfd-1c03101943bd`                        | PASS   |
| Is production original? | no                                        | no; original production D1 is `homelink` and was not targeted | PASS   |
| Is staging?             | no                                        | no                                                            | PASS   |
| Is isolated copy?       | yes                                       | yes                                                           | PASS   |

Command executed:

```powershell
npx wrangler d1 info homelink-finance-production-copy-dryrun
```

Notes:

- No production D1 write was executed.
- No production migration was executed.
- No production deploy was executed.
- All subsequent dry-run commands in this task target only `homelink-finance-production-copy-dryrun`.
