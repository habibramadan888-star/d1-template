# Owner Internal Acceptance Script

Generated: 2026-06-01 Asia/Dubai

Scope: read-only or already-approved acceptance observation. Do not create new owner directives, batch dispatches, migrations, or production writes in this script.

Production cutover status: `PRODUCTION_NO_GO`

| Step | Test | Expected | Result | Notes |
|---|---|---|---|---|
| OWNER-001 | 登录老板账号 | 进入老板端，不打印 token/cookie |  |  |
| OWNER-002 | 打开总览 | 总览数据和异常提醒可见，无快速进入 |  |  |
| OWNER-003 | 打开欠款模块 | 欠款模块稳定加载，无 signal aborted，无 debug 字段 |  |  |
| OWNER-004 | 查找 144 / 139780080 | 50 AED、系统已有欠款、员工反馈可见 |  |  |
| OWNER-005 | 检查已反馈任务按钮 | 已反馈任务不显示可点击 `下发员工`，显示已下发/员工已反馈等只读状态 |  |  |
| OWNER-006 | WhatsApp 导出 | 选中项导出选中项；无选择时导出当前筛选结果；无重复/乱码/debug 字段 |  |  |
| OWNER-007 | 打开历史 | 历史页面可打开，记录分组和详情可用 |  |  |
| OWNER-008 | 打开分析 | 分析入口存在且页面可打开 |  |  |
| OWNER-009 | 打开客户 | 客户页面可打开，空态/数据态可理解 |  |  |
| OWNER-010 | 打开网络 | 网络入口可访问 |  |  |
| OWNER-011 | 退出登录 | 返回三道门，受保护页面不能继续访问 |  |  |

## Safety Checks

- Do not open production write gate.
- Do not execute owner directive create.
- Do not execute batch dispatch.
- Do not run TTLock production smoke.
- Do not perform D1 export/import/execute.
