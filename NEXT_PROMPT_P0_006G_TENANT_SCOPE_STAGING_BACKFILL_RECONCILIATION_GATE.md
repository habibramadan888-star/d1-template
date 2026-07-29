# NEXT PROMPT: P0-006G Tenant Scope Staging Backfill Reconciliation Gate

Enter TASK P0-006G: Tenant scope staging backfill reconciliation gate.

Current state:

- P0-006F dashboard/history query gate passed in staging/local fixture mode.
- `TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE=PASS`.
- Cross-tenant rows removed from legacy `CORPID` query result: 6.
- Live Worker dashboard/history routes are unchanged.
- Legacy `CORPID` fallback remains.
- Production cutover remains `NO-GO`.

Task goal:

Design a staging/local tenant-scope backfill reconciliation gate that proves how
legacy `CORPID` rows would map to canonical `company_id` / `property_id` before
any migration or live route switch.

Strictly forbidden:

1. Do not execute production deploy.
2. Do not execute production migration.
3. Do not execute remote production D1 migration.
4. Do not write production D1.
5. Do not call production URL.
6. Do not modify production wrangler config.
7. Do not remove legacy `CORPID` fallback.
8. Do not rewrite production auth/login behavior.
9. Do not change live dashboard/history output.
10. Do not mark P0-006 Verified.
11. Do not mark production cutover GO.
12. Do not commit secrets or print password/token/cookie values.

Allowed:

1. Local/staging-only backfill mapping design.
2. Static fixture reconciliation.
3. Read-only staging SELECT if explicitly target-confirmed.
4. Migration/backfill command drafts only.
5. Tests and reports.
6. Rollback plan.
7. P0-006 status update to Partial only.

Required outputs:

1. `P0_006G_STARTING_CONTEXT.md`
2. `TENANT_SCOPE_BACKFILL_RECONCILIATION_PLAN.md`
3. `TENANT_SCOPE_BACKFILL_RECONCILIATION_RESULT.md`
4. `P0_006G_ROLLBACK_PLAN.md`
5. `P0_006G_COMMERCIAL_LAUNCH_GATE_RESULT.md`
6. Updated `RUN_REPORT.md`, `VERIFICATION_STATUS.md`,
   `COMMERCIALIZATION_BACKLOG.md`, `P0_P1_STATUS_REVIEW.md`,
   `NEXT_MORNING_REVIEW.md`, and `COMMERCIAL_LAUNCH_READINESS_RESULT.md`.

Validation:

- `npm run format:check`
- `npm run check`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run gate:tenant-scope`
- `npm run test:tenant-scope`
- `npm run rehearse:tenant-scope`
- `npm run test:tenant-scope-staging-shadow`
- `npm run compare:staging-tenant-scope`
- `npm run test:tenant-scope-route-gate`
- `npm run gate:tenant-scope-route-enforcement`
- `npm run test:tenant-scope-query-gate`
- `npm run gate:tenant-scope-dashboard-history-query`
- `npm run qa:employee-entry-staging`

Completion rule:

- P0-006 can only become
  `Partial - tenant scope staging backfill reconciliation gate passed` or
  `Partial - tenant scope staging backfill reconciliation gate blocked`.
- Production remains `NO-GO`.
