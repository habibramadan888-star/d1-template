# Owner Overview Business Value Redesign

Date: 2026-05-28, Asia/Dubai

Scope: owner overview layout and prioritization. Existing data sources and calculation helpers are reused; dashboard calculation and financial formula were not changed.

## Decision Value

The owner overview now prioritizes a quick business readout instead of empty operational counters. It is intended to answer:

- How much was received today?
- How much remains outstanding?
- Are there items needing attention?
- What was the latest handover state?

## Modules

| Module             | Status              | Purpose                                                                                                                                        |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 今日实收           | kept and promoted   | Fast read of same-day received amount.                                                                                                         |
| 待收尾款           | kept and promoted   | Highlights outstanding balance needing follow-up.                                                                                              |
| 今日待处理         | added / promoted    | Gives the owner a count-based action signal.                                                                                                   |
| 最近交接           | added / promoted    | Summarizes latest handover state when available.                                                                                               |
| 异常提醒           | added               | Surfaces short-pay, overdue, pending review, and void/correction categories; unavailable authority is marked as pending instead of fabricated. |
| 待收尾款列表       | kept                | Gives direct follow-up context without changing calculations.                                                                                  |
| 最近会话           | kept but downgraded | Useful operational context, not the primary decision item.                                                                                     |
| 最近流水摘要       | added               | Shows latest session / transaction context when available.                                                                                     |
| 快速进入           | removed             | Removed from the bottom of the overview because it duplicated primary navigation and had no distinct business function.                        |
| Raw total counters | downgraded          | No longer the main overview value because they do not answer immediate owner decisions.                                                        |

## Boundaries

| Item                          | Result                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard calculation changed | no                                                                                                                                        |
| Financial formula changed     | no                                                                                                                                        |
| Business write flow changed   | no                                                                                                                                        |
| Backend authority needed      | MANUAL_REQUIRED for any unavailable short-pay / overdue / pending-review / void authority that is not already represented by current data |
| Production cutover            | `PRODUCTION_NO_GO`                                                                                                                        |
