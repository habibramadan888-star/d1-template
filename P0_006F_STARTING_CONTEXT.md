# P0-006F Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging dashboard/history query gate. This task is
staging/local only and does not deploy, migrate, read or write D1, call
production, change production auth behavior, remove legacy `CORPID`, or mutate
dashboard/history output.

## Prior Evidence

| Area                    | Evidence                                                | Current Result  | Notes                                                       |
| ----------------------- | ------------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| Local/staging rehearsal | `TENANT_SCOPE_LOCAL_STAGING_REHEARSAL_RESULT.md`        | PASS            | Fixture-based cross-tenant denial passed with 0 leaks.      |
| Staging shadow gate     | `TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md`            | PASS            | Staging D1 schema/counts were read with SELECT only.        |
| Route enforcement gate  | `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE_RESULT.md` | PASS            | Route policy matrix passed with 11 scenarios and 0 blocked. |
| Tenant readiness gate   | `TENANT_SCOPE_READINESS_GATE_RESULT.md`                 | MANUAL_REQUIRED | Static `CORPID` remains dominant in live Worker scope.      |

## What P0-006E Proved

- Owner and employee route-level membership decisions can be evaluated in
  staging/local gate logic.
- Same legacy `corpid` no longer grants cross-company route access in the gate
  matrix.
- Production remains disabled even if the staging route enforcement flag input
  is true.

## What P0-006F Proves

- Legacy dashboard/history queries that select by `CORPID` can be compared
  against company/property-scoped query candidates.
- Owner A and owner B dashboard/history scenarios remove cross-tenant rows from
  legacy `CORPID` results.
- Query gate mode remains production-disabled and mutation-disabled.
- Live dashboard/history route handlers remain unchanged.

## Minimum Safe Scope

- Add `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING` as a
  production-disabled local/staging gate flag.
- Add pure query-comparison tests and a report-generating gate script.
- Keep query mutation disabled in gate mode.
- Keep dashboard/history output unchanged.
- Keep legacy `CORPID` fallback in place until an approved migration/backfill
  task.

## Not Proven

- Live Worker dashboard/history routes are not wired to the new query gate.
- Production auth, production queries, production schema, and production data are
  unchanged.
- Legacy rows have not been backfilled with canonical tenant/property IDs.
- P0-006 is not Verified.
