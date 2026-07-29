# P0-006P Access Matrix Coverage Summary

Date: 2026-05-26, Asia/Dubai

Source: `TENANT_SCOPE_STAGING_ACCESS_MATRIX_REHEARSAL_RESULT.md`

| Metric          | Count | Notes                                                                |
| --------------- | ----: | -------------------------------------------------------------------- |
| Total scenarios |    31 | Full staging/local access matrix rehearsal.                          |
| PASS            |    28 | Automatically verified allow/deny/tamper/production-disabled rows.   |
| MANUAL_REQUIRED |     2 | `audit_logs`, `entry_events`.                                        |
| FAIL            |     0 | No failing role/resource combinations.                               |
| NOT_APPLICABLE  |     0 | Production disabled row is represented as PASS with disabled actual. |
| LEGACY_WARNING  |     1 | Legacy CORPID fallback remains warning-only.                         |

## Remaining Production Blockers

1. `audit_logs` tenant/property attribution requires dedicated staging evidence.
2. `entry_events` tenant/property attribution requires dedicated staging evidence.
3. Production JWT/session tenant claims are not live.
4. Production migration/backfill are not approved.
5. Production deploy/cutover are not approved.
6. Legacy CORPID fallback has not been retired.

Production remains `NO-GO`. P0-006 remains Partial.
