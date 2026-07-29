# Arrears WhatsApp Baseline Predeploy Verification Result

Generated: 2026-05-31 16:12:54 +04:00

Verification was run from clean detached worktree `.tmp/whatsapp-baseline-deploy-307af7f` at commit `307af7f`.

## Results

| Check | Result | Evidence |
|---|---:|---|
| `npm run security:secrets` | PASS | `Secret hygiene check passed.` |
| `npm run gate:commercial-launch` | PASS | `COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO`, `COMMERCIAL_LAUNCH_NO_GO=12`, `COMMERCIAL_LAUNCH_MANUAL_REQUIRED=1` |
| `npm run test:arrears-whatsapp-final-baseline` | PASS | 3/3 tests passed |
| `npm run test:arrears-whatsapp-search-baseline` | PASS | 2/2 tests passed |
| `npm run test:arrears-whatsapp-no-duplicate` | PASS | 3/3 tests passed |
| `npm run test:owner-arrears-whatsapp-export` | PASS | 2/2 tests passed |
| `npm run qa:employee-entry-staging` | PASS | `EMPLOYEE_ENTRY_STAGING_QA=MANUAL_REQUIRED`, `write execution: DRY_RUN_ONLY` |
| `npm run build:embedded:dry-run` | PASS | `EMBEDDED_WORKER_DRY_RUN_RESULT=PASS` |
| `npm run verify:embedded-worker` | PASS | `EMBEDDED_WORKER_FRESHNESS_RESULT=PASS`, `EMBEDDED_WORKER_MISSING_CRITICAL=0` |
| `npm run audit:worker-drift` | PASS | `WORKER_DRIFT_CRITICAL_MISMATCHES=0` |

## Required Safety Outcomes

- security:secrets PASS: Yes
- gate:commercial-launch remains `PRODUCTION_NO_GO`: Yes
- qa:employee-entry-staging remains `MANUAL_REQUIRED / DRY_RUN_ONLY`: Yes
- build:embedded:dry-run PASS: Yes
- verify:embedded-worker PASS: Yes
- audit critical mismatch = 0: Yes
- D1 write: No
- Migration: No

