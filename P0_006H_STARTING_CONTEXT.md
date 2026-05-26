# P0-006H Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging backfill dry-run. This task is staging read-only and
does not deploy, migrate, write D1 rows, call production, change production auth
behavior, remove legacy `CORPID`, or mutate dashboard/history output.

## Prior Evidence

| Area                         | Evidence                                                      | Current Result  | Notes                                                                |
| ---------------------------- | ------------------------------------------------------------- | --------------- | -------------------------------------------------------------------- |
| Local/staging rehearsal      | `TENANT_SCOPE_LOCAL_STAGING_REHEARSAL_RESULT.md`              | PASS            | Cross-tenant fixture denial passed with 0 leaks.                     |
| Staging shadow gate          | `TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md`                  | PASS            | Staging schema/counts were previously inspected with SELECT only.    |
| Route enforcement gate       | `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE_RESULT.md`       | PASS            | Route policy matrix passed with 11 scenarios.                        |
| Dashboard/history query gate | `TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE_RESULT.md` | PASS            | Scoped query candidates reduce legacy `CORPID` over-selection.       |
| Backfill reconciliation      | `TENANT_SCOPE_BACKFILL_RECONCILIATION_RESULT.md`              | PASS            | Fixture rows are mappable with 2 explicit legacy collision warnings. |
| Tenant readiness gate        | `TENANT_SCOPE_READINESS_GATE_RESULT.md`                       | MANUAL_REQUIRED | Static `CORPID` remains dominant in live Worker scope.               |

## What P0-006G Proved

- Static fixture rows can be mapped to canonical `company_id` / `property_id`
  candidates.
- Same-bed and same-CID collisions are visible as warnings.
- No D1 read/write, migration, deployment, live query wiring, or fallback
  removal occurred.

## What P0-006H Proves

- Staging D1 target can be confirmed as `homelink-finance-staging`
  (`4ff78bfc-3855-436b-aefb-6b492145d79c`).
- Staging table schema and counts can be inspected using SELECT only.
- Legacy `CORPID` tables can be classified into draft backfill plan categories
  without generating executable writes.
- Existing staging handover tables with `company_id` and `property_id` require
  no update in this dry-run.

## Minimum Safe Scope

- Read-only staging D1 schema and row-count SELECTs.
- Draft update-plan classification only.
- No staging writes.
- No production commands.
- No live dashboard/history switch.
- No legacy `CORPID` fallback removal.

## Not Proven

- Staging rows were not backfilled.
- Production rows were not backfilled.
- Live Worker queries were not switched to canonical scope.
- Backfill SQL was not approved or executed.
- P0-006 is not Verified.
