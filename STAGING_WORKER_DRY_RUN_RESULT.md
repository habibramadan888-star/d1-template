# Staging Worker Dry Run Result

Generated: 2026-05-25

Command:

```powershell
cd deploy-worker
npx wrangler deploy --config wrangler.toml --env staging --dry-run --outdir ../.wrangler-dryrun/staging
```

| Check                                      | Result                               |
| ------------------------------------------ | ------------------------------------ |
| Dry-run passed                             | PASS                                 |
| Entrypoint                                 | `src/index.js`                       |
| Worker name                                | `homelink-finance-staging`           |
| D1 binding                                 | `DB` -> `homelink-finance-staging`   |
| KV binding                                 | `RATE_LIMIT` -> `RATE_LIMIT_STAGING` |
| Assets binding                             | `ASSETS`                             |
| `APP_ENV`                                  | `staging`                            |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | `false`                              |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | `false`                              |
| Production touched                         | No                                   |
| D1 execute performed                       | No                                   |
| Migration performed                        | No                                   |

Wrangler dry-run confirmed that the staging environment binds to the dedicated staging D1 and KV resources.
