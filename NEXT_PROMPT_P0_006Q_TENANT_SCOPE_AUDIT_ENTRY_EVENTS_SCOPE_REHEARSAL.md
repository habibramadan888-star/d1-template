# NEXT PROMPT: P0-006Q Tenant Scope Audit / Entry Events Scope Rehearsal

Enter TASK P0-006Q: Tenant scope audit_logs / entry_events scope rehearsal.

Current state:

- P0-006P completed.
- P0-006 status: `Partial - tenant scope staging access matrix rehearsal passed`.
- Tenant access matrix rehearsal: PASS.
- Cross-tenant and cross-property denial: PASS.
- Remaining manual-required coverage:
  - `audit_logs`
  - `entry_events`
- Production remains `NO-GO`.

Goal:

Close the two remaining tenant access matrix manual-required rows with staging/local-only audit
and entry event scope evidence.

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

1. staging/local only.
2. audit_logs and entry_events scope rehearsal.
3. read-only staging D1 verification if needed.
4. staging-only evidence fixtures if explicitly safe.
5. no production.
6. rollback if any feature flag is used.
7. P0-006 remains Partial.

Required validation:

1. `npm run check`
2. `npm run security:secrets`
3. `npm run gate:commercial-launch`
4. `npm run test:tenant-claims`
5. `npm run test:tenant-claims-staging`
6. `npm run test:tenant-access-matrix`
7. `npm run test:tenant-access-matrix-staging`
8. `npm run rehearse:tenant-claims`
9. `npm run rehearse:tenant-claims-staging`
10. `npm run rehearse:tenant-access-matrix`
11. `npm run rehearse:tenant-access-matrix-staging`
12. `npm run qa:employee-entry-staging` without confirmation flags; must remain `DRY_RUN_ONLY / MANUAL_REQUIRED`.

Completion rules:

- P0-006 remains Partial.
- Production remains `NO-GO`.
- Do not enter production.
