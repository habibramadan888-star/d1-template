# Owner Dashboard Initial Load Review

Scope: owner auth bootstrap and dashboard first visible state.

| Question                                                      | Answer                                                                                                                                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why did a second login page appear for a few seconds?         | The owner app previously had a legacy login fallback as the visible initial state. Prior session handoff fixed the control path; this pass keeps the fallback hidden and styles the loading state. |
| Is the remaining wait auth check or dashboard initialization? | Auth check is now explicit. Any remaining long wait is likely dashboard data/API initialization after owner shell entry.                                                                           |
| Which JS/API can block perceived first screen?                | `enterAs()` loads session/history/arrears/room configuration before all dashboard widgets are complete.                                                                                            |
| Minimum safe fix                                              | Show auth loading first, then show shell and progressive states without changing API payloads or calculations.                                                                                     |
| Formula impact                                                | None.                                                                                                                                                                                              |
| D1 impact                                                     | None.                                                                                                                                                                                              |

## Follow-Up Prompt

See `NEXT_PROMPT_OWNER_DASHBOARD_LOAD_PERFORMANCE.md` for a separate performance-only task that must preserve calculations and avoid writes.
