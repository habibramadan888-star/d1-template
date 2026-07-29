# Arrears Directive Staging Schema Check

Date: 2026-05-31

Target: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

Result: `BLOCKED_SCHEMA_MISSING_IDEMPOTENCY`

The staging database has the main `arrear_tasks`, `entry_events`, `audit_logs`, `employee_users`, and `active_sessions` tables. It also has directive fields from the earlier migration. However, the schema does not provide a durable idempotency key table/field for the new real directive closure APIs.

| Required Field/Table | Exists | Notes |
|---|---:|---|
| `arrear_tasks` table | yes | Primary task storage exists. |
| directive id | partial | Uses `task_id` as directive identity; no separate directive table. |
| arrears task id | yes | `task_id` exists. |
| assigned employee id | yes | `userid` exists and is used as assignee. |
| `directive_status` | yes | Exists with default `none`. |
| promised payment date | yes | Existing `promise_date` maps to `promised_payment_date`. |
| follow-up note | yes | Existing `staff_note` maps to `followup_note`. |
| owner note | yes | `owner_note` exists. |
| staff promised timestamp | yes | `staff_promised_at` exists. |
| last follow-up timestamp | yes | `last_followup_at` exists. |
| idempotency key table/field | no | No durable key table/field found for owner create or employee follow-up. |
| audit table | yes | `audit_logs` exists. |
| event table | yes | `entry_events` exists. |
| employee table | yes | `employee_users` exists. |

## Important Compatibility Notes

The API can prevent duplicate owner assignment for already-active tasks, but that is not equivalent to durable idempotency-key replay protection. The employee follow-up API currently requires an idempotency key in the request, but staging schema does not persist that key separately.

Because the task explicitly requires idempotency duplicate prevention and audit/traceability, this run stopped before executing business writes.
