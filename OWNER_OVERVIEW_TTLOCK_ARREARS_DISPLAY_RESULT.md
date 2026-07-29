# Owner Overview TTLock Arrears Display Result

Display rules after fix:

| Scenario | Display |
|---|---|
| TTLock source succeeds with expired mapped cards | `通通锁 X`; no unavailable warning |
| TTLock source succeeds with empty data | `通通锁 0`; no unavailable warning |
| TTLock source fails while system arrears succeeds | System arrears still shown; short retryable TTLock warning may appear |
| TTLock rows missing rent | `ttlock_missing_rent_count` returned; rows excluded from default total |
| Both sources fail | Terminal error with retry |

Frontend changes:

- Backend-provided TTLock rows are split from the primary followup response.
- Backend TTLock success overrides failed client fallback.
- `buildArrearsFollowupPool` receives `existingArrearsRecords` and `ttlockExpiredUnpaid` separately.

No business write was executed.
