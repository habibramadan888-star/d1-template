# Arrears Directive Production Idempotency And Write Approval Packet

Date: 2026-05-31

Status: `PRODUCTION_EXISTING_ARREARS_SMOKE_APPROVAL_REQUIRED`

This packet is generated from staging QA, production read-only schema metadata checks, and the approved production idempotency schema migration. It does not authorize production business writes, production write gate enablement, production write smoke, deploy, or production cutover.

## Staging Evidence

| Area                                | Result |
| ----------------------------------- | ------ |
| staging existing_arrears_record E2E | PASS   |
| staging ttlock_expired_unpaid E2E   | PASS   |
| idempotency replay                  | PASS   |
| audit traceability                  | PASS   |
| rollback                            | PASS   |
| readonly_admin write block          | PASS   |

## Production Schema State

| Area                           | Production Result | Impact                                                  |
| ------------------------------ | ----------------- | ------------------------------------------------------- |
| `arrear_tasks` table           | present           | can store directive/follow-up fields                    |
| boss directive fields          | present           | migration 002 applied                                   |
| employee follow-up fields      | present           | employee follow-up fields available                     |
| `idx_arrear_tasks_directive`   | present           | directive query index available                         |
| `audit_logs` table/core fields | present           | audit path schema available                             |
| `request_idempotency_keys`     | present           | idempotency prerequisite closed                         |
| idempotency unique/indexes     | present           | replay/conflict path ready                              |
| `source_type` / `source_ref`   | absent            | still needed only for persisted ttlock production smoke |

Schema readiness conclusion: `SCHEMA_READY_FOR_EXISTING_ARREARS_WRITE_SMOKE`

## Current Approval Documents

| Document                                                                      | Purpose                             |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| `ARREARS_DIRECTIVE_PRODUCTION_IDEMPOTENCY_MIGRATION_SQL_REVIEW.md`            | Migration SQL and rollback review   |
| `ARREARS_DIRECTIVE_PRODUCTION_IDEMPOTENCY_PREMIGRATION_CHECK.md`              | Pre-migration safety check          |
| `ARREARS_DIRECTIVE_PRODUCTION_IDEMPOTENCY_MIGRATION_RESULT.md`                | Production schema migration result  |
| `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_POST_MIGRATION_CHECK.md`                 | Post-migration schema evidence      |
| `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_GAP_REVIEW.md`                           | Updated schema readiness            |
| `ARREARS_DIRECTIVE_PRODUCTION_SMOKE_TASK_INPUT_TEMPLATE.md`                   | Manual task/operator input template |
| `NEXT_PROMPT_ARREARS_DIRECTIVE_PRODUCTION_EXISTING_ARREARS_SMOKE_APPROVAL.md` | Next approval prompt                |

## Required Before Any Existing Arrears Production Write Smoke

1. Ramadan explicitly approves temporary production write gate enablement.
2. Ramadan explicitly approves exactly 1 `existing_arrears_record` production smoke write.
3. Ramadan manually specifies `task_id`, employee, promised payment date, follow-up note, QA tag, and idempotency keys.
4. Ramadan specifies rollback snapshot method/location and rollback operator.
5. Ramadan specifies write gate enable/disable operator and expected open duration.
6. Operator confirms write gate will be disabled immediately after smoke/rollback.
7. Production cutover remains `PRODUCTION_NO_GO`.

## TTLock Boundary

Do not include ttlock production smoke in the next step unless Ramadan separately approves `source_type` / `source_ref` schema handling for persisted ttlock rows.

## Current Recommendation

The schema is ready for a separately approved one-row `existing_arrears_record` production write smoke.

Do not execute smoke until the next approval prompt is explicitly filled and approved.

## Safety Status

- Production business write: `NO`
- Production schema migration executed in this task: `request_idempotency_keys` only
- `source_type` / `source_ref` migration: `NO`
- Production write gate enabled: `NO`
- Production deploy: `NO`
- Commercial launch: `PRODUCTION_NO_GO`

## Existing Arrears Production Smoke PASS Addendum

Date: 2026-05-31, Asia/Dubai

Status update: the separately approved one-row `existing_arrears_record` production-linked smoke has completed and passed.

| Area | Result |
|---|---|
| smoke retry commit | `a2bef0d` |
| result file | `ARREARS_DIRECTIVE_PRODUCTION_EXISTING_ARREARS_SMOKE_RETRY_RESULT.md` |
| selected task | `task-mpgzu9kp-f150e26f` |
| owner directive create | PASS |
| owner idempotency replay | PASS |
| employee read | PASS |
| employee follow-up | PASS |
| employee idempotency replay | PASS |
| owner feedback visible | PASS |
| readonly_admin blocked | PASS |
| rollback / cleanup | PASS |
| write gate after smoke | closed |
| production cutover | `PRODUCTION_NO_GO` |

### Smoke Write Scope

- One owner directive create for `task-mpgzu9kp-f150e26f`.
- One employee follow-up for the same task.
- Two idempotency evidence rows retained.
- Two audit evidence rows retained.
- One directive/follow-up event evidence row retained.
- One cleanup/restore update for the same selected task.

### Cleanup Result

The selected task was restored to its pre-smoke business state:

- `arrear_amount`: `50 AED`, unchanged.
- `actual_received`: `0`, unchanged.
- `directive_status`: restored to `none`.
- `userid`: restored to `staff`.
- `promise_date`: restored to `2026-05-24`.
- `staff_note`: restored to the original production value.

### Remaining Boundaries

- TTLock production smoke: `NOT TESTED`.
- Batch rollout: `NOT APPROVED`.
- Financial formula: unchanged.
- Dashboard calculation: unchanged.
- Commercial launch: remains `PRODUCTION_NO_GO`.

Recommendation: return to internal acceptance. Do not proceed to TTLock production smoke or batch rollout unless Ramadan separately approves that next scope.
