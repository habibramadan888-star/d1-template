# Arrears Directive Staging TTLock Fixture Plan

Date: 2026-05-31T15:59:13.222Z

This plan targets staging D1 only. Production D1, production migration, production deploy, and production business writes remain forbidden.

Backend SOT identifies a ttlock arrears row when `empTaskToBossArrear()` sees `source_type` or `source` containing `ttlock`. Current staging `arrear_tasks` needed a nullable `source_type` fixture-support column to persist one test ttlock task.

| Field | Value | Reason |
| --- | --- | --- |
| target table | arrear_tasks | Directive APIs query durable tasks by task_id/corpid. |
| source_type | ttlock_expired_unpaid | Backend SOT maps ttlock rows from source_type/source containing ttlock. |
| source_ref | QA-TTLOCK-CARD-001-20260531155612 | Traceable staging-only source reference. |
| room_bed | QA-TTLOCK-001 | Required business identity for card/read model. |
| customer_code | QA-TTLOCK-CARD-001 | Safe QA customer/card label. |
| amount_fils | 63000 | 630.00 AED staging test rent equivalent. |
| due_date | 2026-05-28 | Expired before current date. |
| qa_tag | ARREARS_TTLOCK_E2E_QA_20260531155612 | Findable QA trace and rollback scope. |
| production guard | staging D1 only | Wrangler command targets homelink-finance-staging only. |
