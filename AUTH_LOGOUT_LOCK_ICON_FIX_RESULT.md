# AUTH-ROUTING-STABILIZATION-001 Logout / Lock Icon Fix Result

Date: 2026-05-29, Asia/Dubai

| Handler                                       | File                                      | Previous Behavior                                            | New Behavior                                                                                                   |
| --------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Owner topbar lock button                      | `deploy-worker/public/index.html`         | Called `logout()` and could reveal old owner login overlay.  | Calls `logout()`, which clears server/client auth state and redirects to `./unified-login.html`.               |
| Owner logout function                         | `deploy-worker/public/index-51-main.js`   | Cleared cookie/token then showed local owner login fallback. | Calls `/auth/logout`, clears legacy role/session caches, closes overlays, and redirects unified login.         |
| Unified login clear session                   | `deploy-worker/public/unified-login.html` | Cleared core token only.                                     | Clears core token plus old owner/employee role/session caches; preserves remembered username only if selected. |
| Employee destination unauthenticated fallback | `deploy-worker/public/employee-v3.html`   | Could show old PIN login overlay.                            | Redirects unified login.                                                                                       |

Fixed handlers:

- `logout()`
- `.topbar-right .btn-ghost` click binding
- `showAuthExpired()`
- `showOwnerLoginFallback()`
- `clearSession()`
- `checkEmployeeSession()`
- `checkEmployeeSessionLegacyDisabled()`

Safety:

- Production D1 write: no.
- Migration: no.
- D1 export/import/execute: no.
- Password/token/cookie printed: no.
- Production cutover: `PRODUCTION_NO_GO`.
