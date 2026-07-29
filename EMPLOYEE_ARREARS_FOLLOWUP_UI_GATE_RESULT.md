# Employee Arrears Follow-up UI Gate Result

Date: 2026-05-31

## Feedback Scope

| Field | UI |
|---|---|
| `promised_payment_date` | Required date input |
| `followup_note` | Required note textarea |
| `promised_amount` | Not present |
| Amount edit | Not present |
| Close / void | Not present |

## Gate Handling

- The employee directive follow-up button calls `/api/employee/arrears/directives/:id/followup`.
- If production write gate is off and API returns `409 production_write_approval_required`, UI says:
  `提交反馈需要生产写入审批；当前未写入生产，请先用 WhatsApp/线下回执。`
- UI does not show success on 409.
- No D1 write was executed in this task.

Production cutover remains `PRODUCTION_NO_GO`.
