# Arrears Real Directive Delivery Production Write Approval Required

Date: 2026-05-31

## Why Approval Is Required

Real employee directive delivery persists business state. It changes what employees see and what owners treat as assigned follow-up work. Production writes must be separately approved.

## Write APIs

| API | Write Purpose |
|---|---|
| `POST /api/boss/arrears/directives` | Assign selected arrears tasks to employee follow-up. |
| `POST /api/employee/arrears/directives/:id/followup` | Employee submits promised payment date and note. |

## Tables And Fields

| Table | Fields |
|---|---|
| `arrear_tasks` | `userid`, `boss_requested_at`, `boss_requested_by`, `directive_status`, `owner_note`, `promise_date`, `staff_note`, `staff_promised_at`, `last_followup_at`, `updated_by`, `updated_at` |
| `entry_events` | Directive assignment and employee follow-up event records. |
| `audit_logs` | API-level audit records. |

## Duplicate Prevention

- `idempotency_key` is required by API contract.
- Active existing directives (`assigned`, `pending`, `viewed`, `promised`, `followed_up`, `needs_review`) are skipped.
- Closed/cancelled tasks are not re-created as active directives.

## Rollback

Rollback plan before enabling production writes:

1. Disable `ARREARS_DIRECTIVE_WRITE_APPROVED`.
2. Stop new directive writes.
3. Use audit/event records to identify affected task ids.
4. Revert directive fields on selected task ids only after separate approval.

## Verification Required Before Approval

- Staging write QA with backup/rollback confirmation.
- Owner send creates assigned directives.
- Employee read sees assigned directives only.
- Employee follow-up updates date/note only.
- Owner sees employee feedback.
- readonly_admin remains read-only.
- No amount/dashboard/financial formula changes.

## Current Status

- Live production remains dry-run only.
- No production D1 write was executed in this task.
- Production cutover remains `PRODUCTION_NO_GO`.
