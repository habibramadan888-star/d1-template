# Arrears Source Model Final

Status: final design package only  
Execution boundary: no schema execution

## Source Classes

| Source Type           | Meaning                                                                            | Accounting Authority                                       | Follow-up Required            | Dedupe Key                                                                                 | Risk Impact                                                                          |
| --------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `historical_arrears`  | Historical short-paid, unpaid, restored voided payment arrears, old promise missed | Medium to high, depending on receivable or ledger evidence | Yes                           | `tenant_id + property_id + room_bed + customer_code + due_date + source_type`              | Strong signal, contributes to repeat arrears and promise-missed metrics              |
| `current_due_unpaid`  | Current due item exists and no payment or handover match is confirmed              | High after receivable or due schedule is verified          | Yes                           | `tenant_id + property_id + room_bed + customer_code + due_date + source_type`              | Strong signal, contributes to overdue days and current exposure                      |
| `ttlock_expired_card` | TTLock card or room access expired                                                 | Low by itself; operational signal only                     | Yes, as operational follow-up | `tenant_id + property_id + room_bed + customer_code_or_card_code + due_date + source_type` | Weak to medium signal; increases only after owner or employee confirms payment issue |

## Dedupe Key Rule

Primary:

```text
tenant_id + property_id + room_bed + customer_code + due_date + source_type
```

Fallback when `customer_code` is missing:

```text
tenant_id + property_id + room_bed + card_code_or_ttlock_card_id + due_date + source_type
```

## Dedupe Requirements

- Same customer, same bed, same due date, same source type must not create duplicate active tasks.
- Different source types can be linked to the same operational task when the same customer/bed/due date matches.
- Dedupe must preserve all source references in `source_ref` or a future source-link table.
- Closed tasks can remain closed and should not be reopened automatically without owner review.

## Accounting Notes

- TTLock source must default `amount_authority_status = unknown`.
- Historical arrears can be `estimated` or `verified` depending on source evidence.
- Current due unpaid can become `verified` only when backend receivable or due schedule authority confirms it.
