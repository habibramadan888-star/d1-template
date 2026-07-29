# Unified Login Employee Session Handoff Fix

Date: 2026-05-28

## Fixed Behavior

`deploy-worker/public/employee-v3.html` now attempts to resume a unified-login session during employee page startup:

1. Calls `/api/me` with `credentials: include`.
2. If `/api/me` returns `staff` or `employee`, enters the employee page without requiring a second PIN.
3. If `/api/me` returns `manager`, `owner`, or `admin`, redirects to `index.html`.
4. If `/api/me` returns 401/403 or no valid claim, keeps the employee PIN login as fallback.
5. If the claim has an unsupported role, leaves the employee login visible with an error message.

## Authority

| Item                                                    | Result    |
| ------------------------------------------------------- | --------- |
| Authority source                                        | `/api/me` |
| Frontend role trusted                                   | No        |
| localStorage employee cache trusted                     | No        |
| Employee PIN fallback preserved                         | Yes       |
| Owner/admin access to employee entry allowed by default | No        |

## Production Safety

| Check                         | Result             |
| ----------------------------- | ------------------ |
| Production D1 write           | No                 |
| Production migration          | No                 |
| D1 export/import/execute      | No                 |
| Employee entry write          | No                 |
| Handover submit               | No                 |
| Void/delete                   | No                 |
| Dashboard calculation changed | No                 |
| Financial formula changed     | No                 |
| Production cutover            | `PRODUCTION_NO_GO` |

## Deploy Note

This fix changes Worker-served static HTML. Live behavior will not change until the updated assets are deployed under a separate explicit deploy approval.
