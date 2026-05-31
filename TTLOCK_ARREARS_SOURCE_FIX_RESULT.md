# TTLock Arrears Source Fix Result

| Item | Result |
|---|---|
| ttlock API/data source available | yes, live API client exists; runtime availability depends on configured Cloudflare secrets |
| ttlock expired cards loaded | yes when live API and secrets succeed |
| ttlock expired unpaid enters arrears pool | yes, via `/api/arrears/followup/tasks` |
| bed rent mapping applied | yes, read-only `rent_ref_room` config lookup |
| missing rent handled | yes, returned as `ttlock_missing_rent` and excluded from default total |
| secrets printed | no |
| D1 write | no |
| migration | no |

Implementation details:

- Backend followup API now calls `empLoadTtlockExpiredUnpaidForArrears`.
- Backend returns `ttlock_expired_unpaid_count`, `ttlock_missing_rent_count`, and source status.
- Frontend splits backend rows by `source_type`, so backend TTLock rows are not reclassified as system arrears.
- Frontend still has `/api/lock/cards` fallback, but it does not show unavailable if backend TTLock source already succeeded.

Production cutover remains `PRODUCTION_NO_GO`.
