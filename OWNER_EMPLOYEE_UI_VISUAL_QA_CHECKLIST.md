# Owner Employee UI Visual QA Checklist

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
