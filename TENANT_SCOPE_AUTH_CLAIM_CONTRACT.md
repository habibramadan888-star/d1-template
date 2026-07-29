# Tenant Scope Auth Claim Contract

Date: 2026-05-26, Asia/Dubai

Scope: future auth/session claim contract for tenant/property routing. This is a
staging/local gate document and does not change production login behavior.

## Employee Claim

- `sub`: stable user identifier.
- `role`: `employee`.
- `employee_id`: employee identity used by employee entry and handover flows.
- `tenant_id`: future SaaS tenant authority.
- `corp_id`: legacy fallback / compatibility only.
- `allowed_property_ids`: property ids the employee may write/read.
- `permissions`: employee-scoped permissions such as `EMPLOYEE_ENTRY_WRITE`.
- `issued_at`: claim issue timestamp.
- `expires_at`: claim expiry timestamp.

## Owner Claim

- `sub`: stable user identifier.
- `role`: `owner`.
- `owner_id`: owner identity.
- `tenant_id`: future SaaS tenant authority.
- `allowed_property_ids`: explicit property ids or `*` for all reviewed tenant properties.
- `permissions`: owner-scoped permissions such as `DASHBOARD_READ` and `HISTORY_READ`.
- `issued_at`: claim issue timestamp.
- `expires_at`: claim expiry timestamp.

## Manager/Admin Claim

- `sub`: stable user identifier.
- `role`: `manager` or `admin`.
- `tenant_id`: future SaaS tenant authority.
- `allowed_property_ids`: explicit property ids or reviewed tenant-wide scope.
- `permissions`: constrained manager/admin permissions.
- `constraints`: future explicit tenant/property/admin boundaries.
- `issued_at`: claim issue timestamp.
- `expires_at`: claim expiry timestamp.

## Authority Rules

- `tenant_id` is the future SaaS authority.
- `corp_id` is legacy fallback only; it is not final SaaS tenant authority.
- Missing `tenant_id` must block production tenant-scoped access.
- Staging/local rehearsal may classify missing `tenant_id` plus `corp_id` as
  `LEGACY_FALLBACK_WARNING`, but this is not production-ready.
- Route/query scope must prefer `claim.tenant_id` and `claim.allowed_property_ids`.
- Frontend-submitted `tenant_id` or `property_id` is never authority.
- Employee access to another tenant/property must be denied.
- Legacy `CORPID` fallback remains preserved until an approved migration/cutover removes it.

## Production Status

Production remains `NO-GO`. This contract is a gate input only and does not approve production
deploy, production migration, production D1 write, or production cutover.
