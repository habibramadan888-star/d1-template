# Internal QA Start Guide

Date: 2026-05-28, Asia/Dubai

Scope: unified login guide for internal QA. This file does not approve
production deploy, staging deploy, production migration, D1 export/import/execute,
D1 write, feature flags, dashboard authority switch, public beta, or commercial
launch.

## Correct Links

| Role / Path            | Link                                                                      | Status                                      | Notes                                                                                         |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Unified login          | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html` | Live route verified after static deploy     | All testers should start here.                                                                |
| Employee business page | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`   | Confirmed by Ramadan and local asset exists | Automatic destination after employee/staff role is confirmed; not a primary login entry.      |
| Owner business page    | `https://homelink-finance.habibramadan888.workers.dev/index.html`         | Confirmed local main SPA asset exists       | Automatic destination after owner/manager/admin role is confirmed; not a primary login entry. |
| Owner/root legacy      | `https://homelink-finance.habibramadan888.workers.dev/`                   | Preserved compatibility path                | Do not use as the default QA login path.                                                      |
| Versioned main SPA     | `https://homelink-finance.habibramadan888.workers.dev/index-51.html`      | Confirmed local asset exists                | Candidate fallback only if the root/index route needs comparison.                             |

## Before Testing

| Check                     | Requirement                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Production cutover status | Must remain `PRODUCTION_NO_GO`.                                                                                 |
| Start link                | Open the single unified login first; do not split employee and owner login pages.                               |
| Credentials               | Receive through secure channel only; do not write passwords in docs.                                            |
| Evidence                  | Mask passwords, tokens, cookies, and sensitive customer data.                                                   |
| Write actions             | Do not run write-style QA against `homelink-finance` unless production D1 write approval is explicitly granted. |
| Bug reports               | Use `BUG_REPORT_TEMPLATE.md`.                                                                                   |

## Backend Binding Warning

Local `deploy-worker/wrangler.toml` config shows the default
`homelink-finance` Worker is bound to D1 database `homelink` with binding `DB`.
That means employee or owner write flows on the confirmed links can affect
production data. This guide is safe for link correction, navigation, login, and
read-only smoke planning only under current restrictions.

## Login Page Visible Copy Boundary

The live `unified-login.html` page must stay minimal for normal employees,
owners, and administrators. The page should show only the Homelink logo, title,
short unified-entry subtitle, employee-ID field, password/PIN field, login
button, small clear-session action, and one short helper sentence.

Do not show these internal QA notes on the visible login page:

| Internal Note                                 | Where It Belongs                |
| --------------------------------------------- | ------------------------------- |
| Worker binding `DB = homelink`                | QA docs only, not user login UI |
| Write-style QA requires separate approval     | QA docs only, not user login UI |
| Production cutover remains `PRODUCTION_NO_GO` | QA docs only, not user login UI |
| Role routing details and server-role matrix   | QA docs only, not user login UI |

## Live Route Verification

`INTERNAL_QA_005B_UNIFIED_LOGIN_LIVE_SMOKE_RESULT.md` confirms the live unified
login route now returns HTTP 200 with `text/html`, contains Homelink login
content, and no longer returns the API fallback text. This verification was
read-only and did not execute employee entry, handover, void/delete, settings,
migration, D1 export/import/execute, or any D1 write.

`INTERNAL_QA_005D_SESSION_HANDOFF_LIVE_SMOKE_RESULT.md` confirms the deployed
live assets now contain the owner and employee `/api/me` session handoff code.
The smoke deliberately did not execute a successful owner/employee login because
the current live login implementation writes a server session row to production
D1 table `active_sessions`.

## Session Handoff Expectation

Unified login is the only QA/product login entry. After sign-in, the
server-confirmed role routes the tester to a business destination:

| Role                    | Expected Handoff                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner / manager / admin | Unified login routes to the owner business page `index.html`; the page reads `/api/me` and must not behave as a separate owner login page.                  |
| Employee / staff        | Unified login routes to the employee business page `employee-v3.html`; the page reads `/api/me` and must not be treated as the primary employee login page. |

If either destination shows another credential prompt after a successful unified
login, record it as a bug with role, URL, time, and screenshot. Do not perform
write-style testing on `homelink-finance` without separate production D1 write
approval.

Successful live login testing is also a production D1 session-write action under
the current implementation. Treat it as a separate approval item if the test
must prove the live browser path with real credentials.

## Owner UX Expectation

After UNIFIED-LOGIN-UX-004, the owner destination must not flash the legacy
password panel before checking the server session. Expected behavior:

| Scenario                                             | Expected Result                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner opens destination after unified login          | Owner business page first shows `Checking session`, then enters the dashboard shell.                    |
| Browser back to unified login while still signed in  | Unified login shows a signed-in panel with continue and clear-session actions.                          |
| Expired or missing session                           | QA should return to `unified-login.html`; destination-side credential UI is not a separate login entry. |
| Second credential prompt appears after unified login | Record as a bug and do not continue role-flow testing until triaged.                                    |

The live Worker is still bound to `DB = homelink`; full write testing and
successful-login smoke that creates `active_sessions` require separate approval.

## Owner / Employee Visual Unification Expectation

After UI-UNIFICATION-NIGHT-001, owner and employee pages must look like the same
commercial SaaS product. Required visual checks:

| Area          | Expected Result                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Design system | Owner, employee, and unified login load `shared-design-tokens.css`.                                    |
| Font          | Owner uses the same Apple/SF + PingFang/Microsoft YaHei stack as employee.                             |
| Buttons       | Owner primary/secondary/danger buttons match employee radius, height, weight, and green gradient.      |
| Inputs        | Owner inputs/selects/textareas match employee rounded glass field and focus halo.                      |
| Cards         | Owner dashboard cards match employee glass/radius/shadow style.                                        |
| Mobile        | Owner mobile dashboard must not look like a squeezed desktop table.                                    |
| Loading       | Owner shows auth-loading first; no legacy second login flash.                                          |
| Unified login | `unified-login.html` visually matches the original employee login card/background/input/button design. |

If owner UI still looks visibly old compared with employee UI, record it as a
P1 UX bug. If owner shows a second login flash, record it as a P1 UX bug. If
mobile layout is broken or cramped, record it as P1/P2 depending on whether the
main flow is blocked.

## Owner Mobile Navigation Expectation

After UI-UNIFICATION-003, owner mobile QA must confirm:

| Area                 | Expected Result                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Primary navigation   | The owner primary nav does not show `录入` as a main tab.                                                  |
| Control panel button | The control panel button uses stable SVG/text and must not display garbled icon text.                      |
| Right-side controls  | Role badge, control panel, and logout icon remain inside the mobile viewport.                              |
| Client credit page   | Search, filter, refresh button, legend, and cards use the same design-system feel as employee cards/forms. |
| Write boundary       | Complete write testing still needs separate approval; this is visual/read-only QA guidance only.           |

If the owner topbar is clipped, garbled, or visually older than the employee
page, record it as a P1 UX bug. If only a deep secondary panel is less polished
but the main flow remains usable, record it as P2 unless it blocks testing.

## Stop Immediately If

| Condition                                                                 | Action                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| A tester is about to submit a production-affecting write without approval | Stop and request explicit production D1 write approval. |
| A tester sees another tenant/property data                                | Stop and open a P1 permission/data bug.                 |
| A screenshot exposes password, token, cookie, or secret                   | Stop, redact, and open a security bug.                  |
| Production cutover is marked GO by mistake                                | Stop and correct status to `PRODUCTION_NO_GO`.          |

## Owner Real Screenshot Regression Boundary

After OWNER-UI-REAL-SCREENSHOT-FIX-001, owner mobile QA must use real phone screenshots as acceptance evidence.

| Regression                                            | Expected Result                                            |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Main tab `录入`                                       | Not present in owner primary navigation.                   |
| Garbled glyph before `控制台` / `控制面板`            | Stable inline SVG/text only.                               |
| `添加记录 ADD ENTRY` on owner homepage                | Not visible. Employee entry belongs to `employee-v3.html`. |
| Direct `现金收款` / `银行转账` owner homepage buttons | Not visible on owner homepage.                             |

If any item remains visible in a live phone screenshot, mark visual QA as failed. Full write testing still requires separate approval because the live Worker is bound to `DB = homelink`. Production cutover remains `PRODUCTION_NO_GO`.
