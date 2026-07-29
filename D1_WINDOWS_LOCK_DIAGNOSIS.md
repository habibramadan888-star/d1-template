# D1 Windows Lock Diagnosis

Generated: 2026-05-24, Asia/Dubai

Scope: P0-005A, local verification tooling only. No business logic, financial logic, production configuration, production migration, or remote D1 operation was changed.

## Finding Summary

The clean D1 bootstrap business verification passed before the failure. The failure happened after all smoke/auth/entry/database checks, during cleanup of the isolated Wrangler local D1 persistence directory. On Windows, Wrangler/Miniflare can keep a SQLite file handle open briefly after `taskkill` returns. The previous script called `killTree(worker)` and immediately executed recursive `rm`, without waiting for the Worker child process `close` event.

## Required Questions

| Question                                                            | Answer                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does `verify:clean-d1` start a Worker?                              | Yes. `scripts/verify-clean-d1.mjs` starts Wrangler dev through `startWorker({ port, persistTo })`.                                                                                                                   |
| Does the Worker fully exit before cleaning D1 files?                | Previously not guaranteed. The script killed the process tree but did not await `close`.                                                                                                                             |
| Is there a child process without awaited close?                     | Yes. `verify-clean-d1`, `smoke-with-worker`, and `test-delete-session-void` used synchronous kill behavior without awaiting process close.                                                                           |
| Is Wrangler/Miniflare still holding SQLite files?                   | The observed `EBUSY` on `v3/d1` after business PASS is consistent with a short-lived local SQLite handle.                                                                                                            |
| Is Windows deleting a busy D1 file directly?                        | Previously yes. The script called recursive `rm` immediately after kill.                                                                                                                                             |
| Do multiple tests reuse the same `.wrangler/state/v3/d1` directory? | `verify:clean-d1` uses a unique temp `--persist-to`; normal dev uses `.wrangler/local-dev`; local bootstrap uses `.wrangler/p0-005-clean-d1`. The failing path was an isolated temp directory, not production state. |
| Can each verification use an isolated temp directory?               | Yes, and `verify:clean-d1` already does this via `mkdtemp(...)` and `--persist-to`.                                                                                                                                  |
| Can we avoid deleting active SQLite files?                          | Yes. The fix awaits Worker shutdown before cleanup and retries locked directory deletion.                                                                                                                            |
| Did the failure happen before or after business verification?       | After business verification. All core checks printed `PASS`; cleanup threw `EBUSY`.                                                                                                                                  |
| Does this affect real business results?                             | No direct business data impact. It affected repeatability of local validation, which is still a P0 release gate.                                                                                                     |

## Root Cause

`scripts/verify-clean-d1.mjs` used:

```text
killTree(worker);
await rm(persistTo, { recursive: true, force: true });
```

This did not guarantee the child Worker process had emitted `close`, and Windows may still have held local D1 SQLite files under `<persist-to>/v3/d1`.

## Fix Strategy

- Add `stopProcessTree(...)` to terminate only the child process started by the script and await `close`.
- Add `removeDirWithRetries(...)` to retry `EBUSY` / `EPERM` / `ENOTEMPTY` cleanup up to 10 times.
- If deletion still cannot complete, move the directory to `.tmp/pending-cleanup` when possible or warn without polluting the next isolated run.
- Enhance `verify-clean-d1` output to distinguish business verification from cleanup.
