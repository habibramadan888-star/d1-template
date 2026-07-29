# OWNER_ARREARS_VERTICAL_LAYOUT_ROOT_CAUSE

## Finding

The owner arrears screen was visually labeled as a task card, but the rendered item still used the old `.arrear-row` wrapper. On mobile that inherited a narrow flex-row layout, inline chips, nowrap text, and right-aligned amount behavior. The result was a compressed list/table hybrid instead of a readable one-column card.

| Problem                                                      | File / Selector                                                                                 | Root Cause                                                                                            | Required Fix                                                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Card fields squeezed into vertical-looking columns           | `deploy-worker/public/index-51-main.js` / `.arrear-row arrear-task-card`                        | The task item reused the old row wrapper and inherited `display:flex`, narrow gaps, and row alignment | Render each item through `renderOwnerArrearsTaskCard()` using `.owner-arrears-task-card` without `.arrear-row` |
| Customer, bed, and amount split across unrelated row columns | `deploy-worker/public/index-51-main.js` / inline row markup                                     | Identity data was distributed between `.arrear-room`, a flex body, and `.arrear-remain`               | Put `#客户编号｜床位｜金额` in one identity block                                                              |
| Debug-like fields still visible                              | `deploy-worker/public/index-51-main.js` / old inline chips                                      | Raw workflow concepts were surfaced as chip labels or English status text                             | Map all source/status/empty values to Chinese business language                                                |
| Mobile table/grid compression                                | `deploy-worker/public/index-51.html` / `.arrear-row`, `.arrear-remain`, old `.arrear-task-card` | The old card class did not override the row layout enough                                             | Add dedicated `.owner-arrears-*` card CSS with one-column mobile layout                                        |
| Large card height with low information density               | `deploy-worker/public/index-51-main.js` / old chips                                             | Metadata was repeated and spread across many pills                                                    | Use a compact identity line, due line, follow-up grid, note, and actions                                       |
| Source labels not business-readable                          | `arrearSourceLabel()`                                                                           | `current_due_unpaid` label differed from the requested business language                              | Use `历史欠款`, `到期未收`, and `通通锁过期`                                                                   |

## Scope Guard

No database migration, D1 write, financial formula change, dashboard calculation change, handover change, or tenant-scope business rule change was required for this UI fix.
