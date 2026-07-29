# NEXT PROMPT: P0-008G Receivables Staging Authority Switch Rehearsal

Use only after P0-008F gate evidence is reviewed and accepted.

```text
Enter TASK P0-008G: Receivables staging authority switch rehearsal.

Current state:
1. P0-008F receivables staging authority switch gate passed.
2. ENABLE_RECEIVABLES_AUTHORITY_STAGING exists as a staging/local-only gate flag.
3. Six dashboard authority candidates matched in gate evidence:
   - rent received
   - rent due
   - arrears outstanding
   - due today
   - overdue amount
   - arrears total
4. Adjustment credit/debit remain accounting-review-required.
5. P0-008 remains Partial.
6. Production cutover remains NO-GO.

Goal:
Run a staging/local-only authority switch rehearsal behind ENABLE_RECEIVABLES_AUTHORITY_STAGING.

Strictly forbidden:
1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag.
7. No production cutover.
8. No dashboard live switch without explicit staging-only guard.
9. No secret commit.
10. Do not mark P0-008 Verified.

Allowed:
1. Staging/local only.
2. Feature flag required.
3. Dashboard/history before/during/after evidence.
4. Only switch matched authority candidates in staging/local rehearsal mode.
5. Keep accounting-review rows shadow-only.
6. Rollback required to false.
7. P0-008 remains Partial.

Rollback:
Set ENABLE_RECEIVABLES_AUTHORITY_STAGING=false and verify dashboard/history returns legacy/unchanged behavior.
```
