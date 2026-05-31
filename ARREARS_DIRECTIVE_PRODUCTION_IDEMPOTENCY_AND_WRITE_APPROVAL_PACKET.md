# Arrears Directive Production Idempotency And Write Approval Packet

Date: 2026-05-31

Status: `PRODUCTION_APPROVAL_REQUIRED`

This packet is generated from staging-only QA. It does not authorize production migration, production D1 writes, production deploy, production write gate enablement, or production cutover.

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

## Approval Documents

| Document                                                                | Purpose                                  |
| ----------------------------------------------------------------------- | ---------------------------------------- |
| `ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_GAP_REVIEW.md`                     | Schema gap and migration requirements    |
| `ARREARS_DIRECTIVE_PRODUCTION_WRITE_GATE_PLAN.md`                       | Temporary write gate rules               |
| `ARREARS_DIRECTIVE_PRODUCTION_MINIMUM_SMOKE_PLAN.md`                    | Minimum approved production-linked smoke |
| `ARREARS_DIRECTIVE_PRODUCTION_ROLLBACK_PLAN.md`                         | Rollback and cleanup plan                |
| `NEXT_PROMPT_ARREARS_DIRECTIVE_PRODUCTION_SCHEMA_AND_WRITE_APPROVAL.md` | Explicit next approval prompt            |

## Production Schema Gap Summary

Production schema was not live-queried because this task forbids production D1 execute.

Repository review indicates production needs explicit confirmation/migration for:

- `request_idempotency_keys` table and indexes.
- `arrear_tasks` directive fields from `migrations/002_add_boss_directive_fields.sql` if not already applied.
- Nullable `arrear_tasks.source_type` and `arrear_tasks.source_ref` if production must persist ttlock source rows in `arrear_tasks`.

All schema work requires separate Ramadan approval before execution.

## Write Gate Summary

| Item                                 | Status                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Gate                                 | `ARREARS_DIRECTIVE_WRITE_APPROVED` or `ARREARS_DIRECTIVE_WRITE_MODE=approved` |
| Default production state             | Closed                                                                        |
| Current task enabled production gate | No                                                                            |
| Allowed only after approval          | Owner directive create and employee follow-up write                           |
| readonly_admin                       | Read-only; writes remain 403                                                  |

## Minimum Production Smoke Summary

This is not production cutover.

After explicit approval, the minimum smoke is:

1. Select exactly 1 safe existing arrears task.
2. Optionally select 1 ttlock task only if production supports persisted ttlock rows and approval says yes.
3. Owner creates directive with idempotency key.
4. Duplicate owner request replays.
5. Assigned employee reads directive.
6. Employee submits `promised_payment_date` and `followup_note`.
7. Duplicate employee request replays.
8. Owner sees feedback.
9. readonly_admin write returns 403.
10. Audit and rollback evidence are recorded.

## Rollback Summary

Before any approved production write, snapshot selected task directive/follow-up fields. If rollback is needed, restore only those fields for the approved task ids. Keep audit/idempotency records unless separate destructive cleanup is approved.

The production write gate must be disabled immediately after smoke/rollback.

## Explicit Approval Requirement

Ramadan must explicitly approve each of the following before any production operation:

1. Production schema migration.
2. Temporary production write gate enablement.
3. 1-2 row maximum production-linked smoke write.
4. Rollback/cleanup permission.
5. Continued `PRODUCTION_NO_GO` status.

Until then:

- Production D1 write: `NO`
- Production migration: `NO`
- Production deploy: `NO`
- Production write gate enabled: `NO`
- Commercial launch: `PRODUCTION_NO_GO`
