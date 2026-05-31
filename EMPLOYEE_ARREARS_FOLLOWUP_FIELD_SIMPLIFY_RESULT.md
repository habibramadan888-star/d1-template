# EMPLOYEE_ARREARS_FOLLOWUP_FIELD_SIMPLIFY_RESULT

## Result

Employee arrears follow-up now focuses on two fields: promised payment date and note. Employees no longer enter a promised amount in the follow-up form.

| Field                                    | Display | Required             | Notes                             |
| ---------------------------------------- | ------- | -------------------- | --------------------------------- |
| `promised_payment_date` / `promise_date` | yes     | yes when promised    | Employee promised repayment date  |
| `followup_note` / `staff_note`           | yes     | optional/recommended | Employee note                     |
| `promised_amount` / `promise_amount`     | no      | no                   | Removed from default follow-up UI |

## Implementation

- `deploy-worker/public/employee-v3.html`: `saveFollowup` no longer sends `promise_amount`.
- `deploy-worker/public/employee-v2.html`: legacy arrears task form no longer renders a `promise_amount` input.
- Existing backend/API compatibility fields are preserved.

## Safety

No D1 write, migration, business write, financial formula change, or dashboard calculation change was performed.
