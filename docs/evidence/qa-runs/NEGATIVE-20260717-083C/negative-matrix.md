# Seven-event Negative Matrix

- Environment: isolated QA summary environment only
- Execution type: authenticated aggregate validate-only
- Formal writes: `0`
- TTLock external calls: `0`
- Canonical archive reads per aggregate request: `1`

## Live aggregate results

The first aggregate returned nine stable Entry-ID-linked failures in one bounded JSON response:

| Entry | Boundary | Error code |
|---|---|---|
| NEG-083-01 | Rent missing bed | RENT_REQUIRED_FIELD_MISSING |
| NEG-083-02 | Rent invalid amount | RENT_REQUIRED_FIELD_MISSING |
| NEG-083-03 | Invalid arrears reference | ARREARS_REF_STALE_REFRESH_REQUIRED |
| NEG-083-04 | Deposit canonical conflict | DUPLICATE_CANONICAL_FINGERPRINT |
| NEG-083-05 | Deposit refund canonical conflict | DUPLICATE_CANONICAL_FINGERPRINT |
| NEG-083-06 | Checkout required fields missing | CHECKOUT_REQUIRED_FIELD_MISSING |
| NEG-083-07 | Expense canonical conflict | DUPLICATE_CANONICAL_FINGERPRINT |
| NEG-083-08 | Bed Transfer source vacant | BED_TRANSFER_LEGACY_GENESIS_SOURCE_NOT_OCCUPIED |
| NEG-083-09 | Bed Transfer target occupied | BED_TRANSFER_TARGET_NOT_VACANT |

Event-specific follow-up validation confirmed:

- Deposit In missing bed: `DEPOSIT_IN_REQUIRED_FIELD_MISSING`
- Deposit Out missing bed: `DEPOSIT_OUT_REQUIRED_FIELD_MISSING`
- Expense missing description: `EXPENSE_REQUIRED_FIELD_MISSING`

All results remained associated with their stable Entry ID. No formal write endpoint was called. Duplicate, missing, and unknown Entry-ID response contracts and non-string error-code handling are covered by the committed recovery/transport tests.

