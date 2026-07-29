# P0-006E Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging route enforcement gate. This task is staging/local
only and does not deploy, migrate, read or write D1, call production, change
production auth behavior, remove legacy `CORPID`, or mutate dashboard/history
output.

## Prior Evidence

| Area                    | Evidence                                         | Current Result  | Notes                                                              |
| ----------------------- | ------------------------------------------------ | --------------- | ------------------------------------------------------------------ |
| Local/staging rehearsal | `TENANT_SCOPE_LOCAL_STAGING_REHEARSAL_RESULT.md` | PASS            | Fixture-based cross-tenant denial passed with 0 leaks.             |
| Staging shadow gate     | `TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md`     | PASS            | Staging D1 schema/counts were read with SELECT only.               |
| Tenant readiness gate   | `TENANT_SCOPE_READINESS_GATE_RESULT.md`          | MANUAL_REQUIRED | Static `CORPID` remains dominant in live Worker scope.             |
| API inventory           | `API_INVENTORY.md`                               | MANUAL RISK     | Live routes still list `corpid` filters for many sensitive routes. |

## What P0-006D Proved

- Staging D1 can be inspected for tenant-scope risk without writes.
- Handover staging tables already include `company_id` / `property_id`.
- Legacy `corpid` tables remain warning-only and are not production switch
  candidates.
- Dashboard/history live results were not mutated.

## What P0-006E Proves

- A staging/local route-enforcement policy can evaluate owner and employee
  membership decisions for sensitive routes.
- Same legacy `corpid` no longer grants cross-company access in the gate
  matrix.
- Employee route access is property-scoped in gate logic.
- Owner-only writes such as rent config and void remain denied to employees.
- Production remains disabled even if the staging route enforcement flag input
  is true.

## What P0-006E Does Not Prove

- It does not wire live Worker routes to tenant enforcement.
- It does not change production auth or login behavior.
- It does not migrate legacy rows to `company_id` / `property_id`.
- It does not remove legacy `CORPID` fallback.
- It does not make P0-006 Verified.

## Minimum Safe Scope

- Add `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING` as a production-disabled
  local/staging gate flag.
- Add pure route-policy tests and a report-generating gate script.
- Keep route mutation disabled in gate mode.
- Keep dashboard/history output unchanged.
