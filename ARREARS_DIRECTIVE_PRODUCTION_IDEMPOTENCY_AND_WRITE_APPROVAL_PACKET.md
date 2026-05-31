# Arrears Directive Production Idempotency And Write Approval Packet

Date: 2026-05-31

Status: `PRODUCTION_APPROVAL_REQUIRED`

This packet is generated from staging-only QA plus production read-only schema metadata checks. It does not authorize production migration, production D1 writes, production deploy, production write gate enablement, production write smoke, or production cutover.

## Staging Evidence

| Area                                | Result           |
| ----------------------------------- | ---------------- |
| staging existing_arrears_record E2E | PASS             |
| staging ttlock_expired_unpaid E2E   | PASS             |
| idempotency replay                  | PASS             |
| audit traceability                  | PASS             |
| rollback                            | PASS             |
| readonly_admin write block          | PASS             |
| production D1 write                 | NO               |
| production migration                | NO               |
| production deploy                   | NO               |
| production cutover                  | PRODUCTION_NO_GO |

## Production Schema Live Check Summary

Live check document: `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_LIVE_CHECK_RESULT.md`

| Area                           | Production Result | Impact                                              |
| ------------------------------ | ----------------- | --------------------------------------------------- |
| `arrear_tasks` table           | present           | can store directive/follow-up fields                |
| boss directive fields          | present           | migration 002 appears applied                       |
| employee follow-up fields      | present           | employee follow-up fields available                 |
| `idx_arrear_tasks_directive`   | present           | directive query index available                     |
| `audit_logs` table/core fields | present           | audit path schema available                         |
| `request_idempotency_keys`     | missing           | blocker before write smoke                          |
| idempotency unique/indexes     | missing           | blocker before write smoke                          |
| `source_type` / `source_ref`   | missing           | required only for persisted ttlock production smoke |

Schema readiness conclusion: `SCHEMA_MIGRATION_REQUIRED_BEFORE_WRITE_SMOKE`

## Approval Documents

| Document                                                                | Purpose                                     |
| ----------------------------------------------------------------------- | ------------------------------------------- |
| `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_LIVE_CHECK_RESULT.md`              | Production read-only schema evidence        |
| `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_GAP_REVIEW.md`                     | Final schema gap and migration requirements |
| `ARREARS_DIRECTIVE_PRODUCTION_WRITE_GATE_PLAN.md`                       | Temporary write gate rules                  |
| `ARREARS_DIRECTIVE_PRODUCTION_MINIMUM_SMOKE_PLAN.md`                    | Minimum approved production-linked smoke    |
| `ARREARS_DIRECTIVE_PRODUCTION_ROLLBACK_PLAN.md`                         | Rollback and cleanup plan                   |
| `ARREARS_DIRECTIVE_PRODUCTION_SMOKE_TASK_INPUT_TEMPLATE.md`             | Manual task/operator input template         |
| `NEXT_PROMPT_ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_AND_WRITE_APPROVAL.md` | Fixed readable approval prompt              |

## Required Before Production Write Smoke

1. Ramadan approves production idempotency schema migration.
2. Idempotency table and indexes are applied to production.
3. Ramadan manually fills smoke task ids.
4. Ramadan manually fills rollback snapshot method/location/operator.
5. Ramadan manually fills write gate enable/disable operators and expected open duration.
6. Ramadan explicitly confirms production cutover remains `PRODUCTION_NO_GO`.

## Write Gate Summary

| Item                                 | Status                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Gate                                 | `ARREARS_DIRECTIVE_WRITE_APPROVED` or `ARREARS_DIRECTIVE_WRITE_MODE=approved` |
| Default production state             | Closed                                                                        |
| Current task enabled production gate | No                                                                            |
| Allowed only after approval          | Owner directive create and employee follow-up write                           |
| readonly_admin                       | Read-only; writes remain 403                                                  |

## Current Recommendation

Do not approve production write smoke yet.

Approve only the next controlled step if Ramadan wants to proceed:

1. Production idempotency schema migration approval.
2. Optional `source_type` / `source_ref` migration only if ttlock persisted production smoke is approved.
3. Then re-check schema before enabling the write gate.

## Explicit Approval Requirement

Ramadan must explicitly approve each of the following before any production operation:

1. Production schema migration.
2. Temporary production write gate enablement.
3. 1 existing arrears production-linked smoke write.
4. Optional 1 ttlock production-linked smoke write only if schema supports it.
5. Rollback/cleanup permission.
6. Continued `PRODUCTION_NO_GO` status.

Until then:

- Production D1 write: `NO`
- Production migration: `NO`
- Production deploy: `NO`
- Production write gate enabled: `NO`
- Commercial launch: `PRODUCTION_NO_GO`
