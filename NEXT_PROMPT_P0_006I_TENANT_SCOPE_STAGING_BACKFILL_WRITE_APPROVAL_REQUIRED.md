# NEXT PROMPT: P0-006I Tenant Scope Staging Backfill Write Approval Required

Enter TASK P0-006I: Tenant scope staging backfill write approval gate.

Current state:

- P0-006H tenant scope staging backfill dry-run passed.
- `TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN=PASS`.
- Tables reviewed: 13.
- Blocked tables: 0.
- Manual-required tables: 0.
- Legacy-warning tables: 9.
- Staging D1 was read with SELECT only.
- Staging D1 write did not occur.
- Production cutover remains `NO-GO`.

Task goal:

Prepare an approval gate for any future staging tenant-scope backfill write.
This task must not run writes unless explicit human approval, backup evidence,
rollback acceptance, and target confirmation are all present.

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

Required before any staging write:

1. Confirm target D1 name is `homelink-finance-staging`.
2. Confirm target D1 id is `4ff78bfc-3855-436b-aefb-6b492145d79c`.
3. Complete staging D1 backup.
4. Confirm rollback method.
5. Review exact generated write plan.
6. Confirm no production command.
7. Confirm legacy `CORPID` fallback remains.
8. Confirm dashboard/history live result remains unchanged.
9. Require explicit human approval for staging backfill write.

Required validation:

- `npm run format:check`
- `npm run check`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run gate:tenant-scope`
- `npm run dry-run:tenant-scope-staging-backfill`
- `npm run qa:employee-entry-staging`

Completion rule:

- P0-006 can only remain Partial.
- Production remains `NO-GO`.
