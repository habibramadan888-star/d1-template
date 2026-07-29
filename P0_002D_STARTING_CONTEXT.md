# P0-002D Starting Context

Generated: 2026-05-24, Asia/Dubai

Scope: P0-002D staging/manual validation preparation for the local/staging-only atomic handover endpoint. No live employee flow switch, live dashboard change, production migration, remote D1 migration, production deploy, secret change, or embedded Worker regeneration was performed.

## P0-002C Implemented

1. `POST /api/staging/handover/commit` exists in `deploy-worker/src/index.js`.
2. The route is guarded by `APP_ENV` and `ENABLE_HANDOVER_ATOMIC_STAGING=true`.
3. `APP_ENV=production` returns `404`.
4. Non-production with the feature flag disabled returns `403 FEATURE_DISABLED`.
5. Auth is server-side; unauthenticated and invalid JWT requests are rejected.
6. Only `staff` / employee role can submit.
7. Owner/manager/admin submit attempts are rejected.
8. Backend recomputes totals in integer fils for the staging commit result.
9. Frontend totals mismatch is rejected.
10. Voided rows are rejected.
11. Same idempotency key replays are stable.
12. Same rows under a different idempotency key produce duplicate-risk behavior.
13. Successful staging commits write staging tables plus audit evidence.

## P0-002C Did Not Implement

1. It did not switch the live employee handover UI or live submission flow.
2. It did not change live owner dashboard/history calculations.
3. It did not write legacy live financial tables: `transactions`, `deposit_ledger`, or `arrears`.
4. It did not execute production or remote D1 migrations.
5. It did not deploy production Worker code.
6. It did not complete P0-001C minor-unit dual-write.
7. It did not complete P0-003 live backend totals authority.
8. It did not implement P0-008 receivables.
9. It did not implement P0-006 tenant isolation.

## Staging-Only Code Paths

| Area                     | File                                               | Boundary                                                                                           |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Route guard and endpoint | `deploy-worker/src/index.js`                       | `POST /api/staging/handover/commit`, `HSC_ALLOWED_APP_ENVS`, and `ENABLE_HANDOVER_ATOMIC_STAGING`. |
| Staging tables           | `migrations/local/002_handover_atomic_staging.sql` | Local/staging migration only; not production.                                                      |
| Endpoint regression      | `tests/handover-staging-endpoint.spec.mjs`         | Disposable local Worker/D1 tests only.                                                             |
| Rehearsal                | `scripts/rehearse-handover-staging-endpoint.mjs`   | Disposable local D1, no remote D1.                                                                 |

## Live Legacy Code Paths

| Area                           | File                                  | Current Behavior                                                                        |
| ------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------- |
| Employee live entry            | `deploy-worker/src/index.js`          | Existing `/api/employee/entry` legacy write path remains unchanged.                     |
| Owner session save             | `deploy-worker/src/index.js`          | Existing `/api/save_session` legacy owner write path remains unchanged.                 |
| Owner history/dashboard source | `deploy-worker/src/index.js`          | Existing `/api/history`, `/api/arrears`, and related reads remain unchanged.            |
| Embedded Worker                | `deploy-worker/src/index.embedded.js` | Generated deployment artifact path remains separate and was not regenerated in P0-002C. |

## Feature Flag Protection

1. `APP_ENV=production` returns `404` even if `ENABLE_HANDOVER_ATOMIC_STAGING=true`.
2. Missing or unsupported `APP_ENV` returns `403 FEATURE_DISABLED`.
3. Supported non-production environments are `development`, `dev`, `local`, `test`, and `staging`.
4. Feature flag values accepted as enabled are `1`, `true`, `yes`, or `on`.

## Storage Risk Review

Current automated evidence from `tests/handover-staging-endpoint.spec.mjs` and `scripts/rehearse-handover-staging-endpoint.mjs` shows:

1. `handover_commits`, `handover_commit_rows`, and `handover_idempotency_keys` are written on success.
2. `audit_logs`, `entry_events`, and `handover_audit_events` capture staging evidence.
3. `transactions`, `deposit_ledger`, and `arrears` remain unwritten by the staging endpoint.

## Dashboard Impact Risk

Current automated evidence checks owner `/api/history` before and after a successful staging submit and asserts the result is unchanged. P0-002D adds a dedicated verification wrapper for this evidence.

## Embedded Worker Drift Risk

`deploy-worker/src/index.js` contains the staging route. `deploy-worker/src/index.embedded.js` does not contain the route. `deploy-worker/wrangler.toml` points to `src/index.js`; `deploy-worker/wrangler.embedded.toml` points to `src/index.embedded.js`. Local/main Worker validation is not blocked, but embedded staging deployment is blocked until a controlled regeneration/deploy-prep step is approved.

## This Task Should Validate

1. Manual QA can reproduce endpoint behavior with documented steps.
2. Manual commands can be generated without printing secrets.
3. Production-disabled and feature-flag-disabled behavior remains verifiable.
4. Dashboard/history source remains unchanged.
5. Legacy live financial tables remain unchanged.
6. Audit evidence exists.
7. Embedded Worker drift is documented without regenerating artifacts.

## This Task Must Not Do

1. Do not wire the route into the live employee UI.
2. Do not alter live dashboard or financial formulas.
3. Do not run production or remote migrations.
4. Do not regenerate embedded Worker artifacts.
5. Do not deploy production.
6. Do not move P0-002 to Verified.
