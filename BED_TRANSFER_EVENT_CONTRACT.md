# Bed Transfer Event Contract

`bed_transfer_event` is a bed relationship transfer event, not a new tenant, checkout, rent payment, deposit receipt, deposit refund, expense, or arrears payment.

| Field | Required | Source | Accounting Meaning | Analytics Anchor |
|---|---|---|---|---|
| transfer_id | yes | generated event id | audit identity | transfer count |
| from_bed | yes | employee input / current bed | old occupancy anchor | from bed frequency |
| to_bed | yes | employee input | new occupancy anchor | to bed frequency |
| transfer_date | yes | employee input default today | effective movement date | month / quarter transfer count |
| effective_date | yes | transfer date or owner-approved date | period boundary | transfer timing |
| customer_id / tenant_id / customer_code | yes | current occupant context | customer liability anchor | customer transfer count |
| customer_display_name | optional | TTLock / customer context | display only | traceability |
| original_checkin_date | yes if known | TTLock/current occupant | tenancy continuity | days before transfer |
| original_rent_period_start | yes if known | rent context | period continuity | rent period carry |
| original_rent_period_end | yes if known | rent context | period continuity | rent period carry |
| original_deposit_amount_fils | yes if known | deposit ledger / card | liability carried, not revenue | deposit review |
| current_rent_amount_fils | yes if configured | rent config | old bed rent reference | rent difference |
| new_bed_rent_amount_fils | yes if configured | rent config | new bed rent reference | rent difference |
| rent_difference_fils | computed | old/new rent config | review only unless charged | rent delta |
| transfer_fee_fils | optional | explicit employee selection | revenue only if explicitly charged | transfer fee count |
| carry_over_arrears_fils | yes | arrears task lookup | receivable continues | transfer with arrears |
| old_ttlock_ref | yes if known | TTLock card | old lock history preserved | TTLock trace |
| new_ttlock_ref | optional | TTLock creation/review | new lock anchor | TTLock trace |
| old_lock_valid_from | optional | TTLock | old validity retained | traceability |
| old_lock_valid_until | optional | TTLock | old validity retained | traceability |
| new_lock_valid_from | optional | TTLock | new validity starts | traceability |
| new_lock_valid_until | optional | TTLock | new validity ends | traceability |
| reason | yes | employee input | audit reason | reason distribution |
| operator_employee | yes | authenticated employee | audit operator | employee transfer count |
| created_at | yes | system time | audit timestamp | time series |
| audit_id | yes if persisted | audit log | immutable trail | audit trace |
| status | yes | state machine | lifecycle | pending/review/completed |

Production cutover remains `PRODUCTION_NO_GO`.
