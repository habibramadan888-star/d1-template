# NEXT PROMPT: P0-008E Receivables Staging Shadow Rehearsal

Use only after P0-008D gate evidence is reviewed and accepted.

```text
Enter TASK P0-008E: Receivables staging shadow rehearsal.

Current state:
1. P0-008D receivables staging shadow gate passed.
2. Receivables shadow comparison has no mismatch or blocker.
3. Current staging data still needs more due/overdue/repayment/adjustment cases.
4. P0-008 remains Partial.
5. Production cutover remains NO-GO.

Goal:
Run a staging/local receivables shadow rehearsal behind:
ENABLE_RECEIVABLES_SHADOW_STAGING=true

Strictly forbidden:
1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag.
7. No production cutover.
8. No dashboard live switch.
9. No secret commit.
10. Do not mark P0-008 Verified.

Allowed:
1. Staging/local only.
2. Feature flag required.
3. Read-only shadow comparison by default.
4. Dashboard before/during/after evidence.
5. Due/overdue/arrears shadow evidence.
6. Rollback required to ENABLE_RECEIVABLES_SHADOW_STAGING=false.
7. P0-008 remains Partial.

Rollback:
After rehearsal, set ENABLE_RECEIVABLES_SHADOW_STAGING=false and verify dashboard remains legacy/unchanged.
```
