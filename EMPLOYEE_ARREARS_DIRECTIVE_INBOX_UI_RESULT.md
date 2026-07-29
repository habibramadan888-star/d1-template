# Employee Arrears Directive Inbox UI Result

Date: 2026-05-31

## UI Sections

| Section | Content |
|---|---|
| 老板下发任务 | Cards from `GET /api/employee/arrears/directives` |
| 系统提醒 | Existing TTLock overdue and historical arrears reminders |

## Boss Directive Card

Displayed fields:

- Bed / room-bed.
- Customer code if available.
- Amount as read-only display.
- Source label.
- Due / overdue status.
- Owner note.
- Inputs: promised payment date, follow-up note.

Not displayed or editable:

- Internal debug ID as primary business field.
- Promised amount input.
- Amount edit.
- Close / void action.
- Employee entry write action.

Production cutover remains `PRODUCTION_NO_GO`.
