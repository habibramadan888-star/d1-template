# Employee Directive Card Collapse / Expand Result

Generated: 2026-06-01 Asia/Dubai

## Behavior

| Requirement | Result |
|---|---|
| default collapsed | PASS |
| Expand Details / 展开详情 button exists | PASS |
| Collapse Details / 收起详情 button exists | PASS |
| detail panel hidden by default | PASS |
| detail panel shows date/note inputs only | PASS |
| customer_code not shown by default | PASS |
| technical/debug fields hidden | PASS |

## Interaction Model

Multiple cards may be expanded independently. Each card owns its own detail panel and `aria-expanded` state.

No production write is performed by expand/collapse.
