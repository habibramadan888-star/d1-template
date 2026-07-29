# Arrears Directive Owner API Result

Date: 2026-05-31

## API

`POST /api/boss/arrears/directives`

Request:

```json
{
  "task_ids": ["task-1", "task-2"],
  "assigned_employee_id": "staff-or-default",
  "note": "optional",
  "idempotency_key": "required"
}
```

Response when write approval is not enabled:

```json
{
  "code": 1000,
  "message": "production_write_approval_required",
  "approval_required": true,
  "operation": "boss_arrears_directives_create",
  "dry_run_only": true
}
```

## Implementation

- Added `handleBossArrearsDirectives`.
- Owner/manager only via `requireManager(user)`.
- readonly_admin and employee get 403.
- Requires `task_ids`.
- Requires `idempotency_key`.
- Default behavior blocks writes unless `ARREARS_DIRECTIVE_WRITE_APPROVED=true` or `ARREARS_DIRECTIVE_WRITE_MODE=approved`.
- Approved write path updates existing `arrear_tasks` records to `directive_status='assigned'`.
- Duplicate active directives are skipped, not recreated.
- Audit and entry events are emitted only on approved writes.

## Safety

No production D1 write was executed.
No migration was executed.
