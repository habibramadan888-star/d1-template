# Arrears Directive Production Idempotency And Write Approval Packet

Status: `PRODUCTION_APPROVAL_REQUIRED`

This packet is generated from staging-only QA. It does not authorize production migration or production writes.

## Staging Coverage

| Area | Result |
|---|---|
| existing_arrears_record E2E staging QA | PASS |
| ttlock_expired_unpaid E2E staging QA | PASS |
| idempotency | PASS |
| audit | PASS |
| rollback | PASS |
| readonly_admin | PASS |
| production D1 write | NO |
| production migration | NO |
| production cutover | PRODUCTION_NO_GO |

## Production Schema / Write Approval Still Required

- Production migration/write must be approved separately.
- Production write gate must not be enabled automatically.
- If persisted ttlock directive tasks are required in production, source metadata such as `source_type='ttlock_expired_unpaid'` requires an explicit production schema/data plan.

## Idempotency Strategy

- Same key + same scope/action/actor/payload returns stored replay.
- Same key + different actor or payload returns `409 idempotency_conflict`.
- Duplicate active task assignment is skipped.

## Rollback Strategy

- Disable write gate.
- Use QA tag, idempotency keys, audit logs, and task ids to identify affected rows.
- Restore or delete selected rows only after separate approval.

Explicit user approval is required before production migration or production-linked write.
