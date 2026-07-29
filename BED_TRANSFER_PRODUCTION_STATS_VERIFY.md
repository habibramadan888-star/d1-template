# Bed Transfer Production Statistics Verify

Date: 2026-06-01 Asia/Dubai

## Result

| Check | Result |
|---|---|
| New tenant transaction created | NO |
| Checkout/refund transaction created by smoke | NO |
| Bed transfer transaction row created | NO |
| `transactions` rows changed by smoke | 0 |
| `bed_transfer_events` rows after smoke | 1 |
| Occupancy statistics formula changed | NO |

## Interpretation

The smoke wrote the Bed Transfer event ledger only. Because no `transactions` row was created, the smoke cannot be counted as a new tenant or checkout by the existing owner occupancy flow. This preserves the rule that Bed Transfers are separate from new tenant and checkout statistics.

Production cutover remains `PRODUCTION_NO_GO`.
