# Owner Real Dispatch Mixed Source UI Result

Date: 2026-06-01, Asia/Dubai

Owner arrears batch action now targets the gated real dispatch endpoint instead of pretending a dry-run is employee delivery.

## UI Behavior

| State | UI Behavior |
|---|---|
| no rows selected | button disabled |
| rows selected | button label shows `真实下发员工端（N）` |
| write gate off | API returns approval-required; UI says current action was not written to employee side |
| write gate on and API succeeds | UI shows created/skipped/blocked counts from backend |
| readonly_admin | write controls remain hidden/blocked |

## Backend Endpoint

The UI calls `POST /api/boss/arrears/directives` with:

- `task_ids`
- `assigned_employee_id`
- `idempotency_key`
- `Idempotency-Key` header

Default assignee for the current internal flow is `window.HOMELINK_DEFAULT_ARREARS_ASSIGNEE || 'staff'`; production smoke scripts may pass the exact employee ID directly.
