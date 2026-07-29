# Employee Arrears Follow-Up Write Result

Date: 2026-05-31

## API

`POST /api/employee/arrears/directives/:id/followup`

Request:

```json
{
  "promised_payment_date": "YYYY-MM-DD",
  "followup_note": "customer note",
  "idempotency_key": "required"
}
```

## Rules

- Employee can only update a directive assigned to the same `userid`.
- `promised_payment_date` is required.
- `followup_note` is accepted as the employee note.
- `promised_amount`, `promise_amount`, and `promised_amount_fils` are rejected.
- Employee cannot change arrears amount.
- Employee cannot close the task.
- Write path is blocked unless explicit approval env is enabled.

## Safety

Default result is `production_write_approval_required`.
No production D1 write was executed.
No migration was executed.
