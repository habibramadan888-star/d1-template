# Owner Arrears Mobile Card Live Smoke Result

Date: 2026-05-31, Asia/Dubai

## Smoke Mode

Live smoke was limited to public read-only asset checks. No production login was performed because creating or refreshing a production session would write to `active_sessions`, which is disallowed by this task.

## Public Asset Checks

| Check                                            |          Result | Evidence                                                                                    |
| ------------------------------------------------ | --------------: | ------------------------------------------------------------------------------------------- |
| Production Worker reachable                      |            PASS | `https://homelink-finance.habibramadan888.workers.dev` returned 200 for public entry assets |
| Updated JS asset served                          |            PASS | `/index-51-main.js` contains `renderOwnerArrearsTaskCard`                                   |
| TTLock expired-card label available in served JS |            PASS | served JS contains the TTLock expired-card display label                                    |
| Readonly admin marker present in served JS       |            PASS | served JS contains readonly-detail-only behavior markers                                    |
| Root portal remains three-card only              |            PASS | `/portal.html` has exactly 3 `data-portal` entries and no arrears portal entry              |
| Protected owner HTML visual state                | MANUAL REQUIRED | `/owner` and `/index-51.html` redirect to root without an authenticated session             |

## Important Note On Debug Fields

The served JavaScript necessarily contains internal object keys such as `source_type` and `followup_status` because the renderer maps backend data to business labels. The regression tests verify these raw/debug fields are not rendered in the owner arrears card UI.

## Live Visual Acceptance

Because authenticated visual smoke would require a production session write, final mobile screenshot acceptance remains required from the user.

Checklist for the user screenshot:

1. Owner arrears cards are single-column, not vertical.
2. No `directive`, `promise`, `staff`, `none`, `undefined`, or `null` debug text is visible.
3. Cards show customer number, bed, amount, overdue days, source, and status.
4. TTLock expired-card source appears when relevant data exists.
5. `readonly_admin` sees details only and no write buttons.
6. No horizontal scroll or large empty card gaps appear on mobile.

## Safety Confirmation

No D1 write, migration, D1 export/import/execute, employee entry write, handover, void/delete, dashboard calculation change, financial formula change, or production cutover was performed.

Production remains `PRODUCTION_NO_GO`.
