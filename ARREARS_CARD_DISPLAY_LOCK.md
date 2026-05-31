# Arrears Card Display Lock

## Allowed Owner Card Fields

| Field         | Display                                                               |
| ------------- | --------------------------------------------------------------------- |
| Bed           | Business title, e.g. `3-329` or `床位待确认`                          |
| Amount        | Business title, e.g. `630.00 AED` or controlled missing-rent QA state |
| Source        | Chinese label: `系统已有欠款` or `通通锁到期未付`                     |
| Due / overdue | Business due line                                                     |
| Promise date  | `承诺日期`                                                            |
| Note          | `备注`                                                                |
| Status        | Business status pill                                                  |
| Actions       | `下发员工` / `详情` according to role                                 |

## Forbidden Owner Card Fields

1. `#ttlock-expired-xxxx`
2. Internal ID
3. `source_ref`
4. `dedupe_key`
5. `ttlock_card`
6. Raw `source_type`
7. Raw `directive`
8. Raw `promise`
9. Raw `staff`
10. `none`
11. `undefined`
12. `null`
13. `承诺金额`
14. Debug fields

## Raw Field Mapping

| Raw Field                                | Owner Card Display                                         | Allowed          |
| ---------------------------------------- | ---------------------------------------------------------- | ---------------- |
| `task_id`                                | Hidden from main card; optional technical detail only      | Main card: no    |
| `id`                                     | Hidden from main card                                      | Main card: no    |
| `source_ref`                             | Hidden from main card                                      | Main card: no    |
| `dedupe_key`                             | Hidden from user UI                                        | no               |
| `tenant_card_id` / TTLock card id        | Hidden from owner default card                             | Main card: no    |
| `source_type=existing_arrears_record`    | `系统已有欠款`                                             | yes              |
| `source_type=ttlock_expired_unpaid`      | `通通锁到期未付`                                           | yes              |
| unsupported source                       | Not rendered in default list                               | no               |
| `bed`, `room`, `room_bed`                | Bed label                                                  | yes              |
| `remain`, `amount`, `amount_fils`        | System amount label                                        | yes              |
| `promise_date`, `promised_payment_date`  | `承诺日期`                                                 | yes              |
| `staff_note`, `followup_note`            | `备注`                                                     | yes              |
| `followup_status`, `directive_status`    | Chinese business status                                    | yes, mapped only |
| `promise_amount`, `promised_amount_fils` | Not shown by default owner card                            | no               |
| empty value                              | Business fallback such as `未填写` / `暂无` / `床位待确认` | yes, mapped only |

## Current Implementation

Current owner card renderer uses:

1. `arrearBedLabel()`
2. `arrearAmountLabel()`
3. `arrearSourceLabel()`
4. `arrearDueLine()`
5. `arrearPromiseDateLabel()`
6. `arrearFollowupNoteLabel()`
7. `arrearBusinessState()`

Current card no longer calls `arrearPromiseAmountLabel()` in the default card path.

## Required Tests

1. No internal ID or TTLock raw id in card title.
2. No `ttlock_card` in main card.
3. No raw source/status/debug terms.
4. No `none/null/undefined`.
5. No `承诺金额`.
6. Bed and amount remain visible.

## Promise Amount Display Lock

- Owner arrears cards show system arrears amount, promised payment date, follow-up note, and status.
- Owner default cards must not show `promise_amount`, `promised_amount`, or `promised_amount_fils`.
- Promised amount fields are legacy optional only and may not re-enter the default owner card.
- No dashboard calculation, financial formula, D1 write, or migration was performed.
- Production cutover remains `PRODUCTION_NO_GO`.
