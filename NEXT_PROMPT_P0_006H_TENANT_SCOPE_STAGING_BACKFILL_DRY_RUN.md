# NEXT PROMPT: P0-006H Tenant Scope Staging Backfill Dry-Run

Enter TASK P0-006H: Tenant scope staging backfill dry-run.

Current state:

- P0-006G backfill reconciliation gate passed in staging/local fixture mode.
- `TENANT_SCOPE_BACKFILL_RECONCILIATION_GATE=PASS`.
- Rows reconciled: 3.
- Blocked rows: 0.
- Collision warnings: 2.
- No D1 write occurred.
- Legacy `CORPID` fallback remains.
- Production cutover remains `NO-GO`.

Task goal:

Create a staging-only tenant-scope backfill dry-run that reads staging rows,
generates proposed update plans, compares before/after row counts, and stops
before writing unless a separate explicit staging write approval is given.

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

1. Read-only staging D1 SELECT after confirming target name/id.
2. Static and staging row-count reconciliation.
3. Draft update plan generation.
4. No-write dry-run reports.
5. Rollback and backup plan.
6. P0-006 status update to Partial only.

Required validation:

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
- `npm run test:tenant-scope-backfill-gate`
- `npm run gate:tenant-scope-backfill-reconciliation`
- `npm run qa:employee-entry-staging`

Completion rule:

- P0-006 can only become
  `Partial - tenant scope staging backfill dry-run passed` or
  `Partial - tenant scope staging backfill dry-run blocked`.
- Production remains `NO-GO`.
