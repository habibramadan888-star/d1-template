# TEST-STABILITY-002 ECONNRESET Diagnosis

Generated: 2026-05-25 21:27:38 +04:00

Scope: local Worker test harness stability only. No deploy, no migration, no production D1 write, no staging D1 write, and no feature flag change was executed.

## Starting Failure

`npm run check` failed during existing employee-entry Worker tests with `TypeError: fetch failed` caused by `read ECONNRESET`.

| Failing Test File                                        | Test                                                                                             | Error                                   | Classification                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------- |
| `tests/employee-entry-production-behavior-lock.spec.mjs` | `missing APP_ENV does not enable adapter even when flag is true`                                 | `fetch failed`; cause `read ECONNRESET` | Local Worker harness instability |
| `tests/employee-entry-route-switch-rehearsal.spec.mjs`   | `production APP_ENV keeps /api/employee/entry on legacy behavior even when adapter flag is true` | `fetch failed`; cause `read ECONNRESET` | Local Worker harness instability |
| `tests/employee-entry-route-switch-rehearsal.spec.mjs`   | `local flag on skips voided rows before legacy write`                                            | `fetch failed`; cause `read ECONNRESET` | Local Worker harness instability |

## Diagnosis Questions

| Question                                                 | Answer                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which test file triggered `ECONNRESET`?                  | `tests/employee-entry-production-behavior-lock.spec.mjs` and `tests/employee-entry-route-switch-rehearsal.spec.mjs` during `npm run check`.                                                 |
| What fetch URL was involved?                             | Local dynamic-port Worker URLs such as `http://127.0.0.1:<port>/auth/login`, `/auth/employee-login`, and `/api/employee/entry`. The exact failing request was not enriched before this fix. |
| Was the Worker ready before the request?                 | The tests waited for `/api/me` readiness first, but readiness did not prove the child process stayed alive through the following request.                                                   |
| Did the Worker exit during the request?                  | The previous harness discarded or did not attach enough stdout/stderr and child exit diagnostics in the failing suites, so this could not be proven from the original error.                |
| Was stdout/stderr available?                             | Partially. `TEST-STABILITY-001` added diagnostics to one suite, but the shared fixture and route-switch suite still discarded startup logs.                                                 |
| Did multiple tests share one Worker?                     | No. Each test created its own Worker, but several suites kept Workers alive until file-level teardown, so multiple wrangler child processes accumulated within a file.                      |
| Did multiple Workers share one port?                     | No intentional sharing. Ports were dynamically allocated, but Windows still has a check-then-bind race and socket reuse pressure under many short-lived Workers.                            |
| Could cleanup be too early?                              | Not likely for the original direct failure, but cleanup was only file-level, so stale child processes could remain longer than needed.                                                      |
| Could teardown close a Worker before request completion? | Not by design. The safer fix still moves cleanup to test-level hooks after awaited requests finish.                                                                                         |
| Was fetch retry missing?                                 | Yes. Direct `fetch()` calls treated transient `ECONNRESET` as final and emitted little context.                                                                                             |
| Could body/headers crash the Worker?                     | Targeted reruns passed the same payloads after harness hardening, so there is no evidence of a business route crash.                                                                        |
| Windows port/socket risk?                                | Yes. The failure is consistent with local wrangler child process/socket instability on Windows rather than deterministic route behavior.                                                    |
| Dynamic-port helper mismatch?                            | Yes. Multiple test files had their own worker/request helper logic, with inconsistent diagnostics and cleanup.                                                                              |
| Test serial/concurrency conflict?                        | Package-level `node --test --test-concurrency=1` serializes files, but individual files still accumulated several active local Workers.                                                     |
| Test harness or business code?                           | Test harness / local Worker lifecycle. No business route, dashboard, or financial formula changes were made.                                                                                |

## Root Cause

The practical root cause was local Worker harness fragility: direct fetch calls had no limited retry or enriched diagnostics, and multiple employee-entry suites kept several wrangler dev child processes alive until file-level teardown. On Windows this made transient socket resets fail the suite even when the Worker route itself was healthy.

## Fix Summary

- Added `fetchWithRetry()` to `scripts/local-worker-utils.mjs`.
- Retries only transient connection failures: `ECONNRESET`, `ECONNREFUSED`, `UND_ERR_SOCKET`, `UND_ERR_CONNECT_TIMEOUT`, `EPIPE`, and equivalent `fetch failed` socket failures.
- Does not retry HTTP `4xx` or `5xx` business responses.
- Adds final-failure diagnostics: URL, method, attempts, elapsed time, port, command, non-secret vars, child exit state, and stdout/stderr tails.
- Updated employee-entry Worker tests and shared fixture to capture stdout/stderr.
- Updated route-switch and production-lock tests to clean each Worker after its test completes.
- Added `npm run reproduce:employee-entry-econnreset` for repeated local reproduction without staging writes.
