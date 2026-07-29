# P0-006O Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging/local access matrix gate. No production deploy, production
migration, production D1 write, production URL call, staging D1 write, dashboard mutation,
live financial formula change, production feature flag enablement, or secret exposure occurred.

## What P0-006N Proved

1. Tenant auth claims can drive staging/local route and query scope checks.
2. Employee, owner, and manager claims can be converted into tenant-scope actor and
   membership inputs.
3. Cross-tenant and cross-property access are denied in deterministic rehearsal
   scenarios.
4. Frontend-submitted `tenant_id` is ignored as authority.
5. Legacy `CORPID` fallback remains preserved as warning-only compatibility.
6. Production remains disabled/no-go even if the staging rehearsal flag is true.

## What P0-006N Did Not Prove

1. It did not build a full role/resource access matrix.
2. It did not cover every core table/API combination.
3. It did not use real production auth/session claims.
4. It did not apply production migration, production backfill, or production route/query
   cutover.
5. It did not remove legacy `CORPID` fallback.

## Roles Already Covered

- Employee with `employee_id`, `tenant_id`, and property membership.
- Owner with `owner_id`, `tenant_id`, and tenant-wide property scope.
- Manager/admin with explicit tenant/property constraints.
- Legacy employee claim with `corp_id` fallback and missing `tenant_id`.

## Resources Already Covered

- Employee entry.
- Handover.
- Dashboard/history query scope.
- Rent config read/write scope.
- Sessions and transactions in route/query policy rehearsal.
- Cross-tenant and cross-property denial paths.

## Missing Access Matrix Coverage Before This Task

- Unauthenticated and invalid JWT coverage in the tenant access matrix.
- Deposit ledger, arrears, export/report, void/delete-session, settings/app_settings,
  customer/tenant records, property/room/unit records.
- Audit logs and entry events as explicit manual-production-review rows.

## Minimum Safe Scope

- Use deterministic staging/local claims and resource fixtures.
- Exercise policy helpers only.
- Generate matrix, rehearsal report, and coverage gaps.
- Do not call production.
- Do not read or write D1.
- Do not change live Worker login, route, dashboard, or financial logic.

## Production NO-GO

Production remains `NO-GO` because P0-006 is still Partial, production tenant auth claim
issuance is not live, production migration/backfill are not approved, live route/query cutover is
not approved, and this access matrix gate is staging/local evidence only.
