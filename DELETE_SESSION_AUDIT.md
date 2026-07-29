# Delete Session Audit

Date: 2026-05-23  
Task: P0-004 hard delete to void / soft-delete

## Summary

`POST /api/delete_session` is a financial deletion endpoint. The current implementation is not a simple UI cleanup. It physically removes a session and the related ledger rows from multiple financial tables.

This is a P0 accounting and audit risk because it destroys evidence required for reconciliation, dispute review, and owner/staff accountability.

## Current Call Chain

- Frontend caller: `index-51-main.js`, history card delete action.
- Worker route: `deploy-worker/src/index.js`, `POST /api/delete_session`.
- Employee caller: no direct employee UI call found. Employee role is denied by server manager check.
- Owner caller: owner history page delete action.
- Method: `POST`.
- Request body: `{ id: "<session_id>" }`.
- Server auth: all `/api/*` requires `requireAuth()`.
- Server role check: `requireManager(user)`.
- Tenant/CORPID scope: `WHERE id=? AND corpid=?`, using authenticated `user.corpid`.

## Current Risk Table

| Item                     | Current Behavior                                                      | Risk                                                                                  | Required Change                                                                    |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Frontend delete          | Owner history UI calls `/api/delete_session` then removes local state | UI implies deletion and hides cloud-side impact                                       | Keep UI behavior compatible, but backend must void, not delete                     |
| Employee access          | Server checks `requireManager(user)` after auth                       | Employee should be denied; current design is acceptable                               | Preserve 403 for employee                                                          |
| Unauthenticated access   | `/api/*` requires `requireAuth()`                                     | Correct if preserved                                                                  | Keep 401 for missing/invalid auth                                                  |
| Session lookup           | `SELECT id FROM sessions WHERE id=? AND corpid=?`                     | Tenant scope exists but no void state                                                 | Read void state and make second void idempotent                                    |
| `arrear_tasks`           | Updates `close_status='VOID'` for related entries                     | This is soft-like but missing void metadata                                           | Add `voided_at`, `voided_by`, `void_reason`, `void_source` where available         |
| `deposit_ledger`         | `DELETE FROM deposit_ledger ...`                                      | Destroys deposit movement history and changes balance evidence                        | Update void metadata and exclude voided rows from active balance                   |
| `transactions`           | `DELETE FROM transactions WHERE session_id=?`                         | Destroys income/payment/refund/expense evidence                                       | Set `status='VOID'` and void metadata                                              |
| legacy `arrears`         | `DELETE FROM arrears WHERE session_id=?`                              | Destroys receivable/collection trail                                                  | Set void metadata and exclude from active list                                     |
| `sessions`               | `DELETE FROM sessions WHERE id=?`                                     | Destroys handover/session root record                                                 | Set `handover_status='VOID'` and void metadata                                     |
| `audit_logs`             | Writes `session.delete` after physical deletion                       | Audit says deletion happened, but evidence rows are gone                              | Write `session.void` and preserve rows                                             |
| `entry_events`           | Not written for delete session                                        | No business-event trail in the employee event model                                   | Write a `session_void` entry event                                                 |
| `/api/history`           | Lists every session by corpid                                         | Would show voided records unless filtered                                             | Default exclude voided sessions; add `include_voided=1` for audit use              |
| `/api/session_detail`    | Lists every transaction by session/corpid                             | Would show voided rows unless filtered                                                | Default exclude voided transactions; add `include_voided=1` for audit use          |
| Dashboard/history impact | Physical delete removes data from history and downstream calculations | Accounting totals can silently change with no retained evidence                       | Void rows should be hidden from active views but visible through audit/detail mode |
| Second delete            | Currently returns 404 after first physical delete                     | Not idempotent and loses audit context                                                | Return success with `already_voided: true`                                         |
| CORPID scope             | Uses authenticated `user.corpid`                                      | Current single-tenant limitation remains P0-006, but this route has scoped predicates | Preserve existing scope; do not attempt tenant redesign here                       |

## Tables Affected By Current Hard Delete

- `sessions`
- `transactions`
- `deposit_ledger`
- legacy `arrears`
- `arrear_tasks` indirectly closed/voided
- `audit_logs` receives only a post-delete action

## Conclusion

`/api/delete_session` must be converted to void / soft-delete. Normal business flow must not physically delete financial rows.
