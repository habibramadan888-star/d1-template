# Arrears Directive Production Idempotency And Write Approval Packet

Status: `PRODUCTION_APPROVAL_REQUIRED`

This packet is generated from staging-only QA. It does not authorize production migration or production writes.

## Staging Result

| Step | Result |
| --- | --- |
| staging idempotency migration | pass |
| owner creates directive | pass |
| duplicate owner request prevented | pass |
| employee reads directive | pass |
| employee submits date/note | pass |
| duplicate employee request prevented | pass |
| owner sees feedback | pass |
| readonly_admin blocked | pass |
| audit recorded | pass |
| rollback plan valid | pass |
| production D1 write | no |
| production migration | no |
| production cutover | PRODUCTION_NO_GO |

## Production Schema Proposal

- Add `request_idempotency_keys` with unique `(scope, action, idempotency_key)`.
- Store actor, request hash, response hash/body, resource metadata, status, created/expires timestamps.

## Affected Tables

- `request_idempotency_keys` for replay safety.
- `arrear_tasks` for directive assignment and employee follow-up date/note.
- `entry_events` and `audit_logs` for traceability.

## Idempotency Strategy

- Same key + same scope/action/actor/payload returns stored replay.
- Same key + different actor or payload returns `409 idempotency_conflict`.
- Duplicate active task assignment is skipped.

## Rollback Strategy

- Disable production write gate.
- Use idempotency keys, QA tags, audit logs, and task ids to identify affected rows.
- Restore directive/follow-up fields on selected rows only after separate approval.

## Production Risk

- Business state changes become visible to employees and owners.
- Requires production migration and explicit write gate enablement.

## Production Smoke Plan

- One owner directive assignment.
- One employee read.
- One employee date/note follow-up.
- One owner feedback verification.
- readonly_admin write block.

Explicit user approval is required before production migration or production-linked write.
