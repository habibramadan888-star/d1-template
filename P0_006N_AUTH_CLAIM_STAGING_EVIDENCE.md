# P0-006N Auth Claim Staging Evidence

Date: 2026-05-26, Asia/Dubai

Evidence source: `TENANT_SCOPE_AUTH_CLAIM_STAGING_REHEARSAL_RESULT.md`

## Employee Claim Evidence

- Employee claim with `tenant_id=company_a`, `employee_id=employee_a_1`, and
  `allowed_property_ids=property_a_1` can access own tenant/property.
- Employee access to another tenant is denied.
- Employee access to another property is denied.

## Owner Claim Evidence

- Owner claim with `tenant_id=company_a` and reviewed tenant-wide property scope can access
  tenant-level history.
- Owner access to another tenant is denied.

## Manager/Admin Claim Evidence

- Manager claim is constrained by `tenant_id` and explicit `allowed_property_ids`.
- Manager access to allowed property is permitted for configured action.
- Manager access to another property is denied.

## Cross-Tenant And Cross-Property Evidence

- Cross-tenant denied: yes.
- Cross-property denied: yes.
- Missing tenant claim is production-unsafe.

## Frontend Tamper Evidence

- Frontend-submitted `tenant_id=company_b` is ignored.
- Server-side claim remains `tenant_id=company_a`.
- Frontend totals or frontend tenant hints are not authority.

## Legacy Fallback Evidence

- Legacy `CORPID` fallback remains preserved.
- Legacy fallback is warning-only in staging/local.
- Legacy fallback is not production SaaS authority.

## Route/Query Integration Evidence

- Claim-derived actor and membership can feed route enforcement helpers.
- Claim-derived owner scope can feed dashboard/history query helpers.
- Scoped query removes cross-tenant rows from legacy `CORPID` results.

## Remaining Production Blockers

- Live JWT/session claim propagation is not implemented.
- Production tenant migration is not approved.
- Production backfill is not approved.
- Production route/query cutover is not approved.
- P0-006 remains Partial, not Verified.
