# Owner Bed Transfer Fee Record View Result

Date: 2026-06-01

Owner read-only Bed Transfer records now display:

| Field | Display |
|---|---|
| from_bed -> to_bed | yes |
| transfer_date | yes |
| employee | yes |
| fee | `50.00 AED` or `Waived / 已豁免` |
| waiver_reason | displayed when waived |
| reason | yes |
| note | yes |
| entry_event_id | yes |
| audit_id | yes |

Owner view does not expose:

- Approve
- Reject
- Pending review action
- Apply transfer action

The view remains read-only and does not mutate occupancy, deposit, arrears, or TTLock.
