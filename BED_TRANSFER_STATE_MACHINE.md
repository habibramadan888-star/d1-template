# Bed Transfer State Machine

| Status | Meaning | Employee Action | Owner Action |
|---|---|---|---|
| draft | employee is entering from/to and context | fill from_bed, to_bed, date, reason | none |
| validated | required anchors pass local validation | save record when ready | view timeline and audit |
| recorded | transfer event persisted and audited | no further edit except approved correction | view timeline and audit only |
| recorded_with_notes | non-blocking anchors are attached as trace notes | save record with notes if policy allows | view trace notes only |
| rolled_back | record-only event was reversed by an approved cleanup | stop workflow | view audit |
| voided | record intentionally voided | stop workflow | view audit |
| failed | save/validation failed | fix inputs or retry | investigate |

Primary path:

`draft -> validated -> recorded`

Record-with-notes path:

`draft -> recorded_with_notes -> recorded / rolled_back`

Non-blocking trace-note triggers:

- New bed occupied.
- Deposit missing.
- Arrears not reviewed.
- TTLock missing.
- Rent difference requires confirmation.
- Multiple/uncertain customer match.
- Existing pending transfer.

Record-only rule:

- Owner approval/rejection is not part of the Bed Transfer workflow.
- Saving a Bed Transfer writes event/audit/trace/idempotency evidence only.
- Occupancy, deposit, arrears, TTLock, dashboard, and financial formulas are not mutated by this save path.
