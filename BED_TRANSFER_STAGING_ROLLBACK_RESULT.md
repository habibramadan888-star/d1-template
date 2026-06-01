# Bed Transfer Staging Rollback Result

Date: 2026-06-01
Status: `NOT_REQUIRED_NO_FIXTURE_CREATED`

No staging fixture was created and no staging Bed Transfer save was executed, so rollback had no rows to restore.

| Rollback Check | Expected | Actual | Result |
|---|---|---|---|
| QA transfer event removed/restored | no residual event | no event created | PASS |
| from_bed occupant state restored | pre-state | no change made | PASS |
| to_bed occupant state restored | pre-state | no change made | PASS |
| deposit relation restored | pre-state | no change made | PASS |
| arrears state restored | pre-state | no change made | PASS |
| TTLock trace state restored | pre-state | no change made | PASS |
| QA fixture row count | 0 | 0 created | PASS |
| staging consistency | unchanged | unchanged | PASS |

Production write: no
Production migration: no
Production cutover: `PRODUCTION_NO_GO`
