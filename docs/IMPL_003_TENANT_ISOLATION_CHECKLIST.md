# IMPL-003 Tenant and Property Scope Isolation Checklist

Generated: 2026-05-29
Scope: implementation handoff. No code change, no D1 write, no deploy.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Tenant tests | `tests/tenant-scope*.spec.mjs` cover claims, routes, query gates, backfill, and staging wiring. | Strong staging coverage. |
| Worker legacy queries | Many active queries still filter by `corpid`. | Legacy fallback remains. |
| Staging scoped tables | Handover staging tables use `company_id` and `property_id`. | Good target pattern. |

## Required Scope Rule

Every read and write must derive scope from server auth claims:

- `tenant_id` or canonical company id from backend session.
- `allowed_property_ids` from backend identity.
- Frontend-provided tenant/property values are request target only, never authority.
- `readonly_admin` can read all tenant data and cannot write.

## Endpoint Classes To Close

| Class | Required Scope |
|---|---|
| Dashboard/history | tenant/company plus property where applicable |
| Customers/client credit | tenant/company plus property where applicable |
| Arrears/receivables | tenant/company plus property/customer where applicable |
| Employee entry | employee allowed property only |
| Settings | manager role plus scoped property |
| Audit/events | owner/admin tenant scope, employee own evidence only if policy allows |

## Implementation Steps

1. Introduce a shared query-scope helper for Worker routes.
2. Convert each list endpoint from `corpid`-only to canonical tenant/company scope.
3. Add property filters for employee and manager scoped routes.
4. Preserve legacy fallback behind explicit staging flag only.
5. Add route-level tests for deny/allow matrices.
6. Keep production switch disabled until backfill reconciliation passes.

## Tests To Add Or Extend

- Employee own property allowed.
- Employee other property denied.
- Owner own tenant allowed.
- Owner other tenant denied.
- Manager constrained by property.
- Frontend tenant/property tamper ignored.
- Dashboard/history cross-tenant rows filtered.
- Production switch remains no-go.

## Exit Criteria

| Item | Required |
|---|---|
| `corpid` fallback removed or gated | Yes |
| All list endpoints scoped | Yes |
| All mutation endpoints scoped | Yes |
| Backfill reconciliation | Required |
| Production state | PRODUCTION_NO_GO until signed off |
