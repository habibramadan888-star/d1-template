# Delete Session Migration Plan

Date: 2026-05-23  
Task: P0-004 hard delete to void / soft-delete

## Tables And Fields

| Table            | Field              | Purpose                                      | Backward Compatible    |
| ---------------- | ------------------ | -------------------------------------------- | ---------------------- |
| `sessions`       | `voided_at TEXT`   | Timestamp when session was voided            | yes, NULL means active |
| `sessions`       | `voided_by TEXT`   | User id that voided the session              | yes                    |
| `sessions`       | `void_reason TEXT` | Manager-entered or default reason            | yes                    |
| `sessions`       | `void_source TEXT` | Source route, e.g. `api.delete_session`      | yes                    |
| `transactions`   | `voided_at TEXT`   | Timestamp when transaction was voided        | yes                    |
| `transactions`   | `voided_by TEXT`   | User id that voided related session          | yes                    |
| `transactions`   | `void_reason TEXT` | Void reason propagated from session          | yes                    |
| `transactions`   | `void_source TEXT` | Source route                                 | yes                    |
| `deposit_ledger` | `voided_at TEXT`   | Timestamp when deposit ledger row was voided | yes                    |
| `deposit_ledger` | `voided_by TEXT`   | User id that voided related session          | yes                    |
| `deposit_ledger` | `void_reason TEXT` | Void reason propagated from session          | yes                    |
| `deposit_ledger` | `void_source TEXT` | Source route                                 | yes                    |
| `arrears`        | `voided_at TEXT`   | Timestamp when legacy arrear was voided      | yes                    |
| `arrears`        | `voided_by TEXT`   | User id that voided related session          | yes                    |
| `arrears`        | `void_reason TEXT` | Void reason propagated from session          | yes                    |
| `arrears`        | `void_source TEXT` | Source route                                 | yes                    |
| `arrear_tasks`   | `voided_at TEXT`   | Timestamp when arrear task was voided        | yes                    |
| `arrear_tasks`   | `voided_by TEXT`   | User id that voided related session          | yes                    |
| `arrear_tasks`   | `void_reason TEXT` | Void reason propagated from session          | yes                    |
| `arrear_tasks`   | `void_source TEXT` | Source route                                 | yes                    |

## Migration Draft

Draft file:

- `migration-drafts/003_delete_session_void_fields.sql`

This is a draft and must not be applied to production without human review.

## Rollback

The migration is additive. Rollback is normally unnecessary. If a rollback is required before production use, columns can be left unused. Physical column removal is not recommended for D1 production databases.

## Local Verification

Use:

```text
npm run test:delete-session
npm run check
npm run smoke:with-worker
```

The delete-session test uses local-only disposable D1 state and must not use `--remote`.

## Production Execution Requirements

Before production execution:

1. Confirm no active deployment is using old hard delete behavior.
2. Back up D1.
3. Apply migration in staging first.
4. Run owner delete-session regression in staging.
5. Confirm `/api/history` active view and audit include-voided view both behave correctly.
6. Confirm deposit balance excludes voided deposit rows.
7. Confirm `audit_logs` and `entry_events` are written.

## P0-005 Note

This migration does not create the complete clean D1 schema. It only adds void metadata to existing financial tables. Clean bootstrap remains P0-005.
