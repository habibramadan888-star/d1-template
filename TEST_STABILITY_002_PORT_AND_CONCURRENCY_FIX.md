# TEST-STABILITY-002 Port And Concurrency Fix

Generated: 2026-05-25 21:27:38 +04:00

Scope: local Worker test orchestration only. No staging data was written, no feature flags were changed, and no deploy or migration was executed.

## Final Scheme

| Area                    | Previous Behavior                                                                    | Updated Behavior                                                                                               | Result                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Port allocation         | Each suite already selected dynamic ports.                                           | Dynamic ports retained.                                                                                        | No fixed-port collision introduced.                                   |
| Worker process lifetime | Several employee-entry suites kept Workers alive until file-level teardown.          | Route-switch and production-lock suites now register test-level cleanup after awaited requests complete.       | Reduces concurrent wrangler child processes within a file.            |
| Readiness diagnostics   | Some suites discarded stdout/stderr or called `waitForWorker()` without diagnostics. | Employee-entry helpers now capture stdout/stderr and pass diagnostics to readiness/fetch helpers.              | Future failures include actionable context.                           |
| Fetch handling          | Direct `fetch()` failed immediately on transient socket reset.                       | `fetchWithRetry()` retries only connection-level transient failures and never retries business HTTP responses. | Transient Windows socket reset no longer fails without retry/context. |
| Cleanup safety          | File-level cleanup could leave stale child processes alive longer than needed.       | Test-level cleanup awaits `stopProcessTree()` and `removeDirWithRetries()`.                                    | Less process/socket pressure.                                         |
| Global process killing  | Not used.                                                                            | Still not used.                                                                                                | No global `node.exe` or `wrangler.exe` kill.                          |

## Why This Does Not Mask Business Failures

- `fetchWithRetry()` only catches thrown network-level failures.
- A returned HTTP response, including `401`, `403`, `404`, `422`, or `500`, is returned to the test unchanged.
- Existing assertions still validate status codes, response bodies, count deltas, role rejection, invalid money rejection, and legacy/adaptor behavior.
- No failed test was skipped or weakened.

## Safety Confirmation

| Item                      | Result |
| ------------------------- | ------ |
| Production deploy         | no     |
| Staging deploy            | no     |
| Migration                 | no     |
| Production D1 write       | no     |
| Staging D1 write          | no     |
| Feature flags changed     | no     |
| Dashboard changed         | no     |
| Financial formula changed | no     |
