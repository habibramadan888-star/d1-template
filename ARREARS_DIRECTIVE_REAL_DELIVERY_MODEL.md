# Arrears Directive Real Delivery Model

Date: 2026-05-31

## Storage Decision

Reuse existing `arrear_tasks`; no migration executed.

Existing relevant fields:

- `task_id`
- `corpid`
- `userid`
- `bed`
- `tenant_name`
- `arrear_amount`
- `followup_status`
- `promise_date`
- `staff_note`
- `owner_note`
- `boss_requested_at`
- `boss_requested_by`
- `boss_requested_due_date`
- `directive_status`
- `staff_promised_at`
- `updated_by`
- `updated_at`

## Logical Model

| Field | Source | Notes |
|---|---|---|
| `arrears_task_id` | `arrear_tasks.task_id` | Primary directive anchor. |
| `tenant_id` | `arrear_tasks.corpid` | Existing tenant/corp scope. |
| `assigned_employee_id` | `arrear_tasks.userid` | Employee who can read/update the directive. |
| `directive_status` | `arrear_tasks.directive_status` | `assigned`, `viewed`, `promised`, `followed_up`, `needs_review`, `closed`, `cancelled`. |
| `promised_payment_date` | `arrear_tasks.promise_date` | Employee feedback date. |
| `followup_note` | `arrear_tasks.staff_note` | Employee feedback note. |
| `owner_note` | `arrear_tasks.owner_note` | Optional owner instruction note. |
| `owner_created_at` | `arrear_tasks.boss_requested_at` | Boss directive timestamp. |
| `employee_updated_at` | `arrear_tasks.staff_promised_at` | Employee feedback timestamp. |

## Rules

1. Owner send sets `directive_status = assigned`.
2. Employee read is scoped by `corpid` and `userid`.
3. Employee feedback writes only `promise_date`, `staff_note`, `directive_status`, and timestamps.
4. Employee cannot change amount.
5. Employee cannot close the task.
6. readonly_admin cannot write.
7. All real writes require audit/event records.
8. All real writes require explicit environment approval before production use.
