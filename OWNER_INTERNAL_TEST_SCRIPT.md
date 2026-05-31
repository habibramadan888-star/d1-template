# Owner Internal Test Script

## ARREARS-EMPLOYEE-INBOX-STATUS-COPY-DEPLOY-001 Owner Notes

Date: 2026-05-31, Asia/Dubai

The employee-side status-copy fix is deployed. Owner-side validation should remain read-only unless a separate write approval is granted.

- Employee follow-up copy now clearly says production write is not enabled when the gate is off.
- Owner should not treat the deployed copy fix as employee feedback write approval.
- Real Abdul follow-up write requires the separate approval prompt.
- No batch dispatch, TTLock smoke, migration, financial formula change, dashboard calculation change, or production cutover is approved.
- Production remains `PRODUCTION_NO_GO`.

## ARREARS-DIRECTIVE-ABDUL-REAL-INBOX-ROLLOUT-001 Owner Acceptance

Date: 2026-05-31, Asia/Dubai

Owner-side production visibility was validated for exactly one approved existing arrears task assigned to Abdul.

| Check | Expected |
|---|---|
| target task | `task-mpgzu9kp-f150e26f` |
| owner directive create | PASS |
| owner can see Abdul feedback | PASS |
| promised payment date visible | 2026-06-01 |
| follow-up note visible | yes |
| write gate after rollout | off |
| TTLock production dispatch | not run |
| batch dispatch | not run |
| production cutover | PRODUCTION_NO_GO |

Do not treat this as approval for all-task dispatch, TTLock dispatch, public beta, or commercial cutover.

## TTLOCK-ARREARS-SOURCE-FIX-001 Addendum

Use owner overview in read-only visual mode unless explicitly testing staging writes.

- Confirm system arrears still display.
- Confirm TTLock expired unpaid count is greater than zero when live TTLock expired cards and bed-rent mapping exist.
- Confirm TTLock amount equals mapped bed rent.
- Confirm missing bed-rent rows do not enter the default amount total.
- Confirm TTLock unavailable warning does not appear when TTLock source succeeds.
- Confirm TTLock failure does not hide system arrears.
- Do not include passwords, cookies, or TTLock tokens in reports.

## OWNER-ARREARS-MOBILE-CARD-DEPLOY-001 Addendum

Date: 2026-05-31, Asia/Dubai

Use the production root URL only: `https://homelink-finance.habibramadan888.workers.dev/`. Choose the owner door and authenticate normally. Do not run write flows during visual acceptance.

Required read-only visual checks:

- Open owner arrears management on a mobile viewport.
- Confirm each arrears task is a single-column card, not a table row or squeezed multi-column grid.
- Confirm the first visible line shows customer number, bed/room, and amount or an amount-pending label.
- Confirm overdue information, source label, follow-up status, responsible person, promised repayment date, and note are readable.
- Confirm no raw/debug UI text appears: `directive`, `promise`, `staff`, `source_type`, `followup_status`, `none`, `undefined`, or `null`.
- Confirm TTLock expired-card tasks remain visible when that source exists, even if amount is unknown.
- Confirm readonly admin sees detail-only behavior and no write action buttons.
- Confirm the root portal still has only employee, owner, and admin entries.

Stop if the mobile screenshot still shows vertical text, debug fields, hidden TTLock expired-card rows, write buttons for readonly admin, or horizontal page scrolling.

Production remains `PRODUCTION_NO_GO`.

## ARREARS-ROOT-CAUSE-LOCK-001 Addendum

Date: 2026-05-30, Asia/Dubai

- Open owner `欠款管理`.
- Confirm task pool includes rows from historical arrears, current due unpaid, and TTLock expired cards.
- Confirm expired TTLock rows with no verified amount display `金额待核对`, not zero and not hidden.
- Confirm each row is a task card with source type, customer code, room/bed, overdue days, package/card, status, responsible metadata, promised repayment date, and recent note.
- Confirm main list has no raw `directive:`, `promise:`, or `staff:` labels.
- Confirm main list has no direct `录入收款`, `录入押金`, or `作废` shortcuts.
- Confirm owner primary nav shows no second-row `网络` wrap.

Production remains `PRODUCTION_NO_GO`.

## OWNER-PAGE-REGRESSION-LOCK-001 Addendum

Date: 2026-05-30, Asia/Dubai

- Owner overview must not render `QUICK ACTIONS` or `快速进入`.
- Arrears management is an owner-internal module, not a login entry.
- The three-door root portal must remain employee / owner / admin only.
- Owner internal navigation must keep a visible `欠款管理` entry.
- The arrears information pool must remain visible and include status KPIs, directive action, WhatsApp export, task status, owner/staff follow-up fields, promised repayment date, and recent notes.
- If `QUICK ACTIONS` reappears or the owner arrears entry disappears, treat it as a regression bug.

Regression evidence:

- `OWNER_PAGE_COMPONENT_AUTHORITY_MAP.md`
- `tests/owner-overview-no-quick-actions.spec.mjs`
- `tests/owner-arrears-entry-present.spec.mjs`
- `tests/owner-arrears-info-pool.spec.mjs`

## AUTH-ROUTING-ARCHITECTURE-001 Entry Update

Owner testers must start at `https://homelink-finance.habibramadan888.workers.dev/`, choose the owner door, then authenticate. Do not start from `/index.html`; it is a compatibility alias to `/owner`. Lock/logout must return to `/`. Old owner login UI must not appear. Production cutover remains `PRODUCTION_NO_GO`.

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

## AUTH-UI-STABILIZATION-002 Owner Checks

| Test ID        | Scenario             | Steps                        | Expected Result                                                                  | Evidence Needed     | Pass/Fail | Notes                          |
| -------------- | -------------------- | ---------------------------- | -------------------------------------------------------------------------------- | ------------------- | --------- | ------------------------------ |
| OWNER-AUTH-001 | Lock icon logout     | Tap owner lock icon          | Browser lands on `/unified-login.html`; no old login page appears                | Screenshot / URL    |           | Read-only                      |
| OWNER-AUTH-002 | Control panel layout | Open control panel on mobile | Header, tools, filters, and room details fit viewport                            | Screenshot          |           | No settings change             |
| OWNER-AUTH-003 | Arrears detail modal | Open overdue / due detail    | Modal shows readable cards and usable close/copy/export controls                 | Screenshot          |           | No write                       |
| OWNER-AUTH-004 | History feedback     | Open history                 | Skeleton appears quickly; recent 20 records load first or retry feedback appears | Screenshot / timing |           | No delete                      |
| OWNER-AUTH-005 | Network entry        | Find network/WiFi entry      | `网络 / NETWORK` entry is visible for authorized owner session                   | Screenshot          |           | Do not change network settings |

## INTERNAL-QA-BLOCKERS-003 Owner Checks

| Test ID              | Scenario                   | Steps                                           | Expected Result                                                               | Evidence Needed             | Pass/Fail | Notes                  |
| -------------------- | -------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------- | --------- | ---------------------- |
| OWNER-BLOCKER-003-01 | Arrears export format      | Open control panel, filter overdue, export text | Export is summary-first, readable, no ASCII box art, no empty `update:` field | Export text screenshot/copy |           |                        |
| OWNER-BLOCKER-003-02 | Arrears compact modal      | Open overdue detail modal on mobile             | Multiple compact rows are visible and readable                                | Mobile screenshot           |           |                        |
| OWNER-BLOCKER-003-03 | Readonly admin write guard | Login as readonly admin test fixture            | Dashboard/history/clients visible; write buttons hidden or disabled           | Screenshot plus test result |           | No business write test |
| OWNER-BLOCKER-003-04 | Password manager support   | Login owner via unified login                   | Browser can offer password save; app does not store plaintext password        | Browser prompt/manual note  |           | Do not print password  |

## THREE-PORTAL-FIX-001 Owner Entry Notes

Use `/` only to choose the owner role. The main portal must not display 欠款管理 as a separate identity.

After owner login, verify 欠款管理 is available inside the owner workspace navigation/module area. The owner can manage/review arrears from that workspace only; do not treat arrears as a standalone login entry.

Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Simplified Follow-Up Check

During owner QA, confirm:

- Arrears card title shows bed and system amount.
- Default card does not show `承诺金额`.
- Default card shows `承诺日期`, `备注`, and `状态`.
- Detail/export text does not reintroduce promised amount as a default field.
- Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Final UX Test Addendum

1. Open owner `欠款` from the primary nav. The label must be `欠款`, not `欠款管理`.
2. Confirm the page shows a skeleton/loading shell immediately and never stays blank for 20 seconds.
3. Confirm default arrears cards only include two sources: `系统已有欠款` and `通通锁到期未付`.
4. Confirm TTLock expired unpaid cards display a concrete AED amount from bed rent mapping. Cards must not show `金额待核对`.
5. Confirm each card matches the history page card style and shows customer/bed/amount, due status, source, status, promised amount, promised date, and note.
6. Confirm no raw/debug labels appear: `directive`, `promise`, `staff`, `source_type`, `followup_status`, `none`, `undefined`, `null`.
7. Confirm readonly admin can view details only and cannot see write buttons.

Stop the test if any old row/table layout, third source, debug field, or 20-second blank load appears. Production remains `PRODUCTION_NO_GO`.

## Owner Regression Audit Test Addendum

1. Confirm owner navigation exposes all six modules: 总览 / 欠款 / 历史 / 分析 / 客户 / 网络.
2. Confirm `分析` is visible or horizontally reachable and opens the analysis view.
3. Confirm the arrears page does not display `signal is aborted without reason`; slow requests should keep skeleton/cache.
4. Run `npm run test:owner-regression-smoke` before accepting any owner shell change.
5. Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Overview Merge Test Addendum

1. Confirm owner navigation no longer exposes `欠款` as a top-level tab.
2. Confirm owner navigation still exposes `总览 / 历史 / 分析 / 客户 / 网络` without wrapping.
3. Confirm overview contains `欠款跟进`.
4. Confirm `欠款跟进` shows a skeleton quickly and cannot remain loading beyond 10 seconds without retry state.
5. Confirm arrears timeout/error only affects the arrears module and does not break overview KPIs, alerts, sessions, or ledger.
6. Confirm `查看全部` expands arrears inside overview and `WhatsApp 导出` remains available.
7. Treat 20s+ loading as P1 and 3-minute loading as P0/P1.
8. Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Loading And Fixed Nav Regression Checks

1. 打开老板端总览，确认欠款跟进模块 10 秒内进入成功、空、部分失败或错误重试状态，不允许无限 loading。
2. 如果通通锁数据失败，系统已有欠款仍应显示；如果系统已有欠款失败，通通锁有效欠款仍可显示。
3. 点击重试只能触发一次新请求，不能形成请求风暴。
4. 顶部导航必须固定居中，不允许左右滑动。
5. 欠款不允许出现在一级 Tab。
6. 分析入口必须存在，网络入口必须可访问。
7. Production cutover remains `PRODUCTION_NO_GO`.
## Owner Arrears Batch Display / Export QA

1. Open owner arrears page.
2. Verify filters only show `全部`, `通通锁已过期`, `系统已有欠款`.
3. Choose each filter and verify select-all only selects visible tasks in that filter.
4. Verify selected count shows `已选择 N / M`.
5. Verify "下发员工" without selection prompts the user to select arrears first.
6. Verify "下发员工" with selection generates a dry-run execution list and does not submit a backend write.
7. Verify default cards are compact and details expand per card.
8. Verify WhatsApp export copies text or shows a manual fallback.
9. Verify readonly_admin can view/export but cannot see select-all or send-employee write controls.
10. Confirm no D1 write, migration, or production deploy was performed.

Deployment follow-up:

- The UI has been deployed to Worker version `d09255c7-aa18-424b-a34f-7cb385cfea91`.
- Re-run the same checks on a real authenticated phone session.
- Confirm "下发员工" remains dry-run and does not create production tasks.
- Confirm WhatsApp export opens/copies on the target phone browser.

## WhatsApp Final Baseline QA

1. Export arrears to WhatsApp.
2. Confirm the first line is `Due M/D | N overdue`.
3. Confirm the second line is `---`.
4. Confirm rooms/beds are grouped as `【room_bed】`.
5. Confirm rows are `customer_code  overdue_status  Dxx  date_code`.
6. Search for customer codes such as `219` and `4014`; they must highlight as continuous strings.
7. Search for bed labels such as `1-102` and `8-202`; they must highlight as continuous strings.
8. Confirm the text does not include `ttlock_card`, `rent`, `deposit`, `source_type`, internal IDs, `undefined`, `null`, or `none`.
9. Confirm the exported text is not duplicated.
10. Confirm no D1 write or business write is performed.
# Acceptance Bugfix Test Notes - 2026-05-31

- Verify select-all makes “下发员工” clickable for owner/manager when at least one arrears task is selected.
- Verify “下发员工” shows dry-run feedback and does not write D1.
- Verify WhatsApp export button, clipboard, share URL, and fallback modal use identical final baseline text.
- Verify portal cards keep exactly three entries and aligned title/subtitle text.
- Production cutover remains `PRODUCTION_NO_GO`.
## Acceptance Bugfix Deployed Phone QA - 2026-05-31

Run these checks on the live Worker version `73517bf9-df6e-47e1-a72f-9743264ee934`:

1. Open the portal and confirm exactly three entries: employee, owner, admin.
2. Confirm the three portal cards have aligned Chinese/English text.
3. Log in with an existing owner session, open the arrears module, and select all visible arrears tasks.
4. Confirm the send-employee button becomes clickable after at least one selected task.
5. Click send-employee and confirm it shows a dry-run execution list only.
6. Confirm no real employee directive task is created and no backend write happens.
7. Click WhatsApp export with selected tasks and confirm only selected rows are exported.
8. Clear selection, apply a filter, click WhatsApp export, and confirm current filtered rows are exported.
9. Confirm clipboard/share/fallback text is identical and does not include `ttlock_card`, `rent`, `deposit`, `source_type`, `undefined`, `null`, or `none`.
10. Confirm searchable codes such as `125`, `219`, and `4014` appear as continuous strings when present in the data.

Production cutover remains `PRODUCTION_NO_GO`.
## Arrears Directive Real Delivery QA - 2026-05-31

1. Confirm dry-run does not equal real directive delivery.
2. Confirm real owner directive API returns approval-required unless explicit write approval is enabled.
3. Confirm employee assigned directive read contract exists.
4. Confirm employee follow-up accepts promised payment date and note only.
5. Confirm owner can see employee promised date, note, status, and responsible employee in the arrears card details.
6. Confirm WhatsApp export uses the user-verified searchable format.
7. Confirm production write approval document exists before any live write.
8. Confirm production cutover remains `PRODUCTION_NO_GO`.

## Arrears Directive Dispatch Acceptance - 2026-05-31

1. Open owner arrears.
2. Select one or more arrears cards.
3. Click `下发员工`.
4. Expected while production write gate is off: dry-run/WhatsApp list is generated and UI explicitly says it was not written to employee side.
5. Do not expect employee inbox delivery unless a separate production write approval opens the gate.
6. Verify `readonly_admin` cannot see dispatch write controls.

## Live Owner Dry-run Copy Acceptance After Deploy - 2026-05-31

1. Log in as owner.
2. Open arrears.
3. Select at least one task and click `下发员工`.
4. Expected: UI states real dispatch is not enabled and a dry-run/manual list was generated.
5. It must not say that employee side already received the task.
6. No production write should be performed.

## Abdul One-Task Follow-up Owner Visibility - 2026-06-01

1. Log in as owner.
2. Open arrears / follow-up task details.
3. Locate `task-mpgzu9kp-f150e26f` / `144 / 139780080 / 50.00 AED`.
4. Confirm Abdul's promised payment date `2026-06-10` is visible.
5. Confirm Abdul's follow-up note is visible.
6. Confirm amount remains `50 AED`, `actual_received` remains `0`, and accounting status remains unchanged.
7. Confirm no batch dispatch, TTLock smoke, close, void, or handover action is part of this acceptance.
8. Production cutover remains `PRODUCTION_NO_GO`.

## Assigned / Followed-up Button State Acceptance - 2026-06-01

1. Open owner arrears.
2. Locate an assigned task and confirm it does not show a clickable primary `下发员工` action.
3. Locate a followed-up task and confirm it shows an already-feedback/saved state instead of a clickable primary `下发员工` action.
4. Confirm only waiting/not-dispatched tasks expose the primary send action for owner write roles.
5. Confirm readonly_admin still sees details only.
6. Do not execute any owner directive write or batch dispatch.
7. Production cutover remains `PRODUCTION_NO_GO`.
