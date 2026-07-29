# Owner Occupancy Flow Metric Result

| Metric | Rule |
|---|---|
| New tenants | `tag = New`, excluding transfers |
| Checkouts | `type = CO`, excluding transfers |
| Bed transfers | `tag = Transfer` or `bed_from` / `bed_to` exists |
| Current occupied count | Distinct beds observed in bounded read-only transaction window |

Important accounting rule:

Bed transfers are not counted as new tenants or checkouts. This prevents internal bed movement from inflating occupancy flow.
