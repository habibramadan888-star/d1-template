# NEXT PROMPT: P0-006F Tenant Scope Staging Dashboard / History Query Gate

Use only after P0-006E route enforcement gate evidence is reviewed.

```text
Enter TASK P0-006F: Tenant scope staging dashboard/history query gate.

Current state:
1. P0-006E tenant scope staging route enforcement gate passed.
2. Route enforcement is still policy-only; live Worker routes are not rewired.
3. P0-006 remains Partial, not Verified.
4. Production cutover remains NO-GO.

Goal:
Design and rehearse staging/local dashboard/history query scoping without
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
1. Local/staging dashboard/history query design.
2. Read-only query comparison using fixtures or staging SELECT.
3. Staging/local feature flag guard with rollback false.
4. Tests for owner cross-tenant denial.
5. Dashboard/history diff evidence.
6. Migration/backfill draft review without execution.

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
10. npm run test:tenant-scope-route-gate
11. npm run gate:tenant-scope-route-enforcement
12. npm run qa:employee-entry-staging without confirmation flags

Production must remain PRODUCTION_NO_GO.
```
