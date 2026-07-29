# Tenant Scope Auth Claim Staging Rehearsal Result

Generated: 2026-05-26T15:24:55.949Z

Overall: `PASS`

Scope: staging/local-only auth claim rehearsal using deterministic test claims and route/query policy helpers. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.

Feature flag phases:

| Phase  | Flag                                   | Expected                               | Actual                                 | Result |
| ------ | -------------------------------------- | -------------------------------------- | -------------------------------------- | ------ |
| before | ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING | false / LEGACY                         | false / LEGACY                         | PASS   |
| during | ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING | true / TENANT_SCOPE_AUTH_CLAIM_STAGING | true / TENANT_SCOPE_AUTH_CLAIM_STAGING | PASS   |
| after  | ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING | false / LEGACY                         | false / LEGACY                         | PASS   |

Rehearsal scenarios:

| Scenario                                | Claim Source                                                                               | Route / Query                          | Expected                  | Actual                  | Result | Notes                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------- | ----------------------- | ------ | ---------------------------------------------------------------------- |
| employee own tenant allowed             | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | /api/employee/entry                    | allowed                   | allowed                 | PASS   | ALLOWED_BY_TENANT_SCOPE_CLAIM                                          |
| employee own property route wiring      | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | /api/employee/entry                    | allowed                   | allowed                 | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP                                         |
| employee other tenant denied            | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | /api/employee/entry                    | denied                    | denied                  | PASS   | CROSS_TENANT_DENIED                                                    |
| employee other tenant route denied      | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | /api/employee/entry                    | denied                    | denied                  | PASS   | NO_PROPERTY_MEMBERSHIP                                                 |
| employee other property denied          | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | /api/employee/entry                    | denied                    | denied                  | PASS   | CROSS_PROPERTY_DENIED                                                  |
| owner tenant-level history allowed      | sub=owner_a; role=owner; tenant=company_a; corp=homelink; properties=\*                    | /api/history                           | allowed                   | allowed                 | PASS   | ALLOWED_BY_TENANT_SCOPE_CLAIM                                          |
| owner other tenant denied               | sub=owner_a; role=owner; tenant=company_a; corp=homelink; properties=\*                    | /api/history                           | denied                    | denied                  | PASS   | CROSS_TENANT_DENIED                                                    |
| manager own property write allowed      | sub=manager_a; role=manager; tenant=company_a; corp=missing; properties=property_a_1       | /api/rent_config                       | allowed                   | allowed                 | PASS   | ALLOWED_BY_TENANT_SCOPE_CLAIM                                          |
| manager other property denied           | sub=manager_a; role=manager; tenant=company_a; corp=missing; properties=property_a_1       | /api/rent_config                       | denied                    | denied                  | PASS   | CROSS_PROPERTY_DENIED                                                  |
| missing tenant staging fallback warning | sub=legacy_employee; role=employee; tenant=missing; corp=homelink; properties=property_a_1 | claim validation                       | LEGACY_FALLBACK_WARNING   | LEGACY_FALLBACK_WARNING | PASS   | legacy CORPID fallback preserved for staging warning only              |
| missing tenant production blocked       | sub=legacy_employee; role=employee; tenant=missing; corp=homelink; properties=property_a_1 | claim validation                       | PRODUCTION_UNSAFE         | PRODUCTION_UNSAFE       | PASS   | missing tenant_id cannot authorize production SaaS access              |
| frontend tenant tamper ignored          | sub=employee_a_1; role=employee; tenant=company_a; corp=missing; properties=property_a_1   | claim builder                          | company_a                 | company_a               | PASS   | front-end tenant_id is not authority                                   |
| owner query consumes auth claim         | sub=owner_a; role=owner; tenant=company_a; corp=homelink; properties=\*                    | /api/history                           | cross-tenant rows removed | arrear_b_1              | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| rollback flag false restores legacy     | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING | false / LEGACY            | false / LEGACY          | PASS   | flag_off                                                               |
| production remains disabled             | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING | disabled                  | disabled                | PASS   | production_always_disabled                                             |

Summary:

- Scenario count: 15.
- Blocked scenarios: 0.
- Cross-tenant denied: yes.
- Cross-property denied: yes.
- Frontend tenant_id tamper ignored: yes.
- Legacy CORPID fallback warning preserved: yes.
- Final auth claim staging flag false / legacy: yes.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Remote feature flag changed: no.
- Dashboard/history live result changed: no.
- Live financial formula changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- Staging/local auth claim rehearsal success does not imply production readiness.
- Production migration, production deploy, production backfill, and production cutover remain unapproved.
