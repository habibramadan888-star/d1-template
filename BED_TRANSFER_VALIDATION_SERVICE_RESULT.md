# Bed Transfer Validation Service Result

Local validation contract: `bedTransferValidationSummary(fromBed, toBed, context)`.

| Validation | Pass/Fail | Action |
|---|---|---|
| from_bed not empty | fail if empty | block |
| to_bed not empty | fail if empty | block |
| from_bed != to_bed | fail if equal | block |
| from_bed has active occupant | fail if false | block |
| to_bed available | review if false | pending_review |
| occupant anchor found | review if uncertain | pending_review |
| deposit record found | review if false | deposit_review_required |
| rent period found | review if false | rent_period_review_required |
| current arrears found | pass with carry-over amount | carry-over |
| TTLock current record found | review if false | ttlock_review_required |
| rent difference checked | review if non-zero | rent_difference_review |
| pending transfer checked | review if true | pending_transfer_exists |
| validation summary generated | pass | `blocked`, `pending_review`, or `validated` |

This is a local UI validation contract. It does not write production D1 and does not open a write gate.
