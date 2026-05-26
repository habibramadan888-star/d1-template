# P0-006L Route/Query Wiring Rehearsal Result

Generated: 2026-05-26T13:16:18.485Z

Conclusion: `PASS`

Feature flag phases:

| Phase  | Flag                                                | Expected                                         | Actual                                           | Result |
| ------ | --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------ |
| before | ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING       | false / LEGACY                                   | false / LEGACY                                   | PASS   |
| before | ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING | false / LEGACY                                   | false / LEGACY                                   | PASS   |
| during | ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING       | true / TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE       | true / TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE       | PASS   |
| during | ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING | true / TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | true / TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   |

Route enforcement scenarios:

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

Dashboard/history query scenarios:

| Scenario                                       | Query                                    | Legacy Rows                              | Scoped Rows                  | Removed Rows                 | Cross-Tenant Removed         | Mode                                      | Result | Notes                                                                  |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------- | ---------------------------- | ---------------------------- | ----------------------------------------- | ------ | ---------------------------------------------------------------------- |
| owner A history query removes company B rows   | history by legacy corpid                 | session_a_1, transaction_a_2, arrear_b_1 | session_a_1, transaction_a_2 | arrear_b_1                   | arrear_b_1                   | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner B history query removes company A rows   | history by legacy corpid                 | session_a_1, transaction_a_2, arrear_b_1 | arrear_b_1                   | session_a_1, transaction_a_2 | session_a_1, transaction_a_2 | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner A dashboard query removes company B rows | dashboard active totals by legacy corpid | session_a_1, transaction_a_2, arrear_b_1 | session_a_1, transaction_a_2 | arrear_b_1                   | arrear_b_1                   | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner B dashboard query removes company A rows | dashboard active totals by legacy corpid | session_a_1, transaction_a_2, arrear_b_1 | arrear_b_1                   | session_a_1, transaction_a_2 | session_a_1, transaction_a_2 | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |

Summary:

- Route scenarios: 11.
- Query scenarios: 4.
- Cross-tenant rows removed: 6.
- Blocked rows: 0.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Remote staging flag write: no.
- Dashboard/history live result changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

P0-006 remains Partial, not Verified.
