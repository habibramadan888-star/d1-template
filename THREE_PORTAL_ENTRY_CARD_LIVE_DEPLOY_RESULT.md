# Three Portal Entry Card Live Deploy Result

## Status

Deploy not executed.

Reason: required pre-deploy command `npm run build:embedded:dry-run` failed before any Worker deploy was attempted.

## Deployment Scope

Allowed scope is static Worker UI only:

- `deploy-worker/public/portal.html`
- related embedded Worker asset packaging

## Prohibited Operations

- D1 write: not allowed
- Migration: not allowed
- D1 export/import/execute: not allowed
- Business write: not allowed
- Dashboard calculation change: not allowed
- Financial formula change: not allowed

## Pre-Deploy Checks

| Command                          | Result                     | Notes                                                            |
| -------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `npm run build:embedded:dry-run` | fail                       | `embedded fallback injection failed`                             |
| `npm run verify:embedded-worker` | pass                       | `EMBEDDED_WORKER_FRESHNESS_RESULT=PASS`                          |
| `npm run audit:worker-drift`     | pass with route mismatches | `WORKER_DRIFT_CRITICAL_MISMATCHES=0`; route mismatches remain 22 |

## Deployment Decision

No deploy was performed because the requested pre-deploy chain did not fully pass.

## Production Cutover

Production cutover remains `PRODUCTION_NO_GO`.
