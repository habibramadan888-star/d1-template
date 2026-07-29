# P0-006N Staging Rehearsal Scenarios

Date: 2026-05-26, Asia/Dubai

Scope: staging/local-only auth claim scenarios. No production deploy, production migration,
production D1 write, staging D1 write, dashboard mutation, live financial formula change, or
secret exposure occurred.

| Scenario                                                | Role           | Claim                                                          | Route / Query                             | Expected Result                             | Risk                                |
| ------------------------------------------------------- | -------------- | -------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- | ----------------------------------- |
| employee valid tenant claim accesses own tenant data    | employee       | `tenant_id=company_a`, `employee_id=employee_a_1`              | `/api/employee/entry`                     | allowed                                     | low in staging rehearsal            |
| employee valid property claim accesses allowed property | employee       | `allowed_property_ids=property_a_1`                            | `/api/employee/entry`                     | allowed                                     | low in staging rehearsal            |
| employee cannot access other tenant                     | employee       | `tenant_id=company_a`                                          | `/api/employee/entry` target company_b    | denied                                      | high if missing in production       |
| employee cannot access other property                   | employee       | `allowed_property_ids=property_a_1`                            | `/api/employee/entry` target property_a_2 | denied                                      | high if missing in production       |
| owner valid tenant claim accesses tenant-level data     | owner          | `tenant_id=company_a`, `allowed_property_ids=*`                | `/api/history`                            | allowed                                     | owner scope must be reviewed        |
| owner cannot access other tenant                        | owner          | `tenant_id=company_a`                                          | `/api/history` target company_b           | denied                                      | high if missing in production       |
| manager/admin constrained by tenant/property            | manager/admin  | `tenant_id=company_a`, `allowed_property_ids=property_a_1`     | `/api/rent_config`                        | own property allowed, other property denied | admin scope must remain constrained |
| missing tenant_id rejected or warning depending env     | employee       | `corp_id=homelink`, no `tenant_id`                             | claim validation                          | staging warning, production blocked         | production unsafe                   |
| frontend tenant_id tamper ignored                       | employee       | server claim `tenant_id=company_a`, frontend attempt company_b | claim builder                             | server claim wins                           | critical                            |
| legacy CORPID fallback warning preserved                | employee       | `corp_id=homelink`, no `tenant_id`                             | claim validation                          | `LEGACY_FALLBACK_WARNING`                   | not production authority            |
| route/query wiring consumes claim                       | employee/owner | claim-derived actor/membership                                 | route/query helper                        | scoped allow/deny works                     | needs live wiring later             |
| rollback returns legacy behavior                        | n/a            | flag false                                                     | guard mode                                | `LEGACY`                                    | must remain reversible              |
| production remains disabled/no-go                       | n/a            | production env plus flag true                                  | guard mode                                | disabled                                    | production cutover no-go            |

Result: ready for staging/local auth claim rehearsal only. Production remains `NO-GO`.
