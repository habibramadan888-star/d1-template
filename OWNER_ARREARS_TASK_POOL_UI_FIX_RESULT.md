# Owner Arrears Task Pool UI Fix Result

Date: 2026-05-30, Asia/Dubai

## Result

The owner arrears main list now renders task cards with:

- Source type.
- Customer code.
- Room / bed.
- Overdue days.
- Package / card.
- Task status.
- Responsible staff / owner request metadata.
- Promised repayment date.
- Recent staff note.
- Unknown TTLock amount shown as `金额待核对`.

## Removed From Main Pool

The main task pool does not render raw debug labels (`directive:`, `promise:`, `staff:`) and does not render direct write shortcuts (`录入收款`, `录入押金`, `作废`) in the owner arrears list.
