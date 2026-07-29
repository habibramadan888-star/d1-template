# Employee Follow-up Boss Card Compact Deploy Approval Required

Task: EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-UI-001

Date: 2026-06-01, Asia/Dubai

Default decision: not deployed.

## If Mobile Acceptance Requires Deployment

Deploy scope must be UI-only:

- Employee Follow-up boss-assigned task card compact layout.
- Removal of helper/source/boss-note blocks from employee task card.
- Blank note default when no saved note exists.
- `Save / 保存` button copy.
- Compact spacing and badge layout.

## Explicitly Excluded

- production write gate
- production business write
- employee follow-up write
- owner directive create
- D1 execute/export/import
- migration
- financial formula change
- dashboard calculation change
- production cutover

Production cutover must remain `PRODUCTION_NO_GO`.
