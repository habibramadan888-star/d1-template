# Arrears Regression Root Cause Report

Date: 2026-05-30, Asia/Dubai

## Root Cause

The owner arrears page regressed because the visible arrears management pool was sourced only from `/api/arrears`, which is backed by historical `arrear_tasks` plus legacy `arrears` rows. The page did not merge the two live operational sources that create the owner-visible "expired" picture:

- `current_due_unpaid`: current billing-period due rows derived from TTLock card expiry and local payment coverage.
- `ttlock_expired_card`: currently occupied TTLock cards whose card end date has passed.

As a result, the overview/control-panel overdue cards could exist while the owner arrears follow-up page showed an incomplete task pool.

## Locked Fix

The owner arrears pool now uses `buildArrearsFollowupPool` and merges:

| Source                                   | Status                   |
| ---------------------------------------- | ------------------------ |
| Historical arrears / arrear tasks        | Included                 |
| Current due unpaid                       | Included                 |
| TTLock expired cards                     | Included                 |
| TTLock expired cards with unknown amount | Included as `金额待核对` |

## Non-Changes

No production D1 write, migration, export/import, employee entry write, handover, void/delete, financial formula change, dashboard calculation change, or commercial launch GO was performed.

Production remains `PRODUCTION_NO_GO`.
