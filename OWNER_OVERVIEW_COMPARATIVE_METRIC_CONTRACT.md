# Owner Overview Comparative Metric Contract

Read-only endpoint: `GET /api/owner/overview/comparative-summary`

| Metric Group | Field | Definition | Comparison |
|---|---|---|---|
| Business Snapshot | gross_received | Cash + bank receipts in current month-to-date | Last month same elapsed days, same month last year |
| Business Snapshot | rent_received | Receipts classified as rent, excluding deposit and arrears recovery | Last month same elapsed days |
| Business Snapshot | net_cashflow | Gross received - deposit refunds - expenses | Last month same elapsed days |
| Business Snapshot | arrears_recovered | Receipts linked to arrears recovery signals | Last month same elapsed days |
| Accounting Control | deposit_received | Deposit collection separated from rent | No formula mixing |
| Accounting Control | deposit_refund | Deposit refund separated from expenses | No formula mixing |
| Accounting Control | expenses | Expense category only | No formula mixing |
| Occupancy Flow | new_tenants | New tenant tag, excluding bed transfers | Month-to-date |
| Occupancy Flow | checkouts | Checkout type, excluding bed transfers | Month-to-date |
| Occupancy Flow | bed_transfers | Transfer tag or bed_from/bed_to movement | Month-to-date |
| Arrears | outstanding_amount | Open arrears amount minus actual received | Current open tasks |
| Risk Watch | broken_promise_count | Promise date before today with remaining balance | Current open tasks |

No-data rule: if a comparison window has no rows, the API returns `interpretation: "no_data"` instead of fabricating trend.
