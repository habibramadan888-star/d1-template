# Staging Existing Resource Check

Generated: 2026-05-25

Scope: checked Cloudflare resources before creating the dedicated staging resources. No production deploy, production migration, D1 execute, KV write, or resource deletion was performed.

| Resource              | Expected Name                         | Exists Before Setup | ID                                     | Action                                  |
| --------------------- | ------------------------------------- | ------------------: | -------------------------------------- | --------------------------------------- |
| D1 database           | `homelink-finance-staging`            |                  No | N/A before create                      | Created dedicated staging D1.           |
| KV namespace          | `RATE_LIMIT_STAGING`                  |                  No | N/A before create                      | Created dedicated staging KV namespace. |
| Existing D1 database  | `homelink`                            |                 Yes | `562aa079-1cca-4176-ba3b-7276a65f98fb` | Left untouched; not used as staging.    |
| Existing D1 database  | `d1-template-database`                |                 Yes | `4792b9f7-f808-4c59-bf10-e72a8d27db2e` | Left untouched; not used as staging.    |
| Existing KV namespace | `RATE_LIMIT`                          |                 Yes | `c7c64d522d964baba2e72454e7262da9`     | Left untouched; not used as staging.    |
| Existing KV namespace | `__homelink-app-workers_sites_assets` |                 Yes | `56b4719988a2480cab798007479d8529`     | Left untouched.                         |

Conclusion: dedicated staging resources did not exist before this task, so new staging-only resources were created.
