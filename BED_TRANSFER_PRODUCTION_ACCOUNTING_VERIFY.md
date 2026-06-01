# Bed Transfer Production Accounting Verify

Date: 2026-06-01 Asia/Dubai

## Result

| Accounting Rule | Result | Evidence |
|---|---|---|
| Deposit carried as liability, not revenue | PASS | `original_deposit_amount_fils=0`; no deposit/revenue transaction created |
| Arrears preserved | PASS | `carry_over_arrears_fils=5000`; no arrear task update/clear executed |
| Rent formula unchanged | PASS | current rent 770 AED, target rent 770 AED, difference 0 AED |
| Transfer fee not charged | PASS | `transfer_fee_fils=0` |
| No employee entry write | PASS | no `transactions` row created by smoke |
| No dashboard calculation change | PASS | no code/formula change in this task |

## Persisted Amounts

| Field | Value |
|---|---:|
| original_deposit_amount_fils | 0 |
| current_rent_amount_fils | 77000 |
| new_bed_rent_amount_fils | 77000 |
| rent_difference_fils | 0 |
| transfer_fee_fils | 0 |
| carry_over_arrears_fils | 5000 |

Production cutover remains `PRODUCTION_NO_GO`.
