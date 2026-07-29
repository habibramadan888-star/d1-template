# NEXT PROMPT: P0-006N Tenant Scope Auth Claim Staging Rehearsal

Enter TASK P0-006N: Tenant scope auth claim staging rehearsal.

Current status:

- P0-006M completed.
- P0-006 status: `Partial - tenant scope auth/session claim gate ready`.
- Tenant auth claim helper and tests are present.
- `npm run test:tenant-claims` passes.
- `npm run rehearse:tenant-claims` passes.
- Production cutover remains `NO-GO`.

Goal:

Run a staging/local-only auth claim rehearsal that proves route/query gates can consume reviewed
tenant/property claims without changing production behavior.

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No production D1 write.
4. No production URL calls.
5. No production cutover.
6. No secret commit.
7. No password/token/cookie printing.
8. Do not mark P0-006 Verified.
9. Do not remove legacy CORPID fallback.
10. Do not change live dashboard or financial formula.

Allowed:

1. Staging/local-only rehearsal.
2. Use feature flag only if runtime behavior changes.
3. If a feature flag is used, rollback must set it false.
4. Read-only evidence is allowed.
5. Generate reports and tests.

Required validation:

- `npm run check`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run test:tenant-claims`
- `npm run rehearse:tenant-claims`
- `npm run qa:employee-entry-staging`

Expected final state:

- P0-006 remains Partial.
- Production remains `NO-GO`.
- No production deploy, migration, D1 write, or cutover.
