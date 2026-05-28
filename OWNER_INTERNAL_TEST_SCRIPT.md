# Owner Internal Test Script

Date: 2026-05-27, Asia/Dubai

Scope: owner manual QA planning through unified login. Local asset review found
no separate `owner.html`, `boss.html`, or `dashboard.html`; the owner/boss
interface is the main SPA business destination. Start from
`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`; the
server-confirmed owner/manager/admin role must route to the owner business page
`index.html`. Do not treat `index.html` as a separate owner login page. Local
wrangler config binds this Worker to `DB = homelink`, so write-style tests can
affect production data and must not be run unless production D1 writes are
separately approved. Do not include passwords, tokens, cookies, or real
production customer data in evidence.

| Test ID | Scenario                            | Steps                                                                                                                              | Expected Result                                                                                                      | Evidence Needed                                                    | Pass/Fail | Notes |
| ------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- | ----- |
| OWN-001 | Unified login / logout              | Open `unified-login.html`, sign in as owner/manager, confirm automatic route to the owner business page `index.html`, then logout. | Owner can login/logout through the single login entry and employee-only write controls are not exposed unexpectedly. | Screenshot after login and logout with secrets masked.             |           |       |
| OWN-002 | Dashboard view                      | Open dashboard after QA employee entries.                                                                                          | Dashboard loads and shows expected QA data only for owner scope.                                                     | Dashboard screenshot.                                              |           |       |
| OWN-003 | Today due                           | Inspect due-today widget or equivalent list.                                                                                       | Due today follows Asia/Dubai business date rules.                                                                    | Screenshot with date/time.                                         |           |       |
| OWN-004 | Overdue                             | Inspect overdue rows.                                                                                                              | Only due dates earlier than Dubai business date are overdue.                                                         | Overdue screenshot.                                                |           |       |
| OWN-005 | Arrears                             | Inspect arrears total and row detail.                                                                                              | Short-pay and unpaid balances remain outstanding until repayment/adjustment.                                         | Arrears summary and detail evidence.                               |           |       |
| OWN-006 | Monthly income                      | Compare monthly income against accepted QA rent rows.                                                                              | Rent income excludes deposit liability and voided payments.                                                          | Calculation notes and screenshot.                                  |           |       |
| OWN-007 | Rent received                       | Review rent received total.                                                                                                        | Only active valid rent payments are included.                                                                        | Dashboard/history comparison.                                      |           |       |
| OWN-008 | Deposit                             | Review deposit collections, refunds, and deductions.                                                                               | Deposit is separate from rent income and tracked as ledger movement.                                                 | Deposit evidence screenshots.                                      |           |       |
| OWN-009 | History                             | Open history and find QA entries.                                                                                                  | History rows match employee entries and show expected statuses.                                                      | History screenshot.                                                |           |       |
| OWN-010 | Search / filter                     | Filter by property, tenant, date, or status.                                                                                       | Results match selected filters and do not leak other tenant/property rows.                                           | Before/after filter screenshots.                                   |           |       |
| OWN-011 | Voided records                      | Toggle or search voided QA records if UI supports it.                                                                              | Voided records are auditable but excluded from active totals.                                                        | Voided record evidence.                                            |           |       |
| OWN-012 | Handover review                     | Review submitted QA handover.                                                                                                      | Handover totals and rows are visible and explainable.                                                                | Handover review screenshot.                                        |           |       |
| OWN-013 | Export / report                     | Export or generate report if available in staging.                                                                                 | Export matches filtered scope and excludes secrets.                                                                  | Export filename and summary; do not commit export unless approved. |           |       |
| OWN-014 | Mobile view                         | Open dashboard/history on phone viewport.                                                                                          | Core information is readable and actions remain accessible.                                                          | Mobile screenshots.                                                |           |       |
| OWN-015 | Permission isolation                | Attempt to view another tenant/property if test identity supports negative case.                                                   | Access is denied or rows are filtered out.                                                                           | Denial or filtered-result screenshot.                              |           |       |
| OWN-016 | Refresh consistency                 | Refresh dashboard/history after QA entries and voids.                                                                              | Data remains consistent after reload.                                                                                | Before/after screenshots.                                          |           |       |
| OWN-017 | Dashboard vs history reconciliation | Compare dashboard totals to history rows for selected QA date/property.                                                            | Differences are explainable and no unsupported dashboard authority switch occurs.                                    | Reconciliation notes and screenshots.                              |           |       |
| OWN-018 | Design-system parity                | Compare owner dashboard, cards, buttons, inputs, loading, and mobile view against employee page.                                   | Owner and employee feel like one SaaS product, not two generations of UI.                                            | Desktop/mobile screenshots beside employee reference.              |           |       |
| OWN-019 | Auth loading visual                 | Open owner destination with valid or expired session.                                                                              | Shows checking/loading first; legacy password panel does not flash before `/api/me`.                                 | Screenshot or short clip if issue appears.                         |           |       |
| OWN-020 | Owner primary navigation            | Open owner mobile view after login and inspect the primary tabs.                                                                   | Primary nav shows owner-oriented entries such as 总览/历史/客户/网络 and does not show main `录入`.                  | Mobile top-nav screenshot.                                         |           |       |
| OWN-021 | Owner topbar containment            | Open owner mobile view and inspect brand, role badge, control panel, and logout controls.                                          | No garbled control panel icon/text; right-side controls stay inside viewport.                                        | Mobile topbar screenshot.                                          |           |       |
| OWN-022 | Client credit visual parity         | Open 客户 page and inspect search, filter, refresh, legend, and customer cards.                                                    | Controls and cards match shared employee-style input/button/card language.                                           | Client credit mobile screenshot.                                   |           |       |

## Stop Conditions

| Condition                                                 | Required Response                        |
| --------------------------------------------------------- | ---------------------------------------- |
| Owner sees another tenant/property data                   | Stop and open P1 permission bug.         |
| Dashboard totals include deposit as rent income           | Stop and open finance bug.               |
| Voided records remain in active totals                    | Stop and open finance bug.               |
| Export leaks data outside owner scope                     | Stop and open P1 security/data bug.      |
| Owner UI visibly old versus employee                      | Open P1 UX bug and attach screenshots.   |
| Owner mobile layout blocks core review                    | Open P1/P2 UX bug depending on severity. |
| Owner main nav shows `录入`                               | Open P1 UX/IA bug.                       |
| Owner topbar has garbled icon/text or overflow            | Open P1 UX bug.                          |
| Owner homepage shows ADD ENTRY or cash/bank entry buttons | Open P1 UX/IA bug.                       |

## Real Screenshot Retest

## Auth Routing Stabilization Retest

| Test ID | Scenario                      | Steps                                                               | Expected Result                                                                                           | Evidence Needed                      | Pass/Fail | Notes |
| ------- | ----------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------- | ----- |
| OWN-028 | Owner unauthenticated routing | In a clean browser state, open `index.html`.                        | Page routes to `unified-login.html`; old owner password panel does not appear or flash.                   | Short clip or timed screenshots.     |           |       |
| OWN-029 | Owner lock routing            | From an authenticated owner session, click the lock/logout control. | Session clears and the browser lands on `unified-login.html`; it does not show the old login panel.       | Screenshot after logout; no secrets. |           |       |
| OWN-030 | Owner history first feedback  | Tap `历史` on mobile.                                               | Skeleton/loading appears quickly and recent records load first; no 30 second blank wait.                  | Timed screenshots or short clip.     |           |       |
| OWN-031 | Owner network entry           | Open owner navigation.                                              | `网络` / WiFi control entry is visible or documented as manual-required; access remains permission-gated. | Navigation screenshot.               |           |       |

Additional stop conditions:

| Condition                                                 | Required Response                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| Owner lock routes to an old login panel                   | Stop owner auth QA and open a P1 auth-routing bug.               |
| Owner history has no visible feedback after 5 seconds     | Open a P1 UX/performance bug.                                    |
| Owner network/WiFi entry is missing without documentation | Open a P2/P1 owner workflow bug depending on operational impact. |

## Owner UX Stabilization Retest

| Test ID | Scenario                      | Steps                                          | Expected Result                                                                                                                                                | Evidence Needed                  | Pass/Fail | Notes |
| ------- | ----------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------- | ----- |
| OWN-024 | Owner topbar simplified       | Open owner mobile view and inspect the topbar. | No visible `老板` badge; role permissions still work through server session.                                                                                   | Mobile topbar screenshot.        |           |       |
| OWN-025 | Owner overview business value | Open owner 总览 on mobile.                     | Overview shows today's received amount, outstanding amount, pending work signal, recent handover/alerts, recent flow, and quick links where data is available. | Mobile overview screenshot.      |           |       |
| OWN-026 | Owner history performance     | Tap 历史 on mobile.                            | Skeleton or loading feedback appears quickly, then recent history rows load first; no 15-20 second blank screen.                                               | Short clip or timed screenshots. |           |       |
| OWN-027 | Owner mobile density          | Review 总览, 历史, 分析, 客户 on mobile.       | Typography/card/nav spacing is compact enough to show useful content without losing readability.                                                               | Mobile screenshots.              |           |       |

| Test ID | Scenario                     | Steps                                                   | Expected Result                                                                                     | Evidence Needed             | Pass/Fail | Notes |
| ------- | ---------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------- | --------- | ----- |
| OWN-023 | Owner entry block regression | Open owner homepage/default view on mobile after login. | Owner homepage does not show `添加记录 ADD ENTRY`, `现金收款`, or `银行转账` primary entry buttons. | Mobile homepage screenshot. |           |       |
