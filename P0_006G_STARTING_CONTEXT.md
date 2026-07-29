# P0-006G Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging backfill reconciliation gate. This task is
staging/local only and does not deploy, migrate, read or write D1, call
production, change production auth behavior, remove legacy `CORPID`, or mutate
dashboard/history output.

## Prior Evidence

| Area                         | Evidence                                                      | Current Result  | Notes                                                                       |
| ---------------------------- | ------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| Local/staging rehearsal      | `TENANT_SCOPE_LOCAL_STAGING_REHEARSAL_RESULT.md`              | PASS            | Cross-tenant fixture denial passed with 0 leaks.                            |
| Staging shadow gate          | `TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md`                  | PASS            | Staging schema/counts were previously inspected with SELECT only.           |
| Route enforcement gate       | `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE_RESULT.md`       | PASS            | Route policy matrix passed with 11 scenarios.                               |
| Dashboard/history query gate | `TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE_RESULT.md` | PASS            | Legacy `CORPID` query over-selection is reduced by scoped query candidates. |
| Tenant readiness gate        | `TENANT_SCOPE_READINESS_GATE_RESULT.md`                       | MANUAL_REQUIRED | Static `CORPID` remains dominant in live Worker scope.                      |

## What P0-006F Proved

- Dashboard/history query candidates can remove cross-tenant rows from legacy
  `CORPID` results in fixture-based staging/local gate mode.
- Live Worker dashboard/history route handlers were not changed.
- Production remains disabled and NO-GO.

## What P0-006G Proves

- Legacy `CORPID` rows in the local/staging fixture can be mapped to canonical
  `company_id` / `property_id` candidates.
- Known property and company IDs exist for all fixture rows.
- Same-bed / same-CID cross-tenant collisions are visible as warnings and are
  resolved by canonical company/property scope.
- No migration or backfill command was executed.

## Minimum Safe Scope

- Static fixture reconciliation only.
- No staging D1 read/write.
- No production D1 read/write.
- No live query wiring.
- No legacy fallback removal.

## Not Proven

- Production rows are not backfilled.
- Staging D1 rows are not backfilled.
- Live Worker queries are not switched to canonical scope.
- Human tenancy model approval is still required.
- P0-006 is not Verified.
