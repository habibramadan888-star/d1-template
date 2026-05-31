# Entry And Authority Lock

## Canonical Rules

| Rule                                                       | Current                                                                                             | Pass/Fail             | Evidence                                                                                                                   | Required Fix                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Main entry is `/` only                                     | Live `/` returns portal                                                                             | Pass                  | Live read-only fetch returned HTTP 200 and root portal asset. Worker routes `/` and `/home` to `/portal`.                  | Keep. Add CI smoke for `/`.                                                     |
| Home page only shows employee / owner / admin              | Current portal has exactly these three `data-portal` doors                                          | Pass                  | `deploy-worker/public/portal.html` contains `data-portal="employee"`, `owner`, `admin`; live root contains same markers.   | Keep.                                                                           |
| No fourth entry                                            | Arrears is not a portal door                                                                        | Pass                  | Live root does not contain `data-portal="arrears"`; `owner-arrears-entry-present` tests exist.                             | Keep.                                                                           |
| Arrears management is not a login entry                    | Arrears is not in portal                                                                            | Pass                  | Portal source has no arrears door.                                                                                         | Keep locked.                                                                    |
| Arrears is an owner business module                        | Arrears section exists in owner shell; current primary nav should not expose it as top tab          | Partial               | `view-arrears` exists; current top nav has no `data-view="arrears"`, but `switchView('arrears')` and JS references remain. | Define whether arrears is overview-only or hidden route; test both HTML and JS. |
| Employee arrears follow-up is employee task module         | Employee v3 uses `/api/arrear_tasks/update` and task cards                                          | Pass with backend gap | `employee-v3.html` posts `promise_date` and `staff_note`; backend still accepts `promise_amount`.                          | Future backend contract cleanup.                                                |
| Admin is readonly_admin                                    | Portal maps readonly roles to `/admin`; frontend app maps to `readonly_admin`; backend has role set | Pass                  | `READONLY_ADMIN_ROLES` in Worker; portal `ADMIN_ROLES`.                                                                    | Keep; test all write denials.                                                   |
| `/employee`, `/owner`, `/admin` unauthenticated return `/` | Live returns 302 to `/`                                                                             | Pass                  | Read-only smoke: all three returned 302 to root.                                                                           | Keep.                                                                           |
| `/api/me` is the frontend authority                        | Portal and owner/employee shells call `/api/me`                                                     | Pass                  | `portal.html`, `index-51-main.js`, `employee-v3.html` all fetch `/api/me`; live unauth returns 401 standard error.         | Keep; forbid localStorage role authority.                                       |
| localStorage/sessionStorage are not permission authority   | Used for cleanup/state hints; routing based on `/api/me`                                            | Pass with watch       | Portal `routeFromMe(me)` uses API body. Owner shell uses `fetchCurrentAuthUser()`.                                         | Add test that localStorage role alone cannot enter app.                         |
| logout / lock icon returns `/`                             | Current code calls `/api/logout` and clears local state                                             | Pass                  | `portal.html`, `index-51-main.js`, `employee-v3.html` include `/api/logout` and root redirect logic.                       | Keep.                                                                           |
| Old employee PIN login is not user-visible                 | `/employee-v3.html` redirects to `/employee`; unauth `/employee` returns `/`                        | Pass                  | Worker static route redirects old asset route to canonical route; live smoke confirms redirects.                           | Keep.                                                                           |
| Old owner login page is not user-visible                   | `/index-51.html`, `/owner.html` redirect to `/owner`; unauth `/owner` returns `/`                   | Pass                  | Live smoke confirms 302 chain to canonical route.                                                                          | Keep.                                                                           |

## Authority Model

Only server-authenticated `/api/me` can decide role and destination.

Allowed destinations:

| Role                                | Destination | Writes                                  |
| ----------------------------------- | ----------- | --------------------------------------- |
| `staff` / `employee`                | `/employee` | Employee-scoped writes only             |
| `manager`                           | `/owner`    | Owner writes allowed by endpoint policy |
| `readonly_admin` / `admin_readonly` | `/admin`    | No business writes                      |

## Non-Negotiable Tests

1. `GET /` renders exactly three doors.
2. `GET /employee`, `/owner`, `/admin` unauthenticated redirect to `/`.
3. `GET /api/me` unauthenticated returns 401 with standard error.
4. Portal route is based on `/api/me`, not localStorage.
5. Legacy visible login paths redirect to canonical routes.
6. Logout clears client hints and posts `/api/logout`.
# Acceptance Bugfix Lock - 2026-05-31

- No employee entry write is executed by arrears batch dry-run.
- No financial formula, dashboard calculation, money, receivables, handover, or tenant-scope business rule is changed.
- `readonly_admin` remains read-only and must not see owner batch write controls.
- Production cutover remains `PRODUCTION_NO_GO`.
