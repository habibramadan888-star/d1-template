# P0-006P Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging/local access matrix rehearsal. No production deploy, production
migration, production D1 write, production URL call, staging D1 write, dashboard mutation,
live financial formula change, production feature flag enablement, or secret exposure occurred.

## What P0-006O Proved

1. A deterministic tenant access matrix can cover employee, owner, manager, admin,
   unauthenticated, and invalid JWT scenarios.
2. Core tenant/property allow/deny expectations are expressible through the existing
   auth-claim and route/query policy helpers.
3. Cross-tenant and cross-property access is denied in the matrix.
4. Frontend-submitted `tenant_id` remains non-authoritative.
5. Legacy `CORPID` fallback remains warning-only.
6. Production remains disabled/no-go.

## What P0-006O Did Not Prove

1. It did not convert the matrix into P0-006P rehearsal result semantics.
2. It did not close the `audit_logs` and `entry_events` documented-only rows.
3. It did not validate production JWT/session claim propagation.
4. It did not execute production migration, production backfill, or production cutover.
5. It did not read or write staging D1.

## Gate-Passed Scenarios

- Unauthenticated and invalid JWT denial.
- Employee own tenant/property allow.
- Employee cross-tenant/cross-property denial.
- Owner tenant-level dashboard/history, sessions, transactions, deposits, arrears,
  export/report, and void scope.
- Manager/admin tenant/property constraints.
- Delete-session / void scope.
- Frontend tenant tamper ignored.
- Legacy `CORPID` warning preserved.
- Production authority disabled/no-go.

## Documented-Only / Manual-Required Rows

1. `audit_logs`
2. `entry_events`

These remain manual-required because production-grade audit attribution and live write-path event
scope require dedicated staging evidence. P0-006P records them as `MANUAL_REQUIRED`, not `PASS`.

## Minimum Safe Scope

- Reuse deterministic staging/local access matrix fixtures.
- Convert matrix rows into rehearsal semantics: `PASS`, `FAIL`, `MANUAL_REQUIRED`,
  `NOT_APPLICABLE`, and `LEGACY_WARNING`.
- Do not call production.
- Do not read or write D1.
- Do not change live Worker behavior, dashboard, or financial formula.

## Production NO-GO

Production remains `NO-GO` because P0-006 is still Partial, production JWT/session tenant claims
are not live, `audit_logs` / `entry_events` still need dedicated scope evidence, production
migration/backfill are not approved, and production cutover is not approved.
