# P0-006I2 Target D1 Confirmation

Date: 2026-05-26, Asia/Dubai

Command executed:

```powershell
npx wrangler d1 info homelink-finance-staging
```

| Item        | Expected                               | Actual                                 | Result |
| ----------- | -------------------------------------- | -------------------------------------- | ------ |
| D1 name     | `homelink-finance-staging`             | `homelink-finance-staging`             | PASS   |
| D1 id       | `4ff78bfc-3855-436b-aefb-6b492145d79c` | `4ff78bfc-3855-436b-aefb-6b492145d79c` | PASS   |
| Production? | no                                     | no                                     | PASS   |

Safety:

- Production D1 was not selected.
- Production URL was not called.
- Production deploy: no.
- Production migration: no.
