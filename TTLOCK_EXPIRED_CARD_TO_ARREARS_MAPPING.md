# TTLock Expired Card To Arrears Mapping

TTLock expired cards are operational follow-up leads. Entering the arrears pool does not mean final accounting receivable confirmation. Amount comes from configured bed rent, not from TTLock.

| TTLock Raw Field | Arrears Task Field |
|---|---|
| `cardId` / `cardNumber` | `source_ref` |
| `cardName` | `customer_code`, `card_code`, bed parser input |
| lock alias / room key | `lock_room`, rent lookup key |
| `endDate` | `due_date` |
| expired status | `source_type = ttlock_expired_unpaid` |
| parsed bed | `room_bed`, `bed`, `room` |
| rent config value | `amount_fils`, `remain`, `amount_source = bed_rent_mapping` |

Mapped arrears fields:

| Field | Value |
|---|---|
| `source_type` | `ttlock_expired_unpaid` |
| `source_ref` | TTLock card id/number if available, otherwise lock/bed/end/card key |
| `room_bed` | Parsed bed key |
| `customer_code` | Card display name |
| `card_code` | Card display name |
| `due_date` | Validity end date |
| `overdue_days` | Days since validity end |
| `package_code` | `ttlock_card` |
| `amount_fils` | matched bed rent * 100 |
| `amount_source` | `bed_rent_mapping` |
| `amount_authority_status` | `bed_rent_mapping` |
| `followup_status` | `pending_followup` |
| `accounting_status` | `unverified` |

If bed or rent mapping is missing, the row is returned in the missing-rent/config list and is not included in the default arrears amount total.
