# Owner / Employee Real Screenshot Acceptance Checklist

Use this checklist with real mobile screenshots after the static UI fix is deployed.

| Screenshot                                      | Required Visual Match                                                                                             | Pass/Fail | Notes |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- | ----- |
| Employee header vs owner header                 | Both show the same HOME LINK logo, HOMELINK. wordmark, business title, role chip, and compact action area.        |           |       |
| Employee nav vs owner nav                       | Both use large pill tabs with green active state and white inactive state.                                        |           |       |
| Employee card vs owner card                     | Owner overview, analysis, client, and history cards use the same radius, shadow, padding, and soft white surface. |           |       |
| Employee title vs owner title                   | Owner title and English subtitle use the same hierarchy as employee section titles.                               |           |       |
| Employee mobile spacing vs owner mobile spacing | Owner mobile page has the same product spacing and does not feel like a backend table page.                       |           |       |
| Unified login minimal page                      | Only login essentials are visible; no production/D1/QA/routing text.                                              |           |       |
| Owner backend impression                        | Owner must not look like a separate admin/control-panel product.                                                  |           |       |
| Owner `录入` tab                                | Main nav must not show `录入`.                                                                                    |           |       |
| Control panel icon                              | No garbled icon; inline SVG renders cleanly.                                                                      |           |       |
| ADD ENTRY block                                 | Owner landing page must not show `添加记录 / ADD ENTRY` as a primary block.                                       |           |       |

If any row fails in a real phone screenshot, UI acceptance is not complete.
