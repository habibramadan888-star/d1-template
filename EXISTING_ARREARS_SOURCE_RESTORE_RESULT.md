# EXISTING ARREARS SOURCE RESTORE RESULT

Status: restored in read-only merge contract.

| Check                                                                          | Result |
| ------------------------------------------------------------------------------ | ------ |
| Existing arrears source still loaded from backend                              | yes    |
| Existing rows are split separately from TTLock rows                            | yes    |
| TTLock source failure can no longer hide existing rows                         | yes    |
| Existing source count is exposed in backend summary                            | yes    |
| Existing source rows are exposed under `sources.existing_arrears_record.tasks` | yes    |

Implementation points:

- `empTaskToBossArrear` defaults non-TTLock arrears rows to `existing_arrears_record`.
- `handleBossArrearsFollowupTasks` returns `sources.existing_arrears_record`.
- `loadArrearsForOwner` passes `existingArrearsRecords: existingRows` into the pool builder even when TTLock is unavailable.

If production still shows `系统欠款 0`, that is now a data-source result rather than a UI merge loss; the source status and source count are exposed for verification.
