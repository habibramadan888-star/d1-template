# Arrears Pool Source Of Truth

Date: 2026-05-30, Asia/Dubai

## Authority

The owner arrears follow-up page must use this pool:

```text
buildArrearsFollowupPool({
  historicalArrears,
  currentDueUnpaid,
  ttlockExpiredCards
})
```

## Required Source Types

| Source Type           | Meaning                                                | Amount Authority                   |
| --------------------- | ------------------------------------------------------ | ---------------------------------- |
| `historical_arrears`  | Existing arrear tasks and legacy arrears rows          | Known                              |
| `current_due_unpaid`  | Current billing-period unpaid due rows                 | Known from current due computation |
| `ttlock_expired_card` | Currently occupied TTLock cards with expired end dates | May be unknown                     |

Rows with `sourceType = ttlock_expired_card` must not be dropped only because the amount is unknown. They are displayed as `金额待核对`.

## Regression Lock

`tests/arrears-followup-pool-source.spec.mjs` is the source-of-truth regression test.
