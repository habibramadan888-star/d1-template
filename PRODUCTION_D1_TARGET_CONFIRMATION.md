# Production D1 Target Confirmation

Date: 2026-05-27, Asia/Dubai

Scope: production D1 read/export and isolated production-copy creation were
explicitly approved for this task. Production D1 write, production migration,
production deploy, production feature flag enablement, and production cutover
remain forbidden.

## D1 Discovery Result

Command executed:

```powershell
npx wrangler d1 list
```

## Candidate Review

| Candidate                | Database ID                          | Looks Production | Human Approved | Notes                                                         |
| ------------------------ | ------------------------------------ | ---------------- | -------------- | ------------------------------------------------------------- |
| homelink-finance-staging | 4ff78bfc-3855-436b-aefb-6b492145d79c | no               | no             | Known staging D1 target from prior staging QA tasks.          |
| homelink                 | 562aa079-1cca-4176-ba3b-7276a65f98fb | yes              | yes            | Top-level Worker D1 binding in `deploy-worker/wrangler.toml`. |
| d1-template-database     | 4792b9f7-f808-4c59-bf10-e72a8d27db2e | no               | no             | Template database, not production.                            |

## Confirmed Production Target

| Item               | Value                                | Result    |
| ------------------ | ------------------------------------ | --------- |
| Production D1 name | homelink                             | CONFIRMED |
| Production D1 id   | 562aa079-1cca-4176-ba3b-7276a65f98fb | CONFIRMED |
| Confirmation basis | `wrangler d1 info homelink` + config | PASS      |
| Production write   | not executed                         | PASS      |

Conclusion: `homelink` was the unique production D1 candidate and was approved
for read/export only. No production D1 write or migration was executed.
