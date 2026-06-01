# Bed Transfer State Machine

| Status | Meaning | Employee Action | Owner Action |
|---|---|---|---|
| draft | employee is entering from/to and context | fill from_bed, to_bed, date, reason | none |
| validated | required anchors pass local validation | add to session / submit when allowed | review later |
| pending_review | non-blocking anchors need review | submit with review flags if policy allows | approve/fix deposit, rent, TTLock, or occupancy issue |
| completed | transfer persisted and audited | no further edit except approved correction | view timeline and audit |
| cancelled | transfer intentionally cancelled | stop workflow | audit cancellation |
| failed | save/validation failed | fix inputs or retry | investigate |

Primary path:

`draft -> validated -> completed`

Review path:

`draft -> pending_review -> completed / cancelled`

Pending review triggers:

- New bed occupied.
- Deposit missing.
- Arrears not reviewed.
- TTLock missing.
- Rent difference requires confirmation.
- Multiple/uncertain customer match.
- Existing pending transfer.
