# Employee Entry Route Switch Rehearsal Result

Generated: 2026-05-24T23:36:49.524Z

Scope: P0-001J local/staging-only rehearsal for `POST /api/employee/entry`.

This rehearsal did not execute production deployment, staging deployment, production D1 migration, remote D1 migration, production config changes, or secret writes. It did not delete the legacy route or legacy fields.

## Result

| Check                                          | Result |
| ---------------------------------------------- | ------ |
| Overall                                        | PASS   |
| Production behavior remains legacy             | PASS   |
| Feature flag off remains legacy                | PASS   |
| Local/staging flag on adapter rehearsal        | PASS   |
| Invalid money rejected before legacy write     | PASS   |
| Owner/admin rejected in adapter rehearsal mode | PASS   |
| Voided row skipped before legacy write         | PASS   |
| Rollback by feature flag off                   | PASS   |

## Command

```text
node --test tests/employee-entry-route-switch-rehearsal.spec.mjs
```

## Output

```text
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ production APP_ENV keeps /api/employee/entry on legacy behavior even when adapter flag is true (8387.2506ms)
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ local flag off keeps legacy behavior and rollback path available (8436.6756ms)
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ local flag on runs adapter pre-validation before continuing legacy write (8496.3536ms)
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ local flag on rejects owner submitter before adapter rehearsal write (8366.1573ms)
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ local flag on rejects invalid money before legacy write (8526.595ms)
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local migration migrations\local\002_handover_atomic_staging.sql
PASS local dev seed app_settings for local-dev-company
✔ local flag on skips voided rows before legacy write (8542.6042ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 61820.7008

```
