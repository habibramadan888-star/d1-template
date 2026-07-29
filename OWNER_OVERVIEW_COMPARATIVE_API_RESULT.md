# Owner Overview Comparative API Result

Added `phase0OwnerOverviewComparativeSummary` in `deploy-worker/src/index.js`.

| Check | Result |
|---|---|
| Endpoint added | yes |
| Method | GET |
| Path | `/api/owner/overview/comparative-summary` |
| Auth scope | owner / readonly_admin via `canReadOwnerData` |
| Writes D1 | no |
| Runs migration | no |
| Changes dashboard totals | no |
| Production cutover | `PRODUCTION_NO_GO` |

Returned sections:

- `current.month`
- `current.quarter`
- `comparisons.last_month`
- `comparisons.same_month_last_year`
- `comparisons.last_quarter`
- `comparisons.same_quarter_last_year`
- `accounting_separation`
- `occupancy_flow`
- `arrears`
- `risk_watch`
- `data_quality`
