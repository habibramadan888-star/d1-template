# Internal QA 005G Unified Login Owner UX Live Smoke Result

Date: 2026-05-28, Asia/Dubai

Status: Completed with read-only/session-write boundary.

| Check                            | Result             | Notes                                                                                  |
| -------------------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| Unified login opens              | PASS               | GET `/unified-login.html` returned HTTP 200 `text/html`.                               |
| Existing-session panel available | PASS               | Live asset contains `signedInPanel` and `shouldAutoRedirectExistingSession`.           |
| Owner loading state asset        | PASS               | Live `index.html` contains `ownerAuthLoading` and hidden `ownerLoginPanel`.            |
| Owner JS bootstrap asset         | PASS               | Live `index-51-main.js` contains `showOwnerAuthChecking` and `showOwnerAppShell`.      |
| Employee flow asset intact       | PASS               | GET `/employee-v3.html` returned HTTP 200 and still contains `/api/me` handoff code.   |
| `/api/me` unauthenticated        | PASS               | Returned HTTP 401 with `{"error":"unauthenticated"}`.                                  |
| Wrong owner login                | PASS               | Returned HTTP 401 `invalid_credentials` when sent with same-origin headers.            |
| Successful owner login           | NOT_EXECUTED       | Successful login can write production D1 `active_sessions`; not approved in this task. |
| Successful employee login        | NOT_EXECUTED       | Successful login can write production D1 `active_sessions`; not approved in this task. |
| Production D1 write              | No                 | No successful login or business write executed in this smoke.                          |
| Production cutover               | `PRODUCTION_NO_GO` | No launch approval.                                                                    |
