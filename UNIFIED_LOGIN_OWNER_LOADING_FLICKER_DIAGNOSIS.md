# Unified Login Owner Loading Flicker Diagnosis

Date: 2026-05-28, Asia/Dubai

Scope: owner unified-login UX only. No production D1 write, migration,
D1 export/import/execute, employee entry write, handover submit, void/delete,
settings change, dashboard calculation change, financial formula change, or
commercial cutover is approved by this diagnosis.

## Findings

| Question                                                       | Answer                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Why did the owner see the second login page for a few seconds? | `index.html` and `index-51.html` rendered the legacy owner login panel immediately, before `index-51-main.js` completed `/api/me`.   |
| Is the root cause cookie/session missing?                      | No. Session handoff works; the issue was initial UI state plus slow owner bootstrap.                                                 |
| Is `/api/me` the authority?                                    | Yes. The owner SPA calls `/api/me`; frontend role/local storage is not authority.                                                    |
| Is dashboard initialization slow?                              | Yes. `enterAs()` waited for `loadAll()` before showing the owner app, and `loadAll()` may fetch customers, arrears, and room config. |
| Which API/data loads block first paint?                        | `loadAll()` can wait on `/api/customers`, `/api/arrears`, and `rc_loadRoomCfgFromCloud()` for manager role.                          |
| Does employee have the same visible issue?                     | No obvious report; employee session handoff remains covered by existing tests and fallback behavior.                                 |

## Minimal Safe Fix

1. Make the owner login overlay start in an auth-loading state.
2. Hide the legacy password panel until `/api/me` returns unauthenticated or
   expired.
3. If `/api/me` confirms owner/manager/admin, show the owner app shell before
   slow dashboard data loads finish.
4. Keep dashboard formulas and API results unchanged.
5. Keep production cutover as `PRODUCTION_NO_GO`.
