# Owner Employee UI Visual QA Checklist

## EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001 Visual Checks

Date: 2026-06-01, Asia/Dubai

| Screenshot / State | Required | Pass/Fail | Notes |
|---|---:|---|---|
| Header compact controls | Yes | | Abdul/account and Logout are compact and same-size. |
| Centered Entry/Follow-up tabs | Yes | | Two tabs centered, equal-size, no Export. |
| Boss Assigned Entry-style card | Yes | | Compact card, Entry-style radius/spacing/buttons. |
| System Reminders Entry-style grid | Yes | | KPI cards match Entry tokens. |
| Reminder list Entry-style cards | Yes | | No red-line legacy cards. |
| Reminder details collapsed | Yes | | Status/date/note/actions hidden until expand. |
| No mixed visual systems | Yes | | Follow-up should look copied from Entry and content-swapped. |

Production remains `PRODUCTION_NO_GO`. This checklist does not approve production writes, write gate, deployment, or cutover.

## EMPLOYEE-FOLLOWUP-ENTRY-PERFECT-PARITY-DEPLOY-001 Visual Checks

Date: 2026-06-01, Asia/Dubai

| Screenshot / State | Required | Pass/Fail | Notes |
|---|---:|---|---|
| Employee header identity/logout | Yes | | One employee identity display plus one explicit `Logout / 退出` action. |
| Employee nav Entry/Follow-up only | Yes | | No employee `Export` tab. |
| Follow-up compact card default | Yes | | Boss assigned tasks should not open as long instruction blocks by default. |
| Follow-up expand/collapse | Yes | | `Expand Details / 展开详情` and `Collapse Details / 收起详情` are present and usable. |
| Follow-up matches Entry visual density | Yes | | Cards, spacing, buttons, and KPI tiles should feel identical to Entry. |
| No default customer code/internal id | Yes | | Default card should not show long customer code, raw task id, or debug labels. |
| System Reminders visual parity | Yes | | Reminders use Entry-style card treatment. |
| Owner exports preserved | Yes | | Owner WhatsApp and arrears export actions remain visible and usable. |

Production remains `PRODUCTION_NO_GO`. This checklist does not approve production writes, write gate, migration, rollout, or production cutover.

## TTLOCK-ARREARS-SOURCE-FIX-001 Visual Checks

| Screenshot / State     | Required | Pass/Fail | Notes                                                               |
| ---------------------- | -------: | --------- | ------------------------------------------------------------------- |
| System arrears visible |      Yes |           | Existing arrears remain visible even if TTLock fails.               |
| TTLock source count    |      Yes |           | Count increases when mapped expired unpaid TTLock cards exist.      |
| TTLock amount          |      Yes |           | Amount comes from bed-rent mapping.                                 |
| Missing rent state     |      Yes |           | Missing rent rows are surfaced separately, not counted in total.    |
| No secret leakage      |      Yes |           | No password, token, cookie, access token, or client secret appears. |

Production remains `PRODUCTION_NO_GO`.

## OWNER-ARREARS-MOBILE-CARD-DEPLOY-001 Visual Checks

Date: 2026-05-31, Asia/Dubai

| Screenshot                     | Required | Pass/Fail | Notes                                                                                                         |
| ------------------------------ | -------: | --------- | ------------------------------------------------------------------------------------------------------------- |
| Owner arrears mobile card list |      Yes |           | One screen should show at least two cards' main content where data density allows.                            |
| No vertical arrears text       |      Yes |           | Customer number, bed, amount, overdue days, source, and status must read horizontally/naturally.              |
| No debug fields                |      Yes |           | No visible `directive`, `promise`, `staff`, `source_type`, `followup_status`, `none`, `undefined`, or `null`. |
| TTLock expired-card source     |      Yes |           | Confirm TTLock expired cards are visible when present, even with amount pending.                              |
| Readonly admin arrears card    |      Yes |           | Readonly admin sees `Details` only and no write buttons.                                                      |
| Root portal integrity          |      Yes |           | Root portal remains employee / owner / admin only.                                                            |

Production remains `PRODUCTION_NO_GO`. This visual QA does not approve business writes, D1 writes, migrations, or production cutover.

## ARREARS-ROOT-CAUSE-LOCK-001 Visual Checks

| Screenshot                  | Required | Pass/Fail | Notes                                                                           |
| --------------------------- | -------- | --------- | ------------------------------------------------------------------------------- |
| Owner arrears source labels | Yes      |           | Confirm `历史欠款`, `本期到期未结清`, or `通通锁过期` appears where applicable. |
| Unknown TTLock amount       | Yes      |           | Confirm text is `金额待核对`.                                                   |
| Owner nav mobile            | Yes      |           | Confirm `网络` does not wrap to a second row.                                   |
| Owner arrears debug fields  | Yes      |           | Confirm no `directive:`, `promise:`, or `staff:` labels are visible.            |

## AUTH-ROUTING-ARCHITECTURE-001 Entry Checks

Use the root URL only: `https://homelink-finance.habibramadan888.workers.dev/`. Confirm the three doors are visible, old login pages are not visible, employee routes to `/employee`, owner routes to `/owner`, readonly admin routes to `/admin` or read-only owner mode, and lock/logout returns to `/`. Production cutover remains `PRODUCTION_NO_GO`.

Production status: `PRODUCTION_NO_GO`. This checklist is for internal visual QA only and does not approve business writes or production cutover.

## Required Screenshots

| Screenshot                    | Required | Pass/Fail | Notes                                                    |
| ----------------------------- | -------- | --------- | -------------------------------------------------------- |
| Unified login desktop         | Yes      |           |                                                          |
| Unified login mobile          | Yes      |           | Must match the original employee login screenshot.       |
| Employee-v3 desktop           | Yes      |           |                                                          |
| Employee-v3 mobile            | Yes      |           |                                                          |
| Employee home mobile          | Yes      |           | Confirm owner/employee design language match.            |
| Owner dashboard desktop       | Yes      |           |                                                          |
| Owner dashboard mobile        | Yes      |           |                                                          |
| Owner top navigation mobile   | Yes      |           | Confirm no garbled icon/text and no overflow.            |
| Owner primary nav mobile      | Yes      |           | Confirm no main `录入` tab.                              |
| Owner client credit mobile    | Yes      |           | Confirm client cards/search/filter match employee style. |
| Owner search/filter area      | Yes      |           | Confirm shared input/select/button styling.              |
| Owner loading state           | Yes      |           |                                                          |
| Owner empty state if possible | Yes      |           |                                                          |
| Owner error state if possible | Yes      |           |                                                          |
| Owner history/list/table      | Yes      |           |                                                          |
| Browser back signed-in state  | Yes      |           |                                                          |
| Clear session state           | Yes      |           |                                                          |

## Manual Checks

| Check                                                                            | Pass/Fail | Notes |
| -------------------------------------------------------------------------------- | --------- | ----- |
| Font family matches employee                                                     |           |       |
| Font sizes feel from same hierarchy                                              |           |       |
| Button radius/height/weight matches employee                                     |           |       |
| Inputs match employee style and focus state                                      |           |       |
| Cards match employee glass/radius/shadow                                         |           |       |
| Page background matches employee product feel                                    |           |       |
| Spacing matches employee rhythm                                                  |           |       |
| Radius scale is consistent                                                       |           |       |
| Shadow/elevation is consistent                                                   |           |       |
| Loading state is consistent                                                      |           |       |
| Mobile layout is consistent                                                      |           |       |
| Owner no longer looks like an old system                                         |           |       |
| Owner no longer flashes a second login page                                      |           |       |
| Owner primary nav no longer shows `录入`                                         |           |       |
| Control panel icon/text is not garbled                                           |           |       |
| Right-side topbar controls stay in viewport                                      |           |       |
| Owner client page matches employee card style                                    |           |       |
| Unified login uses employee login background                                     |           |       |
| Unified login uses employee login card style                                     |           |       |
| Unified login uses employee input/button style                                   |           |       |
| Unified login has no production/D1/cutover warning                               |           |       |
| Unified login has no role-routing explanation card                               |           |       |
| Unified login first screen shows only login content                              |           |       |
| Unified login has no helper paragraph or status card                             |           |       |
| Unified login visible elements are only logo/title/username/password/login/clear |           |       |
| Unified login may remember account only, never password/PIN                      |           |       |
| Only `unified-login.html` is treated as login entry                              |           |       |
| Back-button experience is clear                                                  |           |       |
| First load has visible feedback                                                  |           |       |
| Owner topbar has no meaningless `老板` badge                                     |           |       |
| Owner overview gives business value, not only empty counters                     |           |       |
| Owner history shows fast skeleton/recent rows, not 15-20 second blank            |           |       |
| Owner mobile density is compact and readable                                     |           |       |
| No write test performed                                                          |           |       |
| Production remains `PRODUCTION_NO_GO`                                            |           |       |

## Real Screenshot Regression Checks

If a real phone screenshot still shows any item below, UI acceptance fails and the issue remains open.

| Regression                                            | Expected Result                                           | Pass/Fail | Notes |
| ----------------------------------------------------- | --------------------------------------------------------- | --------- | ----- |
| Owner primary nav shows `录入`                        | Must not appear as a main owner tab.                      |           |       |
| Control panel left icon is garbled                    | Must use stable SVG/text only.                            |           |       |
| Owner homepage shows `添加记录 ADD ENTRY`             | Must not appear on owner homepage.                        |           |       |
| Owner homepage directly shows `现金收款` / `银行转账` | Must not appear as owner homepage primary action buttons. |           |       |
| Employee page entry is broken                         | Must remain available on `employee-v3.html`.              |           |       |

## AUTH-UI-STABILIZATION-002 Screenshot Checks

| Check                                                          | Pass/Fail | Notes |
| -------------------------------------------------------------- | --------- | ----- |
| Old employee PIN login never appears                           |           |       |
| Old owner login never appears                                  |           |       |
| Lock icon goes to unified login                                |           |       |
| Employee identity is real account, not `staff`                 |           |       |
| Employee tabs are consistent and not truncated                 |           |       |
| Owner control panel mobile layout fits viewport                |           |       |
| Owner arrears detail modal is readable                         |           |       |
| Owner history has quick skeleton/loading feedback              |           |       |
| Network/WiFi entry is visible or documented as manual-required |           |       |

## INTERNAL-QA-BLOCKERS-003 Visual And Safety Checks

| Check                                                                                       | Pass/Fail | Notes |
| ------------------------------------------------------------------------------------------- | --------- | ----- |
| Employee header shows only real name, centered                                              |           |       |
| Employee header does not show `当前员工` or `staff`                                         |           |       |
| Employee page does not show `Script error.` toast                                           |           |       |
| Arrears modal compact list shows 3-5 rows on phone                                          |           |       |
| Arrears export is summary-first and accounting-readable                                     |           |       |
| Unified login can use browser password manager without app-owned plaintext password storage |           |       |
| Readonly admin cannot see or trigger write actions                                          |           |       |

# OWNER-PAGE-REGRESSION-LOCK-001 Visual Checklist Addendum

Date: 2026-05-30, Asia/Dubai

- Owner overview screenshot must not show `QUICK ACTIONS` / `快速进入`.
- Owner overview screenshot must not show duplicate quick buttons for history, customer, analysis, or network.
- Owner navigation screenshot must show the internal `欠款管理` entry.
- Root portal screenshot must show only employee, owner, admin doors.
- Arrears screenshot must show the complete information pool: `欠款管理`, `ARREARS FOLLOW-UP`, `待下发`, `跟进中`, `承诺逾期`, `待核对`, `下发员工`, `WhatsApp 导出`, task status, responsible staff, promised repayment date, and notes.
- Any reappearance of `QUICK ACTIONS` or disappearance of the arrears entry is a regression bug.

## Owner Arrears Final Mobile UX Checklist

| Check                                   | Required | Result | Notes                                                                                              |
| --------------------------------------- | -------: | ------ | -------------------------------------------------------------------------------------------------- |
| Top nav label is `欠款`                 |      Yes |        | Must not show `欠款管理`.                                                                          |
| Top nav stays one line                  |      Yes |        | Order: 总览 / 欠款 / 历史 / 客户 / 网络.                                                           |
| Page shell/skeleton appears immediately |      Yes |        | No 20-second blank state.                                                                          |
| Only two sources appear                 |      Yes |        | 系统已有欠款, 通通锁到期未付.                                                                      |
| TTLock amount is rent-mapped            |      Yes |        | No `金额待核对` in default cards.                                                                  |
| Card matches history visual system      |      Yes |        | Same card radius, spacing, typography, and stat rows.                                              |
| Owner sees promised amount/date/note    |      Yes |        | Default employee feedback fields only.                                                             |
| No debug fields                         |      Yes |        | No `directive`, `promise`, `staff`, `source_type`, `followup_status`, `none`, `undefined`, `null`. |
| readonly_admin is read-only             |      Yes |        | Details only, no write buttons.                                                                    |

Production remains `PRODUCTION_NO_GO`.

## Owner Regression Audit Visual Checklist

| Check                             | Required | Result | Notes                                     |
| --------------------------------- | -------: | ------ | ----------------------------------------- |
| `分析` tab visible/reachable      |      Yes |        | Regression blocker if missing.            |
| Owner nav has all modules         |      Yes |        | 总览 / 欠款 / 历史 / 分析 / 客户 / 网络.  |
| Nav does not wrap                 |      Yes |        | Horizontal scroll is allowed.             |
| Arrears does not show abort error |      Yes |        | `signal is aborted without reason` is P1. |
| Full owner smoke run              |      Yes |        | `npm run test:owner-regression-smoke`.    |

Production remains `PRODUCTION_NO_GO`.

## Owner Arrears Overview Merge Visual Checklist

| Check                                         | Required | Result | Notes                                   |
| --------------------------------------------- | -------: | ------ | --------------------------------------- |
| Top nav does not show `欠款`                  |      Yes |        | Arrears belongs inside overview.        |
| Top nav keeps `分析`                          |      Yes |        | Regression blocker if missing.          |
| Top nav keeps `历史 / 客户 / 网络`            |      Yes |        | Network may be horizontally reachable.  |
| Overview shows `欠款跟进`                     |      Yes |        | Core operating module.                  |
| Arrears skeleton appears quickly              |      Yes |        | Should be visible before data resolves. |
| Arrears timeout shows retry                   |      Yes |        | No infinite loading.                    |
| Arrears error does not break overview         |      Yes |        | Other overview cards remain visible.    |
| 20s+ loading classified as blocker            |      Yes |        | P1.                                     |
| 3-minute loading classified as blocker        |      Yes |        | P0/P1.                                  |
| Production cutover remains `PRODUCTION_NO_GO` |      Yes |        | No GO marking from visual QA.           |

## Owner Arrears / Top Nav Visual QA

- 欠款模块不得无限 loading；必须在 10 秒内形成状态闭环。
- 部分来源失败时，卡片区应显示可用数据和业务提示。
- 顶部导航必须固定居中。
- 顶部导航禁止左右滑动、禁止 scroll-snap、禁止 `overflow-x:auto`。
- 欠款不作为一级 Tab。
- 分析入口必须存在，网络入口必须可访问。
- Production cutover remains `PRODUCTION_NO_GO`.

## P0 Arrears Backend SOT Live Visual QA

- Backend SOT has been deployed; owner arrears cards must be driven by `/api/boss/arrears/followup-tasks`.
- Frontend `buildArrearsFollowupPool()` is adapter-only and must not merge sources or calculate rent.
- Summary, preview, view all, and load more must follow backend `summary`, `preview_tasks`, `tasks`, and `pagination`.
- Manual screenshot QA should verify the overview arrears module with an already-authenticated owner or readonly session.
- Creating a new production login session is not part of this verification because it writes `active_sessions`.
- Production remains `PRODUCTION_NO_GO`.
## Owner Arrears Batch Display / Export Checklist

- [ ] Arrears cards are collapsed by default.
- [ ] Card details expand per task.
- [ ] Select-all selects only current filter results.
- [ ] Selection count is visible.
- [ ] Filters only show all / TTLock expired / existing arrears.
- [ ] List is sorted naturally by room/bed.
- [ ] WhatsApp export has visible response.
- [ ] Manual copy fallback appears if clipboard or popup is blocked.
- [ ] readonly_admin does not see select-all or send-employee buttons.
- [ ] Send-employee is dry-run and does not write D1.
- [ ] Production cutover remains `PRODUCTION_NO_GO`.
## Acceptance Bugfix Live Visual QA - 2026-05-31

| Check | Required | Result | Notes |
|---|---:|---|---|
| Three portal cards remain exactly employee / owner / admin | Yes | | No fourth arrears/directive entry. |
| Three portal card text is centered/aligned | Yes | | Chinese title and English subtitle must align consistently. |
| Owner arrears select-all enables send button | Yes | | At least one selected task should make the button clickable for owner/manager. |
| Send-employee is dry-run only | Yes | | Must show execution list only; no real directive write. |
| WhatsApp export uses final baseline | Yes | | No raw/debug labels and no duplicated rows. |
| Clipboard/share/fallback text matches | Yes | | Same generated text for all paths. |
| readonly_admin has no write action | Yes | | View/export only. |
| Production cutover remains `PRODUCTION_NO_GO` | Yes | | No GO marking from visual QA. |
## EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001

Employee mobile visual checklist:

- Header shows one employee identity display and one `Logout / 退出` control.
- Employee identity and Logout controls use matching background, font, size, radius, and centered text.
- Top tabs show only `Entry / 录入` and `Follow-up / 跟进`.
- Follow-up page visually matches Entry page card, button, spacing, and typography rules.
- Boss Assigned Tasks appear before System Reminders.
- Default Follow-up card shows only Bed, Amount, Due, Status, and Details.
- Expanded card shows Promise Date, Note, Boss Note, Source, and Submit/Saved state.
- No visible employee Export page.
- Boss WhatsApp export remains available on owner side.

## EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-DEPLOY-001

Live Worker version: `bae1241e-ac4b-4747-bebe-a4bb4a9bd00f`.

| Check | Expected | Actual | Pass/Fail |
|---|---|---|---|
| Employee tabs | Entry and Follow-up only | | |
| Employee Export tab/page | Not visible | | |
| Header identity | One identity display | | |
| Header logout | `Logout / 退出` visible | | |
| Follow-up card style | Matches Entry card visual system | | |
| Details / Collapse | Works without page jump | | |
| Raw customer code | Hidden from default card | | |
| `existing_arrears_record` raw label | Hidden from default card | | |
| Owner WhatsApp export | Still available | | |
| Production write | None during visual QA | | |
| Production cutover | `PRODUCTION_NO_GO` | | |
