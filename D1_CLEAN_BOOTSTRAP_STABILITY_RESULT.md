# D1 Clean Bootstrap Stability Result

Generated: 2026-05-24, Asia/Dubai

Scope: P0-005A Windows local D1 cleanup stability. No production D1 migration, remote D1 command, production deploy, business logic change, financial logic change, or schema change was performed.

## Consecutive Verification Runs

| Run | Command                   | Result | Business Verification | Cleanup Result          | Notes                                                                                  |
| --- | ------------------------- | ------ | --------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| 1   | `npm run verify:clean-d1` | Pass   | Pass                  | Pass, 1 cleanup attempt | Worker startup, smoke, auth, owner core reads, employee entry, and DB evidence passed. |
| 2   | `npm run verify:clean-d1` | Pass   | Pass                  | Pass, 1 cleanup attempt | No `EBUSY`; isolated temp D1 directory removed.                                        |
| 3   | `npm run verify:clean-d1` | Pass   | Pass                  | Pass, 1 cleanup attempt | No `EBUSY`; isolated temp D1 directory removed.                                        |

## Stability Answers

| Question                                                           | Answer                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can `verify:clean-d1` run 3 consecutive times?                     | Yes. Three consecutive runs exited `0`.                                                                                                                       |
| Did `EBUSY` still appear?                                          | No.                                                                                                                                                           |
| If `EBUSY` appears later, can it affect the next run?              | The script now uses an isolated temp `--persist-to` for each run and quarantines locked cleanup targets, so a cleanup warning should not affect the next run. |
| Does it still pollute `.wrangler/state/v3/d1`?                     | No evidence. `verify:clean-d1` uses isolated temp persistence, not the shared default `.wrangler/state`.                                                      |
| Can clean D1 still initialize from empty?                          | Yes. The local migration and dev seed ran successfully in each clean run.                                                                                     |
| Is the historical `transactions` missing-table issue still solved? | Yes. Employee entry smoke passed and row-count evidence showed `transactions_count 1`.                                                                        |
| Does employee entry minimum verification pass?                     | Yes. `smoke:employee-entry` passed in all three runs.                                                                                                         |
| Do owner core reads pass?                                          | Yes. `smoke:core` passed and covered owner `/api/history` and `/api/arrears`.                                                                                 |
| Does delete-session void still pass?                               | Yes, verified separately by `npm run test:delete-session`.                                                                                                    |

## Current P0-005 Status

Verified. Clean local D1 bootstrap is now repeatable on Windows with stable cleanup.
