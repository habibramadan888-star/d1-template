# Arrears Loading State Lock

## Required State Machine

| State             | Trigger                                            | UI                                                   | Exit Condition                                       |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `idle`            | Owner shell loaded before arrears request starts   | Overview shell visible; arrears placeholder optional | User opens overview or arrears module starts loading |
| `loading`         | Arrears request starts                             | Skeleton within 300ms; no blank screen               | Source returns, partial returns, error, or timeout   |
| `success`         | Both sources complete or canonical API complete    | Cards, summary, visible/total count                  | Refresh or navigation                                |
| `empty`           | Canonical result has no tasks and no source errors | Empty state with clear text                          | Refresh or new data                                  |
| `partial_failure` | One source fails and one source succeeds           | Render available cards plus warning                  | Retry or next successful refresh                     |
| `error`           | All sources fail or API contract invalid           | Error card with retry, no permanent blank            | Retry succeeds or timeout                            |
| `timeout`         | Loading exceeds 10 seconds                         | Timeout message plus retry                           | Retry or navigation away                             |

## Current Implementation Risk

| Risk                      | Evidence                                                                                   | Impact                                                | Required Fix                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Duplicate async paths     | `loadArrearsForOwner()` calls existing + TTLock sources; backend API also aggregates both. | Requests can race or overwrite state.                 | Prefer canonical backend API; keep source isolation metadata.            |
| Long TTLock timeout       | TTLock path uses up to 9000ms in frontend path.                                            | Mobile user can see slow arrears state.               | Keep skeleton and partial source behavior; do not block overview.        |
| Hidden stale route        | `switchView('arrears')` still exists while arrears is not a top nav item.                  | Future code can reintroduce standalone page behavior. | Decide and lock route behavior.                                          |
| Catch-all error rendering | Previous regressions showed AbortError as user-facing error.                               | Normal navigation can look like failure.              | AbortError should be ignored or treated as stale request, not red error. |
| Permanent loading risk    | Any unhandled promise or missing field can leave status unresolved.                        | User sees 20s+ loading or blank.                      | Require every branch to exit state machine.                              |

## Acceptance Criteria

| Check                       | Required                                       |
| --------------------------- | ---------------------------------------------- |
| Shell visible               | <=300ms                                        |
| Skeleton visible            | <=300ms                                        |
| Overview blocked by arrears | no                                             |
| Loading max duration        | <=10 seconds before timeout UI                 |
| Partial source failure      | shows available source data                    |
| Retry                       | visible and functional                         |
| AbortError                  | not shown as final user error                  |
| Duplicate fetch             | old request ignored, latest request owns state |

## Required Tests

1. Skeleton appears before data.
2. No permanent loading string after timeout threshold.
3. Partial failure renders one source.
4. AbortError does not render `signal is aborted without reason`.
5. View all remains clickable after load.
6. Missing field in one row does not fail whole module.

## P0 SOT Update

Owner arrears loading must use the backend SOT endpoint as the single data request for official arrears cards.

Locked loading behavior:

- Show shell/skeleton before data returns.
- Do not block first paint on frontend TTLock aggregation.
- Do not issue a second frontend TTLock request for arrears pool construction.
- Read partial-source status from backend `sources`.
- Show available data when backend returns one successful source and one failed source.
- Show retry only for real API failure, not for a replaced stale request.
- Keep `qa:employee-entry-staging` as `MANUAL_REQUIRED / DRY_RUN_ONLY`.
