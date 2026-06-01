# Bed Transfer Statistical Anchors

| Anchor | Purpose |
|---|---|
| transfer_count_month | monthly transfer volume |
| transfer_count_quarter | quarterly transfer volume |
| transfer_reason_distribution | why transfers happen |
| from_bed_transfer_count | beds frequently moved out from |
| to_bed_transfer_count | beds frequently moved into |
| customer_transfer_count | frequent-transfer customers |
| employee_transfer_count | employee operation volume |
| transfer_with_arrears_count | transfer risk with unpaid balance |
| transfer_with_deposit_review_count | deposit risk count |
| transfer_with_ttlock_review_count | TTLock review burden |
| average_days_before_transfer | stability before transfer |
| transfer_then_checkout_rate | post-transfer churn |
| transfer_then_arrears_rate | post-transfer arrears risk |

Rules:

- Bed transfers are not new tenants.
- Bed transfers are not checkouts.
- Bed transfers do not create income by themselves.
- Bed transfer analytics belongs in personnel/occupancy movement analysis.
