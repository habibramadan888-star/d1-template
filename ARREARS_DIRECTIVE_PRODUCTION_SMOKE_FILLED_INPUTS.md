# Arrears Directive Production Smoke Filled Inputs

Date: 2026-05-31

## Important Status

These are prepared inputs for Ramadan review. They are not execution results.

- Production write gate enabled: `No`
- Production D1 write executed: `No`
- Owner directive created: `No`
- Employee follow-up submitted: `No`
- Rollback executed: `No`
- Production cutover: `PRODUCTION_NO_GO`

## existing_arrears_record task

- task_id: `task-mpgzu9kp-f150e26f`
- room_bed: `144`
- customer_code: `139780080`
- amount: `50 AED`
- reason selected: `lowest-risk existing arrears smoke candidate`

## assigned employee

- employee_id: `abdul`
- employee_name: `阿布杜`

## employee followup payload

- promised_payment_date: `2026-06-01`
- followup_note: `QA smoke：客户承诺测试日期付款，仅用于 production-linked 最小验证`

## idempotency

- owner idempotency key: `qa-prod-arrears-owner-20260531T203913-task-mpgzu9kp-f150e26f`
- employee idempotency key: `qa-prod-arrears-employee-20260531T203913-task-mpgzu9kp-f150e26f`

## rollback snapshot

- snapshot method: `read-only pre/post snapshot of selected task, directives, idempotency rows, and audit rows`
- snapshot storage location: `repo report file ARREARS_DIRECTIVE_PRODUCTION_PRE_SMOKE_SNAPSHOT.md`
- operator: `Ramadan Habib`
- approval timestamp: `2026-05-31T20:39:13+04:00`

## write gate

- enable operator: `Ramadan Habib`
- disable operator: `Ramadan Habib`
- expected open duration: `10 minutes`
- maximum allowed open duration: `15 minutes`

## approval

- approve temporary production write gate: `PENDING_RAMADAN_APPROVAL`
- approve 1 existing_arrears smoke write: `PENDING_RAMADAN_APPROVAL`
- approve immediate gate shutdown after smoke: `PENDING_RAMADAN_APPROVAL`
- confirm production cutover remains PRODUCTION_NO_GO: `yes`

## Explicit Non-Approval

This file does not approve execution. Ramadan must explicitly approve before any production write gate change or production business write.
