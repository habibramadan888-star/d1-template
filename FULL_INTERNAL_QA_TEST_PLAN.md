# Full Internal QA Test Plan

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

## Owner Real Screenshot Regression Stop Items

| Regression                                           | Required Handling                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner primary nav shows `录入`                       | Record as P1 UX/IA bug; owner entry must not be a main tab.                                             |
| Owner topbar icon/text is garbled                    | Record as P1 UX bug and attach phone screenshot.                                                        |
| Owner homepage shows `添加记录 ADD ENTRY`            | Record as P1 UX/IA bug; employee entry must not be exposed as an owner homepage block.                  |
| Owner homepage shows `现金收款` / `银行转账` buttons | Record as P1 UX/IA bug; payment entry actions belong to employee entry flow unless separately approved. |
