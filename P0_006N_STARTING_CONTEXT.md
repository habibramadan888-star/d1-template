# P0-006N Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope auth claim staging rehearsal. No production deploy, production
migration, production D1 write, production URL call, staging D1 write, dashboard mutation,
live financial formula change, production feature flag enablement, or secret exposure occurred.

## What P0-006M Proved

- A non-invasive tenant auth claim helper can build employee, owner, manager, and admin
  claim shapes.
- Missing `tenant_id` with legacy `corp_id` is a staging warning and production-unsafe.
- Frontend-submitted `tenant_id` is ignored as authority.
- Cross-tenant and cross-property access are denied by helper policy.
- Claim-derived actor and membership can feed the existing tenant route/query policy helper.
- Live Worker login/session behavior was not changed.

## What P0-006M Did Not Prove

- It did not execute a broader staging/local route/query rehearsal using auth claims.
- It did not wire live Worker login/session JWT claims.
- It did not read or write staging D1.
- It did not approve production tenant authority, production migration, or production cutover.

## Claim Contract Readiness

The claim contract is sufficient for staging/local rehearsal:

- Employee claims provide `sub`, `role=employee`, `employee_id`, `tenant_id`,
  `allowed_property_ids`, and legacy `corp_id` fallback.
- Owner claims provide `owner_id`, `tenant_id`, and tenant-wide reviewed property scope.
- Manager/admin claims are constrained by explicit tenant/property scope.

## Route/Query Rehearsal Scope

Ready for staging/local claim-driven rehearsal:

- `/api/employee/entry`
- `/api/staging/handover/commit`
- `/api/history`
- `/api/rent_config`
- dashboard/history scoped query policy
- sessions / transactions / audit/event row policy helpers

Legacy fallback only:

- legacy `CORPID` rows without authoritative `tenant_id`
- settings/app_settings tenant split
- production live JWT/session claim propagation

Manual review remains required for production migration, production backfill, live login/session
claim issuance, and eventual legacy fallback retirement.

## Minimum Safe Scope

- Use deterministic staging/local test claims.
- Use existing route/query policy helpers.
- Do not call production.
- Do not write D1.
- Do not change live Worker behavior.

## Rollback

The rehearsal uses in-process guard values only. Rollback is `ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING=false`,
which restores legacy/no-claim mode. No remote feature flag was changed.
