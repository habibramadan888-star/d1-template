# Bed Transfer Fee Ledger Current Audit

Date: 2026-06-01
Branch: fix/auth-closure-001

| Area | Current | Required | Gap |
|---|---|---|---|
| entry_events write | Present | `event_type=bed_transfer` and fee anchor in `new_value` | Closed in this revision |
| bed_transfer_events write | Present | Record transfer, fee mode, amount, waiver reason, entry/audit trace | Closed in this revision |
| amount | Previously only `transfer_fee_fils` from legacy payload | `amount_fils=5000` charged, `0` waived | Closed |
| ordinary payment fields | Employee UI still has generic amount fields, but TF path locks them to 50/0 | TF must not behave like rent/deposit/arrears | Closed by dedicated Fee Option and context |
| status | `recorded` | `recorded`, no owner review | Closed |
| owner review | No approve/reject exposed | No approve/reject | Closed |
| revenue category | Legacy `transfer_fee`; no explicit `bed_transfer_fee` anchor | Independent `bed_transfer_fee` category | Closed |
| charged/waived distinction | Partial UI only (`feePaid=Y/N`) | `fee_mode=charged/waived` | Closed |
| waiver reason | Reused generic custom reason | Dedicated `waiver_reason`, required when waived | Closed |
| from_bed -> to_bed | Present | Preserve anchor | Closed |
| future filtering/query | Transfer table queryable by bed/date/status | Add fee mode/category/index anchors | Closed via migration 007 |

No production cutover is implied. Production status remains `PRODUCTION_NO_GO`.
