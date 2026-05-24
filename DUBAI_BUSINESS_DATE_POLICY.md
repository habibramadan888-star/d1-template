# Dubai Business Date Policy

Status: P1-004A policy only. Production behavior changed: no.

## Business Rule

All commercial due, overdue, period, and promise-date decisions must use the UAE business calendar: `Asia/Dubai`.

## Authority Rules

- Server is the accounting authority for business dates.
- Browser local timezone is not an accounting authority.
- UTC timestamps are acceptable for audit timestamps, but not by themselves for due/overdue status.
- Stored business dates must use `YYYY-MM-DD`.
- Audit timestamps may use ISO timestamps with offset/UTC.
- A due date becomes overdue only when the Dubai business date is later than the due date.
- "Due soon" windows must be counted in Dubai calendar days.
- Rent period windows such as month 2-to-2 must be computed consistently in Dubai business date terms.

## Immediate Guardrail

Use `modules/finance/dubai-business-date.mjs` in tests and future low-risk paths:

- `getDubaiBusinessDate(instant)`
- `compareBusinessDates(left, right)`
- `daysBetweenBusinessDates(startDate, endDate)`
- `classifyDueStatus(dueDate, options)`

## Migration Order

| Phase   | Scope                                                                | Risk   | Verification                               |
| ------- | -------------------------------------------------------------------- | ------ | ------------------------------------------ |
| P1-004A | Add policy/helper/tests.                                             | Low    | `npm run test:timezone`.                   |
| P1-004B | Add server endpoint or API field for current Dubai business date.    | Medium | Auth smoke plus date boundary tests.       |
| P1-004C | Move employee promise-date validation to server-owned Dubai date.    | Medium | Employee entry/follow-up tests.            |
| P1-004D | Move owner dashboard period grouping to backend-owned Dubai windows. | High   | Dashboard reconciliation report.           |
| P1-004E | Remove browser-local date authority from financial paths.            | High   | Browser/device timezone regression matrix. |

## No-Go Conditions

- Do not use `new Date()` in frontend as the source of truth for overdue or promise-date validation.
- Do not compare `YYYY-MM-DD` strings generated from different timezones without normalization.
- Do not use `toISOString().slice(0, 10)` as Dubai today.
- Do not change live due/overdue formulas without dashboard reconciliation.
