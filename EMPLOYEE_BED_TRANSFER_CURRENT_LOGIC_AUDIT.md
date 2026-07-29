# Employee Bed Transfer Current Logic Audit

Status: `GAPS_IDENTIFIED_AND_UI_CLOSURE_STARTED`

| Area | Current Behavior | Required Behavior | Gap |
|---|---|---|---|
| Bed Transfer UI fields | Previously used generic `bed` plus `bedTo` and transfer fee | Must explicitly capture `from_bed`, `to_bed`, transfer date, reason, and note | `BED_TRANSFER_FROM_TO_MISSING` |
| from_bed | Generic `bed` was reused | Dedicated From Bed anchor must be visible and stored as `bed_from` | Fixed in UI with `transferFromBed` |
| to_bed | `bedTo` existed | Must be required, different from from_bed, and checked for availability/review | Partially fixed with validation contract |
| Customer / tenant anchor | Uses TTLock card context where available | Must preserve occupant/customer relationship through transfer | Contract defined |
| Deposit | Existing context can read card/ledger deposit | Deposit liability must follow customer and not become revenue | Accounting rule documented |
| Rent period | Existing rent period anchors exist for rent entries | Transfer must carry current rent period without counting as new revenue | Contract documented |
| TTLock | Existing card data can be read | Old TTLock record must be preserved; new bed TTLock must be linked or review-required | Rule documented |
| Arrears | Existing task matching exists | Carry-over arrears must remain attached to customer/task chain | Contract documented |
| Occupancy | Backend overview already separates bed transfers | Transfer must not count as new tenant or checkout | Existing backend separation noted |
| Audit | Entry rows contain operator/time | Transfer must explicitly audit from/to/operator/reason/amount anchors | Contract documented |
| Traceability | Preview/export can show from/to | Full timeline model needed for future owner/customer detail | Model documented |

Required conclusion:

- `BED_TRANSFER_FROM_TO_MISSING`: addressed in UI contract.
- `BED_TRANSFER_ACCOUNTING_ANCHORS_MISSING`: documented and partially carried in entry payload.
- `BED_TRANSFER_TTLOCK_ANCHORS_MISSING`: documented and old TTLock ref preserved in payload.
- `BED_TRANSFER_AUDIT_TRAIL_MISSING`: contract requires from/to/operator/reason.
- `BED_TRANSFER_STATS_ANCHORS_MISSING`: analytics anchors defined.

No production write, migration, D1 execute/export/import, financial formula change, dashboard calculation change, or production cutover was performed.
