# Arrears Directive Staging Test Data Selection

Date: 2026-05-31T15:42:08.603Z

Selected from staging D1 only. No production data was touched.

| Test Case | Source | Task ID | Room/Bed | Customer | Amount | Employee | Idempotency Key |
| --- | --- | --- | --- | --- | --- | --- | --- |
| existing_arrears_record | existing_arrears_record | p0_008e_adjustment_credit | P0-008E-CREDIT | tenant_p0_008e_adjustment_credit | 100 |  | stg-arrears-directive-owner-20260531153813 |
| second_open_staging_arrears_task | existing_arrears_record | p0_008e_due_today | P0-008E-DUE | tenant_p0_008e_due_today | 500 |  | stg-arrears-directive-owner-20260531153813 (same batch) |

Note: current staging `arrear_tasks` data did not expose a persisted `ttlock_expired_unpaid` task row. The QA used two open staging arrears task rows and records source coverage as a staging data limitation, not a production write approval.
