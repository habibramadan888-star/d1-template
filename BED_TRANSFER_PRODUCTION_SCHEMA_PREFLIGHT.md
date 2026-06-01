# Bed Transfer Production Schema Preflight

Date: 2026-06-01 Asia/Dubai

Scope: production D1 schema preflight for one approved Bed Transfer smoke, `144 -> 122`.

## Result

| Check | Result | Evidence |
|---|---|---|
| Target database | PASS | `homelink` remote D1 |
| `bed_transfer_events` existed before migration | NO | `PRAGMA table_info(bed_transfer_events)` returned no columns |
| Migration required | YES | `migrations/005_bed_transfer_events.sql` required |
| Existing candidate source tables | PASS | `arrear_tasks`, `arrears`, `transactions`, `deposit_ledger`, `audit_logs`, `entry_events` |
| `lock_cards` table present | NO | TTLock/card anchor is represented by `tenant_card_id` in current production tables |
| Production cutover | PRODUCTION_NO_GO | unchanged |

## Preflight Notes

- The production schema did not contain `bed_transfer_events` before this task.
- No D1 export/import was executed.
- No employee entry write, occupancy mutation, deposit mutation, arrears mutation, TTLock mutation, financial formula change, or dashboard calculation change was executed during preflight.
