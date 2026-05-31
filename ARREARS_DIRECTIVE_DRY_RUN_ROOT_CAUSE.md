# Arrears Directive Dry-Run Root Cause

Date: 2026-05-31

## Root Cause Classification

- `DRY_RUN_ONLY`: confirmed for the live owner button before this task.
- `API_EXISTS_BUT_NOT_WIRED`: existing backend `/api/arrear_tasks/directive` can update `arrear_tasks`, but the final owner UI button was intentionally rewired to dry-run only.
- `REAL_DIRECTIVE_API_MISSING`: missing new explicit contract route `/api/boss/arrears/directives`.
- `EMPLOYEE_READ_API_MISSING`: old employee page read `/api/arrear_tasks`; explicit `/api/employee/arrears/directives` was missing.
- `EMPLOYEE_FEEDBACK_API_MISSING`: old employee page posted `/api/arrear_tasks/update`; explicit `/api/employee/arrears/directives/:id/followup` was missing.
- `OWNER_FEEDBACK_DISPLAY_MISSING`: owner card displayed date/note/status but lacked a locked API contract for employee feedback.
- `STORAGE_TABLE_MISSING`: no new table required; existing `arrear_tasks` already has directive fields.

## Gap Table

| Step | Current Implementation | Real Closure Required | Gap |
|---|---|---|---|
| Owner click send employee | Final `sendArrearDirectives()` builds WhatsApp/dry-run list. | Create assigned directive records or report approval-required. | Dry-run only. |
| Real API call | Final UI does not call a write API. | `POST /api/boss/arrears/directives`. | Missing explicit route before this task. |
| Clipboard/toast/modal | Used as the only result. | May remain as preview, but not as real success. | Could be mistaken as real delivery. |
| `/api/arrear_tasks/directive` | Existing legacy write route. | Explicit SOT route with approval gate. | Legacy route not wired to final UI. |
| Employee directive API | Employee reads `/api/arrear_tasks`. | `GET /api/employee/arrears/directives`. | Explicit contract missing before this task. |
| Employee feedback API | Employee posts `/api/arrear_tasks/update`. | `POST /api/employee/arrears/directives/:id/followup`. | Explicit contract missing before this task. |
| Owner feedback display | Owner card uses promise date/note/status fields. | Owner sees employee promised date, note, status, responsible employee. | Locked by tests/docs in this task. |

## Conclusion

Dry-run was intentional and safe for production, but it is not a real employee task delivery loop. Real delivery requires persistent writes and therefore remains blocked behind explicit write approval.
