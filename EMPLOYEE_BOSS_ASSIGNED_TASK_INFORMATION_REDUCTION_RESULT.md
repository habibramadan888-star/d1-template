# Employee Boss Assigned Task Information Reduction Result

Task: `EMPLOYEE-FOLLOWUP-FULL-UX-PARITY-WITH-ENTRY-001`

| Information | Default Card | Expanded Details |
|---|---|---|
| Bed | shown | shown |
| Amount | shown | shown |
| Due date | shown | shown |
| Status | shown | shown |
| Expand/collapse action | shown | n/a |
| Promise date input | hidden | shown |
| Note input | hidden | shown |
| Boss note | hidden | shown if present |
| Source label | hidden | shown as human-readable copy |
| `customer_code` | hidden | hidden by default |
| internal ids | hidden | hidden |
| long instructional text | removed | replaced by short hint |
| promised amount input | not shown | not shown |
| amount edit | not shown | not shown |
| close/void/handover | not shown | not shown |

Result: boss assigned task cards now prioritize execution essentials and keep secondary fields behind Details / Collapse.

Safety: no production write, write gate off, production cutover `PRODUCTION_NO_GO`.
