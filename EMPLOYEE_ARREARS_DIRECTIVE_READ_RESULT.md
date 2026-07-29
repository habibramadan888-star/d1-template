# Employee Arrears Directive Read Result

Date: 2026-05-31

## API

`GET /api/employee/arrears/directives`

## Behavior

- Staff/employee role only.
- Returns only rows where `corpid` matches the employee tenant and `userid` matches the employee id.
- Returns active directive statuses only: `assigned`, `pending`, `viewed`, `promised`, `followed_up`, `needs_review`, `overdue`.
- Does not expose raw internal debug fields in the employee directive response.

## Response Fields

- `directive_id`
- `task_id`
- `room_bed`
- `customer_code`
- `amount_fils`
- `source_type`
- `due_date`
- `overdue_days`
- `directive_status`
- `promised_payment_date`
- `followup_note`
- `owner_note`
- `assigned_employee_id`
- `assigned_employee_name`

## Safety

Read-only. No D1 write was executed.
