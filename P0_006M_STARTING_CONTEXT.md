# P0-006M Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope auth/session claim gate. No production deploy, production migration,
production D1 write, staging D1 write, dashboard mutation, live financial formula change,
feature flag enablement, or secret exposure occurred.

## What P0-006L Proved

- Tenant scope route/query wiring can be evaluated in staging/local mode without changing
  live Worker behavior.
- Route enforcement rehearsal passed 11 owner/employee allow/deny scenarios.
- Dashboard/history query rehearsal passed 4 scoped query scenarios.
- Scoped query rehearsal removed 6 cross-tenant rows from legacy `CORPID` results.
- Route/query rehearsal can roll back to false / legacy behavior.
- Production remains disabled even if rehearsal flags are true.

## What P0-006L Did Not Prove

- Current login/session/JWT does not yet carry tenant/property membership claims.
- Current `/api/me` still returns only legacy identity fields: `userid`, `employee_name`,
  `corpid`, `role`, and `isManager`.
- Route/query wiring still needs a reviewed auth claim source before live staging wiring.
- Legacy `CORPID` fallback remains compatibility-only and is not final SaaS isolation.
- Production tenant/property authority remains unapproved.

## Current Route/Query Wiring Scope Inputs

- `tenant_id` / company scope.
- `property_id` or `allowed_property_ids`.
- `role`.
- `employee_id`, `owner_id`, or manager/admin identity.
- Legacy `corpid` only as compatibility fallback.

## Current Auth/Session Tenant Claim State

- JWT payload currently includes `role`, `userid`, `corpid`, `sid`, and `employee_name`.
- `active_sessions` currently stores `sid`, `corpid`, `userid`, and `role`.
- `employee_users` currently provides employee identity and role but not complete
  tenant/property membership claims.
- `USER_ACCOUNTS` supports manager/staff users but does not define tenant/property claim
  contract.

## Tenant Claim Gaps

- Missing future authoritative `tenant_id`.
- Missing explicit `allowed_property_ids`.
- Missing owner/manager/admin tenant constraints.
- Missing claim-to-route/query consumption contract.
- Missing production rule that absent `tenant_id` must block tenant-scoped SaaS access.

## Minimum Safe Scope

- Add a non-invasive tenant auth claim helper.
- Add local/staging tests and rehearsal evidence.
- Keep live login/session behavior unchanged.
- Keep legacy `CORPID` fallback documented and preserved.
- Keep production disabled and NO-GO.

## Rollback Mechanism

This task does not change runtime auth wiring or remote feature flags. Rollback is to stop using
the new helper/scripts and keep current legacy login/session behavior unchanged. Production
cutover remains `NO-GO`.
