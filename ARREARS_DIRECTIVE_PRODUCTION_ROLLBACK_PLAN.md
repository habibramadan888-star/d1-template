# Arrears Directive Production Rollback Plan

Date: 2026-05-31

## Purpose

Define rollback/cleanup steps for a separately approved minimum production smoke. This document does not approve or execute production rollback.

## Identification

Use all of the following:

- Approved task ids.
- Idempotency key pattern: `prod-arrears-directive-smoke-*`.
- QA note/tag: `PROD_ARREARS_DIRECTIVE_SMOKE_APPROVED_*`.
- `audit_logs.action`:
  - `boss.arrears.directives.create`
  - `employee.arrears.directive.followup`
- `request_idempotency_keys.action`:
  - `boss_arrears_directive_create`
  - `employee_arrears_followup_update`

## Pre-Smoke Snapshot

Before any approved production write, snapshot selected task fields:

```sql
SELECT task_id, corpid, userid, boss_requested_at, boss_requested_by,
       boss_requested_due_date, directive_status, staff_promised_at,
       promise_date, staff_note, last_followup_at, updated_by, updated_at,
       owner_note
  FROM arrear_tasks
 WHERE task_id IN (...approved ids...);
```

## Rollback SQL Pattern

Use the pre-smoke snapshot values. Do not run without explicit approval.

```sql
UPDATE arrear_tasks
   SET userid = ?,
       boss_requested_at = ?,
       boss_requested_by = ?,
       boss_requested_due_date = ?,
       directive_status = ?,
       staff_promised_at = ?,
       promise_date = ?,
       staff_note = ?,
       last_followup_at = ?,
       updated_by = ?,
       updated_at = ?,
       owner_note = ?
 WHERE task_id = ?
   AND corpid = ?;
```

## Audit Retention

Do not delete `audit_logs` by default. Audit entries should remain as evidence of the approved smoke and rollback.

Do not delete `request_idempotency_keys` by default after writes. They prevent accidental replay with the same keys.

## Write Gate Shutdown

Immediately after smoke and/or rollback:

1. Delete production `ARREARS_DIRECTIVE_WRITE_APPROVED` secret if used.
2. Ensure `ARREARS_DIRECTIVE_WRITE_MODE` is not `approved`.
3. Verify write attempts return approval-required/blocked unless explicitly reopened.

## Dashboard / Financial Safety Confirmation

After rollback, confirm by inspection only unless separately approved:

- No dashboard calculation code changed.
- No financial formula code changed.
- No money/receivables/handover/tenant-scope code changed.
- Selected smoke rows have only directive/follow-up fields changed/restored.

## Production Cutover

Rollback does not change production launch status. Production cutover remains `PRODUCTION_NO_GO`.
