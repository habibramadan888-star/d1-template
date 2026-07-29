# Production Copy Row Backfill 008 Receivables Decision

Date: 2026-05-27, Asia/Dubai

Status: `RECEIVABLES_BACKFILL_MANUAL_REQUIRED`

Scope: decision record for receivables after REVIEW-007 copy row-level
compatibility backfill.

## Current Evidence

| Area                                    | Current Copy State              | Decision                                        |
| --------------------------------------- | ------------------------------- | ----------------------------------------------- |
| Legacy arrears                          | 6 rows, `remain_fils` populated | Review-ready but not authoritative receivables. |
| `receivables`                           | 0 rows                          | Not backfilled.                                 |
| `receivable_events`                     | 0 rows                          | Not backfilled.                                 |
| `payment_allocations`                   | 0 rows                          | Not backfilled.                                 |
| `receivable_adjustments`                | 0 rows                          | Not backfilled.                                 |
| Dashboard due/overdue/arrears authority | Still not production-approved   | Keep production NO-GO.                          |

## Options

| Option | Description                                                                                   | Risk                                             | Recommendation                                                   |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| A      | Defer receivables data backfill and keep legacy arrears compatibility for copy reconciliation | Production dashboard due/overdue remains blocked | Accept only if production launch excludes receivables authority. |
| B      | Run a separate copy-only receivables data backfill/allocation dry-run                         | Requires exact lifecycle/accounting mapping      | Recommended before production authority approval.                |
| C      | Attempt production receivables migration/backfill directly                                    | High accounting and rollback risk                | NO-GO.                                                           |

## Decision

Recommended path: Option B, but only after copy rollback rehearsal or with a
separate explicit approval packet.

Receivables remain `MANUAL_REQUIRED`; P0-008 remains Partial. Staging/copy
success does not approve production cutover.
