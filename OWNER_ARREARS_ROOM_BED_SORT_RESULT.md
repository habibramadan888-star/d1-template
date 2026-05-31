# Owner Arrears Room Bed Sort Result

Result:
- The owner arrears display adapter sorts rows by room/bed using `localeCompare(..., { numeric: true })`.
- Same bed rows sort by overdue days descending.
- If overdue days tie, rows sort by customer/card code naturally.
- The sort operates on a copied display array and does not mutate Backend SOT payloads, source counts, or business data.

No D1 write, migration, or financial formula change was performed.
