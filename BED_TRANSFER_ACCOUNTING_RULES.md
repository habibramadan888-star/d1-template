# Bed Transfer Accounting Rules

| Accounting Item | Behavior | Revenue? | Liability? | Audit |
|---|---|---|---|---|
| Deposit transfer | Deposit liability follows customer from `from_bed` to `to_bed` | No | Yes | from/to/customer/deposit amount |
| Deposit refund | Not automatic during bed transfer | No | Liability reduction only if separate refund event | separate DR audit |
| New deposit | Not automatic during bed transfer | No | only if separate deposit-in event | separate D audit |
| Rent period transfer | Current paid/active rent period follows customer | No new revenue | No | period start/end carried |
| Rent difference | Review item when old/new bed rent differs | No unless explicitly charged | possible receivable/review | rent_difference_review |
| Transfer fee | Only revenue if employee explicitly selects fee | Yes, if charged | No | fee_paid/fee_waiver_reason |
| Carry-over arrears | Existing arrears remain attached to customer/task chain | No | Receivable remains | carry_over_arrears |
| Cash flow | Bed transfer itself creates no cash received | No | No | only fee creates cash/bank line |
| Occupancy | Not a new tenant and not a checkout | No | No | bed_transfer_count |
| TTLock history | Old lock/card record preserved | No | No | old/new refs |

Transfer must never clear arrears, create deposit revenue, or inflate rent income unless a separate explicit money event exists.
