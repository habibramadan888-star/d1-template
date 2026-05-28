# Owner History Load Performance Diagnosis

Date: 2026-05-28, Asia/Dubai

Scope: owner history loading behavior. No D1 write, migration, D1 export/import/execute, dashboard calculation change, or financial formula change was performed.

## Findings

| Question                       | Finding                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Current primary API            | `/api/history`                                                                      |
| Slowest likely path            | full `/api/history` session fetch plus front-end rendering of all returned sessions |
| Loads all history at once      | yes, before this change the owner history path requested the full history set       |
| Pagination / limit missing     | yes, before this change no limit was passed by the owner history UI                 |
| Front-end render blocking risk | yes, sorting and rendering a large full result can delay first visible feedback     |
| User-visible issue             | history could appear blank or stuck for 15-20 seconds on large data                 |

## Minimal Safe Optimization

- Add a visible history skeleton immediately before data returns.
- Request only the most recent 20 sessions for first paint.
- Add `加载更多历史` to request additional batches.
- Add read-only `limit` / `offset` support to `/api/history`.
- Keep the existing ordering and filtering rules.
- Do not change history calculations or financial interpretation.

## Follow-Up

If large accounts still feel slow after first-batch loading, add server-side pagination for related detail rows and measure authenticated API timing under an approved read-only performance test.

Production cutover remains `PRODUCTION_NO_GO`.
