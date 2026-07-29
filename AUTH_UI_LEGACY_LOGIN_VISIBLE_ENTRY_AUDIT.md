# AUTH-UI-STABILIZATION-002 Legacy Login Visible Entry Audit

Date: 2026-05-29, Asia/Dubai

Production status: `PRODUCTION_NO_GO`

| Old Login Entry             | File / Selector                                                                      | How It Appears                                                      | Current User Impact                                                                                          | Required Fix                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Old employee PIN login page | `deploy-worker/public/employee.html`                                                 | Standalone legacy employee-code/PIN page                            | Can appear if a stale link or Cloudflare Assets maps `/employee` to `employee.html` before Worker route code | Replaced `employee.html` with a redirect-only stub to `/unified-login.html`; Worker route aliases also redirect. |
| Old employee PIN overlay    | `deploy-worker/public/employee-v3.html`, `#loginOverlay`                             | Hidden legacy overlay inside employee business page                 | Must not appear for unauthenticated users                                                                    | Keep hidden and redirect unauthenticated access to unified login.                                                |
| Old owner password panel    | `deploy-worker/public/index.html`, `#ownerLoginPanel`; handler in `index-51-main.js` | Hidden owner password panel                                         | If surfaced, old handler could authenticate and route by legacy response                                     | `submitCode()` now redirects to unified login and performs no auth.                                              |
| Generic login routes        | Worker routes `/login`, `/staff-login`, `/employee-login`, `/owner-login`            | Legacy or ambiguous route names                                     | Can create mixed login mental model                                                                          | Worker redirects all to `/unified-login.html`.                                                                   |
| Lock/logout handlers        | `logout()` and clear-session handlers                                                | Previously could expose old fallback paths if local state was stale | User saw lock path ending in old employee PIN page                                                           | All logout paths clear legacy auth storage and redirect unified login.                                           |

Answers:

1. The lock icon could enter the old employee PIN page because stale legacy employee routes and the hidden owner login handler still existed as user-reachable fallbacks. Live smoke also showed `/employee.html` normalizes to `/employee`, which Cloudflare Assets can serve from the static `employee.html` asset before the Worker redirect is user-visible.
2. The old employee PIN UI is rendered by `deploy-worker/public/employee.html` and by the hidden `#loginOverlay` in `employee-v3.html`.
3. The risky handler was `submitCode()` in `deploy-worker/public/index-51-main.js`; it could call `/auth/login` and route `staff` to `employee-v3.html`.
4. Legacy `localStorage` / `sessionStorage` keys including `homelink:role`, `owner:role`, `empv3:user`, and `empv3:operator` are cleared during logout and redirects.
5. User-visible old login entries are disabled or redirected to `/unified-login.html`; business pages are not primary login pages. The static `employee.html` file is now a redirect stub and no longer contains the legacy PIN form.

No production D1 write, migration, D1 export/import/execute, business write test, dashboard calculation change, or financial formula change was performed.
