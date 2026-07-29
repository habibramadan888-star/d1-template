# Employee Bed Transfer UI Fix Result

Status: `LOCAL_UI_CONTRACT_UPDATED`

When the employee selects `TF / Bed Transfer`, the UI now exposes a dedicated transfer block.

| Required Field | UI Element | Result |
|---|---|---|
| From Bed | `transferFromBed` / `data-bed-transfer-from="true"` | PASS |
| To Bed | `bedTo` / `data-bed-transfer-to="true"` | PASS |
| Transfer Date | `transferDate` / `data-bed-transfer-date="true"` | PASS |
| Reason | `transferReason` / `data-bed-transfer-reason="true"` | PASS |
| Note | existing `remark` | PASS |
| Context Review | `transferReviewPanel` | PASS |

Read-only review panel includes:

- Current occupant.
- Deposit carried.
- Rent period.
- Current arrears.
- Old TTLock reference.
- New bed availability/review.
- Rent difference review.
- Audit status.

Validation behavior:

- `from_bed` is required.
- `to_bed` is required.
- `from_bed` cannot equal `to_bed`.
- `transfer_date` is required.
- vacant/no-active-tenant source bed blocks save.
- deposit, rent period, TTLock, and rent difference gaps become review flags.

No production write was executed.
