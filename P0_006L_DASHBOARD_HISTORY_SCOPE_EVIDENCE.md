# P0-006L Dashboard/History Scope Evidence

Generated: 2026-05-26T13:16:18.485Z

Conclusion: `PASS`

| Scenario                                       | Query                                    | Legacy Rows                              | Scoped Rows                  | Removed Rows                 | Cross-Tenant Removed         | Mode                                      | Result | Notes                                                                  |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------- | ---------------------------- | ---------------------------- | ----------------------------------------- | ------ | ---------------------------------------------------------------------- |
| owner A history query removes company B rows   | history by legacy corpid                 | session_a_1, transaction_a_2, arrear_b_1 | session_a_1, transaction_a_2 | arrear_b_1                   | arrear_b_1                   | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner B history query removes company A rows   | history by legacy corpid                 | session_a_1, transaction_a_2, arrear_b_1 | arrear_b_1                   | session_a_1, transaction_a_2 | session_a_1, transaction_a_2 | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner A dashboard query removes company B rows | dashboard active totals by legacy corpid | session_a_1, transaction_a_2, arrear_b_1 | session_a_1, transaction_a_2 | arrear_b_1                   | arrear_b_1                   | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner B dashboard query removes company A rows | dashboard active totals by legacy corpid | session_a_1, transaction_a_2, arrear_b_1 | arrear_b_1                   | session_a_1, transaction_a_2 | session_a_1, transaction_a_2 | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |

Evidence summary:

- Query scenarios: 4.
- Cross-tenant rows removed from legacy CORPID results: 6.
- Dashboard/history live result changed: no.
- Dashboard card formula changed: no.
- Production dashboard changed: no.
