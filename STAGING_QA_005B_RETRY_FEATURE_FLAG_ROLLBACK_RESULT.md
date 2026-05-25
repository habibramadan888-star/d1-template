# STAGING-QA-005B Retry Feature Flag Rollback Result

Generated: 2026-05-25

Rollback command:

`npx wrangler deploy --env staging --config deploy-worker/wrangler.toml`

Rollback target:

- Worker: `homelink-finance-staging`
- URL: `https://homelink-finance-staging.habibramadan888.workers.dev`
- Production touched: no
- Staging version after rollback: `5b076a67-c8a2-4c3d-83e2-e915d8c3fc08`

| Flag                                       | Expected After | Actual After                                                       | Result |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------ | ------ |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | `false`        | `false` in staging deploy output and `deploy-worker/wrangler.toml` | PASS   |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | `false`        | `false` in staging deploy output and `deploy-worker/wrangler.toml` | PASS   |

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production feature flags changed: no.
- Secrets printed or committed: no.
