# Unified Login Owner Session Handoff Fix

Date: 2026-05-28

## Fixed Behavior

`deploy-worker/public/index-51-main.js` now attempts to resume a unified-login session during owner SPA startup:

1. Calls `/api/me` with `credentials: include`.
2. If `/api/me` returns `manager`, `owner`, or `admin`, enters the owner SPA without showing a second login.
3. If `/api/me` returns `staff` or `employee`, redirects to `employee-v3.html`.
4. If `/api/me` returns 401/403 or no valid claim, keeps the legacy owner login overlay as fallback.
5. If the claim has an unsupported role, denies automatic entry and leaves fallback login visible.

## Authority

| Item                                         | Result    |
| -------------------------------------------- | --------- |
| Authority source                             | `/api/me` |
| Frontend role trusted                        | No        |
| localStorage role trusted                    | No        |
| tenant_id/property_id accepted from frontend | No        |
| Legacy owner login fallback preserved        | Yes       |

## Production Safety

| Check                         | Result             |
| ----------------------------- | ------------------ |
| Production D1 write           | No                 |
| Production migration          | No                 |
| D1 export/import/execute      | No                 |
| Dashboard calculation changed | No                 |
| Financial formula changed     | No                 |
| Business write test           | No                 |
| Production cutover            | `PRODUCTION_NO_GO` |

## Deploy Note

This fix changes Worker-served static JavaScript. Live behavior will not change until the updated assets are deployed under a separate explicit deploy approval.
