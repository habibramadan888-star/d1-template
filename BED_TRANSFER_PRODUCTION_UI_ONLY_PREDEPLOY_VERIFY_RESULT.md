# Bed Transfer Production UI-Only Predeploy Verification Result

Date: 2026-06-01, Asia/Dubai

Scope: verify the Bed Transfer UI-only deployment is safe to publish without enabling production writes.

## Verification Results

| Command | Result | Notes |
|---|---:|---|
| `npm run security:secrets` | PASS | Secret hygiene check passed. |
| `npm run gate:commercial-launch` | PASS | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`. |
| `npm run test:employee-bed-transfer-ui-fields` | PASS | 5/5 tests passed, including production write gate assertion. |
| `npm run test:bed-transfer-validation-service` | PASS | 3/3 tests passed. |
| `npm run test:bed-transfer-accounting-rules` | PASS | 2/2 tests passed. |
| `npm run test:bed-transfer-ttlock-migration` | PASS | 2/2 tests passed. |
| `npm run test:bed-transfer-state-machine` | PASS | 2/2 tests passed. |
| `npm run test:bed-transfer-traceability` | PASS | 2/2 tests passed. |
| `npm run test:bed-transfer-statistical-anchors` | PASS | 2/2 tests passed. |
| `npm run test:readonly-admin-role` | PASS | 2/2 tests passed. |
| `npm run qa:employee-entry-staging` | PASS / DRY_RUN_ONLY | `EMPLOYEE_ENTRY_STAGING_QA=MANUAL_REQUIRED`; no staging write confirmation supplied. |
| `npm run build:embedded:dry-run` | PASS | `EMBEDDED_WORKER_DRY_RUN_RESULT=PASS`. |
| `npm run verify:embedded-worker` | PASS | `EMBEDDED_WORKER_FRESHNESS_RESULT=PASS`. |
| `npm run audit:worker-drift` | PASS | `WORKER_DRIFT_CRITICAL_MISMATCHES=0`. |

## Safety Checks

| Check | Result |
|---|---|
| Production Bed Transfer write | No |
| Production write gate | Off / not opened |
| Production migration | No |
| Production D1 execute for write | No |
| Financial formula change | No |
| Dashboard calculation change | No |
| Production cutover | `PRODUCTION_NO_GO` |

## Decision

Predeploy verification passed for UI-only publication. Real Bed Transfer writes remain blocked pending production schema migration and separate approval.
