# Tenant Scope Staging Route Enforcement Plan

Date: 2026-05-26, Asia/Dubai

Feature flag: `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`

| Route                          | Method  | Future Enforcement                                                | Gate Status | Production Status | Notes                                                          |
| ------------------------------ | ------- | ----------------------------------------------------------------- | ----------- | ----------------- | -------------------------------------------------------------- |
| `/api/history`                 | GET/ANY | Owner membership must match company/property scope.               | PASS        | NO-GO             | Live route still uses legacy `corpid` filter.                  |
| `/api/employee/entry`          | POST    | Employee membership must match target property.                   | PASS        | NO-GO             | Gate only; live route not rewired.                             |
| `/api/rent_config`             | POST    | Owner membership required for target property/company.            | PASS        | NO-GO             | Needs effective-date and settings migration before production. |
| `/api/delete_session`          | POST    | Owner membership must match session company/property before void. | PASS        | NO-GO             | No live query switch occurred.                                 |
| `/api/staging/handover/commit` | POST    | Employee membership must match submitted property.                | PASS        | NO-GO             | Staging endpoint already carries company/property columns.     |

## Rules

- Production is always disabled.
- Flag-off behavior is legacy/no gate enforcement.
- Flag-on behavior is local/staging gate evaluation only.
- Route mutation is not allowed by this task.
- Dashboard/history live result must remain unchanged.
- Legacy `CORPID` fallback must remain until migration/backfill and human
  tenancy decisions are approved.
