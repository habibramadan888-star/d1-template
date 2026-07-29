# Arrears Directive Write QA Approval Required

Date: 2026-05-31

Result: `APPROVAL_REQUIRED_BEFORE_WRITE_QA`

This task did not execute the real owner-to-employee directive write loop because no safe write QA target was explicitly confirmed for this run.

## Why This Is Blocked

The requested QA validates real persisted state:

1. Owner creates an arrears directive.
2. Employee reads the assigned directive.
3. Employee submits `promised_payment_date` and `followup_note`.
4. Owner sees the employee feedback.
5. Duplicate/idempotency and readonly guards are validated.

That flow writes business state. It must not run against production, and it must not run against staging or production-copy without explicit approval for this specific QA run.

## Required Approval To Proceed

Before running write QA, provide all of the following:

| Required Item | Needed Value |
|---|---|
| Target environment | `staging`, `production-copy`, or explicitly approved `local` |
| Target DB | exact D1 name/id or local DB path |
| Production exclusion | explicit confirmation that target is not production |
| Backup confirmation | backup exists or backup not required for local disposable DB |
| Rollback confirmation | rollback plan accepted |
| Write gate | QA-only `ARREARS_DIRECTIVE_WRITE_APPROVED=true` or equivalent |
| Test owner/manager | approved test account only |
| Test employee | approved test account only |
| Test task ids | one existing arrears record and one ttlock-expired-unpaid task if available |
| Idempotency key policy | unique test keys, duplicate-key replay check |

## Approved Write Scope After Confirmation

Only these APIs may be exercised:

| API | Purpose |
|---|---|
| `POST /api/boss/arrears/directives` | Assign selected arrears tasks to an employee in the approved QA target only. |
| `GET /api/employee/arrears/directives` | Employee reads assigned tasks. |
| `POST /api/employee/arrears/directives/:id/followup` | Employee submits promised payment date and note only. |
| `GET /api/boss/arrears/followup-tasks` | Owner verifies feedback. |

## Forbidden In The Write QA

- Production D1 writes.
- Production migrations.
- D1 export/import/execute unless separately authorized for the QA target.
- Financial formula changes.
- Dashboard calculation changes.
- Money, receivables, handover, or tenant-scope rule changes.
- Secret printing or commits.
- Commercial launch GO.

## Current Status

| Item | Result |
|---|---|
| Owner directive API implemented | yes |
| Employee read API implemented | yes |
| Employee follow-up API implemented | yes |
| Production write gate bypassed | no |
| Real write QA executed | no |
| Production D1 write | no |
| Migration | no |
| Production cutover | `PRODUCTION_NO_GO` |
