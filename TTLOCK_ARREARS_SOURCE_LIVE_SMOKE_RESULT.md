# TTLock Arrears Source Live Smoke Result

Status: read-only live smoke completed after deploy.

Production URL:

```text
https://homelink-finance.habibramadan888.workers.dev
```

Anonymous/read-only checks:

| Check | Result |
|---|---|
| `/index-51-main.js` served | PASS |
| JS contains `backendTtlockStatus` | PASS |
| JS contains `backendTtlockRows` | PASS |
| JS contains `ttlockStatusOk` | PASS |
| JS contains 9000ms TTLock client fallback timeout | PASS |
| Served JS exposes TTLock secrets/tokens | NO |
| `/api/me` without credentials returns 401 | PASS |
| business write | NO |
| D1 write | NO |

Authenticated checks still required:

| Check | Status |
|---|---|
| owner overview arrears module opens | requires owner session |
| system arrears still display | requires owner session |
| TTLock expired card count increments when live data exists | requires owner session and live TTLock data |
| TTLock amount uses bed rent mapping | requires owner session and configured rent |
| TTLock empty/failure behavior | requires owner session |

No production D1 write, migration, D1 export/import/execute, employee entry write, handover submit, void/delete, settings change, dashboard calculation change, financial formula change, or secret print was executed.
