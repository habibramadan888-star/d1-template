# NEXT PROMPT: P0-008F Receivables Staging Authority Switch Gate

Use only after P0-008E staging shadow rehearsal evidence is reviewed and accepted.

```text
Enter TASK P0-008F: Receivables staging authority switch gate.

Current state:
1. P0-008E receivables staging shadow rehearsal passed.
2. Due today, overdue, short pay, repayment, adjustment, deposit exclusion, and void impact evidence exists.
3. P0-008 remains Partial.
4. Production cutover remains NO-GO.

Goal:
Define and test a staging/local-only gate for a future receivables dashboard authority switch.

Strictly forbidden:
1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag.
7. No production cutover.
8. No live dashboard switch without an explicit staging gate.
9. No secret commit.
10. Do not mark P0-008 Verified.

Allowed:
1. Staging/local only.
2. Feature flag required.
3. Shadow/current dashboard comparison.
4. Dashboard before/during/after evidence.
5. Rollback required to false.
6. P0-008 remains Partial.

Rollback:
If a staging/local feature flag is enabled, set it back to false and verify dashboard remains legacy/unchanged.
```
