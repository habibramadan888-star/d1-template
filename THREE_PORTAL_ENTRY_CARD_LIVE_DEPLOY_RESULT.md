# Three Portal Entry Card Live Deploy Result

## Status

Deploy executed successfully.

Deployment was run from a clean temporary git worktree at commit `0aa1401` to avoid publishing unrelated dirty local files.

Live URL: `https://homelink-finance.habibramadan888.workers.dev`

Worker version ID: `d9e56d6b-1ebd-4c41-8744-d19dd3158fde`

## Deployment Scope

Allowed scope is static Worker UI only:

- `deploy-worker/public/portal.html`
- related embedded Worker asset packaging

Wrangler uploaded 6 static assets:

- `/portal.html`
- `/index-51.html`
- `/unified-login.html`
- `/employee-v3.html`
- `/employee-v2.html`
- `/index-51-main.js`

## Prohibited Operations

- D1 write: not allowed
- Migration: not allowed
- D1 export/import/execute: not allowed
- Business write: not allowed
- Dashboard calculation change: not allowed
- Financial formula change: not allowed

## Pre-Deploy Checks

| Command                                 | Result                     | Notes                                                            |
| --------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `npm run build:embedded:dry-run`        | pass                       | `EMBEDDED_WORKER_DRY_RUN_RESULT=PASS`                            |
| `npm run verify:embedded-worker`        | pass                       | `EMBEDDED_WORKER_FRESHNESS_RESULT=PASS`                          |
| `npm run audit:worker-drift`            | pass with route mismatches | `WORKER_DRIFT_CRITICAL_MISMATCHES=0`; route mismatches remain 22 |
| `npm run security:secrets`              | pass                       | Secret hygiene check passed                                      |
| `npm run gate:commercial-launch`        | pass / no-go               | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`                   |
| `npm run test:three-portal`             | pass                       | 3/3 tests passed                                                 |
| `npm run test:three-portal-entry-cards` | pass                       | 5/5 tests passed                                                 |

## Deployment Decision

Deploy was performed after the embedded dry-run blocker was fixed and the required static UI checks passed.

## Production Cutover

Production cutover remains `PRODUCTION_NO_GO`.
