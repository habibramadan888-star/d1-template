# NEXT PROMPT: P0-006C Tenant / Property Scope Local-Staging Rehearsal

Use after P0-008G receivables staging/local authority switch rehearsal is
reviewed and accepted.

```text
Enter TASK P0-006C: Tenant / property scope local-staging rehearsal.

Current state:
1. P0-008G receivables staging/local authority switch rehearsal passed.
2. P0-008 remains Partial, not Verified.
3. P0-006 tenant/property scope remains a production blocker.
4. Production cutover remains NO-GO.

Goal:
Run local/staging-only tenant/property scope rehearsal with fixtures, dry-run
scope checks, and cross-tenant denial tests.

Strictly forbidden:
1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag.
7. No production cutover.
8. No global tenant rewrite.
9. No production login behavior change.
10. No removal of legacy CORPID fallback.
11. Do not mark P0-006 Verified.
12. Do not mark P0-008 Verified.
13. Do not commit secrets.

Allowed:
1. Local/staging-only fixtures.
2. Cross-tenant denial tests.
3. Scope dry-run report.
4. Non-invasive query scope helper or test-only harness.
5. Dashboard/history evidence proving no unapproved live mutation.
6. Rollback plan.

Read first:
1. P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md
2. TENANT_SCOPE_READINESS_GATE_RESULT.md
3. TENANCY_SCOPE_AUDIT.md
4. TENANCY_MIGRATION_PLAN.md
5. TENANCY_TEST_PLAN.md
6. P0_008G_STARTING_CONTEXT.md
7. P0_008G_DASHBOARD_HISTORY_EVIDENCE.md
8. COMMERCIAL_LAUNCH_READINESS_RESULT.md

Required validation:
1. npm run format:check
2. npm run check
3. npm run security:secrets
4. npm run gate:commercial-launch
5. npm run gate:tenant-scope
6. npm run qa:employee-entry-staging without confirmation flags

Production must remain PRODUCTION_NO_GO.
```
