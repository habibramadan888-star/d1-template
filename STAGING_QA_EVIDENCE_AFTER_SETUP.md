# Staging QA Evidence After Setup

Generated: 2026-05-25

| Evidence Item                              | Value                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Current branch                             | `setup/staging-cloudflare-resources`                                            |
| Setup base commit                          | `c73a39a`                                                                       |
| Staging Worker name                        | `homelink-finance-staging`                                                      |
| Staging Worker URL                         | `https://homelink-finance-staging.habibramadan888.workers.dev`                  |
| Worker entrypoint                          | `deploy-worker/wrangler.toml` `[env.staging]` -> `src/index.js`                 |
| `APP_ENV`                                  | `staging`                                                                       |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | `false`                                                                         |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | `false`                                                                         |
| Staging D1 name                            | `homelink-finance-staging`                                                      |
| Staging D1 ID                              | `4ff78bfc-3855-436b-aefb-6b492145d79c`                                          |
| Staging D1 binding                         | `DB`                                                                            |
| Staging KV namespace                       | `RATE_LIMIT_STAGING`                                                            |
| Staging KV ID                              | `9e84150246204f01b3fd8c184761303e`                                              |
| Staging KV binding                         | `RATE_LIMIT`                                                                    |
| Backup completed before write tests        | No                                                                              |
| Rollback method confirmed                  | Procedure documented, not yet exercised                                         |
| Production URL checked and excluded        | Yes, staging Worker URL is separate from the known production-like Worker name. |
| Real staging write QA executed             | No                                                                              |
| Production deploy executed                 | No                                                                              |
| Migration executed                         | No                                                                              |
| Secret committed                           | No pending final scan                                                           |

Remaining manual inputs before real staging write QA:

| Item                                              | Status          |
| ------------------------------------------------- | --------------- |
| Set staging secrets                               | MANUAL_REQUIRED |
| Create or seed staging test accounts              | MANUAL_REQUIRED |
| Execute D1 backup before write QA                 | MANUAL_REQUIRED |
| Exercise rollback plan                            | MANUAL_REQUIRED |
| Human confirm staging URL in Cloudflare Dashboard | MANUAL_REQUIRED |
