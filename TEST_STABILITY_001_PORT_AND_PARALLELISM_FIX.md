# TEST-STABILITY-001 Port And Parallelism Fix

Generated: 2026-05-25, Asia/Dubai

| Area                   | Before                                           | After                                                                | Result                                                                        |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| Port allocation        | Dynamic `freePort()`                             | Unchanged                                                            | PASS. The test already uses independent dynamic ports.                        |
| Port propagation       | Passed to Worker and base URL                    | Unchanged                                                            | PASS. The selected port is consistently used for Worker startup and requests. |
| Full suite parallelism | `npm test` uses `--test-concurrency=1`           | Unchanged                                                            | PASS. No package-level parallelism change needed.                             |
| Readiness timeout      | `45000ms` in affected test                       | `60000ms` default via `WORKER_READY_TIMEOUT_MS                       |                                                                               | 60000` | PASS. Provides buffer for Windows/Wrangler startup variance. |
| Failure visibility     | stdout/stderr discarded in affected test         | stdout/stderr captured and included in readiness failure diagnostics | PASS. Future failures expose startup cause without printing secrets.          |
| Cleanup                | `stopProcessTree()` and `removeDirWithRetries()` | Unchanged                                                            | PASS. No global process kill introduced.                                      |

Final approach: keep dynamic ports and serial full-suite execution, increase the affected readiness window, and add diagnostics instead of skipping tests or changing business behavior.
