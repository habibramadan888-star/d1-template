# Employee Arrears Inbox Data Source Audit

Date: 2026-05-31

## Current Sources

| Section | API / Source | Purpose | Status |
|---|---|---|---|
| 老板下发任务 | `GET /api/employee/arrears/directives` | Reads directives assigned by boss through approved backend SOT | Added to employee FOLLOW-UP page |
| 系统提醒 | `GET /api/arrear_tasks` plus TTLock local aggregation | Existing follow-up reminders: forced follow-up, TTLock overdue, historical arrears | Preserved |

## Root Cause

| Cause | Status | Notes |
|---|---|---|
| EMPLOYEE_PAGE_NOT_READING_DIRECTIVES_API | Confirmed | Employee FOLLOW-UP page only read legacy tasks/reminders. |
| OLD_SYSTEM_FOLLOWUP_ONLY | Confirmed | Boss directives were mixed into historical task status only when old task data carried directive fields. |
| UI_SECTION_MISSING | Confirmed | No separate boss directive inbox existed. |

## Fix

- Added a dedicated boss directive inbox above system reminders.
- Empty state is explicit: `暂无老板下发任务`.
- System reminders remain visible and separate.
- No production write is performed by the read path.

Production cutover remains `PRODUCTION_NO_GO`.
