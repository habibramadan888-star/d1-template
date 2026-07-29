# Tenant Scope Staging Dashboard/History Query Plan

Date: 2026-05-26, Asia/Dubai

This plan covers staging/local query scoping only. It does not alter production,
deploy Workers, execute migrations, read or write D1, mutate live
dashboard/history responses, or remove the legacy `CORPID` fallback.

| Query Area                       | Legacy Source                         | Scoped Candidate                           | Gate Mode             | Production Switch | Notes                                                  |
| -------------------------------- | ------------------------------------- | ------------------------------------------ | --------------------- | ----------------- | ------------------------------------------------------ |
| Owner history                    | `CORPID` filtered history rows        | Company/property membership filtered rows  | STAGING_QUERY_GATE    | NO-GO             | Cross-company rows must be removed from legacy result. |
| Owner dashboard active totals    | `CORPID` filtered active rows         | Company/property membership filtered rows  | STAGING_QUERY_GATE    | NO-GO             | This gate does not replace dashboard totals.           |
| Owner dashboard history relation | Legacy joined rows by shared `CORPID` | Membership-scoped rows by company/property | STAGING_QUERY_GATE    | NO-GO             | Shadow comparison only.                                |
| Employee owner dashboard access  | Role policy denial                    | No owner dashboard query                   | ROUTE_GATE_DEPENDENCY | NO-GO             | Covered by route gate, not switched here.              |
| Tenant backfill readiness        | Existing legacy rows                  | Future canonical company/property columns  | FUTURE_BACKFILL       | NO-GO             | Requires P0-006G and human review.                     |

## Guard

Feature flag: `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING`

| Env               | Flag  | Expected Behavior          |
| ----------------- | ----- | -------------------------- |
| production        | true  | disabled                   |
| production        | false | disabled                   |
| staging           | false | legacy                     |
| staging           | true  | query gate comparison only |
| missing `APP_ENV` | any   | production-safe disabled   |

## Rollback

Rollback is to keep or set
`ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING=false`. Because this task
does not enable a remote flag, wire live routes, or write data, rollback evidence
is local/static only.
