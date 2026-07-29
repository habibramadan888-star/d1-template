# Staging Worker Deploy Result

Generated: 2026-05-25

Command:

```powershell
cd deploy-worker
npx wrangler deploy --config wrangler.toml --env staging
```

This was a staging Worker deploy only. It was not a production deploy and did not execute any migration or D1 command.

| Field                                      | Value                                                          |
| ------------------------------------------ | -------------------------------------------------------------- |
| Deploy executed                            | Yes                                                            |
| Worker name                                | `homelink-finance-staging`                                     |
| Worker URL                                 | `https://homelink-finance-staging.habibramadan888.workers.dev` |
| Version ID                                 | `9f417fc5-2d28-45eb-82c4-648037353984`                         |
| Entrypoint                                 | `src/index.js`                                                 |
| D1 binding                                 | `DB` -> `homelink-finance-staging`                             |
| KV binding                                 | `RATE_LIMIT` -> `RATE_LIMIT_STAGING`                           |
| `APP_ENV`                                  | `staging`                                                      |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | `false`                                                        |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | `false`                                                        |
| Production touched                         | No                                                             |
| Production deploy                          | No                                                             |
| D1 execute                                 | No                                                             |
| Migration                                  | No                                                             |
| Staging write QA                           | Not executed                                                   |

Production URL exclusion: staging URL is distinct from the known production-like Worker URL pattern `homelink-finance.*.workers.dev` because the deployed Worker name is `homelink-finance-staging`.
