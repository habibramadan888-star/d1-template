# Tenant Scope Auth Claim Rehearsal Result

Generated: 2026-05-26T13:38:45.687Z

Overall: `PASS`

Scope: staging/local-only auth claim contract rehearsal. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change live auth behavior, remove legacy CORPID fallback, or print secrets.

| Scenario                           | Claim                                                                                      | Expected                                                          | Result | Notes                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| employee tenant claim              | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | valid staging employee claim                                      | PASS   | LEGACY_CORPID_PRESENT_COMPATIBILITY_ONLY                                 |
| owner tenant claim                 | sub=owner_a; role=owner; tenant=company_a; corp=homelink; properties=\*                    | valid staging owner claim                                         | PASS   | LEGACY_CORPID_PRESENT_COMPATIBILITY_ONLY                                 |
| manager property-constrained claim | sub=manager_a; role=manager; tenant=company_a; corp=missing; properties=property_a_1       | valid manager claim constrained to property_a_1                   | PASS   | manager/admin claims must carry tenant and explicit property constraints |
| missing tenant staging fallback    | sub=employee_legacy; role=employee; tenant=missing; corp=homelink; properties=property_a_1 | legacy warning, not production-ready                              | PASS   | LEGACY_FALLBACK_WARNING                                                  |
| missing tenant production behavior | sub=employee_legacy; role=employee; tenant=missing; corp=homelink; properties=property_a_1 | blocked in production                                             | PASS   | MISSING_TENANT_ID_PRODUCTION_UNSAFE                                      |
| frontend tenant tampering ignored  | sub=employee_a_1; role=employee; tenant=company_a; corp=missing; properties=property_a_1   | claim tenant remains server-side company_a                        | PASS   | front-end tenant_id is not accepted as authority                         |
| own property employee access       | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | allowed                                                           | PASS   | ALLOWED_BY_TENANT_SCOPE_CLAIM                                            |
| cross-tenant owner access          | sub=owner_a; role=owner; tenant=company_a; corp=homelink; properties=\*                    | denied                                                            | PASS   | CROSS_TENANT_DENIED                                                      |
| cross-property manager access      | sub=manager_a; role=manager; tenant=company_a; corp=missing; properties=property_a_1       | denied                                                            | PASS   | CROSS_PROPERTY_DENIED                                                    |
| claim to route/query wiring        | sub=employee_a_1; role=employee; tenant=company_a; corp=homelink; properties=property_a_1  | route/query policy can consume claim-derived actor and membership | PASS   | ALLOWED_BY_PROPERTY_MEMBERSHIP                                           |

Summary:

- Scenario count: 10.
- Blocked scenarios: 0.
- Legacy CORPID fallback warnings: 3.
- Cross-tenant denial verified: yes.
- Cross-property denial verified: yes.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Feature flag changed: no.
- Dashboard/history live result changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- Current Worker login/session behavior is unchanged.
- Production SaaS tenant isolation still requires approved auth/session claim propagation and production migration/cutover gates.
