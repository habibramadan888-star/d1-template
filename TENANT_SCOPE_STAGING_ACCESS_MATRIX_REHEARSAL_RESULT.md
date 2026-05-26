# Tenant Scope Staging Access Matrix Rehearsal Result

Generated: 2026-05-26T16:02:03.657Z

Overall: `PASS`

Scope: staging/local-only access matrix rehearsal using deterministic test claims and resource fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.

Feature flag phases:

| Phase  | Flag                                      | Expected                                  | Actual                                    | Result |
| ------ | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ------ |
| before | ENABLE_TENANT_SCOPE_ACCESS_MATRIX_STAGING | false / LEGACY                            | false / LEGACY                            | PASS   |
| during | ENABLE_TENANT_SCOPE_ACCESS_MATRIX_STAGING | true / TENANT_SCOPE_ACCESS_MATRIX_STAGING | true / TENANT_SCOPE_ACCESS_MATRIX_STAGING | PASS   |
| after  | ENABLE_TENANT_SCOPE_ACCESS_MATRIX_STAGING | false / LEGACY                            | false / LEGACY                            | PASS   |

Rehearsal scenarios:

| Scenario                                            | Role            | Resource                       | Expected                | Actual         | Result         | Notes                                                                                                                           |
| --------------------------------------------------- | --------------- | ------------------------------ | ----------------------- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| unauthenticated employee entry denied               | unauthenticated | employee entry                 | DENY_401                | DENY_401       | PASS           | No auth/session claim.                                                                                                          |
| invalid JWT history denied                          | invalid JWT     | dashboard/history              | DENY_401                | DENY_401       | PASS           | Invalid token cannot produce tenant claim.                                                                                      |
| employee own tenant entry allowed                   | employee        | employee entry                 | ALLOW                   | ALLOW          | PASS           | Claim tenant and property match target.                                                                                         |
| employee other tenant entry denied                  | employee        | employee entry                 | DENY_403                | DENY_403       | PASS           | Cross-tenant write blocked.                                                                                                     |
| employee own property rent config read allowed      | employee        | rent_config                    | ALLOW                   | ALLOW          | PASS           | Employee can read assigned property config.                                                                                     |
| employee other property rent config denied          | employee        | rent_config                    | DENY_403                | DENY_403       | PASS           | Cross-property read blocked.                                                                                                    |
| employee owner dashboard denied                     | employee        | dashboard/history              | DENY_403                | DENY_403       | PASS           | Employee permissions do not include owner dashboard authority.                                                                  |
| employee handover own property allowed              | employee        | handover                       | ALLOW                   | ALLOW          | PASS           | Handover staging path uses employee property membership.                                                                        |
| employee handover other tenant denied               | employee        | handover                       | DENY_403                | DENY_403       | PASS           | Cross-tenant handover blocked.                                                                                                  |
| owner tenant dashboard allowed                      | owner           | dashboard/history              | ALLOW                   | ALLOW          | PASS           | Owner tenant-wide property scope is explicit.                                                                                   |
| owner other tenant dashboard denied                 | owner           | dashboard/history              | DENY_403                | DENY_403       | PASS           | Owner cannot use legacy CORPID to cross tenants.                                                                                |
| owner sessions scoped allowed                       | owner           | sessions                       | ALLOW                   | ALLOW          | PASS           | Session rows require tenant scope.                                                                                              |
| owner transactions scoped allowed                   | owner           | transactions                   | ALLOW                   | ALLOW          | PASS           | Transaction rows require tenant scope.                                                                                          |
| owner deposit ledger scoped allowed                 | owner           | deposit_ledger                 | ALLOW                   | ALLOW          | PASS           | Deposit ledger is comparable by tenant in staging matrix.                                                                       |
| owner arrears scoped allowed                        | owner           | arrears                        | ALLOW                   | ALLOW          | PASS           | Receivables/P0-008 remains production blocker.                                                                                  |
| owner export own tenant allowed                     | owner           | export/report                  | ALLOW                   | ALLOW          | PASS           | Export must stay tenant scoped.                                                                                                 |
| owner export other tenant denied                    | owner           | export/report                  | DENY_403                | DENY_403       | PASS           | Cross-tenant export blocked.                                                                                                    |
| owner delete session own tenant allowed             | owner           | delete_session / void          | ALLOW                   | ALLOW          | PASS           | Void action must be tenant scoped.                                                                                              |
| owner delete session other tenant denied            | owner           | delete_session / void          | DENY_403                | DENY_403       | PASS           | Wrong tenant cannot void rows.                                                                                                  |
| employee delete session denied                      | employee        | delete_session / void          | DENY_403                | DENY_403       | PASS           | Employee claim lacks void permission.                                                                                           |
| manager app settings own property allowed           | manager         | settings / app_settings        | ALLOW                   | ALLOW          | PASS           | Manager setting authority is property constrained.                                                                              |
| manager app settings other property denied          | manager         | settings / app_settings        | DENY_403                | DENY_403       | PASS           | Cross-property settings write blocked.                                                                                          |
| admin own tenant tenant records allowed             | admin           | customer / tenant records      | ALLOW                   | ALLOW          | PASS           | Admin tenant authority is still staging/local only.                                                                             |
| admin other tenant tenant records denied            | admin           | customer / tenant records      | DENY_403                | DENY_403       | PASS           | Admin cannot cross tenant without explicit membership.                                                                          |
| admin property records own property allowed         | admin           | property / room / unit records | ALLOW                   | ALLOW          | PASS           | Admin has explicit property_a_2 membership.                                                                                     |
| manager property records other property denied      | manager         | property / room / unit records | DENY_403                | DENY_403       | PASS           | Manager lacks property_a_2 membership.                                                                                          |
| audit logs staging evidence covered                 | owner           | audit_logs                     | ALLOW                   | ALLOW          | PASS           | P0-006Q2 staging QA evidence rows close audit_logs staging coverage; production audit attribution still needs readiness review. |
| entry events staging evidence covered               | employee        | entry_events                   | ALLOW                   | ALLOW          | PASS           | P0-006Q2 staging QA evidence rows close entry_events staging coverage; production write-path review remains NO-GO.              |
| legacy CORPID fallback warning preserved            | employee        | legacy CORPID fallback         | LEGACY_WARNING          | LEGACY_WARNING | LEGACY_WARNING | Compatibility only; not production SaaS authority.                                                                              |
| frontend tenant id tamper ignored                   | employee        | auth claim                     | server tenant company_a | company_a      | PASS           | Frontend tenant_id does not override server claim.                                                                              |
| production access matrix authority remains disabled | all             | tenant authority switch        | disabled                | disabled       | PASS           | Production remains disabled/no-go.                                                                                              |

Summary:

- Total scenarios: 31.
- PASS count: 30.
- MANUAL_REQUIRED count: 0.
- FAIL count: 0.
- NOT_APPLICABLE count: 0.
- LEGACY_WARNING count: 1.
- Missing coverage count: 0.
- Cross-tenant denied: yes.
- Cross-property denied: yes.
- Frontend tenant_id tamper ignored: yes.
- Legacy CORPID fallback warning preserved: yes.
- Final access matrix flag false / legacy: yes.

Coverage closure:

- `audit_logs`: P0-006Q2 staging QA evidence rows close staging access matrix coverage.
- `entry_events`: P0-006Q2 staging QA evidence rows close staging access matrix coverage.
- Missing coverage count: 0.

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
- Access matrix rehearsal success does not imply production readiness.
- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.
