# NEXT PROMPT: P0-006P Tenant Scope Staging Access Matrix Rehearsal

Enter TASK P0-006P: Tenant scope staging access matrix rehearsal.

Current state:

- P0-006O completed.
- P0-006 status: `Partial - tenant scope staging access matrix gate ready`.
- Tenant access matrix gate: PASS.
- Cross-tenant and cross-property denial: PASS.
- Missing coverage count: 2 documented-only production-review rows.
- Production remains `NO-GO`.

Goal:

Run a staging/local-only rehearsal of the tenant access matrix across roles, route/resource groups,
and allow/deny expectations.

Strictly forbidden:

1. Do not execute production deploy.
2. Do not execute production migration.
3. Do not write production D1.
4. Do not call production URL.
5. Do not execute production cutover.
6. Do not mark P0-006 Verified.
7. Do not remove legacy CORPID fallback.
8. Do not allow missing tenant claim to access tenant-scoped resources.
9. Do not treat frontend-submitted `tenant_id` as authority.
10. Do not commit secrets or print password/token/cookie.

Allowed:

1. staging/local rehearsal only.
2. access matrix rehearsal with deterministic claims/resources.
3. route/resource allow/deny evidence.
4. missing coverage report update.
5. rollback if any feature flag is used.
6. status report updates.

Required validation:

1. `npm run check`
2. `npm run security:secrets`
3. `npm run gate:commercial-launch`
4. `npm run test:tenant-claims`
5. `npm run test:tenant-claims-staging`
6. `npm run test:tenant-access-matrix`
7. `npm run rehearse:tenant-claims`
8. `npm run rehearse:tenant-claims-staging`
9. `npm run rehearse:tenant-access-matrix`
10. `npm run qa:employee-entry-staging` without confirmation flags, must remain `DRY_RUN_ONLY / MANUAL_REQUIRED`.

Completion rules:

- P0-006 remains Partial.
- Production remains `NO-GO`.
- If any feature flag is used, final state must be false.
- Do not enter production.
