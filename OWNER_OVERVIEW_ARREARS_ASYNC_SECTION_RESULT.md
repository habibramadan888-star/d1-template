# Owner Overview Arrears Async Section Result

Arrears is now merged into the owner overview as a core business module instead of a top-level tab.

Implemented overview module:

- Title: `欠款跟进`
- Async panel: `#ownerOverviewArrearsPanel`
- Skeleton first render
- Summary KPIs after load
- Recent 5 tasks by default
- `查看全部`
- `WhatsApp 导出`
- Retry on error/timeout

Displayed content:

| Item                        | Result                                                   |
| --------------------------- | -------------------------------------------------------- |
| Total arrears amount        | Displayed from currently loaded allowed arrears rows     |
| Follow-up count             | Displayed                                                |
| Existing arrears count      | Displayed                                                |
| TTLock expired unpaid count | Displayed                                                |
| Promised but unpaid count   | Displayed                                                |
| Recent 5 tasks              | Displayed by default                                     |
| View all                    | Implemented in overview via `toggleOverviewArrearsAll()` |
| WhatsApp export             | Preserved                                                |

The overview page renders before arrears data is fetched. Arrears failure is isolated inside the arrears module and does not block overview KPIs, alerts, sessions, or recent ledger.
