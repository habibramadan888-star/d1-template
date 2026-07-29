# Unified Login And Owner Loading UX Result

Scope: unified login, owner auth bootstrap, owner loading state, browser-back behavior.

| UX Item                       | Result                                    | Notes                                                                                      |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Second login flash            | Fixed / preserved from prior auth handoff | Owner fallback login remains hidden until `/api/me` returns 401/403.                       |
| Owner loading state           | Improved visually                         | `ownerAuthLoading` now matches the employee glass card design.                             |
| `/api/me` as authority        | Preserved                                 | Tests continue to assert `/api/me` is routing authority.                                   |
| Employee session in owner app | Protected                                 | Employee role redirects to employee page rather than entering owner dashboard.             |
| Browser back to unified-login | Fixed / preserved                         | Existing session shows signed-in panel; it does not auto-loop unless `auto=1`.             |
| Continue button               | Preserved                                 | Routes by `/api/me` role to owner or employee destination.                                 |
| Clear session                 | Preserved                                 | Clears browser storage and calls logout endpoint, then shows login form.                   |
| 10-second load feedback       | Improved                                  | Old login does not flash; shell/loading feedback is visible while session/data initialize. |
| Performance follow-up needed  | Yes                                       | Deep API load profiling is separate from this UI unification pass.                         |

## Follow-Up

Generated follow-up prompt: `NEXT_PROMPT_OWNER_DASHBOARD_LOAD_PERFORMANCE.md`.
