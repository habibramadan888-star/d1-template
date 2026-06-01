# Bed Transfer Fee Accounting Category Result

Date: 2026-06-01

| Rule | Result |
|---|---|
| Independent income category | `bed_transfer_fee` added |
| Count as rent | No |
| Count as deposit | No |
| Count as arrears recovery | No |
| Count in gross/session totals where income is intentionally aggregated | Yes |
| Waived amount | `0`, no income |
| Legacy `transfer_fee` compatibility | Preserved |
| Dashboard formula | Existing formula not rewritten |
| Summary enhancement | Future report can split `transfer_fee_total`, waived count, and waiver reasons |

No financial formula or dashboard calculation path was changed beyond additive category recognition.
