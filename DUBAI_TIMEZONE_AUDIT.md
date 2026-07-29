# Dubai Timezone Audit

Status: P1-004A audit only. Production behavior changed: no. Production deployment: no.

## Summary

The project already contains some UTC-safe helpers and one Worker helper named `empTodayDubai`, but date authority is not centralized. Employee and owner frontends still use browser-local `new Date()`, local midnight, `toISOString()`, and mixed UTC/local comparisons for due, overdue, period grouping, and dashboard status.

## Risk Areas

| Area                           | Evidence                                                          | Current Risk                                                                      | Required Future Rule                                                   |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Employee `today()`             | `employee-v3.html` uses browser local `new Date()`                | Staff phone timezone can change due/overdue and promise-date validation.          | Server should provide Dubai business date; frontend displays only.     |
| Employee period math           | `employee-v3.html` uses local `new Date(date + 'T00:00:00')`      | Browser timezone can shift month/day around midnight and DST-like local settings. | Use server/Dubai date helper for all accounting anchors.               |
| Worker promise-date validation | `deploy-worker/src/index.js` has `empTodayDubai()`                | Better than browser local, but not shared across all Worker logic.                | Centralize helper and test boundary conditions.                        |
| Owner dashboard periods        | `index-51-main.js` uses local `new Date()` for 2nd-to-2nd periods | Owner computer timezone can change included sessions and KPI period progress.     | Period windows should be computed from Dubai business dates on server. |
| WiFi/lock due status           | `index-51-main.js` compares local noon/end values                 | Device timezone can alter overdue display.                                        | Normalize to Dubai business date before status.                        |
| TXT/history period grouping    | `index-51-main.js` uses local date objects                        | Imported session inclusion can differ by browser timezone.                        | Backend or shared helper should define Dubai billing windows.          |
| Scripts/reports                | Many scripts use `new Date().toISOString()`                       | Acceptable for generated timestamps, not for business due/overdue.                | Distinguish audit timestamp from business date.                        |

## Added Guardrail

`modules/finance/dubai-business-date.mjs` and `tests/dubai-business-date.spec.mjs` define and test a non-invasive Dubai business-date helper. It is not wired into production formulas in this stage.

## Remaining P1 Risk

P1-004 is not fixed until:

- due/overdue calculations are backend-owned,
- owner dashboard period windows use Dubai business dates,
- employee promise-date validation uses server date as authority,
- browser local timezone is never the accounting source of truth,
- boundary tests run in CI.
