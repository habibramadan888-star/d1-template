# Owner Arrears Management Final UI Spec

Status: final UI design only

## Page

Owner app must expose a `欠款管理` page focused on management, review, and audit. It is not the main employee entry surface.

## Required Views

- All arrears.
- Today follow-up.
- Promised today.
- Promise overdue.
- Paid reported pending accounting review.
- High-risk customers.
- Closed.
- False positive / moved out.

## Task Row Fields

- Customer code.
- Bed or room.
- Source type.
- Overdue days.
- Current status.
- Assigned employee.
- Last follow-up time.
- Promise payment date.
- Latest note.
- Risk level.
- Historical arrears count.
- Accounting status.

## Owner Actions

- Assign employee.
- Confirm false positive.
- Confirm moved out.
- Mark needs review.
- Confirm close.
- Void task.
- View customer arrears history.
- Export WhatsApp staff follow-up list.

## UX Requirements

- Bulk select tasks.
- Directive button disabled until at least one row is selected.
- Overdue rows visually highlighted.
- `paid_reported` must be visibly different from `payment_matched`.
- Readonly admin sees the page but no write controls.
