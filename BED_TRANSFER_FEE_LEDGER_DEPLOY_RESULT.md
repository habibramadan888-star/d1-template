# Bed Transfer Fee Ledger Deploy Result

Date: 2026-06-01

Status: `NOT_DEPLOYED_IN_THIS_STEP`

Deployment is gated on:

1. Static and local tests passing.
2. Remote staging migration/E2E approval and pass.
3. Explicit decision to publish the UI/API change.

Allowed deployment scope when approved:

- Bed Transfer fee UI.
- Charged/waived fee selection.
- Waiver reason validation.
- Ledger save anchors.
- Owner fee record view.
- Independent `bed_transfer_fee` category marker.

Forbidden deployment scope:

- Occupancy mutation.
- Deposit mutation.
- Arrears clearing.
- TTLock mutation.
- Owner approval workflow.
- Production cutover.
