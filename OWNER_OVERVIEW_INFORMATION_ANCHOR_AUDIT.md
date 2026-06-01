# Owner Overview Information Anchor Audit

Status: completed for read-only comparative BI.

| Anchor | Current Before | Gap | Fix |
|---|---|---|---|
| Today received | Static current-day total | No trend context | Kept unchanged and supplemented with comparative panel |
| Outstanding arrears | Static open amount | No employee follow-up signal | Added Arrears & Collection summary |
| Action items | Static count | No risk separation | Added Risk Watch with overdue, broken promise, partial payment, review |
| Recent handover | Latest date only | No month/quarter movement | Added Business Snapshot with month and quarter comparisons |
| Accounting controls | Mixed operational totals | Rent/deposit/refund/expense risk of confusion | Added Accounting Control separation |
| Occupancy flow | Not anchored | Owner cannot see tenant movement | Added new tenants, checkouts, transfers |

Implementation notes:

- Existing dashboard KPI formulas were not modified.
- Comparative BI is additive and read-only through `/api/owner/overview/comparative-summary`.
- Production cutover remains `PRODUCTION_NO_GO`.
