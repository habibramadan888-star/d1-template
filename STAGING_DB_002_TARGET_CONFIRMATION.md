# STAGING-DB-002 Target Confirmation

Date: 2026-05-25, Asia/Dubai

Scope: read-only target confirmation before any staging D1 schema write.

Command:

```powershell
npx wrangler d1 info homelink-finance-staging
npx wrangler d1 list --json
```

| Item                      | Expected                               | Actual                                                                               | Result |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| D1 name                   | `homelink-finance-staging`             | `homelink-finance-staging`                                                           | PASS   |
| D1 id                     | `4ff78bfc-3855-436b-aefb-6b492145d79c` | `4ff78bfc-3855-436b-aefb-6b492145d79c`                                               | PASS   |
| Is production?            | no                                     | no, staging-specific name and id                                                     | PASS   |
| Is homelink?              | no                                     | no; production-like `homelink` is separate id `562aa079-1cca-4176-ba3b-7276a65f98fb` | PASS   |
| Is d1-template-database?  | no                                     | no; template is separate id `4792b9f7-f808-4c59-bf10-e72a8d27db2e`                   | PASS   |
| Pre-bootstrap table count | empty application schema               | `num_tables=0` before bootstrap; only internal `_cf_KV` observed in STAGING-DB-001   | PASS   |

Decision: target confirmed. Schema bootstrap may proceed only against `homelink-finance-staging`.
