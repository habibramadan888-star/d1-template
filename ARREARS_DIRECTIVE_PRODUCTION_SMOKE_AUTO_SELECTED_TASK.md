# Arrears Directive Production Smoke Auto Selected Task

Date: 2026-05-31

## Scope

Production read-only query only. No production write gate, business write, migration, deploy, directive creation, employee follow-up, rollback, or production cutover was executed.

## Selected Task

| Field           | Value                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| task_id         | `task-mpgzu9kp-f150e26f`                                                                                                         |
| room_bed        | `144`                                                                                                                            |
| customer_code   | `139780080`                                                                                                                      |
| amount          | `50 AED`                                                                                                                         |
| source          | `existing_arrears_record`                                                                                                        |
| status          | `followup_status=待跟进`, `close_status=NULL`, `directive_status=none`                                                           |
| reason selected | lowest-risk existing arrears smoke candidate: smallest amount, open, non-voided, has bed, has customer code, no active directive |

## Candidate List

| Rank | task_id                  | room_bed | customer_code | amount | status   | directive_status | Reason                                                                  |
| ---: | ------------------------ | -------- | ------------- | -----: | -------- | ---------------- | ----------------------------------------------------------------------- |
|    1 | `task-mpgzu9kp-f150e26f` | `144`    | `139780080`   |     50 | `待跟进` | `none`           | Selected; only matching low-risk candidate returned by the strict query |

## Query Criteria Applied

- Source treated as `existing_arrears_record` because the row is from production `arrear_tasks`.
- Non-closed: `close_status` not in closed/paid/cleared values.
- Non-voided: `voided_at` empty.
- Amount exists and is greater than zero.
- `bed` exists.
- `tenant_card_id` exists and is used as `customer_code`.
- No active directive: `directive_status` is `none` or empty.
- Sorted by lowest `arrear_amount`, then `bed`.

## Safety Status

- Production D1 write: `No`
- Production write gate: `Off`
- Production migration: `No`
- Production deploy: `No`
- Production cutover: `PRODUCTION_NO_GO`
