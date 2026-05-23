# Delete Session Void Design

Date: 2026-05-23  
Task: P0-004 hard delete to void / soft-delete

## Design Goal

`POST /api/delete_session` should preserve financial records and mark them voided. Active UI/API views should hide voided rows by default. Audit-capable API calls can include voided records explicitly.

## Minimal Field Set

The same nullable metadata fields should be added to financial tables touched by session deletion:

- `voided_at TEXT NULL`
- `voided_by TEXT NULL`
- `void_reason TEXT NULL`
- `void_source TEXT NULL`

Tables:

- `sessions`
- `transactions`
- `deposit_ledger`
- legacy `arrears`, if present
- `arrear_tasks`

## Void Operation

For one authenticated owner request:

1. Verify auth through existing `/api/*` auth gate.
2. Verify manager role with `requireManager(user)`.
3. Load session by `id` and authenticated `corpid`.
4. If already voided, return success with `already_voided: true`.
5. Set session `handover_status='VOID'` and void metadata.
6. Set related `transactions.status='VOID'` and void metadata.
7. Set related `deposit_ledger` void metadata; do not delete deposit rows.
8. Set related legacy `arrears` void metadata; do not delete arrears rows.
9. Set related `arrear_tasks.close_status='VOID'`, `followup_status='作废'`, and void metadata.
10. Write `audit_logs` action `session.void`.
11. Write `entry_events` event `session_void`.

## Active Query Filtering

Default active views:

- `/api/history`: exclude `sessions` where `voided_at` is not empty or `handover_status='VOID'`.
- `/api/session_detail`: exclude `transactions` where `voided_at` is not empty or `status='VOID'`.
- `empDepositBalance`: exclude `deposit_ledger` rows where `voided_at` is not empty.
- legacy arrears merge: exclude `arrears` rows where `voided_at` is not empty.

Audit/detail mode:

- `/api/history?include_voided=1` can include voided sessions for owner audit review.
- `/api/session_detail?id=<id>&include_voided=1` can include voided transactions for owner audit review.

## Compatibility With Existing Data

- Existing rows with no `voided_at` are treated as active.
- Existing sessions with no `handover_status` remain active unless voided later.
- Existing legacy `arrears` remains active if `voided_at` is empty and `cleared=0`.

## Migration Requirement

Yes. The proper production path is a reviewed migration adding the four void fields to the tables above. This task includes a migration draft only and does not execute production D1 migration.

Because the current Worker already performs runtime schema changes in `empEnsureSchema`, the implementation also adds these fields through the existing compatibility path so local/dev and existing deployments can avoid immediate failure. This does not replace the need for a production migration.

## Dependencies

- Does not depend on P0-001 money precision migration.
- Does not depend on P0-002 handover atomic commit.
- Does not depend on P0-003 backend recompute.
- Does not solve P0-005 clean D1 bootstrap; a clean D1 still lacks full legacy `transactions` setup for employee entry.
- Does not solve P0-006 tenant isolation.
- Does not solve P0-008 receivables model.

## Production Impact

No production deployment or migration is performed in this task. If this code is later deployed before a formal migration, the existing runtime schema compatibility path can add void columns on first relevant request, but that is still a known P1 migration-discipline risk.
