# Arrears Source Of Truth Dual Path Audit

## Scope

This audit compares the backend arrears follow-up API with the owner frontend local arrears pool builder. The objective is to identify duplicated business authority and define which side must own source merging, counts, amounts, pagination, dedupe, and TTLock aggregation.

## Dual Path Findings

| Logic Area              | Backend API                                                                                                       | Frontend buildArrearsFollowupPool                                                                         | Conflict                                                                       | Required Authority                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| API entry point         | `GET /api/arrears/followup/tasks` calls `handleBossArrearsFollowupTasks`                                          | `loadExistingArrearsForOwner()` calls `/api/arrears/followup/tasks`, then may fall back to `/api/arrears` | Frontend treats backend SOT as only one source inside another merge layer      | Backend API                                                      |
| Existing arrears source | `empListMergedArrearTasksDetailed()` reads `arrear_tasks` and legacy `arrears`                                    | `buildArrearsFollowupPool()` merges `existingArrearsRecords` and `historicalArrears` locally              | Existing source is normalized and deduped twice                                | Backend API                                                      |
| TTLock source           | `empLoadTtlockExpiredUnpaidForArrears()` loads lock cards and rent config                                         | `loadTtlockArrearsForOwner()` also loads `/api/lock/cards` and maps rent locally                          | TTLock aggregation can diverge between backend and frontend                    | Backend API                                                      |
| Amount authority        | Backend maps TTLock amount from bed rent mapping and filters missing rent                                         | Frontend has `bedRentAmountForArrears()` and local fallback mapping                                       | Amount and missing-rent behavior can diverge                                   | Backend API                                                      |
| Source eligibility      | Backend exposes `source_authority:["existing_arrears_record","ttlock_expired_unpaid"]`                            | Frontend normalizes several legacy names and filters unsupported rows                                     | Same allowed list exists in two places                                         | Backend API with frontend display guard only                     |
| Dedupe                  | Backend dedupes task ids and bed/entry/remain keys before mapping                                                 | Frontend dedupes again using `arrearsPoolDedupeKey()`                                                     | Counts and dropped rows may not match                                          | Backend API                                                      |
| Summary counts          | Backend returns `total_count`, `existing_arrears_count`, `ttlock_expired_unpaid_count`, `employee_promised_count` | Frontend recomputes `summary` from local `allTasks`                                                       | Summary can disagree with server response                                      | Backend API                                                      |
| Total amount            | Backend returns `total_amount_fils`                                                                               | Frontend recomputes total from `remain`                                                                   | Rounding and filtering differences can change totals                           | Backend API                                                      |
| Preview and all tasks   | Backend returns `preview_tasks`, `tasks`, `all_tasks`, `has_more`                                                 | Frontend slices preview locally from locally merged `allTasks`                                            | View-all and preview can disagree                                              | Backend API                                                      |
| Pagination / limit      | Backend applies `bossArrearsListLimit()` and `limit`                                                              | Frontend applies `ARREARS_PAGE_SIZE` and local preview limits                                             | Two independent limits exist                                                   | Backend API                                                      |
| Partial source failure  | Backend returns `source_status` and `ttlock_missing_rent`                                                         | Frontend may call client TTLock fallback if backend TTLock is not ok                                      | Partial failure can create duplicate fallback semantics                        | Backend API, frontend renders status                             |
| Loading timeout         | Backend TTLock timeout is bounded                                                                                 | Frontend also calls `apiFetchWithTimeout()` and local TTLock timeout                                      | Timeout layering can cause abort-like UX failures                              | Backend API bounded response; frontend non-blocking loading only |
| Employee promise fields | Backend maps `promise_date`, `promise_amount`, `staff_note` and aliases `promised_*`                              | Frontend owner card reads both legacy and alias fields                                                    | UI removed amount editing but backend still accepts `promise_amount` for staff | Backend compatibility, contract cleanup needed                   |

## Required Audit Answers

| Question                                         | Answer                                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does backend return a merged arrears task pool?  | yes, `handleBossArrearsFollowupTasks()` returns merged existing arrears and TTLock unpaid rows.                                                                             |
| Does frontend still generate a merged pool?      | yes, `buildArrearsFollowupPool()` and `buildArrearsFollowupPoolResult()` still merge, dedupe, sort, summarize, and preview locally.                                         |
| Is summary duplicated?                           | yes, backend and frontend both compute total count, source counts, promised count, and total amount.                                                                        |
| Is source merge duplicated?                      | yes, existing arrears and TTLock rows are merged on both sides.                                                                                                             |
| Is dedupe duplicated?                            | yes, backend has seen-id/seen-key checks; frontend has `arrearsPoolDedupeKey()`.                                                                                            |
| Is limit/preview duplicated?                     | yes, backend returns preview/all/has_more; frontend slices preview again.                                                                                                   |
| Is TTLock aggregation duplicated?                | yes, backend calls TTLock and frontend also calls `/api/lock/cards`.                                                                                                        |
| Is existing arrears aggregation duplicated?      | yes, backend reads `arrear_tasks` and `arrears`; frontend accepts `existingArrearsRecords` and `historicalArrears`.                                                         |
| Is there a field-name mismatch?                  | yes, current backend uses `employee_promised_count` and `ttlock_missing_rent_count`, while final contract should expose `promised_unpaid_count` and `config_missing_count`. |
| Is there risk of lost rows?                      | yes, frontend filters unsupported sources and locally drops rows without rent mapping; if backend contract changes, frontend logic can hide valid rows.                     |
| Can count/list inconsistency happen?             | yes, recomputed frontend summary may not equal backend summary after fallback, dedupe, timeout, or source filtering.                                                        |
| Can view-all fail or appear unresponsive?        | yes, because preview/all state comes from frontend local pool and can be affected by duplicate fetch, abort, or fallback state.                                             |
| Can loading timeout be user-visible incorrectly? | yes, layered timeout/Abort handling can surface request cancellation instead of rendering partial backend data.                                                             |

## Conclusions

- `BACKEND_SHOULD_BE_SOT`
- `FRONTEND_DUPLICATE_LOGIC_EXISTS`
- `FRONTEND_ONLY_ADAPTER_NEEDED`
- `API_CONTRACT_MISMATCH`
- Current state is not `UNKNOWN`; the duplicate authority is visible in `deploy-worker/src/index.js` and `deploy-worker/public/index-51-main.js`.

## Required Direction

The owner frontend must stop being a second arrears business engine. It should request the backend SOT endpoint, adapt the returned fields for rendering, show source status and partial errors, and never compute rent, dedupe, source counts, or business totals locally.
