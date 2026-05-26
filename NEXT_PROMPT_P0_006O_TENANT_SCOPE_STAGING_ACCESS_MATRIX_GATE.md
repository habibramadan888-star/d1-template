# NEXT PROMPT: P0-006O Tenant Scope Staging Access Matrix Gate

Enter TASK P0-006O: Tenant scope staging access matrix gate.

Current status:

- P0-006N completed.
- P0-006 status: `Partial - tenant scope auth claim staging rehearsal passed`.
- Tenant auth claim staging rehearsal passed.
- Cross-tenant and cross-property denial passed.
- Frontend `tenant_id` tamper was ignored.
- Legacy `CORPID` fallback remains warning-only.
- Production remains `NO-GO`.

Goal:

Build and verify a staging/local access matrix for roles, routes, queries, resources, and
tenant/property scopes.

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No production D1 write.
4. No production URL calls.
5. No production cutover.
6. Do not mark P0-006 Verified.
7. Do not remove legacy CORPID fallback.
8. Do not change live dashboard or financial formula.
9. Do not commit secrets.
10. Do not print password/token/cookie.

Required scope:

1. staging/local only.
2. access matrix for employee / owner / manager / admin.
3. access matrix for sessions, transactions, arrears, deposits, audit logs, entry events,
   dashboard/history, settings.
4. no production deploy.
5. no production migration.
6. production cutover remains `NO-GO`.
7. P0-006 remains Partial.

Required validation:

- `npm run check`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run test:tenant-claims`
- `npm run test:tenant-claims-staging`
- `npm run qa:employee-entry-staging`

Expected final state:

- P0-006 remains Partial.
- Production remains `NO-GO`.
