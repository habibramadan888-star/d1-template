# Tenant Scope Audit Logs / Entry Events Rehearsal Result

Generated: 2026-05-26T19:02:52.503Z

Overall: `PASS`

Target D1: `homelink-finance-staging`
Target D1 ID: `4ff78bfc-3855-436b-aefb-6b492145d79c`

Scope: staging/local audit/event scope rehearsal. The script uses read-only staging D1 schema/count queries plus deterministic access-policy fixtures. It does not deploy, migrate, write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.

Rehearsal scenarios:

| Scenario                                                 | Table                     | Role            | Expected                                                                                                  | Actual                                                                                                                                          | Result         | Notes                                                                                                |
| -------------------------------------------------------- | ------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| audit_logs scope fields validated                        | audit_logs                | system          | id, corpid, userid, role, action, target, company_id, property_id, owner_id, employee_id                  | id, corpid, userid, role, action, target, detail, created_at, company_id, property_id, owner_id, employee_id                                    | PASS           | Required compatibility columns exist in staging schema.                                              |
| entry_events scope fields validated                      | entry_events              | system          | event_id, corpid, userid, operator_id, ref_id, ref_type, event_type, company_id, property_id, employee_id | event_id, corpid, userid, ref_id, ref_type, event_type, field_name, old_value, new_value, operator_id, ts, company_id, property_id, employee_id | PASS           | Required compatibility columns exist in staging schema.                                              |
| unauthenticated cannot access tenant audit rows          | audit_logs                | unauthenticated | DENY_401                                                                                                  | DENY_401                                                                                                                                        | PASS           | No auth claim means no tenant-scoped audit access.                                                   |
| invalid JWT cannot access tenant event rows              | entry_events              | invalid JWT     | DENY_401                                                                                                  | DENY_401                                                                                                                                        | PASS           | Invalid auth cannot produce tenant claim.                                                            |
| employee own entry event allowed                         | entry_events              | employee        | ALLOW                                                                                                     | ALLOW                                                                                                                                           | PASS           | Employee can see own scoped entry event evidence in rehearsal policy.                                |
| employee other tenant audit evidence filtered            | audit_logs                | employee        | FILTER_OUT                                                                                                | FILTER_OUT                                                                                                                                      | PASS           | Cross-tenant audit row is removed from employee query.                                               |
| employee other property entry event filtered             | entry_events              | employee        | FILTER_OUT                                                                                                | FILTER_OUT                                                                                                                                      | PASS           | Cross-property entry event is removed from employee query.                                           |
| owner own tenant audit evidence allowed                  | audit_logs                | owner           | ALLOW                                                                                                     | ALLOW                                                                                                                                           | PASS           | Owner tenant-wide property scope is explicit in rehearsal claim.                                     |
| owner other tenant audit evidence filtered               | audit_logs                | owner           | FILTER_OUT                                                                                                | FILTER_OUT                                                                                                                                      | PASS           | Owner cannot cross tenants even with legacy CORPID compatibility.                                    |
| manager other property audit evidence filtered           | audit_logs                | manager         | FILTER_OUT                                                                                                | FILTER_OUT                                                                                                                                      | PASS           | Manager is constrained to allowed_property_ids.                                                      |
| admin own tenant entry event allowed                     | entry_events              | admin           | ALLOW                                                                                                     | ALLOW                                                                                                                                           | PASS           | Admin has explicit property_a_2 membership in rehearsal claim.                                       |
| frontend tenant_id tamper ignored                        | auth claim                | employee        | company_a                                                                                                 | company_a                                                                                                                                       | PASS           | Frontend-supplied tenant_id does not override server claim.                                          |
| legacy CORPID fallback warning preserved                 | audit_logs                | employee        | LEGACY_WARNING                                                                                            | LEGACY_WARNING                                                                                                                                  | LEGACY_WARNING | Legacy CORPID remains compatibility-only and not production SaaS authority.                          |
| audit_logs has scoped employee entry rows                | audit_logs                | employee        | scoped employee entry evidence                                                                            | 3 scoped of 5                                                                                                                                   | PASS           | Read-only staging counts prove some employee entry audit rows carry company/property/employee scope. |
| entry_events has scoped employee entry rows              | entry_events              | employee        | scoped employee entry event evidence                                                                      | 2 scoped of 4                                                                                                                                   | PASS           | Read-only staging counts prove some entry event rows carry company/property/employee scope.          |
| audit_logs has scoped handover rows                      | audit_logs                | employee        | scoped handover audit evidence                                                                            | 1 scoped of 3                                                                                                                                   | PASS           | Read-only staging counts prove accepted handover audit scope exists.                                 |
| entry_events has scoped handover rows                    | entry_events              | employee        | scoped handover event evidence                                                                            | 2 scoped of 2                                                                                                                                   | PASS           | Read-only staging counts prove accepted handover entry event scope exists.                           |
| production tenant audit/event authority remains disabled | audit_logs / entry_events | all             | PRODUCTION_NO_GO                                                                                          | PRODUCTION_NO_GO                                                                                                                                | PASS           | Staging rehearsal does not approve production cutover.                                               |

Summary:

- Total scenarios: 18.
- PASS count: 17.
- MANUAL_REQUIRED count: 0.
- NEEDS_STAGING_EVIDENCE_DATA count: 0.
- FAIL count: 0.
- LEGACY_WARNING count: 1.
- Missing coverage count: 0.
- audit_logs result: PASS.
- entry_events result: PASS.

Evidence coverage:

- Owner-created audit row with `owner_id` scope: present.
- Scoped `session.void` audit row: present.
- Scoped `session_void` entry event row: present.
- Missing coverage count: 0.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Dashboard/history live result changed: no.
- Live financial formula changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- Audit/event rehearsal evidence does not imply production readiness.
- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.
