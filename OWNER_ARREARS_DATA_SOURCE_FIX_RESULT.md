# Owner Arrears Data Source Fix Result

Date: 2026-05-30, Asia/Dubai

## Result

Owner arrears loading now:

1. Reads historical tasks from `/api/arrears/followup/tasks`, with `/api/arrears` fallback.
2. Derives current due unpaid rows from `calcPeriodRenewals(getBillingPeriod())`.
3. Derives TTLock expired card rows from `rc_currentOccupiedCards()`.
4. Builds one deduplicated follow-up pool with `buildArrearsFollowupPool`.

## Backend Support

`GET /api/arrears/followup/tasks` was added as a read-only task endpoint for historical arrears. It returns normalized source metadata and does not perform migrations or business writes.

## Safety

The owner page fetches TTLock cards for arrears-pool context with `purpose=arrears_pool`; server audit-write for this read-only helper purpose is skipped.
