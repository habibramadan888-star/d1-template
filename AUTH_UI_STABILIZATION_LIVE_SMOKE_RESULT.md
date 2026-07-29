# AUTH-UI-STABILIZATION-002 Live Read-Only Smoke Result

Date: 2026-05-29, Asia/Dubai

Scope: read-only live smoke after deploying auth routing and internal QA UI blocker fixes.

| Check                                          | Result                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `/unified-login.html` opens                    | yes, HTTP 200 `text/html`                                           |
| `/employee.html` no longer shows old PIN login | yes, HTTP 200 redirect stub content points to `/unified-login.html` |
| `/employee` no longer shows old PIN login      | yes, HTTP 200 redirect stub content points to `/unified-login.html` |
| `/login` redirects to unified login            | yes, HTTP 302 to `/unified-login.html`                              |
| `/staff-login` redirects to unified login      | yes, HTTP 302 to `/unified-login.html`                              |
| `/employee-v3.html` opens                      | yes, HTTP 200                                                       |
| Employee identity fix present live             | yes, `employee-identity-label` / `employeeDisplayName` present      |
| Employee top nav fix present live              | yes, `tab-cn` structure present                                     |
| `/index.html` opens                            | yes, HTTP 200                                                       |
| Owner arrears modal card fix present live      | yes, `modal-list` / `arrears-detail-card` present                   |
| Owner control panel script opens               | yes, `index-51-cp.js` HTTP 200                                      |
| Owner history timeout fix present live         | yes, `HISTORY_FETCH_TIMEOUT_MS = 4500` present                      |
| `/api/me` unauthenticated                      | yes, HTTP 401                                                       |
| Wrong login attempt                            | yes, HTTP 401 `invalid_credentials`                                 |
| D1 write occurred                              | no                                                                  |
| Migration occurred                             | no                                                                  |
| Business write test occurred                   | no                                                                  |

Notes:

- No real username/password was used in smoke verification.
- Lock-icon behavior and real employee display name still need a user phone recheck after login because this smoke did not use production credentials.
- No employee entry, handover, void/delete, settings change, or business write QA was executed.
