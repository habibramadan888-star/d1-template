# Owner Arrears 20s Load Root Cause

Production cutover remains `PRODUCTION_NO_GO`.

| Step                   | API / Function                                |             Time Cost | Problem                                                                                | Required Fix                                                                                     |
| ---------------------- | --------------------------------------------- | --------------------: | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Owner bootstrap        | `loadAll()`                                   |   High on slow mobile | Previously loaded cloud arrears during app bootstrap before the page shell was useful. | Keep only cached arrears shell during bootstrap; fetch arrears only when the arrears view opens. |
| Arrears first paint    | `loadArrearsForOwner()`                       |   Blank while waiting | Loading UI could be delayed until data arrived.                                        | Render skeleton immediately when the arrears tab opens.                                          |
| Existing arrears fetch | `/api/arrears/followup/tasks`, `/api/arrears` |      Potentially high | Full list fetch could return too many rows.                                            | Add `limit=20` on first page and support load-more.                                              |
| TTLock aggregation     | `ensureOwnerLockCardsForArrearsPool()`        |      Potentially high | TTLock/card aggregation could block the first visible list.                            | Hydrate TTLock rows asynchronously after first existing-arrears render.                          |
| Frontend render        | `renderArrearsPanel()`                        | Medium on large lists | Rendering all rows at once increases DOM work.                                         | Render first `ARREARS_PAGE_SIZE` rows and append via load-more.                                  |
| Duplicate fetch        | repeated tab clicks                           |                Medium | Multiple overlapping requests could compete and cause late renders.                    | Guard with `state.arrearsLoading`.                                                               |

Conclusion:

| Class                    | Result                            |
| ------------------------ | --------------------------------- |
| SLOW_API                 | possible                          |
| FULL_DATA_LOAD           | fixed with first-page limit       |
| DUPLICATE_FETCH          | fixed with loading guard          |
| FRONTEND_RENDER_BLOCK    | reduced with first-page rendering |
| TTLOCK_AGGREGATION_BLOCK | fixed by async hydration          |
| LEGACY_OUTSTANDING_PATH  | removed from default pool         |
| UNKNOWN                  | no                                |
