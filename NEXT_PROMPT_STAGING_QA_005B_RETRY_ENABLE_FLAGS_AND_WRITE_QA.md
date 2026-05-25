# NEXT PROMPT: Retry STAGING-QA-005B

Task: retry staging-only feature flag enablement, execute real staging write QA, then rollback.

Precondition now satisfied:

- `npm run check` has recovered after the TEST-STABILITY-001 Worker readiness harness fix.

Strict requirements:

1. Human approval is still required before enabling staging flags.
2. Only target Worker `homelink-finance-staging`.
3. Only call URL `https://homelink-finance-staging.habibramadan888.workers.dev`.
4. Enable only staging flags:
   - `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`
   - `ENABLE_HANDOVER_ATOMIC_STAGING=true`
5. Execute real staging write QA only with:
   - `--confirm-staging-write`
   - `--confirm-backup`
   - `--confirm-rollback`
6. Roll both flags back to `false` after QA, regardless of QA success/failure.
7. Verify post-rollback disabled behavior.
8. Keep `gate:commercial-launch = PRODUCTION_NO_GO`.

Forbidden:

1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production URL calls.
5. No production D1 writes.
6. No production feature flags.
7. No secret/password/token/cookie output.
8. Do not mark P0-001 or P0-002 Verified.
9. Do not enter production cutover.
