# P0-006I1 Post Schema Backfill Dry-Run Result

Date: 2026-05-26, Asia/Dubai

Command executed:

```powershell
npm run dry-run:tenant-scope-staging-backfill
```

Result:

| Metric                           | Value |
| -------------------------------- | ----: |
| Overall                          |  PASS |
| Tables reviewed                  |    13 |
| Blocked tables                   |     0 |
| Manual-required tables           |     5 |
| Legacy-warning tables            |     1 |
| Draft write-plan classifications |     6 |

Dry-run effect:

- Compatibility columns are now available as target fields for backfill
  planning.
- Manual-required count changed from 0 before schema compatibility to 5 after
  schema compatibility because non-empty legacy tables now have target columns
  but still need row-level mapping.
- Legacy-warning count changed from 9 to 1. `active_sessions` remains warning
  because property access must be membership-derived rather than directly
  backfilled into a single property column.
- Exact update plan still requires manual review for `arrear_tasks`,
  `audit_logs`, `entry_events`, `sessions`, and `transactions`.
- No staging backfill write was executed.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging D1 write in dry-run: no.
- `INSERT` / `UPDATE` / `DELETE`: no.
- Dashboard/history mutation: no.

Decision:

- Proceed to P0-006I2 only with explicit human approval and reviewed exact
  mapping.
- Production remains NO-GO.
