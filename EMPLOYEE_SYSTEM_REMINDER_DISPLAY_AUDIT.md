# Employee System Reminder Display Audit

Date: 2026-07-05

Scope: read-only audit only. No code change, no deploy, no production write, no
migration.

## Current Observation

User-visible System page:

- overdue / 欠款中: 26
- due today / 今天到期: 0
- due soon / 3天内到期: 14
- total: 40
- amount: 28,500 AED
- list count: Shown 40 / Total 40

Reported mismatch: list rows do not visually show 26 overdue badges.

## Path Trace

| Layer | Path / Function | SOT / Field | Notes |
|---|---|---|---|
| Employee System API | `deploy-worker/src/index.js` `handleEmployeeSystemReminders()` | `resolveCurrentReceivablesSot()` | Returns `tasks`, `summary`, and `source_breakdown`. |
| Shared SOT resolver | `deploy-worker/src/index.js` `resolveCurrentReceivablesSot()` | `resolveConsoleReceivablesSot()` | Employee System and owner console share this read model. |
| Summary bucket source | `deploy-worker/src/index.js` `consoleSotRowsFromLockCards()` | `byStatus.overdue/today/soon` | Summary counts use backend `console_status` bucket. |
| Row source list | `deploy-worker/src/index.js` `resolveConsoleReceivablesSot()` | `all_rows` | List and summary are returned from the same API payload. |
| Frontend loader | `deploy-worker/public/employee-v3.html` `loadEmployeeSystemReminders()` | `data.tasks` and `data.source_breakdown` | Loads `/api/employee/system/reminders?limit=...`. |
| Row normalize | `deploy-worker/public/employee-v3.html` `normalizeEmployeeSystemReminder()` | `overdue_days`, `due_date`, `source_type` | Does not preserve `console_status`. |
| Row badge render | `deploy-worker/public/employee-v3.html` `followupCard()` | `item.overdue_days > 0` | Badge says `Overdue XD` only when days is greater than 0. No `Due Soon` badge. |
| List count | `deploy-worker/public/employee-v3.html` `ensureSystemReminderListCount()` | `items.length` vs API total | Explains Shown 40 / Total 40. |

## What Summary Uses

`handleEmployeeSystemReminders()` copies summary directly from
`sot.source_breakdown`:

- `overdue_count`
- `due_today_count`
- `due_soon_count`
- `action_count`
- `amount_fils`

Those fields are built in `resolveConsoleReceivablesSot()` from
`byStatus.overdue`, `byStatus.today`, and `byStatus.soon`.

## What Row Badge Uses

The row badge does not use the same bucket field. It only checks:

```text
item.overdue_days > 0
```

Then renders:

```text
Overdue {days}D / 逾期 {days} 天
```

Otherwise it renders:

```text
Not overdue / 未逾期
```

This means:

- A backend row in `console_status = overdue` with `overdue_days = 0` will be
  counted in summary overdue, but the row badge will display `Not overdue`.
- A backend row in `console_status = soon` has `overdue_days = 0`, so the row
  badge also displays `Not overdue` instead of `Due Soon`.

## Why This Can Produce 26 vs 16 Visual Mismatch

Backend status calculation uses `consoleSotStatus()`:

1. If `now > card.endDate`, row bucket is `overdue`.
2. It then computes `days` by date-key difference.
3. If a card expired earlier on the same Dubai date, bucket is `overdue` but
   `days = 0`.

Frontend badge uses `overdue_days > 0`, so same-day expired rows are visually
shown as `Not overdue`.

This is a display-label mismatch, not evidence that summary and list use
different SOT.

## Mismatch Table

Authenticated live API payload could not be fetched without creating a new
production login session. Creating a session would violate this task's
read-only/no-write constraint. Chrome existing-session access was attempted but
the Chrome extension bridge was unavailable, and unauthenticated
`/api/lock/cards?purpose=arrears_pool` returned 401.

The exact 10 live rows therefore cannot be named under the current constraints.
The code-level mismatch condition is below:

| bed | amount | valid_until/due_date | summary_bucket | row_badge | status | mismatch_reason |
|---|---:|---|---|---|---|---|
| API-auth required | n/a | same-day expired card | overdue | Not overdue | `console_status=overdue`, `overdue_days=0` | Row badge uses `overdue_days > 0` instead of backend `console_status`. |
| API-auth required | n/a | due within 3 days | due_soon | Not overdue | `console_status=soon`, `overdue_days=0` | Row badge has no Due Soon label path. |

## D1 Read-Only Check

Production D1 read-only checks were performed with SELECT/PRAGMA only.

Findings:

- `arrear_tasks` contains materialized `ttlock_expired_unpaid` rows, but the
  current user-observed 40 / 28,500 screen does not match the stale materialized
  cache count of 41 / 29,350.
- Therefore the current System page is consistent with live owner-console SOT,
  not the older materialized cache rows.

## Root Cause Classification

`ROW_BADGE_USES_DIFFERENT_FIELD`

Secondary UI symptom:

`LABEL_TEXT_BUG_ONLY`

## Recommended Smallest Fix

Do not change SOT or calculation.

Smallest UI/API display fix:

1. Preserve `console_status` in `normalizeEmployeeSystemReminder()`.
2. Render row badge from `console_status` first:
   - `overdue`: show `Overdue 0D` or `Expired today` when days is 0.
   - `soon`: show `Due Soon / 3天内到期`.
   - `today`: show `Due Today / 今天到期`.
3. Keep `overdue_days` as supporting display detail, not the only status source.
4. Optionally include `row_badge_status` from backend so summary and row labels
   are driven by one field.

## Safety Result

- production write: no
- migration: no
- deploy: no
- production cutover: PRODUCTION_NO_GO

