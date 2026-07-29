# Bed Transfer Employee UI Save Wiring Result

Date: 2026-06-01
Status: IMPLEMENTED

## Changes

- Employee `TF` save now calls `submitBedTransferEvent()`.
- `submitBedTransferEvent()` posts to `/api/employee/bed-transfers`.
- TF requests submit directly for owner review and are not added to local handover drafts.
- Stale TF drafts are blocked from handover export.
- UI copy now states that Bed Transfer writes an event-ledger request only and does not directly change bed/deposit/arrears/TTLock.

## User-Facing Status

Success message:

`Bed transfer submitted for owner review / 换床申请已提交老板核对`

## Safety Boundary

The UI does not claim that the transfer is completed. It only confirms owner-review submission.
