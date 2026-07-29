# Unified Login Deploy Dry-Run Result

Date: 2026-05-28

## Scope

Dry-run validation for deploying the unified login static route to the live `homelink-finance` Worker.

No production D1 write, D1 migration, D1 export/import/execute, business write test, dashboard formula change, or financial formula change was executed.

## Commands

| Command                                                                                                                                 | Result            | Notes                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run build:embedded:dry-run`                                                                                                        | PASS_WITH_WARNING | Generated dry-run embedded Worker with 0 current/generated missing assets.                                 |
| `npm run verify:embedded-worker`                                                                                                        | PASS              | `EMBEDDED_WORKER_MISSING_CRITICAL=0`.                                                                      |
| `npm run audit:worker-drift`                                                                                                            | PASS_WITH_WARNING | `WORKER_DRIFT_CRITICAL_MISMATCHES=0`; one non-critical route mismatch remains tracked by the audit report. |
| `npx wrangler deploy --config wrangler.toml --dry-run --outdir ..\.tmp\wrangler-unified-login-live-dry-run`                             | PASS              | Dry-run only; read 8 asset files.                                                                          |
| `npx wrangler deploy --config wrangler.toml --env="" --dry-run --outdir ..\.tmp\wrangler-unified-login-live-dry-run-explicit-top-level` | PASS              | Dry-run only; explicitly targets top-level `homelink-finance` environment.                                 |

## Wrangler Dry-Run Binding Review

| Binding           | Resource               | Result                                                           |
| ----------------- | ---------------------- | ---------------------------------------------------------------- |
| `env.DB`          | `homelink` D1 Database | EXPECTED - binding present, but no D1 write/migration performed. |
| `env.ASSETS`      | Worker Assets          | EXPECTED - deploy packages `deploy-worker/public`.               |
| `env.RATE_LIMIT`  | KV Namespace           | EXPECTED - unchanged binding.                                    |
| `env.APP_NAME`    | `Homelink Finance`     | EXPECTED                                                         |
| `env.APP_VERSION` | `2.0.0`                | EXPECTED                                                         |
| `env.CORPID`      | `homelink`             | EXPECTED                                                         |

## Asset Packaging

Wrangler dry-run read 8 files from:

`deploy-worker/public`

This includes `unified-login.html`.

## Safety Result

| Safety Check                      | Result             |
| --------------------------------- | ------------------ |
| Production D1 migration executed  | No                 |
| Production D1 write executed      | No                 |
| D1 export/import/execute executed | No                 |
| Business data write executed      | No                 |
| Dashboard formula changed         | No                 |
| Financial formula changed         | No                 |
| Feature flags enabled             | No                 |
| Commercial launch GO              | No                 |
| Production cutover status         | `PRODUCTION_NO_GO` |

## Deploy Eligibility

Deploy is eligible under the user-approved scope because the dry-run confirms the change packages Worker assets for the top-level `homelink-finance` Worker and does not require D1 writes or migrations.
