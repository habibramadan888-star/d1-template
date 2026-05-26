# Tenant Scope Staging Dashboard/History Query Gate Result

Generated: 2026-05-26T05:37:29.478Z

Scope: staging/local-only dashboard and history query gate using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.

Feature flag: `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING`
Overall: `PASS`

| Scenario                                       | Query                                    | Legacy Rows                              | Scoped Rows                  | Removed Rows                 | Cross-Tenant Removed         | Mode                                      | Result | Notes                                                                  |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------- | ---------------------------- | ---------------------------- | ----------------------------------------- | ------ | ---------------------------------------------------------------------- |
| owner A history query removes company B rows   | history by legacy corpid                 | session_a_1, transaction_a_2, arrear_b_1 | session_a_1, transaction_a_2 | arrear_b_1                   | arrear_b_1                   | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner B history query removes company A rows   | history by legacy corpid                 | session_a_1, transaction_a_2, arrear_b_1 | arrear_b_1                   | session_a_1, transaction_a_2 | session_a_1, transaction_a_2 | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner A dashboard query removes company B rows | dashboard active totals by legacy corpid | session_a_1, transaction_a_2, arrear_b_1 | session_a_1, transaction_a_2 | arrear_b_1                   | arrear_b_1                   | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |
| owner B dashboard query removes company A rows | dashboard active totals by legacy corpid | session_a_1, transaction_a_2, arrear_b_1 | arrear_b_1                   | session_a_1, transaction_a_2 | session_a_1, transaction_a_2 | TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE | PASS   | Scoped query removes only cross-tenant rows from legacy corpid result. |

Summary:

- Scenario count: 4.
- Blocked scenarios: 0.
- Cross-tenant rows removed from legacy CORPID result: 6.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- Dashboard/history live result changed: no.
- Production auth behavior changed: no.
- Legacy CORPID fallback removed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- This gate proves only local/staging dashboard/history query scoping readiness.
- Production remains blocked until migration, backfill, live query wiring, and human tenancy decisions are approved.
