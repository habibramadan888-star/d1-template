# STAGING QA 005 Rollback Result

Generated: 2026-05-25T15:08:40+04:00

Result: `ROLLBACK_SAFE_BUT_WRITE_ROLLBACK_NOT_EXECUTED`

| Check                                            | Result          | Evidence                                                                                                                                | Notes                                                            |
| ------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=false` | PASS            | `deploy-worker/wrangler.toml` staging vars and runtime probe                                                                            | Adapter-only staging draft endpoint is disabled.                 |
| `ENABLE_HANDOVER_ATOMIC_STAGING=false`           | PASS            | `deploy-worker/wrangler.toml` staging vars and runtime probe                                                                            | Handover staging endpoint returns `403 FEATURE_DISABLED`.        |
| Employee entry returns to legacy behavior        | MANUAL_REQUIRED | `/api/employee/entry` returns auth-required without adapter-only response                                                               | Authenticated legacy write was not executed in this blocked run. |
| Handover staging endpoint disabled/protected     | PASS            | `POST /api/staging/handover/commit` returned `403 FEATURE_DISABLED`                                                                     | Confirms rollback disabled state.                                |
| No production affected                           | PASS            | No production command or URL used                                                                                                       | Production remains untouched.                                    |
| QA dry-run after rollback                        | PASS            | `npm run qa:employee-entry-staging -- --confirm-staging-write --confirm-backup --confirm-rollback` returned `MANUAL_REQUIRED`, no write | Existing script still refuses writes.                            |
| No secret exposure                               | PASS            | Secret values were not printed or written                                                                                               | Reports omit passwords/tokens/cookies.                           |

Rollback by keeping both feature flags false is confirmed. A full write-then-rollback drill remains blocked until staging-only feature flag enablement is explicitly approved.
