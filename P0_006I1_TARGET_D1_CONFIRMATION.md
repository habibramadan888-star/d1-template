# P0-006I1 Target D1 Confirmation

Date: 2026-05-26, Asia/Dubai

Command executed:

```powershell
npx wrangler d1 info homelink-finance-staging
```

| Item           | Expected                               | Actual                                   | Result |
| -------------- | -------------------------------------- | ---------------------------------------- | ------ |
| D1 name        | `homelink-finance-staging`             | `homelink-finance-staging`               | PASS   |
| D1 id          | `4ff78bfc-3855-436b-aefb-6b492145d79c` | `4ff78bfc-3855-436b-aefb-6b492145d79c`   | PASS   |
| Is production? | no                                     | no, staging database name and id matched | PASS   |

Additional read-only info:

- Region: APAC.
- Table count before schema migration: 14.
- Production D1 touched: no.

Decision: target confirmed for staging-only schema compatibility migration.
