# NEXT PROMPT: P0-006E Tenant Scope Staging Route Enforcement Gate

Use only after P0-006D tenant scope staging shadow gate evidence is reviewed.

```text
Enter TASK P0-006E: Tenant scope staging route enforcement gate.

Current state:
1. P0-006D tenant scope staging shadow gate passed.
2. Staging shadow comparison read homelink-finance-staging with SELECT only.
3. Legacy corpid tables remain shadow-only warnings.
4. P0-006 remains Partial, not Verified.
5. Production cutover remains NO-GO.

Goal:
Design and rehearse staging/local-only tenant-scope route enforcement without
production deploy, production migration, production D1 write, production URL
call, production auth change, or removal of legacy CORPID fallback.

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
12. Do not commit secrets.

Allowed:
1. Local/staging route enforcement design.
2. Staging/local feature flag guard with rollback false.
3. Tests for owner/employee cross-tenant denial.
4. Dashboard/history non-mutation evidence.
5. Migration/backfill draft review without execution.

Required validation:
1. npm run format:check
2. npm run check
3. npm run security:secrets
4. npm run gate:commercial-launch
5. npm run gate:tenant-scope
6. npm run test:tenant-scope
7. npm run rehearse:tenant-scope
8. npm run test:tenant-scope-staging-shadow
9. npm run compare:staging-tenant-scope
10. npm run qa:employee-entry-staging without confirmation flags

Production must remain PRODUCTION_NO_GO.
```
