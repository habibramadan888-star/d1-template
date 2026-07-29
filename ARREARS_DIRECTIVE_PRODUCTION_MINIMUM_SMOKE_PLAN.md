# Arrears Directive Production Minimum Smoke Plan

Date: 2026-05-31

## Scope

This is not production cutover. This is a minimum production-linked write smoke that requires separate explicit manual approval before execution.

## Preconditions

1. Production schema gap is reviewed.
2. Required production migration is approved and applied.
3. Production write gate is temporarily enabled.
4. Smoke task ids are explicitly selected and recorded.
5. Rollback/cleanup operator is ready.
6. Production cutover remains `PRODUCTION_NO_GO`.

## Minimum Existing Arrears Smoke

| Step                      | Expected                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| Select task               | Select exactly 1 safe `existing_arrears_record` task                         |
| Owner create directive    | `POST /api/boss/arrears/directives`, `created_count=1`                       |
| Owner duplicate replay    | Repeat same key/payload, expect replay header                                |
| Employee read             | Assigned employee sees exactly that directive                                |
| Employee follow-up        | Submit `promised_payment_date` and `followup_note`                           |
| Employee duplicate replay | Repeat same key/payload, expect replay header                                |
| Owner feedback            | Owner sees promised date and note                                            |
| readonly_admin write      | Attempt write, expect 403                                                    |
| Audit                     | Owner and employee audit entries present                                     |
| Rollback                  | Restore selected task directive/follow-up fields or execute approved cleanup |

## TTLock Smoke Decision

| Production TTLock Persistent Row Support                         | Plan                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Production supports `ttlock_expired_unpaid` persistent task rows | Select exactly 1 safe ttlock task and repeat the same smoke steps              |
| Production does not yet support ttlock persistent rows           | Do not create ttlock production smoke row; record ttlock production limitation |

## Idempotency Key Pattern

Use a unique pattern such as:

`prod-arrears-directive-smoke-YYYYMMDD-HHMM-owner-01`

`prod-arrears-directive-smoke-YYYYMMDD-HHMM-employee-01`

## QA Tag

Use a visible note/tag:

`PROD_ARREARS_DIRECTIVE_SMOKE_APPROVED_<date>_<operator>`

## Boundaries

- Maximum 1 existing source task write.
- Optional maximum 1 ttlock source task write only if approved.
- No production cutover.
- No commercial launch GO.
- No Partial P0 Verified marking.
