# Employee Internal Test Script

Date: 2026-05-27, Asia/Dubai

Scope: employee manual QA planning through unified login. Start from
`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`; the
server-confirmed employee/staff role must route to `employee-v3.html`. Local
wrangler config binds this Worker to `DB = homelink`, so write-style tests can
affect production data and must not be run unless production D1 writes are
separately approved. Do not include passwords, tokens, cookies, or real
production customer data in evidence.

| Test ID | Scenario                     | Steps                                                                                                | Expected Result                                                                       | Evidence Needed                                               | Pass/Fail | Notes |
| ------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------- | ----- |
| EMP-001 | Login / logout               | Open unified login, sign in as employee, confirm automatic route to `employee-v3.html`, then logout. | Employee can login and logout; no owner-only pages visible.                           | Screenshot after login and logout with secrets masked.        |           |       |
| EMP-002 | Enter rent full payment      | Create QA rent entry for assigned property and tenant.                                               | Entry is accepted or queued per staging behavior; amount is shown correctly.          | Entry screenshot and resulting history reference.             |           |       |
| EMP-003 | Enter deposit                | Create QA deposit collection for assigned property.                                                  | Deposit is recorded separately from rent income.                                      | Deposit entry evidence and owner history screenshot.          |           |       |
| EMP-004 | Enter arrears / owed amount  | Create QA arrears-related entry or short-pay follow-up.                                              | Outstanding amount remains visible and explainable.                                   | Entry screenshot and dashboard/history comparison.            |           |       |
| EMP-005 | Short pay                    | Enter rent due amount with lower paid amount.                                                        | Unpaid difference remains outstanding; no discount is implied.                        | Entry evidence and outstanding amount screenshot.             |           |       |
| EMP-006 | Repayment                    | Enter repayment against an existing QA outstanding amount.                                           | Oldest due item is reduced first if supported by staging rules.                       | Before/after outstanding evidence.                            |           |       |
| EMP-007 | Void / soft-delete           | Void a QA entry through the allowed staging flow.                                                    | Voided record no longer affects active totals and remains auditable.                  | Before/after screenshot and void marker.                      |           |       |
| EMP-008 | Handover submit              | Submit QA handover with rent/deposit/arrears rows.                                                   | Handover totals are recomputed safely and submission is accepted or clearly rejected. | Handover summary screenshot.                                  |           |       |
| EMP-009 | Duplicate submit             | Submit the same QA form twice or refresh during submit.                                              | Duplicate is blocked, idempotent, or clearly reported without double counting.        | Timestamped screenshots of both attempts.                     |           |       |
| EMP-010 | Weak network retry           | Simulate slow network or retry after temporary failure.                                              | No duplicate financial result; user sees safe retry state.                            | Screenshot/video if available.                                |           |       |
| EMP-011 | Wrong amount                 | Enter impossible or invalid money value.                                                             | Validation rejects input before save.                                                 | Validation message screenshot.                                |           |       |
| EMP-012 | Three decimals               | Enter amount with three decimal places.                                                              | Input is rejected or rounded only if explicitly allowed; no silent unsafe conversion. | Validation screenshot.                                        |           |       |
| EMP-013 | Empty amount                 | Submit required money field empty.                                                                   | Form blocks submit and shows clear error.                                             | Validation screenshot.                                        |           |       |
| EMP-014 | Permission denied            | Try property/tenant not assigned to employee.                                                        | Access is denied; no cross-property write or read occurs.                             | Denial screenshot with property identifiers masked if needed. |           |       |
| EMP-015 | Mobile layout                | Repeat login, rent entry, and handover on phone viewport.                                            | Controls are usable without horizontal blocking or hidden submit buttons.             | Mobile screenshots.                                           |           |       |
| EMP-016 | Refresh / back / reopen page | Start entry, refresh/back/reopen, then complete or cancel safely.                                    | No duplicate submit; state is recoverable or clearly reset.                           | Notes and screenshots.                                        |           |       |

## Stop Conditions

| Condition                                        | Required Response                         |
| ------------------------------------------------ | ----------------------------------------- |
| Money totals change unexpectedly                 | Stop finance tests and open P0/P1 bug.    |
| Employee can access another tenant/property      | Stop permission tests and open P1 bug.    |
| Duplicate submit creates duplicate financial row | Stop related flow and open P0/P1 bug.     |
| Password/token appears in UI or logs             | Stop and report security bug immediately. |

## Visual Comparison Checks

| Check                       | Expected Result                                                      | Notes                                                 |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Employee design baseline    | Employee page remains visually modern and unchanged in product feel. | Use as reference for owner UI comparison.             |
| Shared font                 | Employee page continues using the shared product font stack.         | Report if text rendering regresses.                   |
| Shared buttons/inputs/cards | Employee controls still look consistent after token extraction.      | Report as P1 UX if employee visual quality regresses. |
