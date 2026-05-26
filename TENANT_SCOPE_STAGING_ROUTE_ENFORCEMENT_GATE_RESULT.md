# Tenant Scope Staging Route Enforcement Gate Result

Generated: 2026-05-26T06:50:02.020Z

Scope: staging/local-only tenant scope route enforcement gate using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.

Feature flag: `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`
Overall: `PASS`

| Scenario                                 | Route                        | Method | Action               | Expected Allowed | Actual Allowed | Mode                                | Result | Notes                          |
| ---------------------------------------- | ---------------------------- | ------ | -------------------- | ---------------- | -------------- | ----------------------------------- | ------ | ------------------------------ |
| owner A history own property             | /api/history                 | GET    | HISTORY_READ         | yes              | yes            | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| owner A denied company B history         | /api/history                 | GET    | HISTORY_READ         | no               | no             | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | NO_PROPERTY_MEMBERSHIP         |
| employee A own property entry            | /api/employee/entry          | POST   | EMPLOYEE_ENTRY_WRITE | yes              | yes            | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| employee A denied other property entry   | /api/employee/entry          | POST   | EMPLOYEE_ENTRY_WRITE | no               | no             | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | NO_PROPERTY_MEMBERSHIP         |
| employee A denied owner dashboard        | /api/history                 | GET    | DASHBOARD_READ       | no               | no             | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ROLE_NOT_ALLOWED_FOR_ACTION    |
| owner A rent config write own company    | /api/rent_config             | POST   | RENT_CONFIG_WRITE    | yes              | yes            | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| employee A denied rent config write      | /api/rent_config             | POST   | RENT_CONFIG_WRITE    | no               | no             | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ROLE_NOT_ALLOWED_FOR_ACTION    |
| owner A void own session                 | /api/delete_session          | POST   | VOID_SESSION         | yes              | yes            | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| owner A denied company B void            | /api/delete_session          | POST   | VOID_SESSION         | no               | no             | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | NO_PROPERTY_MEMBERSHIP         |
| employee A staging handover own property | /api/staging/handover/commit | POST   | EMPLOYEE_ENTRY_WRITE | yes              | yes            | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP |
| owner A denied staging handover submit   | /api/staging/handover/commit | POST   | EMPLOYEE_ENTRY_WRITE | no               | no             | TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE | PASS   | ROLE_NOT_ALLOWED_FOR_ACTION    |

Summary:

- Scenario count: 11.
- Blocked scenarios: 0.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Production auth behavior changed: no.
- Legacy CORPID fallback removed: no.
- Dashboard/history live result changed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- This gate proves only local/staging route enforcement policy readiness.
- Production remains blocked until route wiring, migration, backfill, dashboard/history evidence, and human tenancy decisions are approved.
