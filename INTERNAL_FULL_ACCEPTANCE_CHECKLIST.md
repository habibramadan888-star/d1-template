# Homelink Internal Full Acceptance Checklist

Generated: 2026-06-01 Asia/Dubai

Scope: internal acceptance only. This checklist does not authorize production cutover, production migration, batch dispatch, TTLock production smoke, write gate opening, or new production business writes.

Production cutover status: `PRODUCTION_NO_GO`

| ID | Role | Page | Test | Expected | Actual | Pass/Fail | Severity | Screenshot |
|---|---|---|---|---|---|---|---|---|
| IFA-001 | All | 主入口 / 三道门 | 打开 `/` | 只显示员工 / 老板 / 管理员三入口，文字对齐，无第四入口 |  |  | P1 |  |
| IFA-002 | Owner | 老板登录/退出 | 老板登录后退出 | 登录进入老板端，退出回三道门，旧受保护页面不可继续访问 |  |  | P0 |  |
| IFA-003 | Employee | 员工登录/退出 | 员工登录后退出 | 登录进入员工端，退出回三道门，旧受保护页面不可继续访问 |  |  | P0 |  |
| IFA-004 | Admin | 管理员登录/退出 | 管理员登录后退出 | 登录进入只读管理视图，退出回三道门 |  |  | P0 |  |
| IFA-005 | Owner | 总览 | 打开总览 | 今日实收、待收尾款、今日待处理、最近交接、异常提醒可读；无快速进入 |  |  | P1 |  |
| IFA-006 | Owner | 欠款模块 | 打开欠款 | 欠款卡片稳定加载，不显示 debug 字段，不显示 signal aborted |  |  | P1 |  |
| IFA-007 | Owner | 欠款模块 | 验证 144 / 139780080 反馈 | 50 AED、承诺日期、备注可见；已反馈任务不显示可点击下发员工 |  |  | P1 |  |
| IFA-008 | Owner | 历史 | 打开历史 | 历史记录卡片可加载、可查看详情，无长时间空白 |  |  | P1 |  |
| IFA-009 | Owner | 分析 | 打开分析 | 分析入口存在，页面可打开，移动端不丢导航 |  |  | P1 |  |
| IFA-010 | Owner | 客户 | 打开客户 | 客户信用档案或客户列表可打开，空态可理解 |  |  | P2 |  |
| IFA-011 | Owner | 网络 | 打开网络 | 网络入口可访问，不影响主导航稳定性 |  |  | P2 |  |
| IFA-012 | Employee | 录入 | 打开员工录入 | 表单字段可用，不执行真实录入写入，错误提示清楚 |  |  | P1 |  |
| IFA-013 | Employee | 跟进 | 打开跟进 | 系统提醒和老板下发任务分区清晰 |  |  | P1 |  |
| IFA-014 | Employee | 导出 | 打开导出 | 导出入口存在，不乱码，不泄露 debug 字段 |  |  | P2 |  |
| IFA-015 | Employee | 老板下发任务收件箱 | 查看任务 | 阿布杜可见 144 / 139780080 / 50 AED，承诺日期 2026-06-10 和备注可见 |  |  | P1 |  |
| IFA-016 | Admin | 管理员只读 | 查看老板端数据 | readonly_admin 可查看但不显示写按钮，写接口返回 403 |  |  | P0 |  |
| IFA-017 | Owner | WhatsApp 导出 | 选中 / 未选中导出 | 选中时导出选中项，未选中时导出当前筛选项；无重复、乱码、debug 字段 |  |  | P1 |  |
| IFA-018 | All | 手机端排版 | 手机浏览核心页面 | 不横向滚动，不竖排，不出现大片空白，关键按钮可点击 |  |  | P2 |  |
| IFA-019 | All | 弱网/刷新/返回/重复点击 | 慢网、刷新、返回、重复点击 | 不重复提交，不显示误导成功，不白屏，加载/错误状态清楚 |  |  | P1 |  |
| IFA-020 | All | 权限边界 | 低权限访问高权限 | 员工不能访问老板写入口；readonly_admin 不能写；无权限返回 401/403 |  |  | P0 |  |
| IFA-021 | All | 错误提示和空状态 | 空数据 / API 失败 | 文案可理解，不暴露 stack/path/token/cookie，不显示 undefined/null/none |  |  | P2 |  |

## Acceptance Rules

- P0 issues block all rollout discussions.
- P1 issues block module acceptance.
- P2/P3 issues can be batched after P0/P1 are stable.
- Any request involving production write gate, migration, D1 write, batch dispatch, or TTLock production smoke requires a separate approval prompt.
