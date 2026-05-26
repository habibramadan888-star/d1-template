# P0-006I2 Post Backfill Dry-Run Result

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
| Manual-required tables           |     4 |
| Legacy-warning tables            |     1 |
| Draft write-plan classifications |     5 |

Manual-required tables after write:

- `arrear_tasks`
- `audit_logs`
- `entry_events`
- `transactions`

Notes:

- `sessions` moved to PASS after the approved staging backfill write.
- `transactions` still has manual-required rows because P0-008E staging shadow
  rows remain intentionally unscoped until receivables/source mapping is
  reviewed.
- `entry_events` and `audit_logs` still have manual-required rows for invalid
  request targets or generic targets that do not have exact persisted target
  entity ids.
- `active_sessions` remains the only legacy warning because property access is
  membership-derived and should not be guessed from active session claims.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Staging D1 write during dry-run: no.
- Dashboard/history live result changed: no.
- Production remains NO-GO.
