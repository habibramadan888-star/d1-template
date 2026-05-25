# NEXT PROMPT: P0-003E Backend Totals Staging Switch Rehearsal

Enter TASK P0-003E: Backend totals staging switch rehearsal.

Current prerequisite:

- P0-003D backend totals staging switch gate is ready.
- `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md` has no mismatch for eligible core totals.
- Production remains `NO-GO`.

## Goal

Run a staging-only backend totals switch rehearsal behind
`ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`.

## Strictly Forbidden

1. Do not execute production deploy.
2. Do not execute production migration.
3. Do not execute remote production D1 migration.
4. Do not write production D1.
5. Do not call production URL.
6. Do not enable production feature flags.
7. Do not modify production wrangler config.
8. Do not switch production dashboard.
9. Do not mark P0-003 Verified.
10. Do not mark production cutover GO.
11. Do not commit secrets, passwords, tokens, or cookies.

## Required Controls

1. Staging-only target.
2. Feature flag required: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=true`.
3. Production must remain disabled.
4. Dashboard/history evidence before and after.
5. Rollback after test: `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING=false`.
6. `npm run gate:commercial-launch` must remain `PRODUCTION_NO_GO`.
7. P0-003 remains Partial.

## Required Validation

Run:

```powershell
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:backend-totals
npm run test:backend-totals-staging-gate
npm run compare:staging-backend-totals
npm run verify:dashboard-unchanged
npm run qa:employee-entry-staging
npm run audit:worker-drift
npm run verify:embedded-worker
npm run build:embedded:dry-run
```

`qa:employee-entry-staging` must run without confirmation flags unless the task
explicitly asks for a separate staging write QA.

## Required Reports

1. `P0_003E_BACKEND_TOTALS_STAGING_SWITCH_RESULT.md`
2. `BACKEND_TOTALS_DASHBOARD_HISTORY_EVIDENCE.md`
3. `BACKEND_TOTALS_STAGING_SWITCH_ROLLBACK_RESULT.md`
4. `P0_003E_PRODUCTION_NO_GO_REVIEW.md`

Stop after P0-003E. Do not enter production cutover.
