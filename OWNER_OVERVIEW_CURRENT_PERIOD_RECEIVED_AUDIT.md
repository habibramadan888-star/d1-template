# Owner Overview Current Period Received Audit

Task: read-only audit for the Owner Overview `Current Period Received / 当前账期实收` value.

Result: **FAIL - current Overview calculation uses the old transaction/event aggregator instead of owner-visible session SOT.**

Production write: **no**  
Migration: **no**  
Deploy: **no**  
Production cutover: **PRODUCTION_NO_GO**

## Summary

The expected current billing period is:

`2026-07-03 -> 2026-08-02`

Owner-visible, non-void sessions in that period:

| date | session_id | anchor | source | cash | bank | gross | included_reason |
|---|---|---|---|---:|---:|---:|---|
| 2026-07-05 | S20260705-4q7zk | EMPV3-20260705-abdul-4q7zk | employee_entry | 3,710 | 1,460 | 5,370 | active owner-visible session |
| 2026-07-06 | S20260706-vfx2y | EMPV3-20260706-abdul-vfx2y | employee_entry | 700 | 0 | 700 | active owner-visible session |

Expected current period gross from `sessions`:

| metric | value |
|---|---:|
| active owner-visible sessions | 2 |
| expected gross | 6,070 |
| expected cash | 4,410 |
| expected bank | 1,460 |

The displayed value `1,397,390.00` is not supported by owner-visible sessions. It matches the old aggregator pattern:

| source | amount |
|---|---:|
| `transactions` cash+bank rows dated 2026-07-03..2026-08-02 | 1,391,130 |
| stale / voided `entry_events` traces that can be additionally counted by the old event path | 6,260 |
| observed wrong total | 1,397,390 |

Current deployed code path has a dedupe guard for `entry_events`, but the data evidence explains the exact user-visible amount as the old Overview transaction/event aggregator result. The durable fix should not try to patch the number in UI; it should change Overview current-period revenue to read owner-visible `sessions` summary as SOT.

## API And Function Path

| Item | Path |
|---|---|
| Overview API | `GET /api/owner/overview/comparative-summary` |
| Route handler | `handlePhase0ReadOnlyApi()` and owner route branch |
| Calculation function | `phase0OwnerOverviewComparativeSummary(env, user, url)` |
| Billing period function | `ownerOverviewBillingPeriodRange(today, offsetPeriods=0)` |
| Current revenue fetch | `ownerOverviewFetchTransactions(env, user, currentBillingPeriod)` |
| Transaction table query | `transactions` |
| Event table query | `entry_events` |
| Summary calculation | `ownerOverviewSummarizeTransactions(rows)` |
| Frontend card reader | `ownerOverviewCurrentPeriodReceived()` |

## Query Conditions Used By Current Code

### `transactions`

```sql
WHERE corpid=?
  AND COALESCE(voided_at,'')=''
  AND COALESCE(status,'ACTIVE')<>'VOID'
  AND substr(COALESCE(ts,created_at,period_start,due_date,''),1,10)
      BETWEEN ? AND ?
```

Issue: this filters the transaction row timestamp/import timestamp, not the owner-visible `sessions.date`. Many historical sessions have transaction rows with `ts/created_at = 2026-07-03` even though their session date is in June or July 1/2.

### `entry_events`

```sql
WHERE corpid=?
  AND substr(COALESCE(ts,''),1,10) BETWEEN ? AND ?
  AND ref_type IN ('transaction','bed_transfer_event','handover_commit')
```

Issue: this can include event traces for sessions that are voided at the session layer. The event path does not join `sessions` to apply `voided_at` or `handover_status <> 'VOID'`.

### `sessions`

The current Overview current-period received calculation does **not** use `sessions` as the revenue SOT, even though owner history visibility does.

Correct owner-visible session filter should be:

```sql
WHERE corpid='homelink'
  AND COALESCE(voided_at,'')=''
  AND COALESCE(handover_status,'')<>'VOID'
  AND substr(COALESCE(date,created_at,''),1,10)
      BETWEEN '2026-07-03' AND '2026-08-02'
```

## Current Period Rows Incorrectly Included

The following rows are grouped by transaction `session_id`. They are included because their transaction row date is `2026-07-03`, but their actual owner-visible `sessions.date` is outside the current billing period.

| transaction_date | session_id | session_date | anchor | source | amount | why_wrong |
|---|---|---|---|---|---:|---|
| 2026-07-03 | mr4yu035csir8 | 2026-07-01 | LGC-2026-07-01-SRNJVC | BOSS | 229,075 | transaction timestamp falls in period; session date is outside 2026-07-03 -> 2026-08-02 |
| 2026-07-03 | mr4yoww3z2ks4 | 2026-06-30 | LGC-2026-06-30-RVCRTQ | BOSS | 162,910 | transaction timestamp falls in period; session date is outside period |
| 2026-07-03 | mr4yqt2w9ghyq | 2026-07-02 | LGC-2026-07-02-H8FJXN | BOSS | 107,470 | 2026-07-02 belongs to previous billing period |
| 2026-07-03 | mr4y8bsdzgkmy | 2026-06-06 | LGC-2026-06-06-K28O41 | BOSS | 94,500 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4yblfuhii62 | 2026-06-14 | LGC-2026-06-14-6EHTXG | BOSS | 89,980 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4ta05v3t5fm | 2026-06-02 | LGC-2026-06-02-TUGRBS | BOSS | 83,740 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4ycdzc28zla | 2026-06-17 | LGC-2026-06-17-NMPB6W | BOSS | 83,050 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4y6abz8n6hq | 2026-06-03 | LGC-2026-06-03-UGQ01 | BOSS | 79,800 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4yfnrumilqw | 2026-06-28 | LGC-2026-06-28-DA9R3S | BOSS | 77,990 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4y92fmfh1fs | 2026-06-08 | LGC-2026-06-08-YCYVZ7 | BOSS | 71,400 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4yag3xqitc1 | 2026-06-11 | LGC-2026-06-11-YW9ACU | BOSS | 70,290 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4yeqeszsjzd | 2026-06-25 | LGC-2026-06-25-PVYFOI | BOSS | 56,925 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4y7kusg73r7 | 2026-06-04 | LGC-2026-06-04-NTASIW | BOSS | 49,000 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4yd5kxsjk6q | 2026-06-19 | LGC-2026-06-19-FVBXT6 | BOSS | 46,640 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4y9utao5iwz | 2026-06-09 | APT-20260609-Z68FXJ | BOSS | 42,800 | historical session imported/transactioned on 2026-07-03 |
| 2026-07-03 | mr4ydviqiqyw9 | 2026-06-22 | LGC-2026-06-22-ELS1ZB | BOSS | 39,490 | historical session imported/transactioned on 2026-07-03 |

Wrong transaction gross from these 2026-07-03 transaction rows:

| date | transaction_rows | gross |
|---|---:|---:|
| 2026-07-03 | 2,449 | 1,385,060 |

Correct rows that should remain from current period:

| date | session_id | rows | gross |
|---|---|---:|---:|
| 2026-07-05 | S20260705-4q7zk | 8 | 5,370 |
| 2026-07-06 | S20260706-vfx2y | 1 | 700 |

## Stale / Voided Event Trace Contribution

These event traces explain the observed `+6,260` delta from `1,391,130` to `1,397,390`.

| event_date | session_id | amount | why_wrong |
|---|---|---:|---|
| 2026-07-03 | no session in payload | 50 | bed transfer event trace not tied to active owner-visible session revenue |
| 2026-07-03 | S20260703-amv7l | 1,470 | session is VOID at session layer |
| 2026-07-05 | S20260705-292h3 | 4,740 | session is VOID at session layer |

## Checks

| Check | Result |
|---|---|
| Uses current billing period 2026-07-03 -> 2026-08-02 | partially; date range exists but is applied to transaction timestamp, not session date |
| Uses owner-visible sessions as SOT | no |
| Includes full historical/current transaction rows | yes, through old transaction aggregator |
| Includes voided session event traces | possible in old event path; exact displayed amount includes 6,260 stale/void trace amount |
| Wrong amount unit/fils issue | no evidence |
| Duplicate cash/bank/gross field sum | no evidence |
| Natural month issue | not primary; 2026-07-01 -> 2026-07-06 returns the same transaction gross because bad rows are dated 2026-07-03 |
| Production write performed | no |

## Root Cause Classification

`OWNER_OVERVIEW_OLD_AGGREGATOR`

The current-period revenue card should be a session-level owner-visible summary, but the current path still uses the old `transactions + entry_events` aggregator. That aggregator filters by transaction/event timestamp and can include historical import rows and stale/void event traces that do not represent active current-period owner-visible sessions.

## Recommended Smallest Fix

Do not patch the UI number. Replace `current_period_received` backend calculation with a session-level resolver:

1. Query `sessions` with `corpid`, `date BETWEEN billing_start AND billing_end`, `voided_at=''`, and `handover_status<>'VOID'`.
2. Use `sessions.gross_received`, `cash_handover`, and `bank_transfer_total` as authoritative summary for the card.
3. Keep `transactions/entry_events` only for drill-down/detail if needed, joined through active session ids.
4. Do not include rows where the transaction timestamp is in-period but the parent `sessions.date` is out-of-period.
5. Do not include event traces whose parent session is voided.
6. Add regression test asserting 2026-07-03 imported June/July-02 historical sessions are excluded from current period received.
