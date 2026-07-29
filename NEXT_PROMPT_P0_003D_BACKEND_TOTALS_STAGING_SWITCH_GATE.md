# NEXT PROMPT: P0-003D Backend Totals Staging Switch Gate

Enter TASK P0-003D: Backend totals staging switch gate.

Current status:

- STAGING-QA-005B real staging write QA passed.
- STAGING-QA-006 locked the staging QA evidence.
- P0-001 is `Partial - real staging QA passed, production cutover still NO-GO`.
- P0-002 is `Partial - handover staging QA passed, production cutover still NO-GO`.
- Production cutover remains `NO-GO`.
- Staging flags are rolled back to false.

## Goal

Create a local/staging-only backend totals staging switch gate. The task must
prove whether selected backend totals can be shadow-compared or rehearsed for
staging switch without changing production dashboard behavior.

## Strictly Forbidden

1. Do not execute production deploy.
2. Do not execute staging deploy unless explicitly scoped as staging-only dry-run or approved staging rehearsal.
3. Do not execute production migration.
4. Do not execute remote production D1 migration.
5. Do not call production URL.
6. Do not write production D1.
7. Do not modify production wrangler config.
8. Do not switch production dashboard authority.
9. Do not modify live financial formula.
10. Do not mark P0-003 as Verified.
11. Do not mark P0-001 or P0-002 as Verified.
12. Do not mark production cutover GO.
13. Do not submit secrets, passwords, tokens, or cookies.

## Allowed

1. Local/staging-only rehearsal.
2. Backend totals shadow compare.
3. Dashboard/history evidence capture.
4. Staging-only database reads/writes if explicitly required and approved for QA.
5. Dry-run scripts and audit scripts.
6. Documentation, reports, and non-sensitive QA evidence.
7. Rollback plan generation and rehearsal.

## Required Work

1. Review current backend totals source-of-truth files and P0-003 status.
2. Identify totals that can be staged safely and totals that must remain legacy.
3. Build or update a staging-only backend totals switch/shadow compare script.
4. Capture dashboard/history before/after evidence.
5. Prove rollback by keeping or returning live dashboard behavior to legacy.
6. Confirm `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.
7. Update `RUN_REPORT.md`, `VERIFICATION_STATUS.md`, `COMMERCIALIZATION_BACKLOG.md`, `P0_P1_STATUS_REVIEW.md`, `NEXT_MORNING_REVIEW.md`, and `COMMERCIAL_LAUNCH_READINESS_RESULT.md`.

## Required Reports

1. `P0_003D_BACKEND_TOTALS_STAGING_SWITCH_GATE.md`
2. `BACKEND_TOTALS_STAGING_SWITCH_RESULT.md`
3. `BACKEND_TOTALS_DASHBOARD_HISTORY_EVIDENCE.md`
4. `BACKEND_TOTALS_STAGING_ROLLBACK_PLAN.md`
5. `P0_003D_PRODUCTION_NO_GO_REVIEW.md`

## Required Validation

Run at minimum:

```powershell
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:backend-totals
npm run rehearse:backend-totals
npm run gate:backend-totals-live
npm run verify:dashboard-unchanged
npm run audit:worker-drift
npm run verify:embedded-worker
npm run build:embedded:dry-run
```

If any command is unavailable, document `COMMAND_NOT_AVAILABLE` and do not
invent unsafe substitutes.

## Status Rules

P0-003 may only move to:

`Partial - backend totals staging switch gate ready`

or:

`Partial - backend totals staging switch gate blocked`

Do not mark `Verified`, `Done`, or `Fixed`.

## Final Output

Report:

1. Current branch.
2. Commit hash.
3. P0-003 current status.
4. Whether production deploy ran.
5. Whether production migration ran.
6. Whether production D1 was written.
7. Whether dashboard/history evidence was captured.
8. Whether rollback plan exists.
9. `gate:commercial-launch` result.
10. Whether production cutover remains `NO-GO`.

Stop after this task. Do not enter production cutover.
