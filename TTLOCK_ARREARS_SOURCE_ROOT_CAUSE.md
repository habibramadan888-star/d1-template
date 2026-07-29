# TTLock Arrears Source Root Cause

Root cause category: `FRONTEND_PLACEHOLDER_ONLY` plus `TTLOCK_API_TIMEOUT` risk.

The TTLock API client exists in the Worker (`loadLockCards`). The owner arrears followup API previously did not include TTLock expired unpaid rows. It returned `ttlock_expired_unpaid_count: 0` and marked TTLock as client-deferred. The owner overview then made a separate short client-side `/api/lock/cards?purpose=arrears_pool` request. If that request was slow, unconfigured, or failed, the UI showed `TTLock unavailable` even though system arrears loaded.

| Check | Result | Root Cause | Required Fix |
|---|---|---|---|
| Current TTLock arrears loader | Frontend `loadTtlockArrearsForOwner` plus backend `loadLockCards` | TTLock not part of followup API contract | Move read-only TTLock aggregation into `/api/arrears/followup/tasks` |
| Data source type | Live API when TTLock secrets are configured | No cached/imported source in current default path | Keep live API; classify missing config explicitly |
| API endpoint | `/oauth2/token`, `/v3/lock/list`, `/v3/identityCard/list`; exposed internally via `/api/lock/cards` | Frontend timeout could mark source unavailable | Backend maps source with bounded timeout; frontend fallback remains |
| Missing token/client config | Classified as `TTLOCK_SECRET_MISSING` | Could previously surface as generic unavailable | Explicit source status |
| Token/auth failure | Classified as `TTLOCK_TOKEN_EXPIRED` or `TTLOCK_AUTH_FAILED` | Generic failure hid root cause | Explicit source status without printing secrets |
| Bed mapping | Parses first numeric bed from card name, with lock-room fallback | Missing bed silently excluded before | Missing bed/rent surfaced in `ttlock_missing_rent` |
| Rent mapping | Read-only `app_settings.rent_ref_room` lookup | Missing rent caused source count 0 | Missing rent count returned; no module crash |
| Owner/readonly path | Same read endpoint for owner and readonly admin | Frontend-only path could differ | Backend contract shared by both |
| API too slow | Bounded read with timeout classification | 3s client timeout was too fragile | Backend 8s bounded read plus 9s client fallback |

No D1 write, migration, export/import/execute, secret print, or business write was performed.
