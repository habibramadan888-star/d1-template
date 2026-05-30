# Employee Arrears Follow-up Final UI Spec

Status: final UI design only

## Page

Employee app needs a clear `欠款跟进` task page or equivalent highlighted section.

## Required Summary

- My pending follow-up task count.
- Promised today count.
- Promise overdue count.
- Paid reported pending review count.

## Task Organization

Tasks should be grouped by apartment and room/bed. Each task card must show:

- Customer code.
- Bed or room.
- Overdue days.
- Package reference.
- Current follow-up status.
- Promise payment date if any.
- Owner requested due date if any.
- Latest note preview.

## Employee Actions

- `已联系` / contacted.
- `承诺付款` / promised.
- `已反馈付款` / paid reported.
- `客户已搬走` / suggest moved out.
- `误报` / suggest false positive.
- `继续跟进` / pending follow-up.

## Required Fields

When submitting promised payment:

- Payment date.
- Note.
- Optional promised amount in fils.

When submitting paid reported:

- Note.
- Optional amount.
- Optional payment method.

## Restrictions

Employee cannot:

- Close task.
- Delete task.
- Void task.
- Modify overdue days.
- Modify amount authority status.
- Confirm accounting payment match.

## Forced Follow-up Rule

Assigned arrears tasks must be visible and hard to ignore, but the system must not block urgent normal employee operations such as current cash entry or emergency handover.
