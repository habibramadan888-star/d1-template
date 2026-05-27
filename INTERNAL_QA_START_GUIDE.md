# Internal QA Start Guide

Date: 2026-05-28, Asia/Dubai

Scope: unified login guide for internal QA. This file does not approve
production deploy, staging deploy, production migration, D1 export/import/execute,
D1 write, feature flags, dashboard authority switch, public beta, or commercial
launch.

## Correct Links

| Role / Path          | Link                                                                      | Status                                      | Notes                                                              |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Unified login        | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html` | Live route verified after static deploy     | All testers should start here.                                     |
| Employee destination | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`   | Confirmed by Ramadan and local asset exists | Automatic destination after employee/staff role is confirmed.      |
| Owner destination    | `https://homelink-finance.habibramadan888.workers.dev/index.html`         | Confirmed local main SPA asset exists       | Automatic destination after owner/manager/admin role is confirmed. |
| Owner/root legacy    | `https://homelink-finance.habibramadan888.workers.dev/`                   | Preserved compatibility path                | Do not use as the default QA login path.                           |
| Versioned main SPA   | `https://homelink-finance.habibramadan888.workers.dev/index-51.html`      | Confirmed local asset exists                | Candidate fallback only if the root/index route needs comparison.  |

## Before Testing

| Check                     | Requirement                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Production cutover status | Must remain `PRODUCTION_NO_GO`.                                                                                 |
| Start link                | Open unified login first; do not split employee and owner login links.                                          |
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

After the session handoff fix is deployed, unified login should be a one-time
login for both role destinations:

| Role                    | Expected Handoff                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Owner / manager / admin | Unified login routes to `index.html`; the owner SPA reads `/api/me` and must not show a second password prompt.      |
| Employee / staff        | Unified login routes to `employee-v3.html`; the employee page reads `/api/me` and must not show a second PIN prompt. |

If either destination shows a second login prompt after a successful unified
login, record it as a bug with role, URL, time, and screenshot. Do not perform
write-style testing on `homelink-finance` without separate production D1 write
approval.

Successful live login testing is also a production D1 session-write action under
the current implementation. Treat it as a separate approval item if the test
must prove the live browser path with real credentials.

## Stop Immediately If

| Condition                                                                 | Action                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| A tester is about to submit a production-affecting write without approval | Stop and request explicit production D1 write approval. |
| A tester sees another tenant/property data                                | Stop and open a P1 permission/data bug.                 |
| A screenshot exposes password, token, cookie, or secret                   | Stop, redact, and open a security bug.                  |
| Production cutover is marked GO by mistake                                | Stop and correct status to `PRODUCTION_NO_GO`.          |
