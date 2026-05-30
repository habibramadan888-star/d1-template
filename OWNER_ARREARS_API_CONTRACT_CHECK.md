# Owner Arrears API Contract Check

Production cutover remains `PRODUCTION_NO_GO`.

API path: `/api/arrears/followup/tasks?limit=20`.

Fallback path: `/api/arrears?limit=20`.

| Field                              | API Provides                                          | UI Expects                        | Match |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------- | ----- |
| `source_type`                      | `existing_arrears_record` or `ttlock_expired_unpaid`  | Final two-source alias            | yes   |
| `source_authority`                 | `["existing_arrears_record","ttlock_expired_unpaid"]` | Contract marker                   | yes   |
| `room_bed` / `room`                | yes                                                   | Bed display                       | yes   |
| `customer_code` / `tenant_card_id` | yes                                                   | Customer identity                 | yes   |
| `remain`                           | yes                                                   | Amount display                    | yes   |
| `due_date`                         | yes                                                   | Due/overdue display               | yes   |
| `promised_amount_fils`             | yes                                                   | Owner promise amount              | yes   |
| `promised_payment_date`            | yes                                                   | Owner promise date                | yes   |
| `followup_note`                    | yes                                                   | Owner note display                | yes   |
| `staff_note`                       | yes                                                   | Backward-compatible note fallback | yes   |
| `limit`                            | yes, clamped 1 to 100                                 | First-page load                   | yes   |

## Notes

Existing arrears records use their record amount. TTLock expired unpaid cards are still UI-aggregated from lock-card data and bed rent config; cards without rent config are excluded from the default follow-up list.
