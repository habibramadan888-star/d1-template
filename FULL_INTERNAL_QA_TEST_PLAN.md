# Full Internal QA Test Plan

## TTLOCK-ARREARS-SOURCE-FIX-001 QA Addendum

Owner arrears QA must validate:

- Only two source classes are visible: system arrears and TTLock expired unpaid.
- TTLock expired unpaid enters the arrears pool when live data and rent mapping are available.
- TTLock amount comes from bed-rent mapping.
- TTLock unavailable is not accepted as a successful end state.
- TTLock source failure does not block system arrears.
- Production cutover remains `PRODUCTION_NO_GO`.

## ARREARS-ROOT-CAUSE-LOCK-001 QA Addendum

Owner arrears QA must validate source completeness, not just visual rendering:

- `historical_arrears` rows are present.
- `current_due_unpaid` rows are present.
- `ttlock_expired_card` rows are present.
- Unknown amount TTLock rows display `金额待核对`.
- Owner overview still has no quick-entry section.
- Owner nav does not wrap the network entry to a second row.

No production cutover is approved. Production remains `PRODUCTION_NO_GO`.

## AUTH-ROUTING-ARCHITECTURE-001 Entry Update

All testers start from the root URL only:

`https://homelink-finance.habibramadan888.workers.dev/`

The page presents three doors: employee, owner, and administrator. `/unified-login.html`, `/employee-v3.html`, and `/index.html` remain compatibility paths, not formal user instructions. If any old PIN login or old owner login appears, record it as a P0/P1 auth-routing bug. Full write testing still requires separate approval. Production cutover remains `PRODUCTION_NO_GO`.

Date: 2026-05-28, Asia/Dubai

Scope: internal QA planning with one unified login page. Testers must start
from `unified-login.html` and allow the server-confirmed role to route them.
`employee-v3.html` and `index.html` are business destinations, not separate
login pages. This plan does
not approve public beta, production migration, production deploy, production D1
write, production feature flags, dashboard production authority switch, or
commercial launch.

## Environment

| Item                           | Value                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| QA package environment         | Internal QA planning; not production approval                                              |
| Unified login URL              | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html`                  |
| Employee business destination  | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`                    |
| Owner business destination     | `https://homelink-finance.habibramadan888.workers.dev/index.html`                          |
| Staging Worker URL             | `https://homelink-finance-staging.habibramadan888.workers.dev`                             |
| Current Worker D1 binding risk | `homelink-finance` is configured with `DB = homelink`; writes affect prod                  |
| Production used?               | Live Worker static route deploy executed under explicit approval; no D1 write or migration |
| Production equivalent?         | No                                                                                         |
| Production cutover status      | `PRODUCTION_NO_GO`                                                                         |
| Test data policy               | QA-marked evidence only; no production writes without separate approval                    |
| Password / token handling      | Never paste into docs, screenshots, tickets, or chat                                       |
| Live unified-login route       | Verified HTTP 200 `text/html` in `INTERNAL_QA_005B_UNIFIED_LOGIN_LIVE_SMOKE_RESULT.md`     |
| Live session handoff assets    | Verified deployed in `INTERNAL_QA_005D_SESSION_HANDOFF_LIVE_SMOKE_RESULT.md`               |

## Roles

| Role          | Purpose                                                      | Account Handling                                                           |
| ------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| employee      | Staff entry, rent/deposit/arrears/handover flows             | Start at unified login; no write test unless target is explicitly approved |
| owner         | Dashboard, history, reports, reconciliation, review flows    | Start at unified login; no production write or cutover approval            |
| manager/admin | Tenant/property permission boundary checks if account exists | Start at unified login; use only if target scope is explicitly approved    |

## Test Cycle

| Round   | Focus                                   | Required Output                                                           | Pass Standard                                                                     |
| ------- | --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Round 1 | Functional usability                    | Employee and owner scripts completed                                      | Core pages load, login/logout works, no P0/P1 functional blocker                  |
| Round 2 | Financial flows                         | Evidence for rent, deposit, arrears, short-pay, repayment, void, handover | Amounts and status changes are explainable and match expected accounting rules    |
| Round 3 | Permissions / exceptions / weak network | Negative cases, duplicate submit, mobile, refresh/back navigation         | Unauthorized access denied, duplicate/weak-network behavior safe, no data leakage |

## Pass Criteria

| Area                  | Pass Criteria                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Employee flow         | Rent, deposit, arrears, short-pay, repayment, void, and handover scenarios are completed or have documented blockers.  |
| Owner flow            | Dashboard, history, search/filter, handover review, and report/export behavior are reviewed with screenshots or notes. |
| Unified login handoff | Owner and employee each log in once through unified login; no second password/PIN prompt appears after routing.        |
| Unified login visual  | `unified-login.html` matches the original employee login background, card, input, button, type, and mobile layout.     |
| Unified design system | Owner and employee use the same font, button, input, card, loading, and mobile visual language.                        |
| Finance flow          | Rent income, deposit liability, arrears, overdue, overpayment, and void behavior match the accepted staging rules.     |
| Tenant/property scope | Employee, owner, and manager/admin access is constrained to expected tenant/property boundaries.                       |
| Mobile usability      | Required employee and owner flows are usable on phone viewport.                                                        |
| Bug threshold         | No open P0/P1 bug remains before closed-pilot recommendation.                                                          |
| Launch boundary       | Production remains `PRODUCTION_NO_GO`; internal QA does not become public beta or launch approval.                     |

## Failure Handling

| Failure Type                                                            | Required Action                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P0 financial or data corruption risk                                    | Stop the affected flow, create bug report, notify Ramadan Habib, and do not continue related tests until triaged.    |
| P1 permission or cross-tenant risk                                      | Stop permission testing, preserve evidence, create bug report, and keep production NO-GO.                            |
| P2 functional defect                                                    | Record steps, expected/actual result, screenshot, and continue unrelated tests if safe.                              |
| P3 usability issue                                                      | Record notes and screenshots; group for later UI cleanup.                                                            |
| Unclear accounting behavior                                             | Mark `MANUAL_REQUIRED`; do not invent pass/fail.                                                                     |
| Second login after unified login                                        | Record as a unified-login handoff bug; do not continue role-flow testing until triaged.                              |
| Owner login flicker or back-loop                                        | Record as a unified-login UX bug. Expected behavior is auth-loading first and signed-in panel on browser back.       |
| Owner visually looks old                                                | Record as a P1 UX bug if the owner UI no longer appears to belong to the same product as employee.                   |
| Owner mobile layout is cramped                                          | Record as P1 if it blocks core use, P2 if readable with workaround.                                                  |
| Owner primary nav shows `录入`                                          | Record as P1 UX/IA bug; owner entry must not appear as a main tab or homepage action.                                |
| Owner topbar icon/text is garbled                                       | Record as P1 UX bug and attach phone screenshot.                                                                     |
| Owner right-side topbar overflows                                       | Record as P1 if it blocks use, P2 if cosmetic but readable.                                                          |
| Successful live login smoke                                             | Requires separate approval because successful login writes production D1 `active_sessions`.                          |
| Login page shows production/D1/cutover/role-routing technical text      | Record as P1 UX bug; visible login UI must stay minimal and user-facing.                                             |
| Login page shows helper paragraphs, route explanations, or second cards | Record as P1 UX bug; the visible login page may show only logo, title, username, password, login, and clear session. |

## Evidence Rules

| Evidence Type      | Required Content                                        | Redaction                                                          |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Screenshot         | Page, role, date/time, masked tenant/customer if needed | Mask passwords, tokens, cookies, personal phone numbers if visible |
| Video              | Only if a bug needs sequence proof                      | No credentials or tokens visible                                   |
| Export/report file | Store as staging QA evidence only                       | Do not upload production data                                      |
| Bug report         | Use `BUG_REPORT_TEMPLATE.md`                            | No secrets or passwords                                            |

## Explicit Non-Goals

| Non-Goal                    | Reason                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Production deploy           | Not approved.                                                                                                               |
| Production migration        | Not approved.                                                                                                               |
| Production D1 write         | Not approved.                                                                                                               |
| Staging D1 write from Codex | This package is documentation only; manual QA may create QA-marked staging evidence through the app if separately approved. |
| Public beta                 | Internal QA is not public beta.                                                                                             |
| Commercial launch GO        | Launch gate remains `PRODUCTION_NO_GO`.                                                                                     |

## Owner UX Stabilization Checks

| Check               | Expected Result                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remember account    | Login page may remember username / employee ID / owner account only. Password remains empty on reload.                                               |
| Password storage    | If the app stores password / PIN in localStorage or sessionStorage, stop and open a P0 security bug.                                                 |
| Clear session       | Clears active session/token state and password field. Remembered account is preserved only when `记住账号` remains checked.                          |
| Owner topbar        | The visible `老板` badge should not appear; permissions still come from the server session.                                                          |
| Overview value      | Owner can see today's received amount, outstanding amount, pending item signal, latest handover status, alert summary, recent flow, and quick links. |
| History performance | First paint shows skeleton quickly; initial history request loads recent records first with a load-more path.                                        |
| Mobile density      | Page title, nav, cards, and lists are compact enough for mobile business review without reverting to old UI.                                         |

## Auth Routing Stabilization Checks

| Check                | Expected Result                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Single-entry routing | All unauthenticated role destinations route to `unified-login.html`; no legacy owner or employee login panel flashes.     |
| Role destination     | Server-confirmed employee/staff sessions route to `employee-v3.html`; owner/manager/admin sessions route to `index.html`. |
| Lock/logout routing  | Lock and logout clear session state and route to `unified-login.html`, not to old login UI.                               |
| Employee identity    | Employee UI displays display name, username, or employee id; `staff` is treated as a role, not a display name.            |
| Network control      | Owner WiFi/network entry is present in the owner navigation or recorded as manual-required.                               |
| History performance  | Owner history shows skeleton/loading quickly and loads recent records first instead of blocking on full history.          |

If any auth route flashes an old login panel, routes through the wrong role
destination, or shows `staff` as the visible employee name, record a P1 bug and
pause role-flow QA until retested. Production cutover remains
`PRODUCTION_NO_GO`.

## Owner Real Screenshot Regression Stop Items

| Regression                                           | Required Handling                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner primary nav shows `录入`                       | Record as P1 UX/IA bug; owner entry must not be a main tab.                                             |
| Owner topbar icon/text is garbled                    | Record as P1 UX bug and attach phone screenshot.                                                        |
| Owner homepage shows `添加记录 ADD ENTRY`            | Record as P1 UX/IA bug; employee entry must not be exposed as an owner homepage block.                  |
| Owner homepage shows `现金收款` / `银行转账` buttons | Record as P1 UX/IA bug; payment entry actions belong to employee entry flow unless separately approved. |

## AUTH-UI-STABILIZATION-002 Scope

- Confirm the unified login is the only visible login flow.
- Confirm unauthenticated owner and employee business pages redirect to unified login.
- Confirm lock/logout does not route to old employee PIN login or old owner login.
- Confirm employee identity displays the actual user, for example `abdul`, not `staff`.
- Confirm employee top tabs use one consistent Chinese-over-English layout.
- Confirm owner control panel and arrears detail modal are readable on mobile.
- Confirm owner history shows skeleton feedback quickly and loads recent records first.
- Confirm WiFi/network entry is present or explicitly marked manual-required.
- Do not perform employee entry write, handover submit, void/delete, settings changes, D1 write, or migration.
- Production cutover remains `PRODUCTION_NO_GO`.

## INTERNAL-QA-BLOCKERS-003 Acceptance Addendum

- Employee identity: display real user name only; `staff` is a role and must never be shown as a person name.
- Script errors: any visible `Script error.` toast during employee initial render is a P1 blocker.
- Arrears export: exported text must start with summary, include generated time/count/aging buckets, and use `金额未接入` when amount authority is not connected.
- Arrears modal: mobile layout must use compact rows, not oversized cards that show only one customer per screen.
- Login password manager: browser autocomplete is allowed; app-owned plaintext password/PIN storage is forbidden.
- Readonly admin: can view owner dashboard/history/clients/analysis; all write actions must be disabled in UI and rejected by backend.
- Production remains `PRODUCTION_NO_GO`; no internal QA result is production approval.

## THREE-PORTAL-FIX-001 Entry Model Regression

QA must verify the formal `/` entry surface has only three role doors:

- 员工
- 老板
- 管理员

欠款管理 is not an entry identity and must not appear as a fourth card on the main portal. Validate arrears only after login:

- Owner: arrears management in owner workspace.
- Employee: assigned arrears follow-up tasks in employee workspace.
- Readonly admin: owner/admin arrears view remains read-only.

Run `npm run test:three-portal-entry-cards` before visual acceptance. Production cutover remains `PRODUCTION_NO_GO`.

# OWNER-PAGE-REGRESSION-LOCK-001 Addendum

Date: 2026-05-30, Asia/Dubai

Owner QA must include these non-negotiable UI composition checks:

- Overview page prohibits `QUICK ACTIONS` / `快速进入`.
- Overview page must not duplicate history/customer/analysis/network shortcut buttons.
- Arrears management is an owner-internal module and must not appear as a fourth login door.
- Owner internal navigation must keep the `欠款管理` entry visible.
- The arrears information pool must show `欠款管理`, `ARREARS FOLLOW-UP`, status KPIs, `下发员工`, `WhatsApp 导出`, `筛选状态`, task status, responsible staff, promised repayment date, and notes.
- If `QUICK ACTIONS` appears or arrears entry disappears, classify it as a regression bug.

## Owner Arrears Final UX QA Addendum

Owner arrears QA must validate the final source and visual contract:

- Allowed sources are exactly two: system existing arrears records and TTLock expired unpaid.
- TTLock expired unpaid must use bed rent mapping for amount; beds without rent config are configuration QA and do not enter the default list.
- Owner default card content is limited to employee promised amount, promised date, and note, alongside identity/source/status/due context.
- Arrears visual style must match the history page card system. Old outstanding rows/tables, vertical text, or debug output are regressions.
- Top navigation must show `欠款`; `欠款管理` is too long for mobile primary nav.
- A 20-second blank/load stall is a P1 blocker.
- Raw debug fields are regression blockers.

Production cutover remains `PRODUCTION_NO_GO`.

## Arrears Follow-Up Field Simplification

QA must verify:

- System, not employee, determines arrears amount.
- Employee only enters promised repayment date and note for follow-up.
- Owner default arrears card shows system amount, promised date, note, and status.
- `promise_amount` / `promised_amount_fils` may exist in compatibility contracts but are not default UI fields.
- Any reappearance of `承诺金额` on default owner arrears cards is a regression.
- Production cutover remains `PRODUCTION_NO_GO`.

## Owner Regression Audit QA Addendum

Owner QA must treat these as blockers:

- Missing `分析` entry.
- Owner arrears `signal is aborted without reason`.
- Any owner module unreachable after login.
- Owner shell changes without `npm run test:owner-regression-smoke`.

Required module smoke: 总览, 欠款, 历史, 分析, 客户, 网络.

Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Overview Merge QA Addendum

Owner QA must validate the new product decision:

- Arrears is merged into overview and must not be a top-level owner tab.
- Overview must contain `欠款跟进`.
- Arrears loading must close to success, empty, error, or timeout; infinite loading is a blocker.
- Arrears timeout/error must show retry inside the module only.
- Arrears failure must not affect overview KPIs, alerts, recent sessions, or recent ledger.
- 20s+ loading is P1.
- 3-minute loading is P0/P1.

Required commands:

- `npm run test:owner-arrears-infinite-loading`
- `npm run test:owner-overview-arrears-async`
- `npm run test:owner-overview-arrears-timeout`
- `npm run test:owner-nav-after-arrears-merge`
- `npm run test:owner-arrears-two-source-only`

Production cutover remains `PRODUCTION_NO_GO`.

## Owner Arrears Loading / Navigation Blockers

- 欠款模块无限 loading 是 P1/P0 blocker。
- 欠款模块必须有状态闭环：loading、success、empty、partial failure、error、retry。
- 欠款来源必须独立失败隔离，避免 TTLock 或 rent mapping 单点拖垮系统已有欠款。
- 顶部导航禁止横向滚动；不能通过左右滑来塞入口。
- 欠款不作为一级 Tab，只在总览里展示。
- Production cutover remains `PRODUCTION_NO_GO`.
