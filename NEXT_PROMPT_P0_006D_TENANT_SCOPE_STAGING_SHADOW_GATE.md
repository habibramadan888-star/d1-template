# NEXT PROMPT: P0-006D Tenant Scope Staging Shadow Gate

Use after P0-006C local/staging rehearsal evidence is reviewed and accepted.

```text
Enter TASK P0-006D: Tenant scope staging shadow gate.

Current state:
1. P0-006C tenant/property local-staging rehearsal passed.
2. Cross-tenant denial fixtures passed locally.
3. P0-006 remains Partial, not Verified.
4. Production cutover remains NO-GO.

Goal:
Run a staging/local shadow gate for tenant/property scope without changing live
dashboard/history behavior.

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
1. Read-only staging/local tenant scope shadow comparison.
2. Staging/local feature flag plan if final state rolls back false.
3. Dashboard/history shadow evidence.
4. Cross-tenant denial test expansion.
5. Migration/backfill draft review without execution.

Required validation:
1. npm run format:check
2. npm run check
3. npm run security:secrets
4. npm run gate:commercial-launch
5. npm run gate:tenant-scope
6. npm run test:tenant-scope
7. npm run rehearse:tenant-scope
8. npm run qa:employee-entry-staging without confirmation flags

Production must remain PRODUCTION_NO_GO.
```
