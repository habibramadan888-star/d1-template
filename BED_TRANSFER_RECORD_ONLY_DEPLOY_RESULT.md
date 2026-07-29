# Bed Transfer Record-Only Deploy Result

Date: 2026-06-01

## Result

`PASS`

## Deployment Scope

Allowed scope only:

- Employee Bed Transfer record-only save copy.
- Backend `status=recorded` save path.
- Owner Bed Transfer records view.
- Recorded-status D1 schema compatibility.
- Static assets for `employee-v3.html` and `index-51-main.js`.

## Staging

| Check | Result |
|---|---|
| Staging recorded-status migration | PASS |
| Staging deploy | PASS |
| Staging Worker version | `55c42765-39d3-4e40-9dbd-038642f685a3` |
| Staging record-only E2E | PASS |

## Production

| Check | Result |
|---|---|
| Production recorded-status schema migration | PASS |
| Production deploy | PASS |
| Production Worker version | `b3c57137-a963-4763-b87a-5894f29e2fd2` |
| Production URL | `https://homelink-finance.habibramadan888.workers.dev` |
| Production cutover | `PRODUCTION_NO_GO` |

## Explicit Non-Scope

- No occupancy mutation.
- No deposit mutation.
- No arrears mutation.
- No TTLock mutation.
- No financial formula change.
- No dashboard calculation change.
- No commercial launch.
