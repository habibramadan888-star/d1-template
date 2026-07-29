# STAGING-QA-005B Retry Feature Flag Before State

Generated: 2026-05-25

| Flag                                       | Expected Before | Actual Before                                                                                                                       | Result |
| ------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | `false`         | `false` in `deploy-worker/wrangler.toml` `[env.staging.vars]`                                                                       | PASS   |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | `false`         | `false` in `deploy-worker/wrangler.toml` `[env.staging.vars]`; unauthenticated staging handover probe returned HTTP 403 before auth | PASS   |

Runtime probe:

| Endpoint                                    | Method | Expected Before        | Actual Before | Result |
| ------------------------------------------- | ------ | ---------------------- | ------------- | ------ |
| `/api/staging/handover/commit`              | POST   | `403 FEATURE_DISABLED` | `403`         | PASS   |
| `/api/staging/employee-entry/adapter-draft` | POST   | `403 FEATURE_DISABLED` | `403`         | PASS   |

Notes:

- No staging write was executed during this check.
- No production URL was called.
- The employee entry live-route flag does not expose a non-write probe; before state is confirmed from staging config and will be validated by real QA response evidence after enabling.
