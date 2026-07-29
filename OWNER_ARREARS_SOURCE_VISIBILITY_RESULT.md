# OWNER_ARREARS_SOURCE_VISIBILITY_RESULT

## Source Visibility

The owner arrears pool still includes all three required sources.

| Source              | Included | Display Label |
| ------------------- | -------- | ------------- |
| historical_arrears  | yes      | 历史欠款      |
| current_due_unpaid  | yes      | 到期未收      |
| ttlock_expired_card | yes      | 通通锁过期    |

## TTLock Requirement

`ttlock_expired_card` remains included through `ttlockExpiredCardsForArrearsPool()` and is merged into the owner follow-up pool by `loadArrearsForOwner()`. Cards with unknown amount render `金额待核对` instead of being hidden.
