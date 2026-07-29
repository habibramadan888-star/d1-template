# Owner Arrears Directive Feedback Display Result

Date: 2026-05-31

## Owner Card Display

Owner arrears card details display:

- Promise date (`promise_date` / `promised_payment_date`)
- Employee note (`staff_note` / `followup_note`)
- Business status (`directive_status` / follow-up status)
- Responsible employee (`userid` / `assigned_employee_id`)

## Hidden From Default Card

- Promised amount
- Internal ids
- `source_ref`
- `dedupe_key`
- raw `source_type`
- debug fields

## Backend Contract

`empTaskToBossArrear()` now exposes:

- `assigned_employee_id`
- `assigned_employee_name`
- `promised_payment_date`
- `followup_note`
- `directive_status`

## Safety

No write was executed.
