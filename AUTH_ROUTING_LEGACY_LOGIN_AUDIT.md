# AUTH-ROUTING-STABILIZATION-001 Legacy Login Audit

Date: 2026-05-29, Asia/Dubai

Scope: auth routing, session handoff, logout routing, employee identity display,
owner network entry, and owner history first-load behavior. This audit does not
approve production D1 write, migration, D1 export/import/execute, dashboard
calculation change, financial formula change, employee entry write, handover
submit, void/delete, settings change, or commercial launch GO.

| Entry / Handler           | File                                                                             | Current Behavior                                                                                                                                               | Problem                                                                                                            | Required Fix                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Unified login             | `deploy-worker/public/unified-login.html`                                        | Single login form posts to `/auth/employee-login` when username is present and `/auth/login` when blank, then routes by `/api/me`.                             | This is the intended only login entry. It also needed to clear old role/session caches on explicit clear-session.  | Keep as only entry; clear legacy auth caches but never save password/PIN.                                                               |
| Employee old PIN overlay  | `deploy-worker/public/employee-v3.html`                                          | `loginOverlay` existed as a visible staff sign-in UI.                                                                                                          | Unauthenticated employee destination could display an old second-login page instead of returning to unified login. | Keep hidden by default and redirect unauthenticated/invalid sessions to `./unified-login.html`.                                         |
| Employee bootstrap        | `deploy-worker/public/employee-v3.html`                                          | `/api/me` was checked, but 401 or errors could show old `loginOverlay`. An older unused function also logged out on refresh.                                   | This caused old employee login flashes and could break unified-login session reuse.                                | `/api/me` remains authority; employee/staff enters page, owner/admin goes `index.html`, unauthenticated goes unified login.             |
| Owner old password panel  | `deploy-worker/public/index.html`; `deploy-worker/public/index-51-main.js`       | Owner destination had hidden old `ownerLoginPanel`; fallback could display it.                                                                                 | Clicking lock/logout or auth fallback could land in the old owner password page.                                   | Suppress owner fallback and redirect to unified login.                                                                                  |
| Owner lock/logout         | `deploy-worker/public/index-51-main.js`                                          | `logout()` called `/auth/logout` but then restored old owner login overlay locally.                                                                            | User saw old login page after clicking lock.                                                                       | Clear server session and legacy client caches, then `location.replace('./unified-login.html')`.                                         |
| Role redirect             | `deploy-worker/public/index-51-main.js`; `deploy-worker/public/employee-v3.html` | Role decisions are made from `/api/me`, but old UI fallback paths still existed.                                                                               | Mixed old/new login pages created visible flicker.                                                                 | Business pages show auth loading first, then route by `/api/me`; no old login UI before auth completes.                                 |
| Employee identity display | `deploy-worker/public/employee-v3.html`                                          | Employee chip could show `userid`, and if the legacy staff role session was used it displayed `staff`.                                                         | `staff` is a role, not an employee name.                                                                           | Display priority is display name, employee name, name, username, userid, employee_id, and role only as last fallback.                   |
| Owner network/WiFi entry  | `deploy-worker/public/index.html`; `deploy-worker/public/index-51-main.js`       | `view-wifi` and WiFi APIs still existed, but no visible owner nav entry was present.                                                                           | User could not find the previous network control entry.                                                            | Restore a `网络 / NETWORK` owner navigation tab and quick action without changing WiFi settings logic.                                  |
| Owner history             | `deploy-worker/public/index-51-main.js`; `deploy-worker/src/index.js`            | History showed skeleton and requested limited rows, but slow API could leave the page waiting too long. GET `/api/history` also ran schema ensure before read. | 30-second wait is a P1 UX blocker and read routes should not run DDL-style schema ensure.                          | Add 8-second timeout/retry UI, keep first load to recent rows, and make history/session-detail routes read-only table-existence checks. |

## Root Cause Summary

1. Owner lock/logout routed to a local fallback login panel after clearing the
   cookie instead of going to the single unified login entry.
2. Employee `employee-v3.html` still retained a visible old PIN overlay path for
   unauthenticated states, so an invalid/expired session could flash old UI.
3. A legacy owner password flow could create a `staff` role session and send the
   user through employee routing; because the employee page displayed role-like
   identifiers, the UI showed `staff`.
4. Network control was still implemented as `view-wifi` and `/api/wifi/accounts`
   but had no restored owner-facing entry after nav restructuring.
5. History had first-load skeleton but no timeout or failure recovery; a slow
   `/api/history` response left the user staring at loading cards.

Production status remains `PRODUCTION_NO_GO`.
