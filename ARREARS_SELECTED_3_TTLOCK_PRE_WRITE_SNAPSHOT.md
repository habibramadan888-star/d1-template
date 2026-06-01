# Selected 3 TTLock Pre-Write Snapshot

Date: 2026-06-01, Asia/Dubai

Snapshot type: production read-only API snapshot. No D1 execute/export/import was run.

## Owner Read Model

| Room / Bed | Task ID | Amount Fils | Amount AED | Source | Due Date | Directive Status | Close Status | Raw Follow-Up Status |
|---|---|---:|---:|---|---|---|---|---|
| 112 | `ttlock-expired-139777220` | 77000 | 770.00 | `ttlock_expired_unpaid` | 2026-06-01 | `none` | empty | `pending_followup` |
| 113 | `ttlock-expired-139777824` | 70000 | 700.00 | `ttlock_expired_unpaid` | 2026-06-01 | `none` | empty | `pending_followup` |
| 125 | `ttlock-expired-139778918` | 70000 | 700.00 | `ttlock_expired_unpaid` | 2026-05-31 | `none` | empty | `pending_followup` |

## Current Employee Inbox Read Model

| Check | Value |
|---|---|
| Employee directives API status | 200 |
| Current employee directive count | 1 |
| Expected +3 after this task | not applicable, write blocked |

## Snapshot Boundaries

| Boundary | Status |
|---|---|
| D1 execute/export/import | not run |
| Write gate | not opened |
| Owner directive create | not run |
| Employee follow-up | not run |
| Idempotency rows | not written |
| Audit rows | not written |
| Production D1 write | no |
| Production cutover | `PRODUCTION_NO_GO` |
