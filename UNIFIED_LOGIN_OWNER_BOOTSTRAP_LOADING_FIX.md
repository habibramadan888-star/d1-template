# Unified Login Owner Bootstrap Loading Fix

Date: 2026-05-28, Asia/Dubai

## Change Summary

| Area                      | Change                                                                                                  | Production Write |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------- |
| Owner HTML initial state  | Added `ownerAuthLoading` and hid `ownerLoginPanel` by default.                                          | No               |
| Owner `/api/me` bootstrap | `resumeUnifiedOwnerSession()` now shows loading first and reveals legacy login only after 401/403.      | No               |
| Owner role routing        | Owner/manager/admin claims enter the owner shell; employee/staff claims redirect to `employee-v3.html`. | No               |
| Slow data loading         | `enterAs()` now displays the owner app shell first, then runs `loadAll()` and rerenders.                | No               |
| Fallback login            | Legacy owner password panel remains available for unauthenticated or expired sessions.                  | No               |

## Expected UX

| Scenario                       | Expected Result                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Valid owner session            | Show auth loading briefly, then enter owner dashboard shell without showing the old login box. |
| Expired/no session             | Show auth loading first, then show the legacy owner login fallback.                            |
| Employee session on owner page | Do not enter owner dashboard; redirect to employee destination.                                |
| `/api/me` failure              | Show retry/login fallback and do not enter dashboard.                                          |

Dashboard calculation and financial formula code were not changed.
