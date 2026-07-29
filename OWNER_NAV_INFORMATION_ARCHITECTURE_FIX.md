# Owner Navigation Information Architecture Fix

Date: 2026-05-28, Asia/Dubai

Scope: owner navigation presentation only. No production deploy, migration, D1 write, business write QA, permission rewrite, dashboard calculation change, or financial formula change was performed.

| Question                       | Answer                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 老板端是否仍显示主 Tab “录入”  | No. `#navTabs` no longer contains `data-view="entry"` or a primary `录入 / ENTRY` tab.                                                                                       |
| 如果移除，替换成什么           | The first primary tab is now `总览 / OVERVIEW`, backed by the existing analysis view. Other primary tabs are `历史`, `客户`, and `网络`.                                     |
| 如果保留，为什么保留，放在哪里 | The legacy owner proxy-entry view remains as a demoted desktop-only `管理工具` button for controlled management use. It is not a primary mobile tab and is hidden on mobile. |
| 是否影响员工端录入             | No. Employee entry remains in `employee-v3.html` under `view-entry` and the employee tab `录入`.                                                                             |
| 是否影响权限                   | No. Existing backend/session authority and front-end staff denial checks remain. This task only changes owner navigation prominence.                                         |
| 是否修改写入流程               | No. The entry view code is not removed and no write workflow is changed.                                                                                                     |

Production remains `PRODUCTION_NO_GO`.
