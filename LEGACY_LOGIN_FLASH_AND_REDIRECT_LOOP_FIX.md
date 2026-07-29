# AUTH-ROUTING-STABILIZATION-001 Legacy Login Flash and Redirect Loop Fix

Date: 2026-05-29, Asia/Dubai

| Flow                                 | Previous Risk                                            | Fix                                                             |
| ------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------- |
| Owner destination unauthenticated    | Could show old owner password panel after session check. | Suppress fallback and redirect to unified login.                |
| Owner lock/logout                    | Could return to old owner login panel.                   | Clear server/client session and redirect unified login.         |
| Employee destination unauthenticated | Could show old employee PIN overlay.                     | Hide overlay by default and redirect unified login.             |
| Employee destination with owner role | Could show wrong page before redirect.                   | `/api/me` check redirects owner/manager/admin to `index.html`.  |
| Owner destination with employee role | Could enter wrong shell.                                 | `/api/me` check redirects employee/staff to `employee-v3.html`. |
| Auth check pending                   | Old login UI could be visible before `/api/me`.          | Business pages keep loading/session-check state first.          |

Disallowed flows after this fix:

- Owner page to old owner login to new employee login to employee system.
- Employee page to old PIN login to unified login loop.
- Lock icon to old login.
- Old login panel flash before `/api/me` completes.

Production status remains `PRODUCTION_NO_GO`.
