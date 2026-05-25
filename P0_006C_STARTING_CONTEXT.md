# P0-006C Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant/property scope local-staging rehearsal. This task does not deploy,
migrate, read or write D1, call production, change login behavior, remove legacy
`CORPID`, or rewrite live API queries.

## Prior Position

| Area               | Evidence                                | Current Result  | Notes                                                                                      |
| ------------------ | --------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Tenant scope audit | `TENANCY_SCOPE_AUDIT.md`                | Partial         | Current live scope still relies heavily on deployment-wide `CORPID`.                       |
| Migration plan     | `TENANCY_MIGRATION_PLAN.md`             | Planned         | Company/property/membership target model exists, but production migration is not approved. |
| Test plan          | `TENANCY_TEST_PLAN.md`                  | Planned         | Cross-tenant denial scenarios are defined.                                                 |
| Readiness gate     | `TENANT_SCOPE_READINESS_GATE_RESULT.md` | MANUAL_REQUIRED | Read-only gate still sees static `CORPID` reliance.                                        |
| P0-008 dependency  | `P0_008G_STARTING_CONTEXT.md`           | Partial         | Receivables authority rehearsal passed, but production remains NO-GO.                      |

## What P0-006C Proves

- Owner A can read only Company A/property rows in local/staging fixtures.
- Owner A is denied Company B data even when legacy `corpid`, bed, or CID values
  overlap.
- Employee A can write only assigned property entry scope.
- Employee A is denied another property and owner-only dashboard scope.
- Missing membership denies access.
- Dashboard/history helpers remain non-mutating.

## What P0-006C Does Not Prove

- It does not change production auth.
- It does not rewrite live dashboard/history SQL.
- It does not migrate legacy rows to `company_id` / `property_id`.
- It does not remove the legacy `CORPID` fallback.
- It does not verify P0-006 for production.

## Production Boundary

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL call: no.
- Staging D1 write: no.
- Production cutover: NO-GO.
- P0-006 status after success: Partial only, not Verified.
