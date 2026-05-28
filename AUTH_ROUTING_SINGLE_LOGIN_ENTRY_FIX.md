# AUTH-ROUTING-STABILIZATION-001 Single Login Entry Fix

Date: 2026-05-29, Asia/Dubai

| Rule                                                      | Implementation                                                                           | Status |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| Only login entry                                          | `unified-login.html` remains the only user-facing login page.                            | READY  |
| Employee destination unauthenticated                      | `employee-v3.html` hides the legacy PIN overlay and redirects to `./unified-login.html`. | READY  |
| Employee destination authenticated as employee/staff      | `/api/me` confirms role and enters employee business UI.                                 | READY  |
| Employee destination authenticated as owner/manager/admin | Redirects to `./index.html`.                                                             | READY  |
| Owner destination unauthenticated                         | Owner fallback login is suppressed and redirects to `./unified-login.html`.              | READY  |
| Owner destination authenticated as owner/manager/admin    | `/api/me` confirms role and enters owner shell.                                          | READY  |
| Owner destination authenticated as employee/staff         | Redirects to `./employee-v3.html`.                                                       | READY  |
| Role authority                                            | `/api/me` remains the routing authority; frontend role/localStorage is not authority.    | READY  |

No second owner login page or second employee login page was added. The old
fallback UI remains hidden as non-primary compatibility code only and is not
used for normal unauthenticated behavior.

Production status remains `PRODUCTION_NO_GO`.
