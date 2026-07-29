# Embedded Dry-Run Revalidation Result

## Command Results

| Command                                 | Result                             | Key Output                                                                    |
| --------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `npm run build:embedded:dry-run`        | pass                               | `EMBEDDED_WORKER_DRY_RUN_RESULT=PASS`; current missing 0; generated missing 0 |
| `npm run verify:embedded-worker`        | pass                               | `EMBEDDED_WORKER_FRESHNESS_RESULT=PASS`; missing critical 0                   |
| `npm run audit:worker-drift`            | pass with non-critical route drift | `WORKER_DRIFT_CRITICAL_MISMATCHES=0`; route mismatches 22                     |
| `npm run security:secrets`              | pass                               | Secret hygiene check passed                                                   |
| `npm run gate:commercial-launch`        | pass / no-go                       | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`; no-go 12                      |
| `npm run test:three-portal`             | pass                               | 3/3 tests passed                                                              |
| `npm run test:three-portal-entry-cards` | pass                               | 5/5 tests passed                                                              |
| `npm run qa:employee-entry-staging`     | pass / manual required             | `EMPLOYEE_ENTRY_STAGING_QA=MANUAL_REQUIRED`; `write execution: DRY_RUN_ONLY`  |

## Safety Confirmation

| Check                        | Result             |
| ---------------------------- | ------------------ |
| D1 write                     | no                 |
| Migration                    | no                 |
| D1 export/import/execute     | no                 |
| Business write               | no                 |
| Dashboard calculation change | no                 |
| Financial formula change     | no                 |
| Commercial launch status     | `PRODUCTION_NO_GO` |

## Deploy Eligibility

The deploy preconditions for a static Worker UI deploy are satisfied, provided deployment is run from a clean committed tree so unrelated dirty static files are not published.
