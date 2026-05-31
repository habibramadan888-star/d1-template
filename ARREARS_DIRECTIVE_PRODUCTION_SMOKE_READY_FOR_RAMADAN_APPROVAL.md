# Arrears Directive Production Smoke Ready For Ramadan Approval

Date: 2026-05-31

## Status

This is a prepared approval packet for a minimum one-row `existing_arrears_record` production-linked write smoke. It is not an execution result.

## Prepared Inputs

| Area                              | Value                                                               |
| --------------------------------- | ------------------------------------------------------------------- |
| selected task                     | `task-mpgzu9kp-f150e26f`                                            |
| room_bed                          | `144`                                                               |
| customer_code                     | `139780080`                                                         |
| amount                            | `50 AED`                                                            |
| selected employee                 | `abdul` / `阿布杜`                                                  |
| promised_payment_date             | `2026-06-01`                                                        |
| followup_note                     | `QA smoke：客户承诺测试日期付款，仅用于 production-linked 最小验证` |
| owner idempotency key             | `qa-prod-arrears-owner-20260531T203913-task-mpgzu9kp-f150e26f`      |
| employee idempotency key          | `qa-prod-arrears-employee-20260531T203913-task-mpgzu9kp-f150e26f`   |
| rollback snapshot location        | `ARREARS_DIRECTIVE_PRODUCTION_PRE_SMOKE_SNAPSHOT.md`                |
| write gate expected open duration | `10 minutes`                                                        |
| write gate maximum open duration  | `15 minutes`                                                        |

## Not Yet Executed

| Item                         | Status             |
| ---------------------------- | ------------------ |
| write gate opened            | no                 |
| production D1 business write | no                 |
| owner directive created      | no                 |
| employee follow-up submitted | no                 |
| rollback executed            | no                 |
| production deploy            | no                 |
| production cutover           | `PRODUCTION_NO_GO` |

## Required Ramadan Decision

Ramadan must explicitly reply with approval before execution. Required approval must include:

1. Approve temporary production write gate.
2. Approve exactly 1 `existing_arrears_record` production smoke write.
3. Approve the selected task and employee.
4. Approve the prepared follow-up payload.
5. Approve the rollback snapshot method and operator.
6. Approve immediate write gate shutdown after smoke.
7. Confirm production cutover remains `PRODUCTION_NO_GO`.

If Ramadan does not approve, the task stops.

## Boundaries

- No ttlock production smoke.
- No batch write.
- No `source_type` / `source_ref` migration.
- No production cutover.
- No commercial launch GO.
- No Partial P0 Verified marking.
- No financial formula change.
- No dashboard calculation change.
- No password/token/cookie output.
