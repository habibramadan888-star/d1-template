# Tenant and Property Scope Isolation Audit

Generated: 2026-05-29
Scope: static audit only. No D1 write, no migration, no deploy.

## Current Evidence

| Area | Evidence | Current State | Risk |
|---|---|---|---|
| Auth claims tests | `tests/tenant-scope-auth-claims.spec.mjs`, `tests/tenant-scope-local-staging.spec.mjs`, and staging route tests cover tenant/property authorization scenarios. | Good test model exists. | MEDIUM |
| Worker live-compatible queries | Many Worker queries filter by `corpid`, for example sessions/history/arrears/transactions. | Legacy tenant isolation relies mainly on `corpid`. | HIGH |
| Property scope | Staging handover path includes `company_id` and `property_id` and checks employee scope. | Strong staging path. | MEDIUM |
| Production readiness | Tests include warnings for legacy `corpid` fallback and missing `tenant_id`. | Not fully production-ready. | CRITICAL |

## Required Isolation Rules

| Role | Read Scope | Write Scope |
|---|---|---|
| employee/staff | Own tenant plus allowed properties only. | Own allowed properties only. |
| owner/manager | Own tenant all properties unless policy narrows scope. | Own tenant only. |
| readonly_admin/admin_readonly | Own tenant all data read-only. | No writes. |
| unknown/unauthenticated | No data. | No writes. |

## API Review Checklist

| API Area | Required Filter | Current Audit Result |
|---|---|---|
| `/api/history` | tenant/company plus property where applicable | Uses `corpid`; has limit/offset. Needs company/property cutover evidence. |
| `/api/arrears` | tenant/company plus property where applicable | Uses `corpid`; legacy arrears fallback remains. |
| dashboard totals | tenant/company plus property where applicable | Staging tests exist; live Worker still legacy compatible. |
| handover staging | company/property/idempotency scope | Stronger scoped implementation present. |
| audit logs/events | tenant/company plus role scope | Tests exist; full live access policy needs sign-off. |

## Findings

- Tenant/property isolation is well represented in tests and staging helpers.
- The active Worker still contains legacy `corpid` queries; this is a known compatibility risk.
- The safe production direction is to make `tenant_id/company_id + allowed_property_ids` the backend authority and keep frontend values ignored.

## Decision

| Item | Result |
|---|---|
| Cross-tenant protection fully proven live | No |
| Staging tenant/property model exists | Yes |
| Legacy `corpid` fallback remains | Yes |
| Production cutover | PRODUCTION_NO_GO |
