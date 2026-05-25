# TEST-STABILITY-001 Worker Readiness Diagnosis

Generated: 2026-05-25, Asia/Dubai

Scope: local Worker test harness stability only. No staging flags were enabled, no deploy was executed, no migration was executed, and no staging business data was written.

| Question                                                | Answer                                                                                                                                                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How did the failing test choose port `2621`?            | The test uses `freePort()` with `node:net.createServer()` and then passes that dynamic port to `startWorker()`. `2621` was a dynamically selected free port from the previous failed run, not a hard-coded port. |
| Is the port dynamic?                                    | Yes. `tests/employee-entry-adapter-staging-endpoint.spec.mjs` calls `freePort()` unless an explicit port is provided.                                                                                            |
| Could the port be occupied?                             | Low probability after `freePort()`, but still possible due to the usual check-then-bind race on Windows.                                                                                                         |
| Did the Worker really fail or was the probe too early?  | The original failure is best classified as an intermittent readiness timing issue. The failing run timed out at roughly the 45s boundary; an immediate full `npm run check` rerun passed.                        |
| Which path does readiness probe request?                | `GET /api/me`, expecting `200`, `401`, or `403` as readiness.                                                                                                                                                    |
| Does the path exist?                                    | Yes. Unauthenticated `/api/me` returns `401` when the Worker is ready.                                                                                                                                           |
| Were startup logs captured before this fix?             | No. The test attached empty stdout/stderr handlers, so a failure only showed `fetch failed`.                                                                                                                     |
| Were child process stdout/stderr diagnostics available? | Not before this fix.                                                                                                                                                                                             |
| What was the timeout?                                   | The affected test used `45000ms`. The failed run exceeded that and reported after about `47035ms`.                                                                                                               |
| Windows cleanup risk?                                   | Present but already mitigated by `stopProcessTree()` and `removeDirWithRetries()`. This task does not kill global `node.exe` or `wrangler.exe`.                                                                  |
| Were multiple tests concurrently starting Workers?      | The project runs `npm test` with `--test-concurrency=1`; within this file, node:test subtests are effectively sequential because each awaits Worker startup and teardown is centralized.                         |
| Need independent dynamic port?                          | Already present.                                                                                                                                                                                                 |
| Need serial execution?                                  | Already present through package-level `--test-concurrency=1` for full checks and isolated process execution for the targeted script.                                                                             |
| Conflict with recent npm test serial modification?      | No direct conflict found. The flake is consistent with startup timing/log visibility rather than test parallelism.                                                                                               |
| Test orchestration or business logic?                   | Test orchestration. No Worker route/business logic was changed.                                                                                                                                                  |

## Root Cause Summary

The previous baseline failure was an intermittent local Worker readiness timeout at the existing `45000ms` boundary, compounded by insufficient startup diagnostics in the affected test. The Worker became ready quickly in repeated reruns, so there is no evidence of a deterministic route or business logic failure.

## Fix Summary

- Increased the affected test readiness wait to `60000ms`.
- Added failure diagnostics to `waitForWorker()`: attempts, elapsed time, port, command, non-secret vars, child PID/exit/signal, and stdout/stderr tails.
- Updated the affected test to capture stdout/stderr rather than discarding them.
