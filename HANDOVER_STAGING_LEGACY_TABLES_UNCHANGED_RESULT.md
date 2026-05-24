# Handover Staging Legacy Tables Unchanged Result

Generated: 2026-05-24T16:20:45.919Z

Scope: P0-002D local verification. This script executes the stable endpoint regression test and verifies that it still contains explicit staging-table write and legacy-table non-write assertions. No production Worker, remote D1, production migration, live handover switch, live dashboard change, or legacy financial table write was performed.

## Evidence Source

- Command: `node --test tests/handover-staging-endpoint.spec.mjs`
- Test file: `tests/handover-staging-endpoint.spec.mjs`

## Result

| Table Group                 | Expected Assertion                        | Result |
| --------------------------- | ----------------------------------------- | ------ |
| `handover_commits`          | count equals 1 after valid staging commit | PASS   |
| `handover_commit_rows`      | count equals 2 after valid staging commit | PASS   |
| `handover_idempotency_keys` | count equals 1 after valid staging commit | PASS   |
| `transactions`              | count remains 0                           | PASS   |
| `deposit_ledger`            | count remains 0                           | PASS   |
| `arrears`                   | count remains 0                           | PASS   |
| `audit_logs`                | handover staging audit evidence exists    | PASS   |
| `entry_events`              | handover commit accepted evidence exists  | PASS   |

```text
✔ production APP_ENV hides staging handover endpoint with 404 (1635.512ms)
✔ missing or disabled feature flag rejects before auth (3147.8973ms)
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ enabled staging handover endpoint enforces auth, roles, idempotency, totals, and staging writes (23533.8538ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 38944.7721

```

## Conclusion

PASS. Current automated evidence shows staging handover writes are isolated to staging/audit tables and do not write legacy live financial tables.
