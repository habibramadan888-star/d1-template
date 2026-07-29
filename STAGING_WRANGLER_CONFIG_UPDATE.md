# Staging Wrangler Config Update

Generated: 2026-05-25

Updated file: `deploy-worker/wrangler.toml`

| Item                                       | Value                                                       |
| ------------------------------------------ | ----------------------------------------------------------- |
| Staging environment                        | `[env.staging]`                                             |
| Staging Worker name                        | `homelink-finance-staging`                                  |
| Staging entrypoint                         | `src/index.js`                                              |
| D1 binding                                 | `DB`                                                        |
| D1 database                                | `homelink-finance-staging`                                  |
| D1 database ID                             | `4ff78bfc-3855-436b-aefb-6b492145d79c`                      |
| KV binding                                 | `RATE_LIMIT`                                                |
| KV namespace title                         | `RATE_LIMIT_STAGING`                                        |
| KV namespace ID                            | `9e84150246204f01b3fd8c184761303e`                          |
| `APP_ENV`                                  | `staging`                                                   |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | `false`                                                     |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | `false`                                                     |
| Production/default config modified         | No existing production/default binding values were changed. |

Staging vars are intentionally conservative. Both staging feature flags default to `false`, so real write QA requires a later explicit staging-only change and approval.

Production safety:

| Check                                          | Result                  |
| ---------------------------------------------- | ----------------------- |
| Default Worker name remains `homelink-finance` | PASS                    |
| Default D1 remains `homelink`                  | PASS                    |
| Default KV remains `RATE_LIMIT`                | PASS                    |
| No production route added                      | PASS                    |
| No secret committed                            | PASS pending final scan |
