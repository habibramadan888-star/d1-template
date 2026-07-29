# Logout and Lock To Root Entry Result

Date: 2026-05-29, Asia/Dubai

| Handler                  | Before                                                        | After                                                                          | Old Login Still Possible |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| Owner lock/logout        | Could route through previous unified/legacy login assumptions | Calls logout, clears legacy auth state, routes `/`                             | No                       |
| Employee session failure | Could expose old PIN fallback                                 | Routes `/` after `/api/me` failure                                             | No                       |
| Portal clear session     | Cleared session within old login route                        | Calls `/auth/logout`, removes token/role/user caches, stays in root entry flow | No                       |

Password/PIN is not stored. Remembered account behavior is limited to account/user identifiers only.
