# Bed Transfer Employee Save Path Deploy Result

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

| Item | Result |
|---|---|
| deploy executed | yes |
| target Worker | `homelink-finance` |
| production URL | `https://homelink-finance.habibramadan888.workers.dev` |
| Worker version id | `832d3ac2-3b3a-4839-92e8-698fbeffe24c` |
| uploaded assets | `/employee-v3.html`, `/index-51-main.js` |
| production migration | no |
| D1 export/import | no |
| production cutover | `PRODUCTION_NO_GO` |

## Deployed Scope

- `POST /api/employee/bed-transfers`
- Employee UI Bed Transfer save wiring.
- Owner pending review visibility.
- Event-ledger write path with idempotency, audit, and trace evidence.

## Explicitly Not Deployed As A Capability

- Occupancy mutation.
- Deposit mutation.
- Arrears clearing.
- TTLock mutation.
- Financial formula changes.
- Dashboard calculation changes.
- Production cutover.
