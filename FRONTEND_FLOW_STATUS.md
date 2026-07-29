# Frontend Flow Status

Generated: 2026-05-23, Asia/Dubai

This status only records evidence available from the repository, reports, and current safe validation commands. No new browser-driven UI verification was performed during reconciliation.

## Employee Frontend

| 功能          | 状态    | 是否实际打开验证 | 是否需要登录           | 是否有 API | 是否通过          | 证据                                                                                                              | 问题                                                 |
| ------------- | ------- | ---------------- | ---------------------- | ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 员工登录      | Partial | no               | yes                    | yes        | no current proof  | `AUTH_TENANCY_AUDIT.md`, `scripts/smoke-auth.mjs`; current `npm run smoke:auth` failed fetch                      | 本轮没有可重复验证登录，因为本地 Worker 未运行       |
| 员工退出      | Unknown | no               | yes                    | possibly   | unknown           | no current direct evidence                                                                                        | 未做实际打开验证                                     |
| 员工首页加载  | Blocked | no               | yes/no depending route | yes        | no                | current `npm run smoke` failed fetching `/employee-v3.html`                                                       | 本地 Worker 未运行，无法确认页面加载                 |
| 客户新增      | Unknown | no               | yes                    | yes        | unknown           | no current direct evidence                                                                                        | 需要员工端 E2E                                       |
| 客户编辑      | Unknown | no               | yes                    | yes        | unknown           | no current direct evidence                                                                                        | 需要员工端 E2E                                       |
| 房源查看      | Unknown | no               | yes                    | yes        | unknown           | no current direct evidence                                                                                        | 需要员工端 E2E                                       |
| 房源编辑      | Unknown | no               | yes                    | yes        | unknown           | no current direct evidence                                                                                        | 需要权限边界验证                                     |
| 收款提交      | Blocked | no               | yes                    | yes        | no live proof     | `EMPLOYEE_FLOW_REPORT.md`, `BLOCKER_REPORT.md`, clean bootstrap error `no such table: transactions`               | Live employee entry path is not clean-bootstrap safe |
| 欠款查看      | Partial | no               | yes                    | yes        | unknown           | `EMPLOYEE_FLOW_REPORT.md`, `API_INVENTORY.md`                                                                     | 静态/报告存在，未做当前真实 API 验证                 |
| handover 提交 | Partial | no               | yes                    | yes        | module tests only | `modules/finance/handover.mjs`, `modules/employees/rent-write-plan.mjs`, `tests/*handover*`, `tests/*write-plan*` | Isolated logic exists but live Worker 未接入验证     |
| 搜索          | Unknown | no               | yes                    | maybe      | unknown           | no current direct evidence                                                                                        | 未做 UI 验证                                         |
| 筛选          | Unknown | no               | yes                    | maybe      | unknown           | no current direct evidence                                                                                        | 未做 UI 验证                                         |
| 导出/预览     | Partial | no               | yes                    | maybe      | unknown           | `deploy-worker/public/employee-v3.html`, previous reports                                                         | 用户历史反馈按钮无反应；本轮未复测                   |
| 弱网/失败状态 | Partial | no               | yes                    | yes        | unknown           | reports mention failure state needs coverage                                                                      | 没有当前网络模拟/E2E                                 |
| 移动端适配    | Partial | no               | no                     | no         | unknown           | user-provided mobile screenshots showed severe layout issues                                                      | 本轮不做 UI 修复；需要专门移动端验收                 |

## Owner Frontend

| 功能           | 状态    | 是否实际打开验证 | 是否需要登录 | 是否有 API | 是否通过 | 证据                                                                                                  | 问题                                                |
| -------------- | ------- | ---------------- | ------------ | ---------- | -------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 老板登录       | Partial | no               | yes          | yes        | unknown  | `OWNER_FLOW_REPORT.md`, auth reports                                                                  | 本轮没有真实登录验证                                |
| dashboard 加载 | Partial | no               | yes          | yes        | unknown  | `deploy-worker/public/index-51.html`, `deploy-worker/public/index-51-main.js`, `OWNER_FLOW_REPORT.md` | 当前 smoke 获取 owner page 失败，因为 Worker 未运行 |
| 今日到期       | Partial | no               | yes          | yes        | unknown  | `OWNER_FLOW_REPORT.md`, finance audit                                                                 | 统计正确性未由后端回归验证                          |
| 本周到期       | Partial | no               | yes          | yes        | unknown  | `OWNER_FLOW_REPORT.md`                                                                                | 缺少真实数据和 API 回归                             |
| 本月收入       | Partial | no               | yes          | yes        | unknown  | `FINANCE_AUDIT.md`, `OWNER_FLOW_REPORT.md`                                                            | 财务金额精度 P0 未解决                              |
| 逾期金额       | Partial | no               | yes          | yes        | unknown  | `FINANCE_AUDIT.md`, `DATABASE_AUDIT.md`                                                               | Receivables model P0 未 live 验证                   |
| 欠款列表       | Partial | no               | yes          | yes        | unknown  | `OWNER_FLOW_REPORT.md`                                                                                | 未做真实列表加载验证                                |
| 房源统计       | Unknown | no               | yes          | yes        | unknown  | no current direct evidence                                                                            | 需要 owner flow E2E                                 |
| 客户统计       | Unknown | no               | yes          | yes        | unknown  | no current direct evidence                                                                            | 需要 owner flow E2E                                 |
| 员工统计       | Unknown | no               | yes          | yes        | unknown  | no current direct evidence                                                                            | 需要 owner flow E2E                                 |
| 收款统计       | Partial | no               | yes          | yes        | unknown  | `FINANCE_AUDIT.md`, `OWNER_FLOW_REPORT.md`                                                            | 后端复核和 integer money 未完成                     |
| 押金统计       | Partial | no               | yes          | yes        | unknown  | `FINANCE_AUDIT.md`, `DATABASE_STATIC_SCAN.md`                                                         | deposit ledger 有 REAL/hard delete 风险             |
| 搜索           | Unknown | no               | yes          | maybe      | unknown  | no current direct evidence                                                                            | 未做 UI 验证                                        |
| 筛选           | Unknown | no               | yes          | maybe      | unknown  | no current direct evidence                                                                            | 未做 UI 验证                                        |
| 导出           | Unknown | no               | yes          | maybe      | unknown  | no current direct evidence                                                                            | 未做导出验证                                        |
| 表格分页       | Unknown | no               | yes          | maybe      | unknown  | no current direct evidence                                                                            | 未做大数据验证                                      |
| 移动端适配     | Partial | no               | no           | no         | unknown  | historical screenshots/context                                                                        | 需要专门响应式验收                                  |
| API 失败状态   | Unknown | no               | yes          | yes        | unknown  | current smoke failed before page/API validation                                                       | 未确认前端是否有清晰失败提示                        |
