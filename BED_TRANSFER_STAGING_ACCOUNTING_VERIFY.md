# Bed Transfer Staging Accounting Verify

Date: 2026-06-01
Status: `PASS`

| Accounting Check | Expected | Actual | Result |
|---|---|---|---|
| deposit carried | yes | `original_deposit_amount_fils=0` carried as fixture value | PASS |
| deposit not counted as revenue | yes | no revenue/cash transaction created | PASS |
| deposit not refunded | yes | no deposit refund row created | PASS |
| rent period carried | yes | `2026-06-01` to `2026-06-02` | PASS |
| carry_over_arrears preserved | yes | `carry_over_arrears_fils=0`, no arrears update | PASS |
| arrears not cleared | yes | no `arrear_tasks` update executed | PASS |
| transfer fee only if explicitly selected | yes | `transfer_fee_fils=0` | PASS |
| cash received unchanged unless fee exists | yes | no cash/bank transaction created | PASS |
| current tenant identity preserved | yes | customer code preserved in event | PASS |
| audit exists | yes | `audit-bt-20260601185154` verified before rollback | PASS |

No financial formula or dashboard calculation was modified.
