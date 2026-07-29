# Production Copy D1 Creation Result

Date: 2026-05-27, Asia/Dubai

Scope: isolated production-copy D1 creation only. The copy is for future dry-run
work and must not be bound to production Worker or served publicly.

## Creation Command

```powershell
npx wrangler d1 create homelink-finance-production-copy-dryrun
```

## Result

| Item                       | Value                                   | Result |
| -------------------------- | --------------------------------------- | ------ |
| Copy database name         | homelink-finance-production-copy-dryrun | PASS   |
| Copy database id           | c461c7f1-47bc-40cf-bbfd-1c03101943bd    | PASS   |
| Region                     | APAC                                    | PASS   |
| Production touched         | no production write                     | PASS   |
| Bound to production Worker | no config change / no binding added     | PASS   |
| Public serving             | no Worker binding / no public serving   | PASS   |
| Production deploy          | not executed                            | PASS   |
| Production migration       | not executed                            | PASS   |
| Production feature flags   | not enabled                             | PASS   |

Conclusion: isolated production-copy D1 was created and remains unbound from
production Worker.
