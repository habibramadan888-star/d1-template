# Admin Internal Acceptance Script

Generated: 2026-06-01 Asia/Dubai

Scope: readonly_admin acceptance. Admin can inspect data but must not write.

Production cutover status: `PRODUCTION_NO_GO`

| Step | Test | Expected | Result | Notes |
|---|---|---|---|---|
| ADMIN-001 | 登录 admin | 进入只读管理视图，不打印 token/cookie |  |  |
| ADMIN-002 | 查看老板端数据 | 可查看老板端数据 |  |  |
| ADMIN-003 | 检查写按钮 | 不显示下发员工、确认关闭、作废、员工反馈等写按钮 |  |  |
| ADMIN-004 | 写接口边界 | 写接口返回 403 |  |  |
| ADMIN-005 | 查看欠款 | 欠款页面可读，不能下发员工 |  |  |
| ADMIN-006 | 查看历史 | 历史页面可读 |  |  |
| ADMIN-007 | 查看分析 | 分析页面可读 |  |  |
| ADMIN-008 | 查看客户 | 客户页面可读 |  |  |
| ADMIN-009 | 员工反馈权限 | 不能执行员工反馈 |  |  |
| ADMIN-010 | 退出登录 | 返回三道门，受保护页面不能继续访问 |  |  |

## Safety Checks

- readonly_admin must remain read-only.
- Any successful write by readonly_admin is P0.
- Production cutover remains `PRODUCTION_NO_GO`.
